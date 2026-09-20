const { query } = require('../db');
const logger = require('../utils/logger');

/**
 * Fetch all departments belonging to a specific hospital
 */
const getDepartmentsByHospital = async (hospitalId) => {
  const hospCheck = await query('SELECT id, name FROM hospitals WHERE id = $1', [hospitalId]);
  if (hospCheck.rows.length === 0) {
    const err = new Error(`Hospital with ID "${hospitalId}" not found.`);
    err.statusCode = 404;
    throw err;
  }

  const res = await query(`
    SELECT d.*,
           h.name as hospital_name,
           COUNT(r.id) as resource_count,
           COALESCE(SUM(r.total_capacity), 0) as total_capacity,
           COALESCE(SUM(r.available_quantity), 0) as available_resources
    FROM departments d
    JOIN hospitals h ON d.hospital_id = h.id
    LEFT JOIN resources r ON d.id = r.department_id
    WHERE d.hospital_id = $1
    GROUP BY d.id, h.name
    ORDER BY d.name ASC;
  `, [hospitalId]);

  return res.rows;
};

/**
 * Get single department by ID
 */
const getDepartmentById = async (id) => {
  const res = await query(`
    SELECT d.*, h.name as hospital_name
    FROM departments d
    JOIN hospitals h ON d.hospital_id = h.id
    WHERE d.id = $1;
  `, [id]);

  if (res.rows.length === 0) {
    const err = new Error(`Department with ID "${id}" not found.`);
    err.statusCode = 404;
    throw err;
  }

  const dept = res.rows[0];

  // Also fetch resources belonging to this department
  const resRes = await query(`
    SELECT * FROM resources WHERE department_id = $1 ORDER BY resource_type ASC;
  `, [id]);
  dept.resources = resRes.rows;

  return dept;
};

/**
 * Create a department for a hospital
 */
const createDepartment = async (hospitalId, data) => {
  const { name, department_code, head_name, floor_location, contact_number } = data;

  if (!name || !department_code) {
    const err = new Error('Department name and department_code are required.');
    err.statusCode = 400;
    throw err;
  }

  // Verify hospital exists
  const hospCheck = await query('SELECT id, name FROM hospitals WHERE id = $1', [hospitalId]);
  if (hospCheck.rows.length === 0) {
    const err = new Error(`Hospital with ID "${hospitalId}" not found.`);
    err.statusCode = 404;
    throw err;
  }

  // Check unique code per hospital
  const dupCheck = await query(
    'SELECT id FROM departments WHERE hospital_id = $1 AND LOWER(department_code) = LOWER($2)',
    [hospitalId, department_code.trim()]
  );
  if (dupCheck.rows.length > 0) {
    const err = new Error(`Department code "${department_code}" already exists in this hospital.`);
    err.statusCode = 409;
    throw err;
  }

  const deptId = `dept-${hospitalId.slice(5, 10)}-${department_code.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;

  const res = await query(`
    INSERT INTO departments (id, hospital_id, name, department_code, head_name, floor_location, contact_number)
    VALUES ($1, $2, $3, UPPER($4), $5, $6, $7)
    RETURNING *;
  `, [
    deptId,
    hospitalId,
    name.trim(),
    department_code.trim(),
    head_name ? head_name.trim() : null,
    floor_location ? floor_location.trim() : null,
    contact_number ? contact_number.trim() : null
  ]);

  logger.info(`Department created: ${res.rows[0].name} in hospital [${hospitalId}]`);
  return res.rows[0];
};

/**
 * Update department
 */
const updateDepartment = async (id, data) => {
  const check = await query('SELECT * FROM departments WHERE id = $1', [id]);
  if (check.rows.length === 0) {
    const err = new Error(`Department with ID "${id}" not found.`);
    err.statusCode = 404;
    throw err;
  }

  const existing = check.rows[0];

  const updatedName = data.name !== undefined ? data.name.trim() : existing.name;
  const updatedCode = data.department_code !== undefined ? data.department_code.trim().toUpperCase() : existing.department_code;
  const updatedHead = data.head_name !== undefined ? data.head_name.trim() : existing.head_name;
  const updatedFloor = data.floor_location !== undefined ? data.floor_location.trim() : existing.floor_location;
  const updatedPhone = data.contact_number !== undefined ? data.contact_number.trim() : existing.contact_number;

  const res = await query(`
    UPDATE departments
    SET name = $1,
        department_code = $2,
        head_name = $3,
        floor_location = $4,
        contact_number = $5,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $6
    RETURNING *;
  `, [
    updatedName,
    updatedCode,
    updatedHead,
    updatedFloor,
    updatedPhone,
    id
  ]);

  logger.info(`Department updated: ${res.rows[0].name} [${id}]`);
  return res.rows[0];
};

/**
 * Delete department
 */
const deleteDepartment = async (id) => {
  const check = await query('SELECT id, name, hospital_id FROM departments WHERE id = $1', [id]);
  if (check.rows.length === 0) {
    const err = new Error(`Department with ID "${id}" not found.`);
    err.statusCode = 404;
    throw err;
  }

  await query('DELETE FROM departments WHERE id = $1', [id]);
  logger.info(`Department deleted: ${check.rows[0].name} [${id}]`);
  return check.rows[0];
};

module.exports = {
  getDepartmentsByHospital,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment
};
