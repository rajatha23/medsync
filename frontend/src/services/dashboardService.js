import { apiClient } from './apiClient';

export const dashboardService = {
  /**
   * Fetch live Coordinator Command Center telemetry overview
   */
  async getOverview() {
    const res = await apiClient.get('/dashboard/overview');
    return res.data;
  }
};
