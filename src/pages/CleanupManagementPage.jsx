import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckSquare,
  Clock,
  CheckCircle,
  Truck,
  Users,
  Calendar,
  MapPin,
  Camera,
  Layers,
  ArrowRight,
  Filter,
  Check,
  AlertCircle,
  Sparkles,
  Sliders,
  ShieldCheck,
  UploadCloud,
  ChevronRight,
  XCircle,
  RotateCcw,
  FileText,
  History,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardBody } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { cleanupService } from '../services/cleanupService';
import { formatDate, formatRelativeTime } from '../utils/dateUtils';
import { compressImageFile } from '../utils/imageStorage';

export function CleanupManagementPage() {
  const [cleanups, setCleanups] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'pending' | 'in_progress' | 'awaiting_verification' | 'completed' | 'reopened'
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskHistory, setTaskHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50); // 0 to 100

  // Modals state
  const [assignModalTask, setAssignModalTask] = useState(null);
  const [assignedTeamInput, setAssignedTeamInput] = useState('');
  const [scheduledDateInput, setScheduledDateInput] = useState('');
  const [assignNotesInput, setAssignNotesInput] = useState('');

  const [evidenceModalTask, setEvidenceModalTask] = useState(null);
  const [evidenceImage, setEvidenceImage] = useState(null);
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  const [verifyModalTask, setVerifyModalTask] = useState(null);
  const [verificationDecision, setVerificationDecision] = useState('approve');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [submittingVerification, setSubmittingVerification] = useState(false);

  const [statusNotification, setStatusNotification] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    loadCleanups();
  }, [activeTab]);

  const loadCleanups = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await cleanupService.getCleanups(activeTab);
      setCleanups(data);
    } catch (e) {
      setErrorMessage(e.message || 'Unable to load cleanup operations.');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg) => {
    setStatusNotification(msg);
    setTimeout(() => setStatusNotification(null), 3500);
  };

  const handleInspectTask = async (task) => {
    setSelectedTask(task);
    setSliderPosition(50);
    setLoadingHistory(true);
    try {
      const history = await cleanupService.getCleanupHistory(task.id);
      setTaskHistory(history);
    } catch (e) {
      console.error('Failed to load history', e);
      setTaskHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAssignSave = async (e) => {
    e.preventDefault();
    if (!assignModalTask) return;
    setErrorMessage(null);
    try {
      await cleanupService.assignTask(
        assignModalTask.id,
        assignedTeamInput || 'Metro Rapid Response Squad A',
        scheduledDateInput || new Date().toISOString().slice(0, 10),
        assignNotesInput
      );
      showNotification(`Task ${assignModalTask.id} dispatched to ${assignedTeamInput}.`);
      setAssignModalTask(null);
      loadCleanups();
    } catch (e) {
      setErrorMessage(e.message || 'Failed to dispatch crew.');
    }
  };

  const handleStartTask = async (taskId) => {
    try {
      await cleanupService.updateTaskStatus(taskId, 'in_progress');
      showNotification(`Task ${taskId} is now in progress (squad on-site).`);
      loadCleanups();
    } catch (e) {
      setErrorMessage(e.message || 'Failed to update status.');
    }
  };

  const handleSubmitEvidence = async (e) => {
    e.preventDefault();
    if (!evidenceModalTask || !evidenceImage) {
      setErrorMessage('Please select an after-cleanup photograph.');
      return;
    }
    setUploadingEvidence(true);
    setErrorMessage(null);
    try {
      await cleanupService.submitEvidence(evidenceModalTask.id, evidenceImage, evidenceNotes);
      showNotification(`Evidence submitted for ${evidenceModalTask.id}. Awaiting municipal verification.`);
      setEvidenceModalTask(null);
      setEvidenceImage(null);
      setEvidenceNotes('');
      loadCleanups();
    } catch (e) {
      setErrorMessage(e.message || 'Failed to submit evidence.');
    } finally {
      setUploadingEvidence(false);
    }
  };

  const handleVerificationDecision = async (e) => {
    e.preventDefault();
    if (!verifyModalTask) return;
    setSubmittingVerification(true);
    setErrorMessage(null);
    try {
      await cleanupService.verifyCleanup(verifyModalTask.id, verificationDecision, verificationNotes);
      showNotification(
        verificationDecision === 'approve'
          ? `Cleanup ${verifyModalTask.id} verified and certified! Report closed.`
          : `Cleanup ${verifyModalTask.id} reopened with corrective notes.`
      );
      setVerifyModalTask(null);
      setVerificationNotes('');
      setSelectedTask(null);
      loadCleanups();
    } catch (e) {
      setErrorMessage(e.message || 'Failed to process verification decision.');
    } finally {
      setSubmittingVerification(false);
    }
  };

  const getStatusBadge = (status, vStatus) => {
    const s = vStatus || status;
    if (s === 'verified' || s === 'completed') {
      return (
        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs inline-flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-emerald-600" />
          Verified Completed
        </span>
      );
    }
    if (s === 'awaiting_verification') {
      return (
        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-300 shadow-xs inline-flex items-center gap-1 animate-pulse">
          <Clock className="w-3 h-3 text-purple-600" />
          Awaiting Verification
        </span>
      );
    }
    if (s === 'reopened' || s === 'rejected') {
      return (
        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-300 shadow-xs inline-flex items-center gap-1">
          <RotateCcw className="w-3 h-3 text-rose-600" />
          Reopened / Action Needed
        </span>
      );
    }
    if (s === 'in_progress') {
      return (
        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-300 shadow-xs inline-flex items-center gap-1">
          <Truck className="w-3 h-3 text-sky-600" />
          Squad In Progress
        </span>
      );
    }
    if (s === 'assigned') {
      return (
        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-300 shadow-xs inline-flex items-center gap-1">
          <Users className="w-3 h-3 text-indigo-600" />
          Crew Assigned
        </span>
      );
    }
    return (
      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 shadow-xs inline-flex items-center gap-1">
        <Clock className="w-3 h-3 text-amber-600" />
        Pending Dispatch
      </span>
    );
  };

  const totalTasks = cleanups.length;
  const verifiedCount = cleanups.filter((c) => c.verificationStatus === 'verified' || c.status === 'completed').length;
  const awaitingCount = cleanups.filter((c) => c.verificationStatus === 'awaiting_verification').length;
  const inProgressCount = cleanups.filter((c) => c.status === 'in_progress' || c.verificationStatus === 'in_progress').length;
  const pendingCount = cleanups.filter((c) => c.status === 'pending' && c.verificationStatus === 'pending').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#1B4332]/10">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-[#DEF5F1] text-[#092421] mb-2 border border-[#98E0D5] shadow-xs">
            <Truck className="w-3.5 h-3.5 text-[#1B4A45]" />
            <span>Remediation & Evidence Operations</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#10241B] tracking-tight">
            Cleanup Operations & Verification
          </h1>
          <p className="text-xs sm:text-sm text-[#556E55] mt-1 max-w-2xl leading-relaxed font-medium">
            Dispatch sanitation squads, verify before/after photographic evidence, and certify site remediation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadCleanups}
            className="shadow-xs rounded-full px-4 py-2 font-bold"
          >
            Refresh List
          </Button>
          <Link to="/reports">
            <Button variant="primary" size="sm" className="rounded-full px-4 py-2 font-bold shadow-md">
              Review Reports
            </Button>
          </Link>
        </div>
      </div>

      {statusNotification && (
        <div className="p-4 rounded-2xl bg-[#DEF5F1] border border-[#74D7CB] text-[#092421] text-xs font-bold flex items-center gap-2.5 shadow-soft animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-[#2D6A4F] shrink-0" />
          <span>{statusNotification}</span>
        </div>
      )}

      {errorMessage && (
        <div role="alert" className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold flex items-center gap-2.5 shadow-soft animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-[1.75rem] card-paper shadow-soft">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Pending Dispatch</span>
          <span className="text-2xl font-black text-amber-700 font-serif mt-0.5 block">{pendingCount}</span>
          <span className="text-[11px] text-amber-700 font-medium">Awaiting crew assignment</span>
        </div>
        <div className="p-5 rounded-[1.75rem] card-paper shadow-soft">
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 block">Active Squads</span>
          <span className="text-2xl font-black text-sky-700 font-serif mt-0.5 block">{inProgressCount}</span>
          <span className="text-[11px] text-sky-700 font-medium">Physical clearance ongoing</span>
        </div>
        <div className="p-5 rounded-[1.75rem] card-paper shadow-soft">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">Awaiting Review</span>
          <span className="text-2xl font-black text-purple-700 font-serif mt-0.5 block">{awaitingCount}</span>
          <span className="text-[11px] text-purple-700 font-medium">After-photos submitted</span>
        </div>
        <div className="p-5 rounded-[1.75rem] card-paper shadow-soft">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Verified Completed</span>
          <span className="text-2xl font-black text-emerald-700 font-serif mt-0.5 block">{verifiedCount}</span>
          <span className="text-[11px] text-emerald-700 font-medium">Photographically certified</span>
        </div>
      </div>

      {/* Lifecycle Status Tabs */}
      <div className="flex items-center justify-between border-b border-sage-200 overflow-x-auto pb-1">
        <div className="flex space-x-1 sm:space-x-3 shrink-0">
          {[
            { id: 'all', label: 'All Operations' },
            { id: 'pending', label: 'Pending Dispatch' },
            { id: 'in_progress', label: 'In Progress' },
            { id: 'awaiting_verification', label: 'Awaiting Verification' },
            { id: 'completed', label: 'Verified Completed' },
            { id: 'reopened', label: 'Reopened' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#74D7CB] text-[#092421] font-black'
                  : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-charcoal-400 font-mono font-bold hidden md:inline shrink-0">
          {cleanups.length} Tasks in view
        </span>
      </div>

      {/* Task Cards List */}
      {loading ? (
        <LoadingSkeleton count={3} height="h-44" />
      ) : cleanups.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No cleanup tasks found"
          description="There are currently no tasks matching this lifecycle status."
          actionLabel="Show All Tasks"
          onAction={() => setActiveTab('all')}
        />
      ) : (
        <div className="space-y-4">
          {cleanups.map((task) => {
            const isVerified = task.verificationStatus === 'verified' || task.status === 'completed';
            const isAwaiting = task.verificationStatus === 'awaiting_verification';
            const isReopened = task.verificationStatus === 'reopened';
            const isInProgress = task.status === 'in_progress' || task.verificationStatus === 'in_progress';

            return (
              <Card
                key={task.id}
                className={`p-5 sm:p-6 space-y-4 shadow-soft hover:shadow-soft-md transition-all duration-300 border ${
                  isVerified
                    ? 'border-l-4 border-l-emerald-500'
                    : isAwaiting
                    ? 'border-l-4 border-l-purple-500 ring-1 ring-purple-200'
                    : isReopened
                    ? 'border-l-4 border-l-rose-500'
                    : isInProgress
                    ? 'border-l-4 border-l-sky-500'
                    : 'border-l-4 border-l-amber-500'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-sage-100 text-charcoal-700">
                        {task.id}
                      </span>
                      <span className="text-xs text-charcoal-300">•</span>
                      <Link
                        to={`/reports?search=${encodeURIComponent(task.reportId)}`}
                        className="font-mono text-xs text-forest-700 font-bold hover:underline"
                      >
                        Incident Ref: {task.reportId}
                      </Link>
                      <span className="text-xs text-charcoal-300">•</span>
                      {getStatusBadge(task.status, task.verificationStatus)}
                    </div>

                    <h3 className="font-extrabold text-base text-charcoal-900 truncate">{task.taskName}</h3>

                    <div className="flex items-center gap-1.5 text-xs text-charcoal-500">
                      <MapPin className="w-3.5 h-3.5 text-forest-700 shrink-0" />
                      <span className="font-medium truncate">{task.location}</span>
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleInspectTask(task)}
                      className="shadow-xs font-bold inline-flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{task.afterImageUrl ? 'Compare Before & After' : 'Inspect Details'}</span>
                    </Button>

                    {!isVerified && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setAssignModalTask(task);
                          setAssignedTeamInput(task.assignedTeam || '');
                          setScheduledDateInput(task.scheduledDate?.slice(0, 10) || '');
                          setAssignNotesInput('');
                        }}
                        className="font-semibold"
                      >
                        {task.assignedTeam && task.assignedTeam !== 'Unassigned' ? 'Reassign' : 'Assign Crew'}
                      </Button>
                    )}

                    {!isVerified && !isInProgress && !isAwaiting && (
                      <Button
                        variant="pista"
                        size="sm"
                        onClick={() => handleStartTask(task.id)}
                        className="font-bold shadow-xs"
                      >
                        Start Task
                      </Button>
                    )}

                    {!isVerified && (isInProgress || isReopened) && (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={Camera}
                        glow
                        onClick={() => {
                          setEvidenceModalTask(task);
                          setEvidenceImage(null);
                          setEvidenceNotes('');
                        }}
                        className="font-bold"
                      >
                        Upload After-Evidence
                      </Button>
                    )}

                    {isAwaiting && (
                      <Button
                        variant="pista"
                        size="sm"
                        icon={ShieldCheck}
                        glow
                        onClick={() => {
                          setVerifyModalTask(task);
                          setVerificationDecision('approve');
                          setVerificationNotes('');
                        }}
                        className="font-black"
                      >
                        Verify & Certify
                      </Button>
                    )}
                  </div>
                </div>

                {/* Details Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-[#F4F7F2] border border-[#1B4332]/10 text-xs">
                  <div>
                    <span className="text-[10px] text-charcoal-400 font-bold uppercase tracking-wider block">Assigned Crew</span>
                    <span className="font-bold text-charcoal-900 truncate block mt-0.5">
                      {task.assignedTeam || 'Unassigned'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-charcoal-400 font-bold uppercase tracking-wider block">Target Execution</span>
                    <span className="font-bold text-charcoal-800 font-mono block mt-0.5">
                      {formatDate(task.scheduledDate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-charcoal-400 font-bold uppercase tracking-wider block">Evidence Status</span>
                    <span className="font-bold text-charcoal-800 block mt-0.5">
                      {task.afterImageUrl ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Photo Captured
                        </span>
                      ) : (
                        <span className="text-amber-700 font-semibold">Pending Evidence</span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-charcoal-400 font-bold uppercase tracking-wider block">Est. Volume / Mass</span>
                    <span className="font-extrabold text-forest-800 font-mono block mt-0.5">
                      {task.wasteVolumeEstimate || '~4 kg'}
                    </span>
                  </div>
                </div>

                {/* Evidence uploaded by badge */}
                {task.afterImageUploadedAt && (
                  <div className="text-[11px] text-charcoal-500 flex items-center gap-2 pt-1 font-mono">
                    <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Evidence uploaded by {task.afterImageUploadedBy || 'Sanitation Team'} on {formatDate(task.afterImageUploadedAt)}</span>
                  </div>
                )}

                {/* Verification notes if reopened */}
                {isReopened && task.verificationNotes && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1">
                    <span className="font-bold flex items-center gap-1.5 text-rose-800">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      Supervisor Rejection Note:
                    </span>
                    <p className="text-[11px] text-rose-800 leading-relaxed font-medium">
                      {task.verificationNotes}
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Detailed Inspection & Split Slider Modal */}
      <Modal
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        title={selectedTask ? `Verification Audit: ${selectedTask.taskName}` : 'Task Details'}
        maxWidth="max-w-4xl"
      >
        {selectedTask && (
          <div className="space-y-6 font-sans">
            {/* Split Comparison View */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-charcoal-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-forest-700" />
                  Photographic Evidence Audit (Before vs. After)
                </span>
                {getStatusBadge(selectedTask.status, selectedTask.verificationStatus)}
              </div>

              {/* Side-by-Side Images */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Before Photo */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-rose-800 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                      BEFORE: Public Incident Evidence
                    </span>
                    <span className="text-[11px] text-charcoal-400 font-mono">Original Citizen Capture</span>
                  </div>
                  <div className="h-64 rounded-2xl overflow-hidden bg-slate-100 border-2 border-rose-200 shadow-soft relative group">
                    {selectedTask.beforeImageUrl ? (
                      <img
                        src={selectedTask.beforeImageUrl}
                        alt="Before Cleanup"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-charcoal-400">
                        No before photo recorded
                      </div>
                    )}
                  </div>
                </div>

                {/* After Photo */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-forest-800 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-forest-600" />
                      AFTER: Municipal Clearance Evidence
                    </span>
                    <span className="text-[11px] text-charcoal-400 font-mono">
                      {selectedTask.afterImageUploadedAt
                        ? formatDate(selectedTask.afterImageUploadedAt)
                        : 'Awaiting resolution'}
                    </span>
                  </div>
                  <div className="h-64 rounded-2xl overflow-hidden bg-slate-100 border-2 border-forest-200 shadow-soft relative group">
                    {selectedTask.afterImageUrl ? (
                      <img
                        src={selectedTask.afterImageUrl}
                        alt="After Cleanup Evidence"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-xs text-charcoal-400 p-6 text-center space-y-3 bg-slate-50">
                        <Camera className="w-8 h-8 text-charcoal-300" />
                        <div>
                          <p className="font-bold text-charcoal-800">No After-Cleanup Photo Submitted</p>
                          <p className="text-[11px] text-charcoal-500 mt-0.5">
                            Sanitation squads must photograph the restored site before verification.
                          </p>
                        </div>
                        <Button
                          variant="primary"
                          size="xs"
                          icon={Camera}
                          onClick={() => {
                            setEvidenceModalTask(selectedTask);
                            setEvidenceImage(null);
                            setEvidenceNotes('');
                          }}
                          className="rounded-full font-bold"
                        >
                          Upload Proof Now
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Evidence Metadata & Crew Notes */}
            <div className="p-4 rounded-2xl bg-[#F4F7F2] border border-[#1B4332]/10 space-y-2 text-xs">
              <span className="font-bold text-charcoal-900 block">Remediation Metadata & Field Log:</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
                <div>
                  <span className="text-charcoal-400 block font-semibold">Assigned Squad:</span>
                  <span className="font-bold text-charcoal-800">{selectedTask.assignedTeam}</span>
                </div>
                <div>
                  <span className="text-charcoal-400 block font-semibold">Evidence Uploader:</span>
                  <span className="font-bold text-charcoal-800">{selectedTask.afterImageUploadedBy || 'Pending'}</span>
                </div>
                <div>
                  <span className="text-charcoal-400 block font-semibold">Upload Timestamp:</span>
                  <span className="font-mono text-charcoal-800">
                    {selectedTask.afterImageUploadedAt ? formatDate(selectedTask.afterImageUploadedAt) : 'N/A'}
                  </span>
                </div>
              </div>
              {selectedTask.completionNotes && (
                <div className="pt-2 border-t border-[#1B4332]/10">
                  <span className="text-charcoal-500 font-semibold block text-[11px]">Field Notes:</span>
                  <p className="text-charcoal-700 leading-relaxed font-medium mt-0.5">{selectedTask.completionNotes}</p>
                </div>
              )}
            </div>

            {/* Administrator Action Decision Bar (if evidence exists & not yet verified) */}
            {selectedTask.afterImageUrl && selectedTask.verificationStatus !== 'verified' && (
              <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div>
                  <span className="font-extrabold text-purple-900 block">Administrator Verification Review</span>
                  <span className="text-purple-700 text-[11px]">
                    Certify whether this clearance meets municipal sanitation standards.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setVerifyModalTask(selectedTask);
                      setVerificationDecision('reject');
                      setVerificationNotes('');
                    }}
                    className="border-rose-300 text-rose-800 hover:bg-rose-100 font-bold"
                  >
                    Reject & Reopen
                  </Button>
                  <Button
                    variant="pista"
                    size="sm"
                    icon={ShieldCheck}
                    glow
                    onClick={() => {
                      setVerifyModalTask(selectedTask);
                      setVerificationDecision('approve');
                      setVerificationNotes('');
                    }}
                    className="font-black shadow-md"
                  >
                    Certify Completed
                  </Button>
                </div>
              </div>
            )}

            {/* Chronological Audit Timeline */}
            <div className="space-y-3">
              <span className="font-bold text-charcoal-800 text-xs flex items-center gap-1.5">
                <History className="w-4 h-4 text-forest-700" />
                Lifecycle Audit Timeline
              </span>
              {loadingHistory ? (
                <div className="text-xs text-charcoal-400 animate-pulse">Loading audit trail...</div>
              ) : taskHistory.length === 0 ? (
                <div className="text-xs text-charcoal-400 p-3 bg-slate-50 rounded-xl">No historical transitions recorded yet.</div>
              ) : (
                <div className="divide-y divide-slate-100 border rounded-2xl overflow-hidden bg-white text-xs">
                  {taskHistory.map((item, idx) => (
                    <div key={item.id || idx} className="p-3 flex items-start justify-between gap-3 hover:bg-slate-50 transition-colors">
                      <div className="space-y-0.5">
                        <span className="font-mono font-bold text-forest-800 block text-xs">
                          {item.action.replace('cleanup.', '').replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-[11px] text-charcoal-500">
                          Actor: <strong className="text-charcoal-700">{item.actorName}</strong> ({item.actorRole})
                        </span>
                        {item.details?.notes && (
                          <p className="text-[11px] text-charcoal-600 italic mt-0.5">&ldquo;{item.details.notes}&rdquo;</p>
                        )}
                      </div>
                      <span className="text-[10px] text-charcoal-400 font-mono shrink-0">
                        {formatDate(item.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-sage-200">
              <Button variant="outline" size="sm" onClick={() => setSelectedTask(null)} className="rounded-full">
                Close Audit View
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reassign / Dispatch Modal */}
      <Modal
        isOpen={!!assignModalTask}
        onClose={() => setAssignModalTask(null)}
        title="Assign Cleanup Crew & Schedule"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAssignSave} className="space-y-4 text-xs font-sans">
          <div>
            <label className="block font-bold text-charcoal-800 mb-1">
              Sanitation Crew / Squad *
            </label>
            <select
              value={assignedTeamInput}
              onChange={(e) => setAssignedTeamInput(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-sage-300 focus:outline-none focus:ring-2 focus:ring-[#74D7CB] bg-white font-semibold"
            >
              <option value="Metro Rapid Response Squad A">Metro Rapid Response Squad A</option>
              <option value="Urban Estuary Cleanup Crew">Urban Estuary Cleanup Crew</option>
              <option value="Parks & Recreation Team 3">Parks & Recreation Team 3</option>
              <option value="District 5 Municipal Sanitation">District 5 Municipal Sanitation</option>
              <option value="HazMat Certified Disposal Services">HazMat Certified Disposal Services</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-charcoal-800 mb-1">
              Target Execution Date *
            </label>
            <input
              type="date"
              required
              value={scheduledDateInput}
              onChange={(e) => setScheduledDateInput(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-sage-300 focus:outline-none focus:ring-2 focus:ring-[#74D7CB] bg-white font-mono font-semibold"
            />
          </div>

          <div>
            <label className="block font-bold text-charcoal-800 mb-1">
              Operational Instructions (Optional)
            </label>
            <textarea
              rows="2"
              placeholder="e.g. Bring extra industrial sacks and hazardous waste bin"
              value={assignNotesInput}
              onChange={(e) => setAssignNotesInput(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-sage-300 focus:outline-none focus:ring-2 focus:ring-[#74D7CB] bg-white outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-sage-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAssignModalTask(null)}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" glow className="rounded-full font-bold">
              Dispatch Crew
            </Button>
          </div>
        </form>
      </Modal>

      {/* Submit After-Evidence Modal */}
      <Modal
        isOpen={!!evidenceModalTask}
        onClose={() => setEvidenceModalTask(null)}
        title="Submit Restored Site Evidence"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmitEvidence} className="space-y-4 text-xs font-sans">
          <div className="p-3 bg-[#DEF5F1] rounded-xl border border-[#98E0D5] text-[#092421] space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-[#1B4A45]" />
              Photographic Evidence Requirements
            </p>
            <p className="text-[11px] text-[#242D2B] leading-relaxed">
              Upload a clear photograph of the restored location. Submitting evidence sets the task to <strong>Awaiting Verification</strong> for supervisor review.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block font-bold text-charcoal-800">After-Cleanup Photograph *</label>
            <div className="border-2 border-dashed border-[#1B4332]/20 rounded-2xl p-4 text-center hover:border-[#74D7CB] transition-colors bg-white">
              {evidenceImage ? (
                <div className="space-y-2">
                  <img src={evidenceImage} alt="Preview" className="h-44 mx-auto rounded-xl object-cover" />
                  <button
                    type="button"
                    onClick={() => setEvidenceImage(null)}
                    className="text-xs text-rose-600 font-bold hover:underline"
                  >
                    Remove & Retake
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center justify-center p-4">
                  <UploadCloud className="w-8 h-8 text-[#2D6A4F] mb-1" />
                  <span className="font-bold text-charcoal-800">Click to upload photo</span>
                  <span className="text-[11px] text-charcoal-400">JPG, PNG, WebP up to 8MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    required
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const { dataUrl } = await compressImageFile(file, 1400, 1400, 0.75);
                        setEvidenceImage(dataUrl);
                      } catch (err) {
                        setErrorMessage('Failed to read image file.');
                      }
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            <label className="block font-bold text-charcoal-800 mb-1">Field Completion Notes</label>
            <textarea
              rows="2"
              placeholder="e.g. 5 bags of plastic collected, drain unblocked, area disinfected"
              value={evidenceNotes}
              onChange={(e) => setEvidenceNotes(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-sage-300 focus:outline-none focus:ring-2 focus:ring-[#74D7CB] bg-white outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-sage-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEvidenceModalTask(null)}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="pista"
              size="sm"
              loading={uploadingEvidence}
              className="rounded-full font-black shadow-md"
            >
              Submit for Verification
            </Button>
          </div>
        </form>
      </Modal>

      {/* Administrator Verification Modal */}
      <Modal
        isOpen={!!verifyModalTask}
        onClose={() => setVerifyModalTask(null)}
        title="Certify Remediation Verification"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleVerificationDecision} className="space-y-4 text-xs font-sans">
          <div className="space-y-2">
            <label className="block font-bold text-charcoal-800">Verification Decision *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVerificationDecision('approve')}
                className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  verificationDecision === 'approve'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-900 ring-2 ring-emerald-300'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Approve & Certify
              </button>
              <button
                type="button"
                onClick={() => setVerificationDecision('reject')}
                className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  verificationDecision === 'reject'
                    ? 'bg-rose-50 border-rose-400 text-rose-900 ring-2 ring-rose-300'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <XCircle className="w-4 h-4 text-rose-600" />
                Reject & Reopen
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-charcoal-800 mb-1">
              Supervisor Verification Notes {verificationDecision === 'reject' ? '*' : '(Optional)'}
            </label>
            <textarea
              rows="3"
              required={verificationDecision === 'reject'}
              placeholder={
                verificationDecision === 'approve'
                  ? 'e.g. Site inspected, full clearance verified against before photo.'
                  : 'Specify why the evidence was rejected (e.g. residual waste remains in the canal bed).'
              }
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-sage-300 focus:outline-none focus:ring-2 focus:ring-[#74D7CB] bg-white outline-none resize-none font-medium"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-sage-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setVerifyModalTask(null)}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={verificationDecision === 'approve' ? 'pista' : 'danger'}
              size="sm"
              loading={submittingVerification}
              className="rounded-full font-black shadow-md"
            >
              {verificationDecision === 'approve' ? 'Certify Cleanup' : 'Reopen Work Order'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
