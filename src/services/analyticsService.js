/**
 * Vasundhara AI — Environmental Analytics Service
 * Connects directly to FastAPI backend (/api/v1/analytics and /api/v1/admin) for real-time
 * civic metrics, seasonal trends, category breakdowns, and municipal notifications.
 */

import { api, getAuthToken } from './apiClient.js';

function buildQuery(params = {}) {
  const parts = [];
  if (params.timeRange && params.timeRange !== 'all') {
    parts.push(`time_range=${encodeURIComponent(params.timeRange)}`);
  }
  if (params.wardId && params.wardId !== 'all') {
    parts.push(`ward_id=${encodeURIComponent(params.wardId)}`);
  }
  if (params.municipalityId && params.municipalityId !== 'all') {
    parts.push(`municipality_id=${encodeURIComponent(params.municipalityId)}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

export const analyticsService = {
  /**
   * Retrieves high-level dashboard metrics from real database records.
   * If logged in as admin, fetches tenant-scoped /analytics/metrics;
   * otherwise fetches sanitized /public/metrics.
   */
  async getDashboardMetrics(filters = {}) {
    const token = getAuthToken();
    const query = buildQuery(filters);
    if (token) {
      try {
        return await api.get(`/analytics/metrics${query}`);
      } catch (err) {
        if (!err.isForbidden) throw err;
      }
    }
    return await api.get(`/public/metrics${query}`);
  },

  /**
   * Retrieves 6-month historical pollution & remediation trends.
   */
  async getPollutionTrends(filters = {}) {
    try {
      const query = buildQuery(filters);
      const data = await api.get(`/analytics/trends${query}`);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  /**
   * Retrieves material category distribution.
   */
  async getCategoryBreakdown(filters = {}) {
    try {
      const query = buildQuery(filters);
      const data = await api.get(`/analytics/categories${query}`);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  /**
   * Retrieves cleanup remediation completion trends over time.
   */
  async getCleanupTrends(filters = {}) {
    try {
      const query = buildQuery(filters);
      const data = await api.get(`/analytics/cleanup-trends${query}`);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  /**
   * Retrieves hotspot priority and spatial distribution.
   */
  async getHotspotDistribution(filters = {}) {
    try {
      const query = buildQuery(filters);
      return await api.get(`/analytics/hotspot-distribution${query}`);
    } catch {
      return { totalHotspots: 0, priorityDistribution: [], wardDistribution: [] };
    }
  },

  /**
   * Retrieves municipality-level performance distribution (super_admin / comparative).
   */
  async getMunicipalityStats() {
    try {
      const data = await api.get('/analytics/municipalities');
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  /**
   * Retrieves ward-level incident distribution (admin only).
   */
  async getWardStats(filters = {}) {
    try {
      const query = buildQuery(filters);
      const data = await api.get(`/admin/ward-stats${query}`);
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
