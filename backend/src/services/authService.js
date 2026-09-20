const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { generateToken } = require('../utils/token');
const logger = require('../utils/logger');

/**
 * Register a new user
 */
const registerUser = async ({ name, email, password, role, hospital_id, phone }) => {
  if (!name || !email || !password || !role) {
    const err = new Error('Name, email, password, and role are required.');
    err.statusCode = 400;
    throw err;
  }

  const normalizedRole = role.toUpperCase();
  const validRoles = ['COORDINATOR', 'HOSPITAL_ADMIN', 'ADMIN', 'PARAMEDIC'];
  if (!validRoles.includes(normalizedRole)) {
    const err = new Error(`Invalid role "${role}". Allowed roles: ${validRoles.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  if (normalizedRole === 'HOSPITAL_ADMIN' && !hospital_id) {
    const err = new Error('hospital_id is required when registering as HOSPITAL_ADMIN.');
    err.statusCode = 400;
    throw err;
  }

  // Check if hospital exists if provided
  if (hospital_id) {
    const hospCheck = await query('SELECT id, name FROM hospitals WHERE id = $1', [hospital_id]);
    if (hospCheck.rows.length === 0) {
      const err = new Error(`Hospital with id "${hospital_id}" not found.`);
      err.statusCode = 404;
      throw err;
    }
  }

  // Check for duplicate email
  const existing = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
  if (existing.rows.length > 0) {
    const err = new Error(`An account with email "${email}" already exists.`);
    err.statusCode = 409;
    throw err;
  }

  // Hash password
  const saltRounds = 10;
  const password_hash = await bcrypt.hash(password, saltRounds);
  const userId = `usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

  const insertRes = await query(`
    INSERT INTO users (id, name, email, password_hash, role, hospital_id, phone, is_active)
    VALUES ($1, $2, LOWER($3), $4, $5, $6, $7, true)
    RETURNING id, name, email, role, hospital_id, phone, created_at;
  `, [userId, name.trim(), email.trim(), password_hash, normalizedRole, hospital_id || null, phone || null]);

  const newUser = insertRes.rows[0];

  // Fetch hospital name if attached
  if (newUser.hospital_id) {
    const hosp = await query('SELECT name FROM hospitals WHERE id = $1', [newUser.hospital_id]);
    newUser.hospital_name = hosp.rows[0]?.name || null;
  }

  const token = generateToken({
    id: newUser.id,
    email: newUser.email,
    role: newUser.role,
    hospital_id: newUser.hospital_id
  });

  logger.info(`User registered: ${newUser.email} [${newUser.role}]`);

  return { user: newUser, token };
};

/**
 * Authenticate user by email and password
 */
const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    const err = new Error('Email and password are required.');
    err.statusCode = 400;
    throw err;
  }

  const userRes = await query(`
    SELECT u.id, u.name, u.email, u.password_hash, u.role, u.hospital_id, u.phone, u.is_active,
           h.name as hospital_name, h.code as hospital_code, h.status as hospital_status
    FROM users u
    LEFT JOIN hospitals h ON u.hospital_id = h.id
    WHERE LOWER(u.email) = LOWER($1);
  `, [email.trim()]);

  if (userRes.rows.length === 0) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  const user = userRes.rows[0];

  if (!user.is_active) {
    const err = new Error('This account has been deactivated.');
    err.statusCode = 403;
    throw err;
  }

  const passwordValid = await bcrypt.compare(password, user.password_hash);
  if (!passwordValid) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    hospital_id: user.hospital_id
  });

  logger.info(`User logged in successfully: ${user.email} [${user.role}]`);

  // Remove password_hash before returning
  delete user.password_hash;

  return { user, token };
};

/**
 * Get current user profile by user ID
 */
const getCurrentUser = async (userId) => {
  const userRes = await query(`
    SELECT u.id, u.name, u.email, u.role, u.hospital_id, u.phone, u.is_active, u.created_at,
           h.name as hospital_name, h.code as hospital_code, h.status as hospital_status,
           h.trauma_level as hospital_trauma_level, h.address as hospital_address
    FROM users u
    LEFT JOIN hospitals h ON u.hospital_id = h.id
    WHERE u.id = $1;
  `, [userId]);

  if (userRes.rows.length === 0) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  return userRes.rows[0];
};

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser
};
