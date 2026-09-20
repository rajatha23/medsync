const { query } = require('../db');
const logger = require('../utils/logger');

/**
 * Fetch all hospitals with optional filtering and department/resource counts
 */
const getAllHospitals = async ({ search, city, status, trauma_level } = {}) => {
  let sql = `
    SELECT 
      h.id, h.name, h.code, h.tier, h.trauma_level, h.address, h.city,
      h.latitude, h.longitude, h.contact_phone, h.contact_email, h.status,
      h.created_at, h.updated_at,
      COUNT(DISTINCT d.id) as department_count,
      COALESCE(SUM(CASE WHEN r.resource_type = 'ICU_BED' THEN r.available_quantity ELSE 0 END), 0) as available_icu_beds,
      COALESCE(SUM(CASE WHEN r.resource_type = 'GENERAL_BED' THEN r.available_quantity ELSE 0 END), 0) as available_general_beds,
      COALESCE(SUM(CASE WHEN r.category = 'BLOOD' THEN r.available_quantity ELSE 0 END), 0) as available_blood_units,
      COALESCE(SUM(CASE WHEN r.resource_type = 'VENTILATOR' THEN r.available_quantity ELSE 0 END), 0) as available_ventilators
    FROM hospitals h
    LEFT JOIN departments d ON h.id = d.hospital_id
    LEFT JOIN resources r ON h.id = r.hospital_id
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    params.push(`%${search.trim().toLowerCase()}%`);
    sql += ` AND (LOWER(h.name) LIKE $${params.length} OR LOWER(h.code) LIKE $${params.length} OR LOWER(h.address) LIKE $${params.length})`;
  }

  if (city) {
    params.push(city.trim());
    sql += ` AND LOWER(h.city) = LOWER($${params.length})`;
  }

  if (status) {
    params.push(status.toUpperCase());
    sql += ` AND h.status = $${params.length}`;
  }

  if (trauma_level) {
    params.push(trauma_level);
    sql += ` AND h.trauma_level = $${params.length}`;
  }

  sql += `
    GROUP BY h.id
    ORDER BY h.name ASC;
  `;

  const res = await query(sql, params);
  return res.rows;
};

/**
 * Get single hospital by ID with full departments and resources summary
 */
const getHospitalById = async (id) => {
  const hospRes = await query('SELECT * FROM hospitals WHERE id = $1', [id]);
  if (hospRes.rows.length === 0) {
    const err = new Error(`Hospital with ID "${id}" not found.`);
    err.statusCode = 404;
    throw err;
  }

  const hospital = hospRes.rows[0];

  // Fetch departments belonging to this hospital
  const deptRes = await query(`
    SELECT d.*, 
           COUNT(r.id) as resource_count,
           COALESCE(SUM(r.available_quantity), 0) as total_available_resources
    FROM departments d
    LEFT JOIN resources r ON d.id = r.department_id
    WHERE d.hospital_id = $1
    GROUP BY d.id
    ORDER BY d.name ASC;
  `, [id]);

  hospital.departments = deptRes.rows;

  // Fetch resources breakdown
  const resRes = await query(`
    SELECT id, department_id, category, resource_type, total_capacity,
           occupied_quantity, reserved_quantity, available_quantity, status
    FROM resources
    WHERE hospital_id = $1
    ORDER BY category, resource_type;
  `, [id]);

  hospital.resources = resRes.rows;

  return hospital;
};

/**
 * Create a new hospital
 */
const createHospital = async (data) => {
  const {
    name,
    code,
    tier = 'Regional Core',
    trauma_level = 'Level 2',
    address,
    city = 'Metropolis',
    latitude,
    longitude,
    contact_phone,
    contact_email,
    status = 'NORMAL'
  } = data;

  if (!name || !code || !address || latitude === undefined || longitude === undefined || !contact_phone) {
    const err = new Error('Name, code, address, latitude, longitude, and contact phone are required.');
    err.statusCode = 400;
    throw err;
  }

  // Check duplicate code
  const dupCheck = await query('SELECT id FROM hospitals WHERE LOWER(code) = LOWER($1)', [code.trim()]);
  if (dupCheck.rows.length > 0) {
    const err = new Error(`Hospital with code "${code}" already exists.`);
    err.statusCode = 409;
    throw err;
  }

  const hospitalId = `hosp-${code.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;

  const res = await query(`
    INSERT INTO hospitals (id, name, code, tier, trauma_level, address, city, latitude, longitude, contact_phone, contact_email, status)
    VALUES ($1, $2, UPPER($3), $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *;
  `, [
    hospitalId,
    name.trim(),
    code.trim(),
    tier,
    trauma_level,
    address.trim(),
    city.trim(),
    parseFloat(latitude),
    parseFloat(longitude),
    contact_phone.trim(),
    contact_email ? contact_email.trim() : null,
    status.toUpperCase()
  ]);

  logger.info(`Hospital created: ${res.rows[0].name} [${res.rows[0].id}]`);
  return res.rows[0];
};

/**
 * Update an existing hospital
 */
const updateHospital = async (id, data) => {
  const current = await query('SELECT * FROM hospitals WHERE id = $1', [id]);
  if (current.rows.length === 0) {
    const err = new Error(`Hospital with ID "${id}" not found.`);
    err.statusCode = 404;
    throw err;
  }

  const existing = current.rows[0];

  const updatedName = data.name !== undefined ? data.name.trim() : existing.name;
  const updatedTier = data.tier !== undefined ? data.tier : existing.tier;
  const updatedTrauma = data.trauma_level !== undefined ? data.trauma_level : existing.trauma_level;
  const updatedAddress = data.address !== undefined ? data.address.trim() : existing.address;
  const updatedCity = data.city !== undefined ? data.city.trim() : existing.city;
  const updatedLat = data.latitude !== undefined ? parseFloat(data.latitude) : existing.latitude;
  const updatedLng = data.longitude !== undefined ? parseFloat(data.longitude) : existing.longitude;
  const updatedPhone = data.contact_phone !== undefined ? data.contact_phone.trim() : existing.contact_phone;
  const updatedEmail = data.contact_email !== undefined ? data.contact_email.trim() : existing.contact_email;
  const updatedStatus = data.status !== undefined ? data.status.toUpperCase() : existing.status;

  const validStatuses = ['NORMAL', 'SURGE', 'DIVERT', 'LOCKDOWN'];
  if (!validStatuses.includes(updatedStatus)) {
    const err = new Error(`Invalid status "${updatedStatus}". Must be one of: ${validStatuses.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  const res = await query(`
    UPDATE hospitals
    SET name = $1,
        tier = $2,
        trauma_level = $3,
        address = $4,
        city = $5,
        latitude = $6,
        longitude = $7,
        contact_phone = $8,
        contact_email = $9,
        status = $10,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $11
    RETURNING *;
  `, [
    updatedName,
    updatedTier,
    updatedTrauma,
    updatedAddress,
    updatedCity,
    updatedLat,
    updatedLng,
    updatedPhone,
    updatedEmail,
    updatedStatus,
    id
  ]);

  logger.info(`Hospital updated: ${res.rows[0].name} [${id}] - Status: ${res.rows[0].status}`);
  return res.rows[0];
};

/**
 * Delete a hospital
 */
const deleteHospital = async (id) => {
  const check = await query('SELECT id, name FROM hospitals WHERE id = $1', [id]);
  if (check.rows.length === 0) {
    const err = new Error(`Hospital with ID "${id}" not found.`);
    err.statusCode = 404;
    throw err;
  }

  await query('DELETE FROM hospitals WHERE id = $1', [id]);
  logger.info(`Hospital deleted: ${check.rows[0].name} [${id}]`);
  return { id, name: check.rows[0].name };
};

module.exports = {
  getAllHospitals,
  getHospitalById,
  createHospital,
  updateHospital,
  deleteHospital
};
