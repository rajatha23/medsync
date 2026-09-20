import { apiClient } from './apiClient';

export const resourceService = {
  async getResources(params = {}) {
    const query = new URLSearchParams();
    if (params.hospital_id) query.append('hospital_id', params.hospital_id);
    if (params.category) query.append('category', params.category);
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    if (params.department_id) query.append('department_id', params.department_id);

    const queryString = query.toString();
    const endpoint = `/resources${queryString ? `?${queryString}` : ''}`;
    const res = await apiClient.get(endpoint);
    return res.data;
  },

  async getResourceSummary(params = {}) {
    const query = new URLSearchParams();
    if (params.hospital_id) query.append('hospital_id', params.hospital_id);

    const queryString = query.toString();
    const endpoint = `/resources/summary${queryString ? `?${queryString}` : ''}`;
    const res = await apiClient.get(endpoint);
    return res.data;
  },

  async getResourceById(id) {
    const res = await apiClient.get(`/resources/${id}`);
    return res.data;
  },

  async createResource(data) {
    const res = await apiClient.post('/resources', data);
    return res.data;
  },

  async updateResource(id, data) {
    const res = await apiClient.put(`/resources/${id}`, data);
    return res.data;
  },

  async deleteResource(id) {
    const res = await apiClient.delete(`/resources/${id}`);
    return res.data;
  }
};
