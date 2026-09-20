import { apiClient } from './apiClient';

/**
 * Health check service
 */
export const healthService = {
  async getHealth() {
    const res = await apiClient.get('/health');
    return res.data;
  }
};
