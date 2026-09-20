const hospitalService = require('../services/hospitalService');

/**
 * GET /api/hospitals
 */
const getAllHospitals = async (req, res, next) => {
  try {
    const { search, city, status, trauma_level } = req.query;
    const hospitals = await hospitalService.getAllHospitals({ search, city, status, trauma_level });
    res.json({
      success: true,
      count: hospitals.length,
      data: hospitals
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/hospitals/:id
 */
const getHospitalById = async (req, res, next) => {
  try {
    const hospital = await hospitalService.getHospitalById(req.params.id);
    res.json({
      success: true,
      data: hospital
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/hospitals
 * Authorized: COORDINATOR, ADMIN
 */
const createHospital = async (req, res, next) => {
  try {
    const hospital = await hospitalService.createHospital(req.body);
    res.status(201).json({
      success: true,
      message: 'Hospital registered successfully.',
      data: hospital
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/hospitals/:id
 * Authorized:
 * - COORDINATOR, ADMIN: Can update any hospital
 * - HOSPITAL_ADMIN: Can ONLY update their own hospital
 */
const updateHospital = async (req, res, next) => {
  try {
    const targetId = req.params.id;

    // Check Hospital Admin isolation
    if (req.user.role === 'HOSPITAL_ADMIN' && req.user.hospital_id !== targetId) {
      return res.status(403).json({
        success: false,
        error: {
          message: `Forbidden: Hospital Admin is assigned to "${req.user.hospital_id}" and cannot modify hospital "${targetId}".`,
          statusCode: 403
        }
      });
    }

    const updated = await hospitalService.updateHospital(targetId, req.body);
    res.json({
      success: true,
      message: 'Hospital details updated successfully.',
      data: updated
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/hospitals/:id
 * Authorized: ADMIN
 */
const deleteHospital = async (req, res, next) => {
  try {
    const deleted = await hospitalService.deleteHospital(req.params.id);
    res.json({
      success: true,
      message: 'Hospital deleted successfully.',
      data: deleted
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllHospitals,
  getHospitalById,
  createHospital,
  updateHospital,
  deleteHospital
};
