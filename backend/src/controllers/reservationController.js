const reservationService = require('../services/reservationService');

/**
 * Controller for Resource Reservations (Phase 9)
 */
class ReservationController {
  /**
   * POST /api/reservations
   * Create a single reservation or bulk reserve demanded resources
   */
  async createReservation(req, res, next) {
    try {
      const {
        emergency_request_id,
        hospital_id,
        resource_id,
        quantity,
        expires_in_minutes,
        notes,
        reserve_all = false
      } = req.body;

      if (!emergency_request_id) {
        return res.status(400).json({
          success: false,
          error: { message: 'emergency_request_id is required.', statusCode: 400 }
        });
      }

      // If resource_id is specified, reserve that specific resource
      if (resource_id) {
        const result = await reservationService.createReservation({
          emergency_request_id,
          hospital_id,
          resource_id,
          quantity: quantity || 1,
          expires_in_minutes: expires_in_minutes || 30,
          notes
        }, req.user);

        return res.status(201).json({
          success: true,
          message: 'Resource successfully reserved under transaction lock.',
          data: result
        });
      }

      // Otherwise, bulk reserve all demanded resources for this hospital
      if (hospital_id) {
        const result = await reservationService.reserveAllDemandedForHospital({
          emergency_request_id,
          hospital_id,
          expires_in_minutes: expires_in_minutes || 30,
          notes
        }, req.user);

        return res.status(201).json({
          success: true,
          message: 'All demanded resources successfully reserved at receiving hospital.',
          data: result
        });
      }

      return res.status(400).json({
        success: false,
        error: { message: 'Either resource_id or hospital_id must be provided.', statusCode: 400 }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/reservations/emergency-request/:id
   */
  async getReservationsForRequest(req, res, next) {
    try {
      const { id } = req.params;
      const reservations = await reservationService.getReservationsForRequest(id);

      res.status(200).json({
        success: true,
        data: reservations
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/reservations/emergency-request/:id/history
   */
  async getReservationHistory(req, res, next) {
    try {
      const { id } = req.params;
      const history = await reservationService.getReservationHistory(id);

      res.status(200).json({
        success: true,
        data: history
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/reservations/:id/release
   */
  async releaseReservation(req, res, next) {
    try {
      const { id } = req.params;
      const { reason, status = 'RELEASED' } = req.body || {};

      const result = await reservationService.releaseReservation(id, {
        reason,
        releaseStatus: status
      }, req.user);

      res.status(200).json({
        success: true,
        message: 'Reservation successfully released and resources returned to availability pool.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/emergency-requests/:id/release-reservations
   */
  async releaseAllForRequest(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body || {};

      const result = await reservationService.releaseAllReservationsForRequest(id, reason, req.user);

      res.status(200).json({
        success: true,
        message: `Successfully released ${result.released_count} active reservations.`,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ReservationController();
