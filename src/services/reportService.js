/**
 * Vasundhara AI — Pollution Report Service
 * Connects directly to FastAPI backend (/api/v1/reports) for real-time incident reporting,
 * geospatial routing, and municipal triage.
 */

import { api, getAuthToken, resolveAssetUrl } from './apiClient.js';

function formatReport(raw) {
  if (!raw) return null;
  return {
    ...raw,
    id: raw.id,
    title: raw.title || 'Untitled Incident',
    description: raw.description || '',
    latitude: Number(raw.latitude),
    longitude: Number(raw.longitude),
    address: raw.address || 'Geo-coordinate location',
    category: raw.category || 'mixed',
    severity: raw.severity || 'medium',
    status: raw.status || 'pending',
    jurisdictionStatus: raw.jurisdictionStatus || 'pending',
    municipalityId: raw.municipalityId,
    municipalityCode: raw.municipalityCode,
    municipalityName: raw.municipalityName,
    wardId: raw.wardId,
    zoneId: raw.zoneId,
    estimatedKg: Number(raw.estimatedKg || 1),
    imageUrl: resolveAssetUrl(raw.imageUrl),
    aiStatus: raw.aiStatus || 'unavailable',
    detectionNote: raw.detectionNote || '',
    detections: raw.detections || [],
    internalNotes: raw.internalNotes || '',
    reportedAt: raw.reportedAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.reportedAt || new Date().toISOString(),
    reporterName: raw.reporterName || 'Citizen Steward',
    reporterEmail: raw.reporterEmail,
  };
}

export const reportService = {
  /**
   * Retrieves all reports matching filters.
   * Dispatches to tenant-scoped /reports if authenticated as municipal/super admin,
   * otherwise uses sanitized /public/reports.
   */
  async getAllReports(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.category && filters.category !== 'all') params.append('category', filters.category);
    if (filters.severity && filters.severity !== 'all') params.append('severity', filters.severity);
    if (filters.search) params.append('search', filters.search);
    if (filters.wardId) params.append('ward_id', filters.wardId);

    const queryString = params.toString() ? `?${params.toString()}` : '';

    // Check if user has an auth token
    const token = getAuthToken();
    let data;

    if (token) {
      try {
        data = await api.get(`/reports${queryString}`);
      } catch (err) {
        // If forbidden (e.g. citizen token on admin route), fall back to public reports
        if (err.isForbidden) {
          data = await api.get(`/public/reports${queryString}`);
        } else {
          throw err;
        }
      }
    } else {
      data = await api.get(`/public/reports${queryString}`);
    }

    if (!Array.isArray(data)) return [];
    return data.map(formatReport);
  },

  /**
   * Retrieves the authenticated citizen's personal report history.
   */
  async getUserReports() {
    const data = await api.get('/reports/mine');
    if (!Array.isArray(data)) return [];
    return data.map(formatReport);
  },

  /**
   * Retrieves details for a specific report by ID.
   */
  async getReportById(id) {
    const data = await api.get(`/reports/${encodeURIComponent(id)}`);
    return formatReport(data);
  },

  /**
   * Submits a new citizen litter report to FastAPI backend.
   */
  async createReport(reportData) {
    const payload = {
      title: reportData.title,
      description: reportData.description || '',
      latitude: Number(reportData.latitude),
      longitude: Number(reportData.longitude),
      address: reportData.address || '',
      category: reportData.category || 'mixed',
      severity: reportData.severity || 'medium',
      estimatedKg: Number(reportData.estimatedKg || 1),
      imageUrl: reportData.imageUrl || null,
    };

    const response = await api.post('/reports', payload);
    return formatReport(response);
  },

  /**
   * Uploads an image file via multipart/form-data.
   * Supports JPEG, PNG, WebP with server-side validation and content-hash deduplication.
   */
  async uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    return await api.post('/uploads', formData);
  },

  /**
   * Updates report verification status (admin only).
   */
  async updateReportStatus(id, newStatus, afterImageUrl = null) {
    const payload = {
      status: newStatus,
      afterImageUrl: afterImageUrl || null,
    };
    const response = await api.patch(`/reports/${encodeURIComponent(id)}/status`, payload);
    return formatReport(response);
  },

  /**
   * Updates internal municipal operational notes (admin only).
   */
  async updateInternalNotes(id, note) {
    const response = await api.patch(`/reports/${encodeURIComponent(id)}/notes`, { note });
    return formatReport(response);
  },

  /**
   * Retrieves audit and status history for a report.
   */
  async getReportHistory(id) {
    return await api.get(`/reports/${encodeURIComponent(id)}/history`);
  },

  /**
   * Deletes a report (admin only).
   */
  async deleteReport(id) {
    return await api.delete(`/reports/${encodeURIComponent(id)}`);
  },

  /**
   * Exports filtered reports as a CSV download.
   */
  async exportReportsCsv() {
    return await api.get('/reports/export.csv', { responseType: 'text' });
  },
};
