const { query } = require('../db');
const {
  calculateResourceStatus,
  normalizeCategory,
  validateQuantities,
  formatResourceLabel
} = require('../utils/resourceHelper');
const crypto = require('crypto');

/**
 * Service for Hospital Resource Management (Phase 5)
 */
class ResourceService {
  /**
   * Get all resources with filtering and role scoping
   */
  async getAllResources(filters = {}, user) {
    let { hospital_id, category, status, search, department_id } = filters;

    // Role-based scoping: Hospital Admins only see their own hospital resources by default
    if (user && user.role === 'HOSPITAL_ADMIN') {
      hospital_id = user.hospital_id;
    }

    const conditions = [];
    const values = [];

    if (hospital_id) {
      values.push(hospital_id);
      conditions.push(`r.hospital_id = $${values.length}`);
    }

    if (category) {
      const normCat = normalizeCategory(category);
      values.push(normCat);
      conditions.push(`r.category = $${values.length}`);
    }

    if (status) {
      values.push(status.toUpperCase().trim());
      conditions.push(`r.status = $${values.length}`);
    }

    if (department_id) {
      values.push(department_id);
      conditions.push(`r.department_id = $${values.length}`);
    }

    if (search) {
      values.push(`%${search.trim()}%`);
      conditions.push(`(r.resource_type ILIKE $${values.length} OR h.name ILIKE $${values.length} OR d.name ILIKE $${values.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        r.id,
        r.hospital_id,
        h.name AS hospital_name,
        h.city AS hospital_city,
        r.department_id,
        d.name AS department_name,
        d.department_code,
        r.category,
        r.resource_type,
        r.total_capacity AS total_quantity,
        r.total_capacity,
        r.available_quantity,
        r.occupied_quantity,
        r.reserved_quantity,
        r.critical_threshold AS threshold,
        r.critical_threshold,
        r.unit_of_measure,
        r.status,
        r.created_at,
        r.updated_at AS last_updated,
        r.updated_at
      FROM resources r
      JOIN hospitals h ON r.hospital_id = h.id
      LEFT JOIN departments d ON r.department_id = d.id
      ${whereClause}
      ORDER BY h.name ASC, r.category ASC, r.resource_type ASC;
    `;

    const result = await query(sql, values);

    return result.rows.map(row => ({
      ...row,
      resource_label: formatResourceLabel(row.resource_type)
    }));
  }

  /**
   * Get single resource by ID with authorization check
   */
  async getResourceById(id, user) {
    const sql = `
      SELECT 
        r.id,
        r.hospital_id,
        h.name AS hospital_name,
        h.city AS hospital_city,
        r.department_id,
        d.name AS department_name,
        d.department_code,
        r.category,
        r.resource_type,
        r.total_capacity AS total_quantity,
        r.total_capacity,
        r.available_quantity,
        r.occupied_quantity,
        r.reserved_quantity,
        r.critical_threshold AS threshold,
        r.critical_threshold,
        r.unit_of_measure,
        r.status,
        r.created_at,
        r.updated_at AS last_updated,
        r.updated_at
      FROM resources r
      JOIN hospitals h ON r.hospital_id = h.id
      LEFT JOIN departments d ON r.department_id = d.id
      WHERE r.id = $1;
    `;

    const result = await query(sql, [id]);
    if (result.rows.length === 0) {
      const err = new Error(`Resource with ID '${id}' not found.`);
      err.statusCode = 404;
      throw err;
    }

    const resource = result.rows[0];

    // Hospital Admin can only inspect their own hospital resources
    if (user && user.role === 'HOSPITAL_ADMIN' && user.hospital_id !== resource.hospital_id) {
      const err = new Error(`Forbidden: You can only access resources belonging to your hospital (${user.hospital_id}).`);
      err.statusCode = 403;
      throw err;
    }

    return {
      ...resource,
      resource_label: formatResourceLabel(resource.resource_type)
    };
  }

  /**
   * Create a new hospital resource
   */
  async createResource(data, user) {
    // Only Hospital Admin can manage their hospital resources
    if (user.role === 'COORDINATOR') {
      const err = new Error('Coordinators have read-only access to hospital inventory. Only Hospital Admins can create resources.');
      err.statusCode = 403;
      throw err;
    }

    const hospitalId = user.hospital_id || data.hospital_id;
    if (!hospitalId) {
      const err = new Error('hospital_id is required.');
      err.statusCode = 400;
      throw err;
    }

    if (user.role === 'HOSPITAL_ADMIN' && user.hospital_id !== hospitalId) {
      const err = new Error(`Forbidden: You can only create resources for your assigned hospital (${user.hospital_id}).`);
      err.statusCode = 403;
      throw err;
    }

    const rawCategory = data.category || 'BEDS';
    const category = normalizeCategory(rawCategory);
    const resourceType = (data.resource_type || '').toUpperCase().trim();

    if (!resourceType) {
      const err = new Error('resource_type is required.');
      err.statusCode = 400;
      throw err;
    }

    const totalQuantity = data.total_quantity !== undefined ? data.total_quantity : (data.total_capacity !== undefined ? data.total_capacity : 0);
    const availableQuantity = data.available_quantity !== undefined ? data.available_quantity : totalQuantity;
    const threshold = data.threshold !== undefined ? Number(data.threshold) : (data.critical_threshold !== undefined ? Number(data.critical_threshold) : 5);

    // Validate quantities
    const { total, available } = validateQuantities(totalQuantity, availableQuantity);

    if (isNaN(threshold) || threshold < 0) {
      const err = new Error('threshold must be a non-negative number.');
      err.statusCode = 400;
      throw err;
    }

    // Auto calculate status based on Phase 5 rules
    const calculatedStatus = calculateResourceStatus(available, total, threshold);
    const status = data.status || calculatedStatus;

    const occupied = total - available;
    const reserved = 0;
    const unitOfMeasure = data.unit_of_measure || (category === 'BLOOD' ? 'units' : (category === 'BEDS' ? 'beds' : 'units'));
    const departmentId = data.department_id || null;
    const resourceId = data.id || `res-${crypto.randomBytes(6).toString('hex')}`;

    const insertSql = `
      INSERT INTO resources (
        id, hospital_id, department_id, category, resource_type,
        total_capacity, occupied_quantity, reserved_quantity,
        critical_threshold, unit_of_measure, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;

    const result = await query(insertSql, [
      resourceId,
      hospitalId,
      departmentId,
      category,
      resourceType,
      total,
      occupied,
      reserved,
      threshold,
      unitOfMeasure,
      status
    ]);

    const created = result.rows[0];

    // Audit log
    await query(`
      INSERT INTO resource_updates (
        resource_id, hospital_id, previous_capacity, new_capacity,
        previous_occupied, new_occupied, previous_reserved, new_reserved,
        change_reason, updated_by_user_id
      )
      VALUES ($1, $2, 0, $3, 0, $4, 0, 0, 'INITIAL_CREATION', $5);
    `, [resourceId, hospitalId, total, occupied, user.id]);

    return {
      ...created,
      total_quantity: created.total_capacity,
      threshold: created.critical_threshold,
      last_updated: created.updated_at,
      resource_label: formatResourceLabel(created.resource_type)
    };
  }

  /**
   * Update resource quantities and auto-recalculate status
   */
  async updateResource(id, updateData, user) {
    // Coordinators cannot edit hospital resources
    if (user.role === 'COORDINATOR') {
      const err = new Error('Coordinators have read-only access to hospital inventory. Only Hospital Admins can update their hospital resources.');
      err.statusCode = 403;
      throw err;
    }

    const checkSql = 'SELECT * FROM resources WHERE id = $1;';
    const checkRes = await query(checkSql, [id]);

    if (checkRes.rows.length === 0) {
      const err = new Error(`Resource with ID '${id}' not found.`);
      err.statusCode = 404;
      throw err;
    }

    const current = checkRes.rows[0];

    // Strict Hospital Admin Isolation
    if (user.role === 'HOSPITAL_ADMIN' && user.hospital_id !== current.hospital_id) {
      const err = new Error(`Forbidden: You can only update resources for your assigned hospital (${user.hospital_id}). This resource belongs to (${current.hospital_id}).`);
      err.statusCode = 403;
      throw err;
    }

    // Determine target total and available quantities
    const total = updateData.total_quantity !== undefined 
      ? Number(updateData.total_quantity) 
      : (updateData.total_capacity !== undefined ? Number(updateData.total_capacity) : current.total_capacity);

    const available = updateData.available_quantity !== undefined
      ? Number(updateData.available_quantity)
      : (updateData.occupied_quantity !== undefined ? (total - Number(updateData.occupied_quantity) - current.reserved_quantity) : current.available_quantity);

    const threshold = updateData.threshold !== undefined
      ? Number(updateData.threshold)
      : (updateData.critical_threshold !== undefined ? Number(updateData.critical_threshold) : current.critical_threshold);

    // Validate quantities strictly according to Phase 5 rules
    validateQuantities(total, available);

    if (isNaN(threshold) || threshold < 0) {
      const err = new Error('threshold must be a non-negative number.');
      err.statusCode = 400;
      throw err;
    }

    const reserved = current.reserved_quantity || 0;
    if (total < (available + reserved)) {
      const err = new Error(`Invalid quantity: Total capacity (${total}) cannot be less than available (${available}) + reserved (${reserved}).`);
      err.statusCode = 400;
      throw err;
    }

    const occupied = total - available - reserved;

    // Automatically calculate status
    const autoStatus = calculateResourceStatus(available, total, threshold);
    const finalStatus = updateData.status ? updateData.status.toUpperCase() : autoStatus;

    const unitOfMeasure = updateData.unit_of_measure || current.unit_of_measure;
    const departmentId = updateData.department_id !== undefined ? updateData.department_id : current.department_id;

    const updateSql = `
      UPDATE resources
      SET total_capacity = $1,
          occupied_quantity = $2,
          critical_threshold = $3,
          status = $4,
          unit_of_measure = $5,
          department_id = $6,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *;
    `;

    const updateResult = await query(updateSql, [
      total,
      occupied,
      threshold,
      finalStatus,
      unitOfMeasure,
      departmentId,
      id
    ]);

    const updated = updateResult.rows[0];

    // Record audit trail in resource_updates
    await query(`
      INSERT INTO resource_updates (
        resource_id, hospital_id, previous_capacity, new_capacity,
        previous_occupied, new_occupied, previous_reserved, new_reserved,
        change_reason, updated_by_user_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
    `, [
      id,
      current.hospital_id,
      current.total_capacity,
      total,
      current.occupied_quantity,
      occupied,
      current.reserved_quantity,
      reserved,
      updateData.change_reason || 'INVENTORY_ADJUSTMENT',
      user.id
    ]);

    return {
      ...updated,
      total_quantity: updated.total_capacity,
      threshold: updated.critical_threshold,
      last_updated: updated.updated_at,
      resource_label: formatResourceLabel(updated.resource_type)
    };
  }

  /**
   * Delete resource with ownership check
   */
  async deleteResource(id, user) {
    if (user.role === 'COORDINATOR') {
      const err = new Error('Coordinators have read-only access to hospital inventory.');
      err.statusCode = 403;
      throw err;
    }

    const checkRes = await query('SELECT * FROM resources WHERE id = $1;', [id]);
    if (checkRes.rows.length === 0) {
      const err = new Error(`Resource with ID '${id}' not found.`);
      err.statusCode = 404;
      throw err;
    }

    const current = checkRes.rows[0];
    if (user.role === 'HOSPITAL_ADMIN' && user.hospital_id !== current.hospital_id) {
      const err = new Error(`Forbidden: You can only delete resources for your assigned hospital (${user.hospital_id}).`);
      err.statusCode = 403;
      throw err;
    }

    await query('DELETE FROM resources WHERE id = $1;', [id]);
    return { id, deleted: true, message: 'Resource deleted successfully.' };
  }

  /**
   * Get resource summary and KPIs
   */
  async getResourceSummary(filters = {}, user) {
    let hospital_id = filters.hospital_id;
    if (user && user.role === 'HOSPITAL_ADMIN') {
      hospital_id = user.hospital_id;
    }

    const values = [];
    let whereClause = '';
    if (hospital_id) {
      values.push(hospital_id);
      whereClause = `WHERE hospital_id = $1`;
    }

    const summarySql = `
      SELECT 
        COUNT(*) as total_resources,
        COALESCE(SUM(CASE WHEN resource_type = 'ICU_BED' THEN total_capacity ELSE 0 END), 0) as total_icu_beds,
        COALESCE(SUM(CASE WHEN resource_type = 'ICU_BED' THEN available_quantity ELSE 0 END), 0) as available_icu_beds,
        COALESCE(SUM(CASE WHEN resource_type = 'GENERAL_BED' THEN total_capacity ELSE 0 END), 0) as total_general_beds,
        COALESCE(SUM(CASE WHEN resource_type = 'GENERAL_BED' THEN available_quantity ELSE 0 END), 0) as available_general_beds,
        COALESCE(SUM(CASE WHEN resource_type = 'VENTILATOR' THEN total_capacity ELSE 0 END), 0) as total_ventilators,
        COALESCE(SUM(CASE WHEN resource_type = 'VENTILATOR' THEN available_quantity ELSE 0 END), 0) as available_ventilators,
        COALESCE(SUM(CASE WHEN category = 'BLOOD' THEN available_quantity ELSE 0 END), 0) as total_blood_units,
        COALESCE(SUM(CASE WHEN category = 'CAPACITY' THEN total_capacity ELSE 0 END), 0) as total_emergency_capacity,
        COALESCE(SUM(CASE WHEN category = 'CAPACITY' THEN available_quantity ELSE 0 END), 0) as available_emergency_capacity,
        COUNT(*) FILTER (WHERE status = 'AVAILABLE') as count_available,
        COUNT(*) FILTER (WHERE status = 'LIMITED') as count_limited,
        COUNT(*) FILTER (WHERE status = 'CRITICAL') as count_critical,
        COUNT(*) FILTER (WHERE status = 'UNAVAILABLE') as count_unavailable
      FROM resources
      ${whereClause};
    `;

    const res = await query(summarySql, values);
    const row = res.rows[0];

    return {
      totalResources: parseInt(row.total_resources, 10),
      icuBeds: {
        total: parseInt(row.total_icu_beds, 10),
        available: parseInt(row.available_icu_beds, 10)
      },
      generalBeds: {
        total: parseInt(row.total_general_beds, 10),
        available: parseInt(row.available_general_beds, 10)
      },
      ventilators: {
        total: parseInt(row.total_ventilators, 10),
        available: parseInt(row.available_ventilators, 10)
      },
      bloodUnits: {
        available: parseInt(row.total_blood_units, 10)
      },
      emergencyCapacity: {
        total: parseInt(row.total_emergency_capacity, 10),
        available: parseInt(row.available_emergency_capacity, 10)
      },
      statusBreakdown: {
        AVAILABLE: parseInt(row.count_available, 10),
        LIMITED: parseInt(row.count_limited, 10),
        CRITICAL: parseInt(row.count_critical, 10),
        UNAVAILABLE: parseInt(row.count_unavailable, 10)
      },
      criticalCount: parseInt(row.count_critical, 10) + parseInt(row.count_unavailable, 10)
    };
  }
}

module.exports = new ResourceService();
