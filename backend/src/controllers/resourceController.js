const resourceService = require('../services/resourceService');

/**
 * Controller for Hospital Resource Management (Phase 5)
 */
class ResourceController {
  async getAllResources(req, res, next) {
    try {
      const filters = {
        hospital_id: req.query.hospital_id,
        category: req.query.category,
        status: req.query.status,
        search: req.query.search,
        department_id: req.query.department_id
      };

      const resources = await resourceService.getAllResources(filters, req.user);
      res.json({
        success: true,
        count: resources.length,
        data: resources
      });
    } catch (err) {
      next(err);
    }
  }

  async getResourceById(req, res, next) {
    try {
      const resource = await resourceService.getResourceById(req.params.id, req.user);
      res.json({
        success: true,
        data: resource
      });
    } catch (err) {
      next(err);
    }
  }

  async createResource(req, res, next) {
    try {
      const resource = await resourceService.createResource(req.body, req.user);
      res.status(201).json({
        success: true,
        message: 'Resource created successfully.',
        data: resource
      });
    } catch (err) {
      next(err);
    }
  }

  async updateResource(req, res, next) {
    try {
      const resource = await resourceService.updateResource(req.params.id, req.body, req.user);
      res.json({
        success: true,
        message: 'Resource updated successfully.',
        data: resource
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteResource(req, res, next) {
    try {
      const result = await resourceService.deleteResource(req.params.id, req.user);
      res.json({
        success: true,
        message: result.message,
        data: { id: result.id }
      });
    } catch (err) {
      next(err);
    }
  }

  async getResourceSummary(req, res, next) {
    try {
      const filters = {
        hospital_id: req.query.hospital_id
      };
      const summary = await resourceService.getResourceSummary(filters, req.user);
      res.json({
        success: true,
        data: summary
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ResourceController();
