/**
 * Vasundhara AI — Hotspot Intelligence Service
 * Connects directly to FastAPI backend (/api/v1/hotspots) for spatial clustering,
 * recurring accumulation detection, and environmental risk assessment.
 */

import { api, getAuthToken } from './apiClient.js';

export const hotspotService = {
  /**
   * Retrieves hotspot clusters with configurable query parameters and filters.
   * Uses tenant-scoped /hotspots when authenticated as municipal admin;
   * otherwise uses public clustered /public/hotspots.
   */
  async getHotspots(options = 'priority') {
    const params = typeof options === 'string' ? { sortBy: options } : (options || {});
    const query = new URLSearchParams();

    const validSort = ['priority', 'recurrence', 'date', 'severity'].includes(params.sortBy)
      ? params.sortBy
      : 'priority';
    query.set('sort_by', validSort);

    if (params.timeWindowDays && Number(params.timeWindowDays) > 0) {
      query.set('time_window_days', String(params.timeWindowDays));
    }
    if (params.radiusMeters && Number(params.radiusMeters) > 0) {
      query.set('radius_meters', String(params.radiusMeters));
    }
    if (params.municipalityId && params.municipalityId !== 'all') {
      query.set('municipality_id', params.municipalityId);
    }
    if (params.wardId && params.wardId !== 'all') {
      query.set('ward_id', params.wardId);
    }
    if (params.category && params.category !== 'all') {
      query.set('category', params.category);
    }
    if (params.severity && params.severity !== 'all') {
      query.set('severity', params.severity);
    }
    if (params.minPriority && Number(params.minPriority) > 0) {
      query.set('min_priority', String(params.minPriority));
    }

    const qs = query.toString() ? `?${query.toString()}` : '';
    const token = getAuthToken();
    let data;

    if (token) {
      try {
        data = await api.get(`/hotspots${qs}`);
      } catch (err) {
        if (err.isForbidden) {
          data = await api.get(`/public/hotspots${qs}`);
        } else {
          throw err;
        }
      }
    } else {
      data = await api.get(`/public/hotspots${qs}`);
    }

    if (!Array.isArray(data)) return [];
    return data;
  },

  /**
   * Retrieves single hotspot details by ID.
   */
  async getHotspotById(id) {
    try {
      return await api.get(`/hotspots/${encodeURIComponent(id)}`);
    } catch {
      const all = await this.getHotspots();
      return all.find((h) => h.id === id) || null;
    }
  },

  /**
   * Client-side hotspot creation helper for simulated simulation views.
   */
  async createHotspot(data) {
    // If backend introduces dynamic hotspot insertion endpoint in future, dispatch here
    return {
      id: `HOT-${Date.now().toString(36).toUpperCase()}`,
      name: data.name || 'Custom Environmental Hotspot',
      district: data.district || 'Municipal Sector',
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      radiusMeters: Number(data.radiusMeters) || 200,
      recurrenceCount: Number(data.recurrenceCount) || 10,
      severity: data.severity || 'high',
      priorityScore: Number(data.priorityScore) || 85,
      dominantCategory: data.dominantCategory || 'plastic',
      lastReportedDate: new Date().toISOString(),
      trend: data.trend || '+12% this month',
      environmentalRisk: data.environmentalRisk || 'Identified repetitive public pollution accumulation',
      suggestedAction: data.suggestedAction || 'Sanitation dispatch and monitoring sensor placement',
    };
  },

  async deleteHotspot(id) {
    return { success: true, id };
  },

  async loadPreset(presetList) {
    return presetList;
  },

  async resetToDefault() {
    return this.getHotspots('priority');
  },
};
