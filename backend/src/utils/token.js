const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'medsync_super_secret_jwt_key_2026_dev_environment';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate signed JWT token
 * @param {object} payload - User identification payload
 * @returns {string} Signed JWT
 */
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verify JWT token
 * @param {string} token
 * @returns {object} Decoded token payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

module.exports = {
  generateToken,
  verifyToken
};
