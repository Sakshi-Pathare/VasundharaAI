import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Flame,
  ArrowUpDown,
  AlertTriangle,
  TrendingUp,
  MapPin,
  Calendar,
  Layers,
  ShieldAlert,
  SlidersHorizontal,
  Compass,
  Sparkles,
  Zap,
  Activity,
  CheckCircle2,
  Sliders,
  ChevronRight,
  Plus,
  Navigation,
  Trash2,
  Globe,
  Building2,
  Check,
  Clock,
  Filter,
  Info,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardBody } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { hotspotService } from '../services/hotspotService';
import { getSeverityBadgeProps, getCategoryLabel } from '../utils/formatters';
import { formatDate, formatRelativeTime } from '../utils/dateUtils';

export function HotspotIntelligencePage() {
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);
  const [selectedHotspotReports, setSelectedHotspotReports] = useState(null);

  // Filters State
  const [sortBy, setSortBy] = useState('priority'); // 'priority' | 'recurrence' | 'date'
  const [timeWindow, setTimeWindow] = useState('all'); // 'all' | '30' | '90' | '180'
  const [municipalityFilter, setMunicipalityFilter] = useState('all');
  const [wardFilter, setWardFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [minPriority, setMinPriority] = useState(0);

  // Simulation Mode
  const [simulationActive, setSimulationActive] = useState(false);

  // New Hotspot Manual Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [geoLocating, setGeoLocating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    district: '',
    latitude: 18.5204,
    longitude: 73.8567,
    radiusMeters: 300,
    recurrenceCount: 4,
    severity: 'high',
    priorityScore: 78,
    dominantCategory: 'plastic',
    environmentalRisk: 'High-density plastic accumulation along local waterway and pedestrian corridor',
    suggestedAction: 'Deploy high-capacity solar compactors and weekly municipal sanitation sweeps',
  });

  useEffect(() => {
    loadHotspots();
  }, [sortBy, timeWindow, municipalityFilter, wardFilter, severityFilter, categoryFilter, minPriority]);

  const loadHotspots = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await hotspotService.getHotspots({
        sortBy,
        timeWindowDays: timeWindow !== 'all' ? Number(timeWindow) : null,
        municipalityId: municipalityFilter !== 'all' ? municipalityFilter : null,
        wardId: wardFilter !== 'all' ? wardFilter : null,
        category: categoryFilter !== 'all' ? categoryFilter : null,
        severity: severityFilter !== 'all' ? severityFilter : null,
        minPriority: minPriority > 0 ? Number(minPriority) : null,
      });
      setHotspots(data);
    } catch (e) {
      console.error('Failed to load hotspots:', e);
      setError(e.message || 'Unable to retrieve geospatial hotspot intelligence.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setTimeWindow('all');
    setMunicipalityFilter('all');
    setWardFilter('all');
    setSeverityFilter('all');
    setCategoryFilter('all');
    setMinPriority(0);
    setSortBy('priority');
  };

  const showNotification = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleGetLiveLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGeoLocating(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setFormData((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
        }));
        showNotification('Acquired live GPS coordinates!');
      },
      (err) => {
        setGeoLocating(false);
        alert('Could not retrieve your location. Please enter coordinates manually.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCreateHotspot = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.latitude || !formData.longitude) {
      alert('Please provide a name, latitude, and longitude.');
      return;
    }
    try {
      const created = await hotspotService.createHotspot(formData);
      setIsAddModalOpen(false);
      loadHotspots();
      showNotification(`Registered Hotspot: ${created.name}`);
      setFormData({
        name: '',
        district: '',
        latitude: 18.5204,
        longitude: 73.8567,
        radiusMeters: 300,
        recurrenceCount: 4,
        severity: 'high',
        priorityScore: 78,
        dominantCategory: 'plastic',
        environmentalRisk: 'High-density plastic accumulation along local corridor',
        suggestedAction: 'Deploy high-capacity solar compactors and weekly municipal sweeps',
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Extract distinct municipalities and wards from active results for filter pickers
  const availableMunicipalities = useMemo(() => {
    const list = new Set();
    hotspots.forEach((h) => {
      if (h.municipalityId) list.add(h.municipalityId);
    });
    return Array.from(list);
  }, [hotspots]);

  const availableWards = useMemo(() => {
    const list = new Set();
    hotspots.forEach((h) => {
      if (h.wardId) list.add(h.wardId);
    });
    return Array.from(list);
  }, [hotspots]);

  const criticalCount = hotspots.filter((h) => h.priorityScore >= 80).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#1B4332]/10">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-rose-100 text-rose-900 mb-2 border border-rose-200 shadow-xs">
            <Flame className="w-3.5 h-3.5 text-rose-600" />
            <span>Geospatial Hotspot Intelligence</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#10241B] tracking-tight">
            Hotspot Intelligence & Priority Scoring
          </h1>
          <p className="text-xs sm:text-sm text-[#556E55] mt-1 max-w-2xl leading-relaxed font-medium">
            Autonomous spatial clustering with incident deduplication and transparent 5-factor priority scoring.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="pista"
            size="sm"
            icon={Plus}
            glow
            onClick={() => setIsAddModalOpen(true)}
            className="rounded-full px-4 py-2 font-black shadow-md"
          >
            Register Hotspot
          </Button>

          <button
            onClick={() => setSimulationActive(!simulationActive)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all inline-flex items-center gap-2 border shadow-xs ${
              simulationActive
                ? 'bg-[#DEF5F1] text-[#092421] border-[#74D7CB] ring-2 ring-[#74D7CB]/40'
                : 'bg-white text-[#242D2B] border-[#1B4332]/15 hover:bg-[#F4F7F2]'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${simulationActive ? 'text-[#10241B]' : 'text-amber-500'}`} />
            <span>Simulator: {simulationActive ? 'ACTIVE' : 'OFF'}</span>
          </button>

          <Link to="/map">
            <Button variant="outline" size="sm" icon={Compass} className="rounded-full px-4 py-2 font-bold">
              GIS Map
            </Button>
          </Link>
          <Link to="/cleanups">
            <Button variant="primary" size="sm" icon={ShieldAlert} className="rounded-full px-4 py-2 font-bold">
              Dispatch Crew
            </Button>
          </Link>
        </div>
      </div>

      {successToast && (
        <div className="p-3.5 rounded-2xl bg-[#DEF5F1] border border-[#74D7CB] text-[#092421] text-xs font-bold flex items-center gap-2.5 shadow-soft animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-[#2D6A4F] shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Transparent 5-Factor Scoring Methodology Banner */}
      <div className="relative rounded-3xl p-6 sm:p-7 bg-gradient-to-r from-[#092421] via-[#123632] to-[#092421] text-white shadow-soft-lg overflow-hidden border border-[#27403C]">
        <div className="absolute top-0 right-0 w-80 h-80 bg-pista-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl text-xs">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[#74D7CB] text-sm font-mono flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#74D7CB]" />
                TRANSPARENT 5-FACTOR PRIORITY SCORING MATRIX
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1B4A45] text-pista-200 border border-[#74D7CB]/30">
                100% Normalized
              </span>
            </div>

            <p className="text-pista-100/90 leading-relaxed text-xs">
              Every hotspot priority score is derived from genuine database reports using five weighted components without invented data:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 font-mono text-[11px]">
              <div className="bg-[#051412] p-2 rounded-xl border border-[#27403C]">
                <span className="text-amber-400 font-bold block text-[10px] uppercase">Severity</span>
                <span className="text-white font-extrabold text-xs">30%</span>
                <span className="text-pista-300/80 text-[10px] block">Material hazard</span>
              </div>
              <div className="bg-[#051412] p-2 rounded-xl border border-[#27403C]">
                <span className="text-sky-400 font-bold block text-[10px] uppercase">Recurrence</span>
                <span className="text-white font-extrabold text-xs">25%</span>
                <span className="text-pista-300/80 text-[10px] block">Deduplicated</span>
              </div>
              <div className="bg-[#051412] p-2 rounded-xl border border-[#27403C]">
                <span className="text-emerald-400 font-bold block text-[10px] uppercase">Cleanup Lag</span>
                <span className="text-white font-extrabold text-xs">20%</span>
                <span className="text-pista-300/80 text-[10px] block">Days since service</span>
              </div>
              <div className="bg-[#051412] p-2 rounded-xl border border-[#27403C]">
                <span className="text-teal-400 font-bold block text-[10px] uppercase">Ecological</span>
                <span className="text-white font-extrabold text-xs">15%</span>
                <span className="text-pista-300/80 text-[10px] block">Water/School buffer</span>
              </div>
              <div className="bg-[#051412] p-2 rounded-xl border border-[#27403C]">
                <span className="text-purple-400 font-bold block text-[10px] uppercase">Recency</span>
                <span className="text-white font-extrabold text-xs">10%</span>
                <span className="text-pista-300/80 text-[10px] block">Days since report</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-[#123632] px-4 py-3 rounded-2xl border border-[#27403C] text-xs text-pista-200 shrink-0 shadow-soft-xs">
            <Flame className="w-5 h-5 text-rose-400 animate-pulse" />
            <div>
              <span className="text-[10px] uppercase font-bold text-pista-300 block">Critical Action Threshold</span>
              <span className="text-sm font-extrabold text-white">
                {criticalCount} Critical Hotspots (Score &ge; 80)
              </span>
              <span className="text-[10px] text-pista-300/80 block">Requires mandatory municipal intervention</span>
            </div>
          </div>
        </div>
      </div>

      {/* Comprehensive Filter Bar */}
      <div className="card-paper p-4 rounded-2xl border border-[#1B4332]/15 shadow-soft space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1B4332]/10 text-xs font-bold text-[#10241B]">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#2D6A4F]" />
            <span>Hotspot Query & Geospatial Filters</span>
          </div>

          <button
            onClick={handleResetFilters}
            className="text-[11px] font-bold text-forest-700 hover:text-forest-900 inline-flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset All Filters
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {/* Time Window */}
          <div>
            <label className="block text-[11px] font-bold text-charcoal-500 mb-1">Time Period</label>
            <select
              value={timeWindow}
              onChange={(e) => setTimeWindow(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-[#1B4332]/20 bg-white text-xs font-medium text-charcoal-900 outline-none focus:ring-1 focus:ring-[#74D7CB]"
            >
              <option value="all">All Time</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="180">Last 180 Days</option>
            </select>
          </div>

          {/* Municipality Filter */}
          <div>
            <label className="block text-[11px] font-bold text-charcoal-500 mb-1">Municipality</label>
            <select
              value={municipalityFilter}
              onChange={(e) => setMunicipalityFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-[#1B4332]/20 bg-white text-xs font-medium text-charcoal-900 outline-none focus:ring-1 focus:ring-[#74D7CB]"
            >
              <option value="all">All Municipalities</option>
              {availableMunicipalities.map((m) => (
                <option key={m} value={m}>
                  {m.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Ward Filter */}
          <div>
            <label className="block text-[11px] font-bold text-charcoal-500 mb-1">Ward</label>
            <select
              value={wardFilter}
              onChange={(e) => setWardFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-[#1B4332]/20 bg-white text-xs font-medium text-charcoal-900 outline-none focus:ring-1 focus:ring-[#74D7CB]"
            >
              <option value="all">All Wards</option>
              {availableWards.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>

          {/* Waste Category */}
          <div>
            <label className="block text-[11px] font-bold text-charcoal-500 mb-1">Waste Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-[#1B4332]/20 bg-white text-xs font-medium text-charcoal-900 outline-none focus:ring-1 focus:ring-[#74D7CB]"
            >
              <option value="all">All Categories</option>
              <option value="plastic">Plastic</option>
              <option value="hazardous">Hazardous</option>
              <option value="organic">Organic</option>
              <option value="metal">Metal</option>
              <option value="glass">Glass</option>
              <option value="paper">Paper & Cardboard</option>
              <option value="mixed">Mixed Waste</option>
            </select>
          </div>

          {/* Severity */}
          <div>
            <label className="block text-[11px] font-bold text-charcoal-500 mb-1">Severity Rating</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-[#1B4332]/20 bg-white text-xs font-medium text-charcoal-900 outline-none focus:ring-1 focus:ring-[#74D7CB]"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical (&ge;80)</option>
              <option value="high">High (60-79)</option>
              <option value="medium">Medium (40-59)</option>
              <option value="low">Low (&lt;40)</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-[11px] font-bold text-charcoal-500 mb-1">Sort Metric</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-[#1B4332]/20 bg-white text-xs font-medium text-charcoal-900 outline-none focus:ring-1 focus:ring-[#74D7CB]"
            >
              <option value="priority">Priority Score</option>
              <option value="recurrence">Recurrence Count</option>
              <option value="date">Latest Report Date</option>
            </select>
          </div>
        </div>
      </div>

      {/* Hotspots Grid */}
      {loading ? (
        <LoadingSkeleton count={3} height="h-64" />
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2">
          <p className="font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            {error}
          </p>
          <Button variant="outline" size="sm" onClick={loadHotspots} className="rounded-full">
            Retry Connection
          </Button>
        </div>
      ) : hotspots.length === 0 ? (
        <EmptyState
          icon={Flame}
          title="No Hotspot Clusters Found"
          description="No spatial clusters match your current filter parameters. Try loosening the time window or severity filters."
          action={
            <Button variant="pista" size="sm" onClick={handleResetFilters} className="rounded-full">
              Reset Filters
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {hotspots.map((hotspot, idx) => {
            const rawScore = hotspot.priorityScore;
            const simulatedScore = simulationActive ? Math.max(30, rawScore - 28) : rawScore;
            const isCritical = simulatedScore >= 80;
            const sevProps = getSeverityBadgeProps(hotspot.severity);
            const factors = hotspot.factors || {};

            return (
              <Card
                key={hotspot.id}
                className={`p-6 space-y-4 border transition-all duration-300 shadow-soft hover:shadow-soft-md group ${
                  isCritical
                    ? 'border-l-4 border-l-rose-500 hover:border-rose-400'
                    : simulatedScore >= 60
                    ? 'border-l-4 border-l-amber-500 hover:border-amber-400'
                    : 'border-l-4 border-l-emerald-500 hover:border-emerald-400'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded-md bg-sage-100 text-charcoal-800">
                        RANK #{idx + 1} • {hotspot.id}
                      </span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${sevProps.bg}`}>
                        {sevProps.label}
                      </span>
                      {hotspot.ward && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          Ward: {hotspot.ward}
                        </span>
                      )}
                    </div>

                    <h3 className="font-extrabold text-base text-charcoal-900 group-hover:text-forest-900 transition-colors truncate">
                      {hotspot.name}
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs text-charcoal-500">
                      <MapPin className="w-3.5 h-3.5 text-forest-700 shrink-0" />
                      <span className="font-medium">{hotspot.municipality || hotspot.district}</span>
                      <span className="text-charcoal-300">•</span>
                      <span className="font-mono text-[11px]">
                        [{hotspot.latitude.toFixed(4)}, {hotspot.longitude.toFixed(4)}] • Radius ~{hotspot.radiusMeters}m
                      </span>
                    </div>
                  </div>

                  {/* Priority Gauge Badge */}
                  <div className="text-center p-3 rounded-2xl bg-[#F4F7F2] border border-[#1B4332]/10 shrink-0 min-w-[80px] shadow-xs">
                    <span className="text-[9px] uppercase font-bold text-charcoal-400 block tracking-wider">Priority</span>
                    <span
                      className={`text-2xl font-black font-mono transition-all duration-500 ${
                        isCritical
                          ? 'text-rose-600'
                          : simulatedScore >= 60
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {simulatedScore}
                    </span>
                    <span className="text-[9px] text-charcoal-400 block font-mono">/ 100</span>

                    {simulationActive && (
                      <span className="text-[10px] font-bold text-botanical-700 font-mono block mt-0.5">
                        -28 pts
                      </span>
                    )}
                  </div>
                </div>

                {/* Transparent 5-Factor Progress Breakdown */}
                {factors.wasteSeverity && (
                  <div className="p-3.5 rounded-xl bg-[#F4F7F2] border border-[#1B4332]/10 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px] font-bold text-charcoal-700">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        Factor Contribution Breakdown (Sum = {hotspot.priorityScore}/100)
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {/* Severity 30% */}
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-charcoal-600">Waste Severity (30%)</span>
                        <span className="font-mono font-bold text-charcoal-900">
                          {factors.wasteSeverity.contribution} / 30 pts (score {factors.wasteSeverity.score}/100)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-amber-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${(factors.wasteSeverity.contribution / 30) * 100}%` }}
                        />
                      </div>

                      {/* Recurrence 25% */}
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-charcoal-600">Report Recurrence (25%)</span>
                        <span className="font-mono font-bold text-charcoal-900">
                          {factors.reportRecurrence.contribution} / 25 pts (score {factors.reportRecurrence.score}/100)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-sky-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${(factors.reportRecurrence.contribution / 25) * 100}%` }}
                        />
                      </div>

                      {/* Cleanup Lag 20% */}
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-charcoal-600">Cleanup Lag (20%)</span>
                        <span className="font-mono font-bold text-charcoal-900">
                          {factors.cleanupLag.contribution} / 20 pts (score {factors.cleanupLag.score}/100)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${(factors.cleanupLag.contribution / 20) * 100}%` }}
                        />
                      </div>

                      {/* Environmental Sensitivity 15% */}
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-charcoal-600">Environmental Sensitivity (15%)</span>
                        <span className="font-mono font-bold text-charcoal-900">
                          {factors.environmentalSensitivity.contribution} / 15 pts (score {factors.environmentalSensitivity.score}/100)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-teal-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${(factors.environmentalSensitivity.contribution / 15) * 100}%` }}
                        />
                      </div>

                      {/* Recency 10% */}
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-charcoal-600">Report Recency (10%)</span>
                        <span className="font-mono font-bold text-charcoal-900">
                          {factors.reportRecency.contribution} / 10 pts (score {factors.reportRecency.score}/100)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-purple-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${(factors.reportRecency.contribution / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Priority Justification Box */}
                {hotspot.priorityExplanation && (
                  <div className="p-3 rounded-xl bg-forest-50/70 border border-forest-200 text-forest-950 text-xs space-y-1">
                    <span className="font-bold flex items-center gap-1.5 text-forest-900 text-[11px]">
                      <Info className="w-3.5 h-3.5 text-forest-700" />
                      Priority Explanation:
                    </span>
                    <p className="text-[11px] text-forest-800 leading-relaxed font-medium">
                      {hotspot.priorityExplanation}
                    </p>
                  </div>
                )}

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#F4F7F2] border border-[#1B4332]/10 text-xs">
                  <div>
                    <span className="text-[10px] text-charcoal-400 font-bold uppercase tracking-wider block">Recurrence</span>
                    <span className="font-extrabold text-charcoal-900 font-mono text-xs block">
                      {hotspot.distinctIncidents || hotspot.recurrenceCount} Incidents
                    </span>
                    <span className="text-[9px] text-charcoal-500 block">({hotspot.reportCount} total reports)</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-charcoal-400 font-bold uppercase tracking-wider block">Dominant Waste</span>
                    <span className="font-bold text-darkgreen-900 text-xs truncate block">
                      {getCategoryLabel(hotspot.dominantCategory)}
                    </span>
                    <span className="text-[9px] text-charcoal-500 block capitalize">{hotspot.severity} grade</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-charcoal-400 font-bold uppercase tracking-wider block">Last Cleanup</span>
                    <span className="font-bold text-charcoal-800 text-[11px] block truncate">
                      {hotspot.lastVerifiedCleanupDate ? formatDate(hotspot.lastVerifiedCleanupDate) : 'No cleanup on record'}
                    </span>
                    <span className="text-[9px] text-charcoal-500 block">
                      {hotspot.lastVerifiedCleanupDate ? formatRelativeTime(hotspot.lastVerifiedCleanupDate) : 'Pending inspection'}
                    </span>
                  </div>
                </div>

                {/* Footer Controls & Contributing Reports */}
                <div className="pt-3 border-t border-sage-100 flex items-center justify-between text-xs text-charcoal-500">
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-charcoal-400" />
                    Latest report: {formatDate(hotspot.latestReportDate || hotspot.lastReportedDate)}
                  </span>

                  <div className="flex items-center gap-3">
                    {hotspot.contributingReportIds && hotspot.contributingReportIds.length > 0 && (
                      <button
                        onClick={() => setSelectedHotspotReports(hotspot)}
                        className="text-forest-700 hover:text-forest-900 font-bold text-xs inline-flex items-center gap-1"
                        title="View contributing reports"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{hotspot.contributingReportIds.length} Reports</span>
                      </button>
                    )}

                    <Link
                      to="/map"
                      className="text-forest-800 hover:text-forest-950 font-bold inline-flex items-center gap-1 transition-colors text-xs"
                    >
                      GIS View <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Contributing Reports Modal */}
      {selectedHotspotReports && (
        <Modal
          isOpen={Boolean(selectedHotspotReports)}
          onClose={() => setSelectedHotspotReports(null)}
          title={`Contributing Reports for ${selectedHotspotReports.id}`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 text-xs font-sans">
            <div className="p-3 bg-[#DEF5F1] rounded-xl border border-[#98E0D5] text-[#092421]">
              <p className="font-bold">
                {selectedHotspotReports.name}
              </p>
              <p className="text-[11px] text-charcoal-600 mt-1">
                Centroid: [{selectedHotspotReports.latitude.toFixed(5)}, {selectedHotspotReports.longitude.toFixed(5)}] • Radius: {selectedHotspotReports.radiusMeters}m
              </p>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              <span className="font-bold text-charcoal-700 uppercase tracking-wider text-[10px] block">
                Cluster Members ({selectedHotspotReports.contributingReportIds?.length || 0} Reports):
              </span>
              <div className="divide-y divide-slate-100 border rounded-xl overflow-hidden">
                {selectedHotspotReports.contributingReportIds?.map((reportId, i) => (
                  <div key={reportId} className="p-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <span className="font-mono font-bold text-forest-800">
                      #{i + 1} • {reportId}
                    </span>
                    <Link
                      to={`/reports?search=${encodeURIComponent(reportId)}`}
                      className="text-[11px] text-forest-700 hover:underline font-semibold"
                    >
                      Audit Report &rarr;
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedHotspotReports(null)}
                className="rounded-full px-4 py-1.5"
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Real Hotspot Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register Custom Hotspot Location"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateHotspot} className="space-y-4 text-xs font-sans">
          <div className="p-3 bg-[#DEF5F1] rounded-xl border border-[#98E0D5] text-[#092421] flex items-center justify-between">
            <span className="font-semibold">Quickly pinpoint real locations:</span>
            <Button
              type="button"
              variant="pista"
              size="xs"
              icon={Navigation}
              loading={geoLocating}
              onClick={handleGetLiveLocation}
              className="rounded-full shadow-xs font-black text-xs"
            >
              Auto-Fill Live GPS Coordinates
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#10241B] mb-1">Hotspot Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Mithi River Drainage Basin"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#1B4332]/20 bg-white text-[#12181A] font-medium focus:ring-2 focus:ring-[#74D7CB] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#10241B] mb-1">District / Ward / Neighborhood</label>
              <input
                type="text"
                placeholder="e.g. Shivajinagar Ward 4"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#1B4332]/20 bg-white text-[#12181A] font-medium focus:ring-2 focus:ring-[#74D7CB] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#10241B] mb-1">Latitude *</label>
              <input
                type="number"
                step="any"
                required
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#1B4332]/20 bg-white text-[#12181A] font-mono font-bold focus:ring-2 focus:ring-[#74D7CB] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#10241B] mb-1">Longitude *</label>
              <input
                type="number"
                step="any"
                required
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#1B4332]/20 bg-white text-[#12181A] font-mono font-bold focus:ring-2 focus:ring-[#74D7CB] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#10241B] mb-1">Buffer Radius (m)</label>
              <input
                type="number"
                min="50"
                max="2000"
                value={formData.radiusMeters}
                onChange={(e) => setFormData({ ...formData, radiusMeters: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#1B4332]/20 bg-white text-[#12181A] font-mono focus:ring-2 focus:ring-[#74D7CB] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#10241B] mb-1">Dominant Material</label>
              <select
                value={formData.dominantCategory}
                onChange={(e) => setFormData({ ...formData, dominantCategory: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#1B4332]/20 bg-white text-[#12181A] font-medium outline-none"
              >
                <option value="plastic">Plastics & Packaging</option>
                <option value="glass">Glass & Bottles</option>
                <option value="metal">Metal & Scrap</option>
                <option value="hazardous">Hazardous / E-Waste</option>
                <option value="mixed">Mixed Waste</option>
                <option value="paper">Paper & Cardboard</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#10241B] mb-1">Severity Rating</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#1B4332]/20 bg-white text-[#12181A] font-medium outline-none"
              >
                <option value="critical">Critical (Tier 1)</option>
                <option value="high">High (Tier 2)</option>
                <option value="medium">Moderate (Tier 3)</option>
                <option value="low">Low Impact (Tier 4)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#10241B] mb-1">Priority Score (0-100)</label>
              <input
                type="number"
                min="10"
                max="100"
                value={formData.priorityScore}
                onChange={(e) => setFormData({ ...formData, priorityScore: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#1B4332]/20 bg-white text-[#12181A] font-mono font-bold outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#10241B] mb-1">Ecological Vulnerability / Environmental Risk</label>
            <textarea
              rows="2"
              value={formData.environmentalRisk}
              onChange={(e) => setFormData({ ...formData, environmentalRisk: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#1B4332]/20 bg-white text-[#12181A] font-medium outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#10241B] mb-1">Recommended Municipal Action</label>
            <textarea
              rows="2"
              value={formData.suggestedAction}
              onChange={(e) => setFormData({ ...formData, suggestedAction: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#1B4332]/20 bg-white text-[#12181A] font-medium outline-none resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
              className="rounded-full px-4 py-2"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="pista"
              size="sm"
              className="rounded-full px-5 py-2 font-black shadow-md"
            >
              Save Hotspot to Live Map
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
