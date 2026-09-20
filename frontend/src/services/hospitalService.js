import { apiClient } from './apiClient';

export const hospitalService = {
  async getHospitals(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.city) query.append('city', params.city);
    if (params.status) query.append('status', params.status);
    if (params.trauma_level) query.append('trauma_level', params.trauma_level);

    const queryString = query.toString();
    const endpoint = `/hospitals${queryString ? `?${queryString}` : ''}`;
    const res = await apiClient.get(endpoint);
    return res.data;
  },

  async getHospitalById(id) {
    const res = await apiClient.get(`/hospitals/${id}`);
    return res.data;
  },

  async createHospital(data) {
    const res = await apiClient.post('/hospitals', data);
    return res.data;
  },

  async updateHospital(id, data) {
    const res = await apiClient.put(`/hospitals/${id}`, data);
    return res.data;
  },

  async getDepartments(hospitalId) {
    const res = await apiClient.get(`/hospitals/${hospitalId}/departments`);
    return res.data;
  },

  async createDepartment(hospitalId, data) {
    const res = await apiClient.post(`/hospitals/${hospitalId}/departments`, data);
    return res.data;
  },

  async updateDepartment(id, data) {
    const res = await apiClient.put(`/departments/${id}`, data);
    return res.data;
  },

  async deleteDepartment(id) {
    const res = await apiClient.delete ? await apiClient.delete(`/departments/${id}`) : await fetch(`/api/departments/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...apiClient.getAuthHeader()
      }
    }).then(r => r.json());
    return res.data;
  }
};
