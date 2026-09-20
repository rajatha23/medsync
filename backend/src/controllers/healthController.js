const healthService = require('../services/healthService');

/**
 * GET /api/health
 * Returns service health and PostgreSQL database status
 */
const checkHealth = async (req, res, next) => {
  try {
    const health = await healthService.getHealthStatus();
    res.status(200).json({
      success: true,
      data: health
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  checkHealth
};
