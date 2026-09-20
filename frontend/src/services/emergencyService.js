import { apiClient } from './apiClient';

/**
 * Service for interacting with Emergency Requests APIs (Phase 7)
 */
export const emergencyService = {
  /**
   * Get emergency requests with optional filters
   * @param {Object} filters - { status, priority, search, assigned_hospital_id }
   */
  async getEmergencyRequests(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'ALL') {
      params.append('status', filters.status);
    }
    if (filters.priority && filters.priority !== 'ALL') {
      params.append('priority', filters.priority);
    }
    if (filters.search) {
      params.append('search', filters.search);
    }
    if (filters.assigned_hospital_id) {
      params.append('assigned_hospital_id', filters.assigned_hospital_id);
    }

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get(`/emergency-requests${queryString}`);
    return res.data;
  },

  /**
   * Get single emergency request by ID with timeline and requested resources
   * @param {string} id
   */
  async getEmergencyRequestById(id) {
    const res = await apiClient.get(`/emergency-requests/${id}`);
    return res.data;
  },

  /**
   * Create a new emergency request
   * @param {Object} data - { location, latitude, longitude, priority, incident_category, patient_reference, notes, required_resources }
   */
  async createEmergencyRequest(data) {
    const res = await apiClient.post('/emergency-requests', data);
    return res.data;
  },

  /**
   * Update emergency request status
   * @param {string} id
   * @param {Object} updateData - { status, assigned_hospital_id, notes, change_reason }
   */
  async updateEmergencyStatus(id, updateData) {
    const res = await apiClient.put(`/emergency-requests/${id}/status`, updateData);
    return res.data;
  }
};
