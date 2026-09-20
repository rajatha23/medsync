/**
 * MedSync API Client
 * Lightweight fetch wrapper with automatic JWT Bearer token attachment
 */
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = {
  getAuthHeader() {
    const token = localStorage.getItem('medsync_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  },

  async get(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader(),
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP error! status: ${response.status}`);
      }
      return data;
    } catch (err) {
      console.error(`API Error [GET ${endpoint}]:`, err);
      throw err;
    }
  },

  async post(endpoint, body = {}, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader(),
          ...options.headers,
        },
        body: JSON.stringify(body),
        ...options,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP error! status: ${response.status}`);
      }
      return data;
    } catch (err) {
      console.error(`API Error [POST ${endpoint}]:`, err);
      throw err;
    }
  },

  async put(endpoint, body = {}, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader(),
          ...options.headers,
        },
        body: JSON.stringify(body),
        ...options,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP error! status: ${response.status}`);
      }
      return data;
    } catch (err) {
      console.error(`API Error [PUT ${endpoint}]:`, err);
      throw err;
    }
  },

  async patch(endpoint, body = {}, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader(),
          ...options.headers,
        },
        body: JSON.stringify(body),
        ...options,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP error! status: ${response.status}`);
      }
      return data;
    } catch (err) {
      console.error(`API Error [PATCH ${endpoint}]:`, err);
      throw err;
    }
  },

  async delete(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader(),
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP error! status: ${response.status}`);
      }
      return data;
    } catch (err) {
      console.error(`API Error [DELETE ${endpoint}]:`, err);
      throw err;
    }
  }
};
