const dashboardService = require('../services/dashboardService');

/**
 * Controller for Coordinator Command Center Dashboard (Phase 6)
 */
class DashboardController {
  async getOverview(req, res, next) {
    try {
      const overview = await dashboardService.getOverview();
      res.json({
        success: true,
        data: overview
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DashboardController();
