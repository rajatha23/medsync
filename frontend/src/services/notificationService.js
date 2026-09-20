import { apiClient } from './apiClient';
export const notificationService = {
  async list(params = {}) { return apiClient.get(`/notifications?${new URLSearchParams(params).toString()}`); },
  async markRead(id) { return apiClient.patch(`/notifications/${id}/read`, {}); },
  async markAllRead() { return apiClient.post('/notifications/read-all', {}); }
};
