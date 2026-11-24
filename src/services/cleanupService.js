/**
 * Vasundhara AI — Cleanup Workflow Service
 * Connects directly to FastAPI backend (/api/v1/cleanups) for sanitation crew dispatching,
 * photo-verified cleanup workflows, and status tracking.
 */

import { api, resolveAssetUrl } from './apiClient.js';

function formatCleanup(raw) {
  if (!raw) return null;
  return {
    ...raw,
    id: raw.id,
    reportId: raw.reportId,
    taskName: raw.taskName || 'Remediation Task',
    location: raw.location || 'Municipal Sector',
    assignedTeam: raw.assignedTeam || 'Unassigned Crew',
    contactLead: raw.contactLead || 'Sanitation Dispatch',
    scheduledDate: raw.scheduledDate || null,
    status: raw.status || 'pending',
    priority: raw.priority || 'medium',
    estimatedHours: Number(raw.estimatedHours || 1.5),
    wasteVolumeEstimate: raw.wasteVolumeEstimate || '',
    beforeImageUrl: resolveAssetUrl(raw.beforeImageUrl),
    afterImageUrl: resolveAssetUrl(raw.afterImageUrl),
    notes: raw.notes || '',
    completedAt: raw.completedAt || null,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
  };
}

export const cleanupService = {
  /**
   * Retrieves cleanup tasks filtered by status.
   */
  async getCleanups(status = 'all') {
    const query = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
    const data = await api.get(`/cleanups${query}`);
    if (!Array.isArray(data)) return [];
    return data.map(formatCleanup);
  },

  /**
   * Creates a new cleanup task from an identified report.
   */
  async createTaskFromReport(report, assignedTeam = 'Municipal Sanitation Crew', scheduledDate = null) {
    const payload = {
      reportId: report.id,
      assignedTeam: assignedTeam || 'Municipal Sanitation Crew',
      scheduledDate: scheduledDate || null,
    };
    const response = await api.post('/cleanups', payload);
    return formatCleanup(response);
  },

  /**
   * Assigns or reschedules a cleanup crew.
   */
  async assignTask(id, teamName, scheduledDate) {
    const payload = {
      assignedTeam: teamName,
      scheduledDate: scheduledDate || null,
    };
    const response = await api.patch(`/cleanups/${encodeURIComponent(id)}/assign`, payload);
    return formatCleanup(response);
  },

  /**
   * Updates task status (e.g. in_progress, completed).
   * Note: marking completed requires an afterImageUrl for verified completion.
   */
  async updateTaskStatus(id, newStatus, afterImageUrl = null) {
    const payload = {
      status: newStatus,
      afterImageUrl: afterImageUrl || null,
    };
    const response = await api.patch(`/cleanups/${encodeURIComponent(id)}/status`, payload);
    return formatCleanup(response);
  },
};
