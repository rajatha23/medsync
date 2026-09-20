import { apiClient } from './apiClient';

export const authService = {
  async login(email, password) {
    const res = await apiClient.post('/auth/login', { email, password });
    if (res.data?.token) {
      localStorage.setItem('medsync_token', res.data.token);
    }
    return res.data;
  },

  async register(userData) {
    const res = await apiClient.post('/auth/register', userData);
    if (res.data?.token) {
      localStorage.setItem('medsync_token', res.data.token);
    }
    return res.data;
  },

  async getCurrentUser() {
    const res = await apiClient.get('/auth/me');
    return res.data?.user;
  },

  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      // Continue cleanup even if server endpoint fails
      console.warn('Logout API call notice:', err.message);
    } finally {
      localStorage.removeItem('medsync_token');
    }
  },

  getToken() {
    return localStorage.getItem('medsync_token');
  }
};
