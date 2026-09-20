const departmentService = require('../services/departmentService');
const { query } = require('../db');

/**
 * GET /api/hospitals/:hospitalId/departments
 */
const getDepartmentsByHospital = async (req, res, next) => {
  try {
    const departments = await departmentService.getDepartmentsByHospital(req.params.hospitalId);
    res.json({
      success: true,
      count: departments.length,
      data: departments
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/departments/:id
 */
const getDepartmentById = async (req, res, next) => {
  try {
    const department = await departmentService.getDepartmentById(req.params.id);
    res.json({
      success: true,
      data: department
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/hospitals/:hospitalId/departments
 * Authorized:
 * - COORDINATOR, ADMIN: Can create department in any hospital
 * - HOSPITAL_ADMIN: Can ONLY create in their assigned hospital
 */
const createDepartment = async (req, res, next) => {
  try {
    const { hospitalId } = req.params;

    if (req.user.role === 'HOSPITAL_ADMIN' && req.user.hospital_id !== hospitalId) {
      return res.status(403).json({
        success: false,
        error: {
          message: `Forbidden: Hospital Admin is assigned to "${req.user.hospital_id}" and cannot create departments in hospital "${hospitalId}".`,
          statusCode: 403
        }
      });
    }

    const department = await departmentService.createDepartment(hospitalId, req.body);
    res.status(201).json({
      success: true,
      message: 'Department created successfully.',
      data: department
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/departments/:id
 * Authorized:
 * - COORDINATOR, ADMIN: Can update any department
 * - HOSPITAL_ADMIN: Can ONLY update if department belongs to their assigned hospital
 */
const updateDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check ownership if Hospital Admin
    if (req.user.role === 'HOSPITAL_ADMIN') {
      const check = await query('SELECT hospital_id FROM departments WHERE id = $1', [id]);
      if (check.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Department not found.', statusCode: 404 }
        });
      }

      if (check.rows[0].hospital_id !== req.user.hospital_id) {
        return res.status(403).json({
          success: false,
          error: {
            message: `Forbidden: Hospital Admin cannot update departments of hospital "${check.rows[0].hospital_id}".`,
            statusCode: 403
          }
        });
      }
    }

    const updated = await departmentService.updateDepartment(id, req.body);
    res.json({
      success: true,
      message: 'Department updated successfully.',
      data: updated
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/departments/:id
 * Authorized:
 * - ADMIN: Can delete any department
 * - HOSPITAL_ADMIN: Can delete if belonging to their assigned hospital
 */
const deleteDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.role === 'HOSPITAL_ADMIN') {
      const check = await query('SELECT hospital_id FROM departments WHERE id = $1', [id]);
      if (check.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Department not found.', statusCode: 404 }
        });
      }

      if (check.rows[0].hospital_id !== req.user.hospital_id) {
        return res.status(403).json({
          success: false,
          error: {
            message: `Forbidden: Hospital Admin cannot delete departments of hospital "${check.rows[0].hospital_id}".`,
            statusCode: 403
          }
        });
      }
    }

    const deleted = await departmentService.deleteDepartment(id);
    res.json({
      success: true,
      message: 'Department deleted successfully.',
      data: deleted
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDepartmentsByHospital,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment
};
