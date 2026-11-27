import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle,
  Clock,
  AlertTriangle,
  Flame,
  ArrowRight,
  BarChart3,
  TrendingUp,
  RefreshCw,
  MapPin,
  Activity,
  Sparkles,
  Trash2,
  Download,
  Filter,
  Info,
  Layers,
  X,
  FileCheck2,
  Calendar,
  Compass,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardBody } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { StatWidget } from '../components/common/StatWidget';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { DetectionOverlay } from '../components/reporting/DetectionOverlay';
import { analyticsService } from '../services/analyticsService';
import { reportService } from '../services/reportService';
import { hotspotService } from '../services/hotspotService';
import { cleanupService } from '../services/cleanupService';
import { getSeverityBadgeProps, getStatusBadgeProps, getCategoryLabel } from '../utils/formatters';
import { formatDate } from '../utils/dateUtils';

export function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [trends, setTrends] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cleanupTrends, setCleanupTrends] = useState([]);
  const [hotspotDist, setHotspotDist] = useState({ totalHotspots: 0, priorityDistribution: [], wardDistribution: [] });
  const [wardStats, setWardStats] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [showDefinitionsModal, setShowDefinitionsModal] = useState(false);
  const [selectedReportForInspection, setSelectedReportForInspection] = useState(null);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [deletingReport, setDeletingReport] = useState(false);

  // Filters State
  const [timeRange, setTimeRange] = useState('all'); // 'all' | '7d' | '30d' | '90d' | '180d' | '1y'
  const [wardFilter, setWardFilter] = useState('all');

  useEffect(() => {
    loadAllData();
  }, [timeRange, wardFilter]);

  const loadAllData = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const filters = {
        timeRange: timeRange !== 'all' ? timeRange : null,
        wardId: wardFilter !== 'all' ? wardFilter : null,
      };

      const [m, t, c, ct, hd, ws, r, h] = await Promise.all([
        analyticsService.getDashboardMetrics(filters),
        analyticsService.getPollutionTrends(filters),
        analyticsService.getCategoryBreakdown(filters),
        analyticsService.getCleanupTrends(filters),
        analyticsService.getHotspotDistribution(filters),
        analyticsService.getWardStats(filters),
        reportService.getAllReports(),
        hotspotService.getHotspots({ sortBy: 'priority' }),
      ]);

      setMetrics(m);
      setTrends(t);
      setCategories(c);
      setCleanupTrends(ct);
      setHotspotDist(hd);
      setWardStats(ws);
      setRecentReports(r);
      setHotspots(h);
    } catch (e) {
      console.error('Failed to load dashboard analytics:', e);
      setActionError(e.message || 'Unable to retrieve database analytics.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setTimeRange('all');
    setWardFilter('all');
  };

  const handleVerify = async (reportId) => {
    setActionError(null);
    try {
      await reportService.updateReportStatus(reportId, 'verified');
      setActionSuccess(`Report ${reportId} marked as Verified in database.`);
      loadAllData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (e) {
      setActionError(e.message || 'Failed to verify report.');
      setTimeout(() => setActionError(null), 5000);
    }
  };

  const handleScheduleCleanup = async (reportId) => {
    setActionError(null);
    try {
      const updated = await reportService.updateReportStatus(reportId, 'scheduled');
      await cleanupService.createTaskFromReport(updated);
      setActionSuccess(`Report ${reportId} dispatched for scheduled sanitation.`);
      loadAllData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (e) {
      setActionError(e.message || 'Failed to dispatch cleanup.');
      setTimeout(() => setActionError(null), 5000);
    }
  };

  const handleDeleteReport = (reportId) => {
    setReportToDelete(reportId);
  };

  const confirmDeleteReport = async () => {
    if (!reportToDelete) return;
    setActionError(null);
    setDeletingReport(true);
    try {
      await reportService.deleteReport(reportToDelete);
      setActionSuccess(`Report ${reportToDelete} deleted successfully.`);
      if (selectedReportForInspection?.id === reportToDelete) {
        setSelectedReportForInspection(null);
      }
      setReportToDelete(null);
      loadAllData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (e) {
      setActionError(e.message || 'Failed to delete report.');
      setTimeout(() => setActionError(null), 5000);
    } finally {
      setDeletingReport(false);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    setActionError(null);
    try {
      const csvText = await reportService.exportReportsCsv();
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `vasundhara_reports_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setActionSuccess('Reports exported to CSV successfully.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (e) {
      setActionError(e.message || 'Failed to export reports to CSV.');
      setTimeout(() => setActionError(null), 5000);
    } finally {
      setExporting(false);
    }
  };

  // Distinct wards for the filter picker
  const availableWards = Array.from(new Set(wardStats.map((w) => w.wardId).filter(Boolean)));

  const totalReportsCount = metrics?.totalReports || 0;
  const hasTrendsData = trends.some((t) => t.reports > 0 || t.resolved > 0);
  const hasCleanupTrendsData = cleanupTrends.some((c) => c.tasksCreated > 0 || c.tasksVerified > 0);
  const hasHotspotData = (hotspotDist?.priorityDistribution || []).some((b) => b.count > 0);
  const hasWardData = wardStats.length > 0 && wardStats.some((w) => w.totalReports > 0 || w.hotspotsCount > 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#1B4332]/10">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-[#DEF5F1] text-[#092421] mb-2 border border-[#98E0D5] shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-[#1B4A45]" />
            <span>Database-Driven Municipal Command</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#10241B] tracking-tight">
            Municipal Analytics & Operations
          </h1>
          <p className="text-xs sm:text-sm text-[#556E55] mt-1 max-w-2xl font-medium leading-relaxed">
            Real-time civic intelligence aggregated directly from verified PostgreSQL / SQLite database records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            icon={Info}
            onClick={() => setShowDefinitionsModal(true)}
            className="rounded-full px-3 py-1.5 text-xs font-bold text-[#1B4A45] hover:bg-[#DEF5F1]"
          >
            Metric Definitions
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={handleExportCsv}
            disabled={exporting}
            className="shadow-xs font-bold rounded-full px-4 py-2"
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={loadAllData}
            className="shadow-xs font-bold rounded-full px-4 py-2"
          >
            Refresh
          </Button>
          <Link to="/hotspots">
            <Button variant="pista" size="sm" icon={Flame} glow className="shadow-lg font-black rounded-full px-4 py-2">
              Hotspots Hub
            </Button>
          </Link>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-forest-50 border border-forest-200 text-forest-900 text-xs font-bold flex items-center gap-2.5 shadow-soft animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-forest-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div role="alert" className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold flex items-center gap-2.5 shadow-soft animate-fadeIn">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Database Filters Bar */}
      <div className="card-paper p-4 rounded-2xl border border-[#1B4332]/15 shadow-soft flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-[#10241B]">
          <Filter className="w-4 h-4 text-[#2D6A4F]" />
          <span>Analytics Time & Spatial Filter:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Time Range Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-charcoal-500">Window:</span>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[#1B4332]/20 bg-white text-xs font-semibold text-charcoal-900 outline-none focus:ring-1 focus:ring-[#74D7CB]"
            >
              <option value="all">All Time</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="180d">Last 180 Days</option>
              <option value="1y">Last 1 Year</option>
            </select>
          </div>

          {/* Ward Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-charcoal-500">Ward:</span>
            <select
              value={wardFilter}
              onChange={(e) => setWardFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[#1B4332]/20 bg-white text-xs font-semibold text-charcoal-900 outline-none focus:ring-1 focus:ring-[#74D7CB]"
            >
              <option value="all">All Wards</option>
              {availableWards.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>

          {(timeRange !== 'all' || wardFilter !== 'all') && (
            <Button
              variant="ghost"
              size="xs"
              onClick={handleResetFilters}
              className="text-[11px] font-bold text-forest-700 hover:text-forest-900 underline"
            >
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Primary KPI Grid (All Genuine Database Values) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatWidget
          title="Total Reports"
          value={metrics?.totalReports ?? 0}
          subtext="Actual citizen submissions"
          icon={BarChart3}
          colorScheme="forest"
        />
        <StatWidget
          title="Verified Incidents"
          value={metrics?.verifiedReports ?? 0}
          subtext="Officer validated evidence"
          icon={ShieldCheck}
          colorScheme="blue"
        />
        <StatWidget
          title="Pending Review"
          value={metrics?.pendingReports ?? 0}
          subtext="Awaiting verification"
          icon={Clock}
          colorScheme="amber"
        />
        <StatWidget
          title="Rejected / Invalid"
          value={metrics?.rejectedReports ?? 0}
          subtext="Dismissed false reports"
          icon={AlertCircle}
          colorScheme="rose"
        />
      </div>

      {/* Operational Performance KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatWidget
          title="Active Hotspots"
          value={metrics?.activeHotspots ?? 0}
          subtext={`${metrics?.highPriorityHotspots ?? 0} high-priority clusters`}
          icon={Flame}
          colorScheme="rose"
        />
        <StatWidget
          title="Cleanup Tasks"
          value={metrics?.cleanupTasks ?? 0}
          subtext={`${metrics?.verifiedCleanups ?? 0} verified • ${metrics?.completedCleanups ?? 0} completed`}
          icon={CheckCircle}
          colorScheme="forest"
        />
        <StatWidget
          title="Avg Verification Time"
          value={metrics?.averageVerificationTimeHours != null ? `${metrics.averageVerificationTimeHours}h` : 'N/A'}
          subtext="Elapsed intake to audit"
          icon={Activity}
          colorScheme="purple"
        />
        <StatWidget
          title="Avg Remediation Time"
          value={metrics?.averageCleanupCompletionTimeHours != null ? `${metrics.averageCleanupCompletionTimeHours}h` : 'N/A'}
          subtext="Dispatch to certified site"
          icon={Sparkles}
          colorScheme="teal"
        />
      </div>

      {/* 5 Recharts Visualizations Grid */}
      <div className="space-y-8">
        {/* Row 1: Monthly Reporting Trends & Waste Material Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Chart 1: Monthly Incidence & Resolution Trends */}
          <div className="lg:col-span-8">
            <Card className="border-sage-200/90 shadow-soft">
              <CardHeader
                title="Incidence & Resolution Trends"
                subtitle="6-Month historical reports logged vs verified cleanups"
                icon={Activity}
              />
              <CardBody>
                {loading ? (
                  <LoadingSkeleton count={1} height="h-72" />
                ) : !hasTrendsData ? (
                  <div className="h-72 flex items-center justify-center">
                    <EmptyState
                      icon={BarChart3}
                      title="No Reporting Trends Data"
                      description="No citizen reports or cleanups recorded for the selected filter period."
                    />
                  </div>
                ) : (
                  <>
                    <div className="h-80 w-full pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#092421" stopOpacity={0.85} />
                              <stop offset="95%" stopColor="#092421" stopOpacity={0.05} />
                            </linearGradient>
                            <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#74D7CB" stopOpacity={0.85} />
                              <stop offset="95%" stopColor="#74D7CB" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2EAE0" />
                          <XAxis dataKey="monthShort" tick={{ fontSize: 11, fill: '#597057', fontWeight: 600 }} />
                          <YAxis tick={{ fontSize: 11, fill: '#597057', fontWeight: 600 }} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#FFFFFF',
                              borderColor: 'rgba(27, 67, 50, 0.15)',
                              borderRadius: '0.75rem',
                              fontSize: '12px',
                              boxShadow: '0 10px 25px -5px rgba(9,36,33,0.1)',
                              fontWeight: 600,
                              color: '#092421',
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="reports"
                            name="Reports Logged"
                            stroke="#092421"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#colorReports)"
                          />
                          <Area
                            type="monotone"
                            dataKey="resolved"
                            name="Cleaned Sites"
                            stroke="#74D7CB"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#colorResolved)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t border-[#1B4332]/10 text-xs font-bold text-darkgreen-950">
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded bg-[#092421] shadow-xs" />
                        <span>Public Litter Reports Logged</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded bg-[#74D7CB] shadow-xs" />
                        <span>Verified Cleanups Completed</span>
                      </div>
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Chart 2: Waste Material Composition */}
          <div className="lg:col-span-4">
            <Card className="border-sage-200/90 shadow-soft">
              <CardHeader
                title="Material Composition"
                subtitle="Dominant waste types detected"
                icon={BarChart3}
              />
              <CardBody>
                {loading ? (
                  <LoadingSkeleton count={1} height="h-72" />
                ) : categories.length === 0 ? (
                  <div className="h-72 flex items-center justify-center">
                    <EmptyState
                      icon={Layers}
                      title="No Material Breakdown"
                      description="No classified waste categories found in current dataset."
                    />
                  </div>
                ) : (
                  <>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categories}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {categories.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(val, name, item) => [`${val}% (${item.payload.count} reports)`, 'Share']}
                            contentStyle={{
                              backgroundColor: '#FFFFFF',
                              borderColor: '#CBDBC9',
                              borderRadius: '0.75rem',
                              fontSize: '12px',
                              boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                              fontWeight: 600,
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-sage-100 text-[11px]">
                      {categories.map((c) => (
                        <div key={c.name} className="flex items-center gap-1.5 font-medium">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: c.color }} />
                          <span className="truncate text-charcoal-600">{c.name}:</span>
                          <span className="font-extrabold text-charcoal-900 font-mono">{c.value}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          </div>
        </div>

        {/* Row 2: Cleanup Completion Trends & Hotspot Priority Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Chart 3: Cleanup Completion Trends */}
          <div className="lg:col-span-6">
            <Card className="border-sage-200/90 shadow-soft">
              <CardHeader
                title="Cleanup Remediation Trends"
                subtitle="Tasks dispatched vs certified verified completions"
                icon={FileCheck2}
              />
              <CardBody>
                {loading ? (
                  <LoadingSkeleton count={1} height="h-64" />
                ) : !hasCleanupTrendsData ? (
                  <div className="h-64 flex items-center justify-center">
                    <EmptyState
                      icon={CheckCircle}
                      title="No Cleanup Operations Trends"
                      description="No squad tasks dispatched or verified in this window."
                    />
                  </div>
                ) : (
                  <div className="h-72 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cleanupTrends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2EAE0" />
                        <XAxis dataKey="monthShort" tick={{ fontSize: 11, fill: '#597057', fontWeight: 600 }} />
                        <YAxis tick={{ fontSize: 11, fill: '#597057', fontWeight: 600 }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            borderColor: '#CBDBC9',
                            borderRadius: '0.75rem',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                        <Bar dataKey="tasksCreated" name="Tasks Dispatched" fill="#092421" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="tasksVerified" name="Certified Completed" fill="#2D6A4F" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="awaitingVerification" name="Awaiting Inspection" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Chart 4: Hotspot Priority Band Distribution */}
          <div className="lg:col-span-6">
            <Card className="border-sage-200/90 shadow-soft">
              <CardHeader
                title="Hotspot Priority Distribution"
                subtitle="Active clusters grouped by transparent priority bands"
                icon={Flame}
              />
              <CardBody>
                {loading ? (
                  <LoadingSkeleton count={1} height="h-64" />
                ) : !hasHotspotData ? (
                  <div className="h-64 flex items-center justify-center">
                    <EmptyState
                      icon={Flame}
                      title="No Active Hotspots"
                      description="No geographic clusters meet clustering criteria in this area."
                    />
                  </div>
                ) : (
                  <div className="h-72 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hotspotDist.priorityDistribution} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2EAE0" />
                        <XAxis dataKey="shortRange" tick={{ fontSize: 11, fill: '#597057', fontWeight: 600 }} />
                        <YAxis tick={{ fontSize: 11, fill: '#597057', fontWeight: 600 }} allowDecimals={false} />
                        <Tooltip
                          formatter={(val, name, item) => [`${val} clusters`, item.payload.range]}
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            borderColor: '#CBDBC9',
                            borderRadius: '0.75rem',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        />
                        <Bar dataKey="count" name="Hotspot Clusters" radius={[4, 4, 0, 0]}>
                          {(hotspotDist.priorityDistribution || []).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>

        {/* Row 3: Chart 5: Ward-Wise Comparative Analysis */}
        <Card className="border-sage-200/90 shadow-soft">
          <CardHeader
            title="Ward-Wise Comparative Analysis"
            subtitle="Municipal reports logged, cleaned sites, and active hotspots by ward"
            icon={MapPin}
          />
          <CardBody>
            {loading ? (
              <LoadingSkeleton count={1} height="h-64" />
            ) : !hasWardData ? (
              <div className="h-64 flex items-center justify-center">
                <EmptyState
                  icon={MapPin}
                  title="No Ward Analytics Available"
                  description="Reports and hotspots have not yet been assigned to specific municipal wards."
                />
              </div>
            ) : (
              <div className="h-80 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={wardStats} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2EAE0" />
                    <XAxis dataKey="wardId" tick={{ fontSize: 11, fill: '#597057', fontWeight: 600 }} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11, fill: '#597057', fontWeight: 600 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#CBDBC9',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                    <Bar dataKey="totalReports" name="Total Reports" fill="#092421" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cleanedReports" name="Cleaned Sites" fill="#2D6A4F" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="hotspotsCount" name="Active Hotspots" fill="#E11D48" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Two Column Section: Recent Reports for Action & Hotspot Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Reports Action Table */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-charcoal-900">Incident Action Queue</h2>
            <Link to="/map" className="text-xs text-forest-800 hover:text-forest-950 font-bold flex items-center gap-1">
              Inspect on GIS map <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <Card className="border-[#1B4332]/10 shadow-soft overflow-hidden">
            {recentReports.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={CheckCircle}
                  title="No Incident Reports"
                  description="All citizen submissions have been addressed or no incidents are logged."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F4F7F2] text-[#10241B] font-bold border-b border-[#1B4332]/10">
                    <tr>
                      <th className="py-3.5 px-4">Incident</th>
                      <th className="py-3.5 px-4">Severity</th>
                      <th className="py-3.5 px-4">Material</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1B4332]/10">
                    {recentReports.slice(0, 5).map((r) => {
                      const sevProps = getSeverityBadgeProps(r.severity);
                      const statProps = getStatusBadgeProps(r.status);

                      return (
                        <tr key={r.id} className="hover:bg-[#F4F7F2] transition-colors cursor-pointer" onClick={() => setSelectedReportForInspection(r)}>
                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-charcoal-900 hover:text-forest-800 transition-colors">{r.title}</div>
                            <div className="text-[11px] text-charcoal-500 truncate max-w-xs">{r.address}</div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${sevProps.bg}`}>
                              {sevProps.label}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-charcoal-800 font-semibold whitespace-nowrap">
                            {getCategoryLabel(r.category)}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${statProps.bg}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statProps.dot}`} />
                              {statProps.label}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="xs"
                              className="font-bold py-1 px-2 text-[#092421]"
                              onClick={() => setSelectedReportForInspection(r)}
                            >
                              Inspect
                            </Button>
                            {r.status === 'pending' && (
                              <Button
                                variant="outline"
                                size="xs"
                                className="font-bold py-1 px-2.5"
                                onClick={() => handleVerify(r.id)}
                              >
                                Verify
                              </Button>
                            )}
                            {r.status !== 'cleaned' && r.status !== 'scheduled' && (
                              <Button
                                variant="primary"
                                size="xs"
                                className="font-bold py-1 px-2.5"
                                onClick={() => handleScheduleCleanup(r.id)}
                              >
                                Schedule
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="xs"
                              className="font-bold py-1 px-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                              onClick={() => handleDeleteReport(r.id)}
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right: Hotspots Summary Card */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-charcoal-900">Priority Hotspots</h2>
            <Link to="/hotspots" className="text-xs text-forest-800 hover:text-forest-950 font-bold flex items-center gap-1">
              Full List <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {hotspots.length === 0 ? (
              <Card className="p-6 text-center border-sage-200">
                <EmptyState
                  icon={Flame}
                  title="No Hotspots"
                  description="No spatial clusters meeting priority criteria."
                />
              </Card>
            ) : (
              hotspots.slice(0, 3).map((hotspot) => (
                <Card key={hotspot.id} className="p-4 border-l-4 border-l-rose-500 shadow-soft hover:shadow-soft-md transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-extrabold text-xs text-charcoal-900">{hotspot.name}</h4>
                      <p className="text-[11px] text-charcoal-500 font-medium">{hotspot.district || hotspot.ward || 'Municipal Area'}</p>
                    </div>
                    <span className="text-xs font-mono font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                      {hotspot.priorityScore}/100
                    </span>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-sage-100 flex items-center justify-between text-[11px] text-charcoal-600 font-medium">
                    <span>Recurrence: <b className="font-mono text-charcoal-900">{hotspot.recurrenceCount} reports</b></span>
                    <span className="text-rose-700 font-bold">{hotspot.severity ? hotspot.severity.toUpperCase() : 'HIGH'}</span>
                  </div>
                </Card>
              ))
            )}
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#092421] to-[#051412] text-pista-100 space-y-2 border border-[#27403C] shadow-soft">
            <h4 className="font-bold text-xs text-[#74D7CB] flex items-center gap-1.5 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-[#74D7CB]" />
              DATABASE AUDIT & ZERO FABRICATION
            </h4>
            <p className="text-[11px] text-pista-200/90 leading-relaxed font-medium">
              Every count, percentage, and chart point above is computed directly from raw PostgreSQL / SQLite tables without hardcoded mock fallbacks.
            </p>
          </div>
        </div>
      </div>

      {/* Metric Definitions Modal */}
      {showDefinitionsModal && (
        <Modal
          isOpen={showDefinitionsModal}
          onClose={() => setShowDefinitionsModal(false)}
          title="Municipal Metric Definitions & Methodologies"
        >
          <div className="space-y-4 text-xs text-charcoal-800 font-sans">
            <div className="p-3 bg-sage-50 rounded-xl border border-sage-200">
              <h4 className="font-bold text-charcoal-900 mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-forest-700" />
                Verified vs. Pending vs. Cleaned Reports
              </h4>
              <p className="text-charcoal-600 leading-relaxed">
                <strong>Pending:</strong> Report submitted by citizen awaiting officer inspection.<br />
                <strong>Verified:</strong> Municipal staff reviewed photo evidence, validated location, and approved incident validity.<br />
                <strong>Cleaned:</strong> Remediation squad dispatched and after-photo evidence certified.
              </p>
            </div>

            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
              <h4 className="font-bold text-blue-950 mb-1 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-blue-700" />
                Completed Cleanups vs. Verified Cleanups
              </h4>
              <p className="text-blue-900 leading-relaxed">
                <strong>Completed:</strong> Field cleanup squad concluded on-site remediation and uploaded after-photo.<br />
                <strong>Verified:</strong> Municipal administrator inspected photographic evidence and formally certified site restoration.
              </p>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
              <h4 className="font-bold text-amber-950 mb-1 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-700" />
                Average Elapsed Durations
              </h4>
              <p className="text-amber-900 leading-relaxed">
                <strong>Avg Verification Time:</strong> Mean elapsed hours from citizen submission timestamp to official verification audit event.<br />
                <strong>Avg Remediation Time:</strong> Mean elapsed hours from cleanup task creation to administrator certification.
              </p>
            </div>

            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
              <h4 className="font-bold text-purple-950 mb-1 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-purple-700" />
                Hotspot Priority Score (0–100)
              </h4>
              <p className="text-purple-900 leading-relaxed">
                Aggregated 5-factor weighted index: Severity (30%), Recurrence (25%), Cleanup Lag (20%), Ecological Sensitivity (15%), and Recency (10%).
              </p>
            </div>

            <div className="pt-2 text-right">
              <Button variant="primary" size="sm" onClick={() => setShowDefinitionsModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Report Inspection Modal with YOLO Computer Vision Overlay */}
      {selectedReportForInspection && (
        <Modal
          isOpen={!!selectedReportForInspection}
          onClose={() => setSelectedReportForInspection(null)}
          title={`Inspect Incident: ${selectedReportForInspection.title}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4 text-xs font-sans">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-[#F4F7F2] rounded-xl border border-sage-200">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs text-[#092421]">{selectedReportForInspection.id}</span>
                <span className="text-charcoal-400">•</span>
                <span className="text-charcoal-600 font-medium">{formatDate(selectedReportForInspection.reportedAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#092421] bg-white px-2.5 py-1 rounded-md border border-sage-200">
                  {getCategoryLabel(selectedReportForInspection.category)}
                </span>
                <span className="font-bold uppercase text-[10px] bg-white px-2.5 py-1 rounded-md border border-sage-200">
                  Severity: {selectedReportForInspection.severity}
                </span>
              </div>
            </div>

            {/* Photo & YOLO Detections */}
            {selectedReportForInspection.imageUrl && (
              <DetectionOverlay
                imageUrl={selectedReportForInspection.imageUrl}
                detections={selectedReportForInspection.detections}
                detectionNote={selectedReportForInspection.detectionNote}
                aiStatus={selectedReportForInspection.aiStatus}
                reportId={selectedReportForInspection.id}
                currentCategory={selectedReportForInspection.category}
                isEditable={false}
              />
            )}

            <div className="p-3 bg-white rounded-xl border border-sage-200 space-y-1">
              <h5 className="font-bold text-charcoal-900">Incident Address & Geolocation</h5>
              <p className="text-charcoal-600">{selectedReportForInspection.address || 'Geo-coordinate location'}</p>
              <p className="font-mono text-[11px] text-[#1B4A45]">
                GPS: {selectedReportForInspection.latitude?.toFixed(5)}°, {selectedReportForInspection.longitude?.toFixed(5)}°
              </p>
            </div>

            {selectedReportForInspection.description && (
              <div className="p-3 bg-white rounded-xl border border-sage-200 space-y-1">
                <h5 className="font-bold text-charcoal-900">Citizen Observations</h5>
                <p className="text-charcoal-700 leading-relaxed">{selectedReportForInspection.description}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-sage-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedReportForInspection(null)}
              >
                Close
              </Button>

              <div className="flex items-center gap-2">
                {selectedReportForInspection.status === 'pending' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleVerify(selectedReportForInspection.id);
                      setSelectedReportForInspection(null);
                    }}
                  >
                    Verify Report
                  </Button>
                )}
                {selectedReportForInspection.status !== 'cleaned' && selectedReportForInspection.status !== 'scheduled' && (
                  <Button
                    variant="primary"
                    size="sm"
                    glow
                    onClick={() => {
                      handleScheduleCleanup(selectedReportForInspection.id);
                      setSelectedReportForInspection(null);
                    }}
                  >
                    Schedule Cleanup
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {reportToDelete && (
        <Modal
          isOpen={!!reportToDelete}
          onClose={() => setReportToDelete(null)}
          title="Confirm Permanent Deletion"
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs font-sans">
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Are you sure you want to permanently delete this report?</p>
                <p className="text-charcoal-600 leading-relaxed text-[11px]">
                  Report ID: <span className="font-mono font-bold text-charcoal-900">{reportToDelete}</span>. This action removes the record and associated telemetry from municipal records.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-sage-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReportToDelete(null)}
                disabled={deletingReport}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                icon={Trash2}
                loading={deletingReport}
                onClick={confirmDeleteReport}
              >
                Delete Report
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
