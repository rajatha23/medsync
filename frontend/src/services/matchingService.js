import { apiClient } from './apiClient';

/**
 * Service for Smart Resource Matching (Phase 8)
 */
export const matchingService = {
  /**
   * Get matching hospitals for a specific emergency request
   * @param {string} emergencyRequestId
   * @param {Object} options - { maxDistanceKm }
   */
  async getMatchingHospitals(emergencyRequestId, options = {}) {
    const params = new URLSearchParams();
    if (options.maxDistanceKm) {
      params.append('maxDistanceKm', options.maxDistanceKm);
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get(`/emergency-requests/${emergencyRequestId}/matching-hospitals${query}`);
    return res.data;
  },

  /**
   * Preview matching hospitals for hypothetical coordinates and resource requirements
   * @param {Object} previewData - { incidentLatitude, incidentLongitude, required_resources, priority }
   */
  async previewMatches(previewData) {
    const res = await apiClient.post('/matching/preview', previewData);
    return res.data;
  }
};
