const { verifyToken } = require('../utils/token');
const { query } = require('../db');
const logger = require('../utils/logger');

/**
 * Authentication Middleware
 * Validates Bearer JWT in Authorization header and loads user
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required. No Bearer token provided.',
        statusCode: 401
      }
    });
  }

  try {
    const decoded = verifyToken(token);
    
    // Fetch active user from database
    const userRes = await query(`
      SELECT u.id, u.name, u.email, u.role, u.hospital_id, u.phone, u.is_active,
             h.name as hospital_name, h.code as hospital_code, h.status as hospital_status
      FROM users u
      LEFT JOIN hospitals h ON u.hospital_id = h.id
      WHERE u.id = $1;
    `, [decoded.id]);

    if (userRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'User belonging to token no longer exists.',
          statusCode: 401
        }
      });
    }

    const user = userRes.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'User account has been deactivated.',
          statusCode: 403
        }
      });
    }

    // Attach user profile to request
    req.user = user;
    next();
  } catch (err) {
    logger.warn(`Invalid or expired token attempt: ${err.message}`);
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid or expired authentication token.',
        statusCode: 401
      }
    });
  }
};

/**
 * Role-Based Access Control (RBAC) Middleware
 * @param  {...string} allowedRoles - Allowed roles (e.g. 'COORDINATOR', 'HOSPITAL_ADMIN')
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required before checking permissions.',
          statusCode: 401
        }
      });
    }

    // ADMIN has superuser access to all routes
    if (req.user.role === 'ADMIN') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: `Access denied. Role "${req.user.role}" does not have permission for this resource. Required: [${allowedRoles.join(', ')}]`,
          statusCode: 403
        }
      });
    }

    next();
  };
};

/**
 * Enforce Hospital Isolation for HOSPITAL_ADMIN
 * A Hospital Admin can only inspect or modify their assigned facility
 */
const requireHospitalAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { message: 'Authentication required.', statusCode: 401 }
    });
  }

  // COORDINATOR and ADMIN can access all hospitals
  if (req.user.role === 'COORDINATOR' || req.user.role === 'ADMIN') {
    return next();
  }

  if (req.user.role === 'HOSPITAL_ADMIN') {
    const targetHospitalId = req.params.hospitalId || req.body.hospital_id || req.query.hospital_id;

    if (!req.user.hospital_id) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Forbidden: Hospital Admin is not assigned to any hospital.',
          statusCode: 403
        }
      });
    }

    if (targetHospitalId && targetHospitalId !== req.user.hospital_id) {
      return res.status(403).json({
        success: false,
        error: {
          message: `Forbidden: Hospital Admin is assigned to hospital "${req.user.hospital_id}" and cannot manage hospital "${targetHospitalId}".`,
          statusCode: 403
        }
      });
    }

    // Default to their assigned hospital if not specified
    req.targetHospitalId = req.user.hospital_id;
    return next();
  }

  return res.status(403).json({
    success: false,
    error: { message: 'Access denied: insufficient hospital permissions.', statusCode: 403 }
  });
};

module.exports = {
  authenticateToken,
  requireRole,
  requireHospitalAccess
};
