/**
 * Vasundhara AI — Environmental Analytics Service
 * Connects directly to FastAPI backend (/api/v1/analytics and /api/v1/admin) for real-time
 * civic metrics, seasonal trends, category breakdowns, and municipal notifications.
 */

import { api, getAuthToken } from './apiClient.js';

export const analyticsService = {
  /**
   * Retrieves high-level dashboard metrics.
   * If logged in as admin, fetches tenant-scoped /analytics/metrics;
   * otherwise fetches sanitized /public/metrics.
   */
  async getDashboardMetrics() {
    const token = getAuthToken();
    if (token) {
      try {
        return await api.get('/analytics/metrics');
      } catch (err) {
        if (!err.isForbidden) throw err;
      }
    }
    return await api.get('/public/metrics');
  },

  /**
   * Retrieves 6-month historical pollution & remediation trends.
   */
  async getPollutionTrends() {
    try {
      const data = await api.get('/analytics/trends');
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  /**
   * Retrieves material category distribution.
   */
  async getCategoryBreakdown() {
    try {
      const data = await api.get('/analytics/categories');
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  /**
   * Retrieves ward-level incident distribution (admin only).
   */
  async getWardStats() {
    try {
      const data = await api.get('/admin/ward-stats');
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  /**
   * Retrieves citizen eco-stewards directory for the municipality (admin only).
   */
  async getCitizens() {
    try {
      const data = await api.get('/admin/citizens');
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  /**
   * Retrieves active municipal cleanup squads and capacities (admin only).
   */
  async getCleanupTeams() {
    try {
      const data = await api.get('/admin/cleanup-teams');
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  /**
   * Retrieves municipality operational profile and ward list (admin only).
   */
  async getMunicipalityDetails() {
    return await api.get('/admin/municipality');
  },

  /**
   * Retrieves municipal notifications and dispatch alerts (admin only).
   */
  async getNotifications() {
    try {
      const data = await api.get('/admin/notifications');
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  /**
   * Marks a notification as read (admin only).
   */
  async markNotificationRead(id) {
    return await api.patch(`/admin/notifications/${encodeURIComponent(id)}/read`);
  },
};
