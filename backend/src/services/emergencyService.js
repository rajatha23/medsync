const { query } = require('../db');
const crypto = require('crypto');

const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const VALID_STATUSES = [
  'SEARCHING',
  'MATCH_FOUND',
  'PENDING_ACCEPTANCE',
  'ACCEPTED',
  'RESERVED',
  'ALLOCATED',
  'COMPLETED',
  'CANCELLED'
];

// Valid forward and allowed status transitions
const ALLOWED_TRANSITIONS = {
  SEARCHING: ['MATCH_FOUND', 'CANCELLED'],
  MATCH_FOUND: ['PENDING_ACCEPTANCE', 'SEARCHING', 'CANCELLED'],
  PENDING_ACCEPTANCE: ['ACCEPTED', 'MATCH_FOUND', 'SEARCHING', 'CANCELLED'],
  ACCEPTED: ['RESERVED', 'ALLOCATED', 'CANCELLED'],
  RESERVED: ['ALLOCATED', 'ACCEPTED', 'CANCELLED'],
  ALLOCATED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [], // Terminal
  CANCELLED: []  // Terminal
};

/**
 * Service for Emergency Request Workflow (Phase 7)
 */
class EmergencyService {
  /**
   * Create a new emergency request with requested resources
   */
  async createEmergencyRequest(data, user) {
    const {
      location,
      incident_address,
      latitude,
      longitude,
      incident_latitude,
      incident_longitude,
      priority = 'MEDIUM',
      incident_category = 'TRAUMA',
      patient_reference,
      notes = '',
      required_resources = []
    } = data;

    const finalAddress = (location || incident_address || '').trim();
    if (!finalAddress) {
      const err = new Error('Location address is required.');
      err.statusCode = 400;
      throw err;
    }

    const finalLat = Number(latitude !== undefined ? latitude : incident_latitude);
    const finalLng = Number(longitude !== undefined ? longitude : incident_longitude);

    if (isNaN(finalLat) || isNaN(finalLng)) {
      const err = new Error('Valid numerical latitude and longitude coordinates are required.');
      err.statusCode = 400;
      throw err;
    }

    const normPriority = (priority || '').toUpperCase().trim();
    if (!VALID_PRIORITIES.includes(normPriority)) {
      const err = new Error(`Priority must be one of: ${VALID_PRIORITIES.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    // Generate IDs and tracking code
    const requestId = `req-${crypto.randomBytes(6).toString('hex')}`;
    const trackingCode = `MED-REQ-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const patientRef = patient_reference || `SYNTH-PT-${Math.floor(1000 + Math.random() * 9000)}`;

    const requesterId = user?.id || null;
    const requesterName = user?.name || 'Emergency Coordinator';
    const requesterContact = user?.phone || '+1 (555) 911-0000';

    const insertSql = `
      INSERT INTO emergency_requests (
        id, tracking_code, priority, incident_category, patient_reference,
        requester_id, requester_name, requester_contact,
        incident_latitude, incident_longitude, incident_address,
        status, notes, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'SEARCHING', $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *;
    `;

    const result = await query(insertSql, [
      requestId,
      trackingCode,
      normPriority,
      incident_category.toUpperCase().trim(),
      patientRef,
      requesterId,
      requesterName,
      requesterContact,
      finalLat,
      finalLng,
      finalAddress,
      notes
    ]);

    const createdRequest = result.rows[0];

    // Insert required resources (if any provided)
    const insertedResources = [];
    if (Array.isArray(required_resources) && required_resources.length > 0) {
      for (const resItem of required_resources) {
        const resType = (resItem.resource_type || '').toUpperCase().trim();
        const reqQty = Number(resItem.required_quantity);

        if (!resType) {
          const err = new Error('resource_type is required for all requested resources.');
          err.statusCode = 400;
          throw err;
        }

        if (isNaN(reqQty) || reqQty <= 0) {
          const err = new Error(`required_quantity for ${resType} must be a positive integer.`);
          err.statusCode = 400;
          throw err;
        }

        const rrId = `rr-${crypto.randomBytes(6).toString('hex')}`;
        const rrInsert = await query(`
          INSERT INTO request_resources (
            id, emergency_request_id, resource_type, required_quantity, fulfilled_quantity, status
          )
          VALUES ($1, $2, $3, $4, 0, 'UNFULFILLED')
          RETURNING *;
        `, [rrId, requestId, resType, reqQty]);

        insertedResources.push(rrInsert.rows[0]);
      }
    }

    // Insert initial status history audit event
    await query(`
      INSERT INTO emergency_status_history (
        emergency_request_id, previous_status, new_status, notes, changed_by_user_id
      )
      VALUES ($1, NULL, 'SEARCHING', $2, $3);
    `, [requestId, 'Incident reported and resource search initiated', requesterId]);

    return {
      ...createdRequest,
      location: createdRequest.incident_address,
      latitude: createdRequest.incident_latitude,
      longitude: createdRequest.incident_longitude,
      created_by: createdRequest.requester_id,
      required_resources: insertedResources
    };
  }

  /**
   * Get all emergency requests with filtering
   */
  async getEmergencyRequests(filters = {}) {
    const { status, priority, search, assigned_hospital_id } = filters;
    const conditions = [];
    const values = [];

    if (status) {
      values.push(status.toUpperCase().trim());
      conditions.push(`er.status = $${values.length}`);
    }

    if (priority) {
      values.push(priority.toUpperCase().trim());
      conditions.push(`er.priority = $${values.length}`);
    }

    if (assigned_hospital_id) {
      values.push(assigned_hospital_id);
      conditions.push(`er.assigned_hospital_id = $${values.length}`);
    }

    if (search) {
      values.push(`%${search.trim()}%`);
      conditions.push(`(er.tracking_code ILIKE $${values.length} OR er.patient_reference ILIKE $${values.length} OR er.incident_address ILIKE $${values.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        er.id,
        er.tracking_code,
        er.priority,
        er.incident_category,
        er.patient_reference,
        er.requester_id AS created_by,
        er.requester_name,
        er.requester_contact,
        er.incident_latitude AS latitude,
        er.incident_longitude AS longitude,
        er.incident_address AS location,
        er.status,
        er.assigned_hospital_id,
        h.name AS assigned_hospital_name,
        h.city AS assigned_hospital_city,
        er.notes,
        er.created_at,
        er.updated_at,
        er.resolved_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', rr.id,
              'resource_type', rr.resource_type,
              'required_quantity', rr.required_quantity,
              'fulfilled_quantity', rr.fulfilled_quantity,
              'status', rr.status
            )
          ) FILTER (WHERE rr.id IS NOT NULL), '[]'
        ) AS required_resources
      FROM emergency_requests er
      LEFT JOIN hospitals h ON er.assigned_hospital_id = h.id
      LEFT JOIN request_resources rr ON er.id = rr.emergency_request_id
      ${whereClause}
      GROUP BY er.id, h.id
      ORDER BY 
        CASE er.status 
          WHEN 'SEARCHING' THEN 1 
          WHEN 'MATCH_FOUND' THEN 2 
          WHEN 'PENDING_ACCEPTANCE' THEN 3 
          WHEN 'ACCEPTED' THEN 4 
          WHEN 'RESERVED' THEN 5 
          WHEN 'ALLOCATED' THEN 6 
          ELSE 7 
        END,
        CASE er.priority 
          WHEN 'CRITICAL' THEN 1 
          WHEN 'HIGH' THEN 2 
          WHEN 'MEDIUM' THEN 3 
          ELSE 4 
        END,
        er.created_at DESC;
    `;

    const result = await query(sql, values);
    return result.rows;
  }

  /**
   * Get single emergency request by ID with complete timeline history
   */
  async getEmergencyRequestById(id) {
    const reqSql = `
      SELECT 
        er.id,
        er.tracking_code,
        er.priority,
        er.incident_category,
        er.patient_reference,
        er.requester_id AS created_by,
        er.requester_name,
        er.requester_contact,
        er.incident_latitude AS latitude,
        er.incident_longitude AS longitude,
        er.incident_address AS location,
        er.status,
        er.assigned_hospital_id,
        h.name AS assigned_hospital_name,
        h.city AS assigned_hospital_city,
        h.contact_phone AS assigned_hospital_phone,
        er.notes,
        er.created_at,
        er.updated_at,
        er.resolved_at
      FROM emergency_requests er
      LEFT JOIN hospitals h ON er.assigned_hospital_id = h.id
      WHERE er.id = $1;
    `;

    const reqRes = await query(reqSql, [id]);
    if (reqRes.rows.length === 0) {
      const err = new Error(`Emergency request with ID '${id}' not found.`);
      err.statusCode = 404;
      throw err;
    }

    const emergency = reqRes.rows[0];

    // Fetch required resources
    const rrSql = `
      SELECT id, resource_type, required_quantity, fulfilled_quantity, status
      FROM request_resources
      WHERE emergency_request_id = $1
      ORDER BY resource_type ASC;
    `;
    const rrRes = await query(rrSql, [id]);

    // Fetch complete status history timeline
    const historySql = `
      SELECT 
        esh.id,
        esh.previous_status,
        esh.new_status,
        esh.notes,
        esh.created_at,
        esh.changed_by_user_id,
        u.name AS changed_by_name,
        u.role AS changed_by_role
      FROM emergency_status_history esh
      LEFT JOIN users u ON esh.changed_by_user_id = u.id
      WHERE esh.emergency_request_id = $1
      ORDER BY esh.created_at ASC, esh.id ASC;
    `;
    const historyRes = await query(historySql, [id]);

    return {
      ...emergency,
      required_resources: rrRes.rows,
      timeline: historyRes.rows
    };
  }

  /**
   * Update emergency request status with validation and audit logging
   */
  async updateEmergencyStatus(id, newStatus, updateData = {}, user) {
    const normStatus = (newStatus || '').toUpperCase().trim();

    if (!VALID_STATUSES.includes(normStatus)) {
      const err = new Error(`Invalid status '${newStatus}'. Must be one of: ${VALID_STATUSES.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    // Check existing request
    const checkSql = 'SELECT * FROM emergency_requests WHERE id = $1;';
    const checkRes = await query(checkSql, [id]);

    if (checkRes.rows.length === 0) {
      const err = new Error(`Emergency request with ID '${id}' not found.`);
      err.statusCode = 404;
      throw err;
    }

    const current = checkRes.rows[0];

    // Prevent transitions from terminal states
    if (current.status === 'COMPLETED' || current.status === 'CANCELLED') {
      const err = new Error(`Cannot transition emergency request from terminal status '${current.status}'.`);
      err.statusCode = 400;
      throw err;
    }

    // If identical, return early
    if (current.status === normStatus) {
      return this.getEmergencyRequestById(id);
    }

    // Validate transition
    const allowed = ALLOWED_TRANSITIONS[current.status] || [];
    if (!allowed.includes(normStatus) && normStatus !== 'CANCELLED') {
      const err = new Error(`Invalid status transition from '${current.status}' to '${normStatus}'. Allowed transitions: ${allowed.join(', ') || 'none'}`);
      err.statusCode = 400;
      throw err;
    }

    const assignedHospitalId = updateData.assigned_hospital_id !== undefined 
      ? updateData.assigned_hospital_id 
      : current.assigned_hospital_id;

    const transitionNotes = updateData.notes || updateData.change_reason || `Status updated to ${normStatus}`;

    const updateSql = `
      UPDATE emergency_requests
      SET status = $1::varchar,
          assigned_hospital_id = $2::varchar,
          notes = CASE 
            WHEN $3::text IS NOT NULL AND $3::text != '' THEN CONCAT(COALESCE(notes, ''), ' [', TO_CHAR(CURRENT_TIMESTAMP, 'HH24:MI:SS'), '] ', $3::text)
            ELSE notes 
          END,
          resolved_at = CASE 
            WHEN $1::varchar = 'COMPLETED' OR $1::varchar = 'CANCELLED' THEN CURRENT_TIMESTAMP 
            ELSE resolved_at 
          END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4::varchar
      RETURNING *;
    `;

    await query(updateSql, [normStatus, assignedHospitalId, transitionNotes, id]);

    // Insert status history audit trail
    await query(`
      INSERT INTO emergency_status_history (
        emergency_request_id, previous_status, new_status, notes, changed_by_user_id
      )
      VALUES ($1, $2, $3, $4, $5);
    `, [id, current.status, normStatus, transitionNotes, user?.id || null]);

    return this.getEmergencyRequestById(id);
  }
}

module.exports = new EmergencyService();
