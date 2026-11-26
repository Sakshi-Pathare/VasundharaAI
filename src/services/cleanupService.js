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
    rawStatus: raw.rawStatus || 'pending',
    verificationStatus: raw.verificationStatus || 'pending',
    priority: raw.priority || 'medium',
    estimatedHours: Number(raw.estimatedHours || 1.5),
    wasteVolumeEstimate: raw.wasteVolumeEstimate || '',
    beforeImageUrl: resolveAssetUrl(raw.beforeImageUrl),
    afterImageUrl: resolveAssetUrl(raw.afterImageUrl),
    afterImageUploadedAt: raw.afterImageUploadedAt || null,
    afterImageUploadedBy: raw.afterImageUploadedBy || null,
    completionNotes: raw.completionNotes || '',
    verifiedAt: raw.verifiedAt || null,
    verifiedBy: raw.verifiedBy || null,
    verificationNotes: raw.verificationNotes || '',
    notes: raw.notes || '',
    completedAt: raw.completedAt || null,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
    report: raw.report || null,
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
   * Retrieves a single cleanup task with full report context.
   */
  async getCleanupById(id) {
    const data = await api.get(`/cleanups/${encodeURIComponent(id)}`);
    return formatCleanup(data);
  },

  /**
   * Retrieves the complete audit event timeline for a cleanup task.
   */
  async getCleanupHistory(id) {
    const data = await api.get(`/cleanups/${encodeURIComponent(id)}/history`);
    return Array.isArray(data) ? data : [];
  },

  /**
   * Creates a new cleanup task from an identified report.
   */
  async createTaskFromReport(report, assignedTeam = 'Municipal Sanitation Crew', scheduledDate = null, notes = null) {
    const payload = {
      reportId: report.id,
      assignedTeam: assignedTeam || 'Municipal Sanitation Crew',
      scheduledDate: scheduledDate || null,
      notes: notes || null,
    };
    const response = await api.post('/cleanups', payload);
    return formatCleanup(response);
  },

  /**
   * Assigns or reschedules a cleanup crew.
   */
  async assignTask(id, teamName, scheduledDate, notes = null) {
    const payload = {
      assignedTeam: teamName,
      scheduledDate: scheduledDate || null,
      notes: notes || null,
    };
    const response = await api.patch(`/cleanups/${encodeURIComponent(id)}/assign`, payload);
    return formatCleanup(response);
  },

  /**
   * Submits after-cleanup photographic evidence.
   * Sets verificationStatus to 'awaiting_verification' without prematurely marking as verified.
   */
  async submitEvidence(id, afterImageUrl, notes = '') {
    const payload = {
      afterImageUrl,
      notes: notes || '',
    };
    const response = await api.post(`/cleanups/${encodeURIComponent(id)}/evidence`, payload);
    return formatCleanup(response);
  },

  /**
   * Administrator verification or rejection of submitted cleanup evidence.
   * decision: 'approve' | 'reject'
   */
  async verifyCleanup(id, decision, notes = '') {
    const payload = {
      decision,
      notes: notes || '',
    };
    const response = await api.post(`/cleanups/${encodeURIComponent(id)}/verify`, payload);
    return formatCleanup(response);
  },

  /**
   * Updates task status (e.g. in_progress, awaiting_verification, completed, reopened).
   */
  async updateTaskStatus(id, newStatus, afterImageUrl = null, notes = null) {
    const payload = {
      status: newStatus,
      afterImageUrl: afterImageUrl || null,
      notes: notes || null,
    };
    const response = await api.patch(`/cleanups/${encodeURIComponent(id)}/status`, payload);
    return formatCleanup(response);
  },
};
