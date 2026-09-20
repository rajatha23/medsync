import { apiClient } from './apiClient';

/**
 * Service for Resource Reservations (Phase 9)
 */
export const reservationService = {
  /**
   * Create a reservation for a specific resource
   */
  async createReservation(data) {
    const res = await apiClient.post('/reservations', data);
    return res.data;
  },

  /**
   * Bulk reserve all demanded resources at a matched hospital
   */
  async reserveAllForHospital(emergencyRequestId, hospitalId, notes = '') {
    const res = await apiClient.post('/reservations', {
      emergency_request_id: emergencyRequestId,
      hospital_id: hospitalId,
      notes
    });
    return res.data;
  },

  /**
   * Get active and historical reservations for an emergency request
   */
  async getReservationsForRequest(emergencyRequestId) {
    const res = await apiClient.get(`/reservations/emergency-request/${emergencyRequestId}`);
    return res.data;
  },

  /**
   * Get full reservation audit history ledger
   */
  async getReservationHistory(emergencyRequestId) {
    const res = await apiClient.get(`/reservations/emergency-request/${emergencyRequestId}/history`);
    return res.data;
  },

  /**
   * Release or cancel a specific reservation
   */
  async releaseReservation(reservationId, reason = 'Hold released') {
    const res = await apiClient.post(`/reservations/${reservationId}/release`, {
      reason,
      status: 'RELEASED'
    });
    return res.data;
  },

  /**
   * Release all active reservations for an emergency request
   */
  async releaseAllForRequest(emergencyRequestId, reason = 'All holds released') {
    const res = await apiClient.post(`/emergency-requests/${emergencyRequestId}/release-reservations`, {
      reason
    });
    return res.data;
  }
};
