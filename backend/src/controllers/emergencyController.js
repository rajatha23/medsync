const emergencyService = require('../services/emergencyService');

/**
 * Controller for Emergency Request Workflow (Phase 7)
 */
class EmergencyController {
  async createEmergencyRequest(req, res, next) {
    try {
      const created = await emergencyService.createEmergencyRequest(req.body, req.user);
      res.status(201).json({
        success: true,
        message: 'Emergency request created successfully.',
        data: created
      });
    } catch (err) {
      next(err);
    }
  }

  async getEmergencyRequests(req, res, next) {
    try {
      const filters = {
        status: req.query.status,
        priority: req.query.priority,
        search: req.query.search,
        assigned_hospital_id: req.query.assigned_hospital_id
      };
      const requests = await emergencyService.getEmergencyRequests(filters);
      res.json({
        success: true,
        count: requests.length,
        data: requests
      });
    } catch (err) {
      next(err);
    }
  }

  async getEmergencyRequestById(req, res, next) {
    try {
      const request = await emergencyService.getEmergencyRequestById(req.params.id);
      res.json({
        success: true,
        data: request
      });
    } catch (err) {
      next(err);
    }
  }

  async updateEmergencyStatus(req, res, next) {
    try {
      const { status, notes, assigned_hospital_id, change_reason } = req.body;
      if (!status) {
        return res.status(400).json({
          success: false,
          error: { message: 'status field is required.', statusCode: 400 }
        });
      }

      const updated = await emergencyService.updateEmergencyStatus(
        req.params.id,
        status,
        { notes, assigned_hospital_id, change_reason },
        req.user
      );

      res.json({
        success: true,
        message: `Emergency request status successfully updated to ${status}.`,
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new EmergencyController();
