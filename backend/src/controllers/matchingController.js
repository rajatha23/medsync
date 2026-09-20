const matchingService = require('../services/matchingService');

/**
 * Controller for Smart Resource Matching (Phase 8)
 */
class MatchingController {
  /**
   * GET /api/emergency-requests/:id/matching-hospitals
   */
  async getMatchesForRequest(req, res, next) {
    try {
      const { id } = req.params;
      const { maxDistanceKm } = req.query;

      const options = {};
      if (maxDistanceKm && !isNaN(parseFloat(maxDistanceKm))) {
        options.maxDistanceKm = parseFloat(maxDistanceKm);
      }

      const results = await matchingService.findMatchingHospitalsForRequest(id, options);

      res.status(200).json({
        success: true,
        data: results
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/matching/preview
   * Preview matching hospitals for hypothetical coordinates and resource requirements
   */
  async previewMatches(req, res, next) {
    try {
      const {
        incidentLatitude,
        incidentLongitude,
        latitude,
        longitude,
        requiredResources = [],
        required_resources = [],
        priority = 'MEDIUM',
        maxDistanceKm
      } = req.body;

      const lat = latitude !== undefined ? latitude : incidentLatitude;
      const lng = longitude !== undefined ? longitude : incidentLongitude;
      const reqRes = required_resources.length > 0 ? required_resources : requiredResources;

      const options = {};
      if (maxDistanceKm && !isNaN(parseFloat(maxDistanceKm))) {
        options.maxDistanceKm = parseFloat(maxDistanceKm);
      }

      const results = await matchingService.previewMatches({
        incidentLatitude: lat !== undefined ? parseFloat(lat) : 40.7128,
        incidentLongitude: lng !== undefined ? parseFloat(lng) : -74.0060,
        requiredResources: reqRes,
        priority,
        options
      });

      res.status(200).json({
        success: true,
        data: results
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new MatchingController();
