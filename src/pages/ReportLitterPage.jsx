import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Camera,
  MapPin,
  Send,
  AlertTriangle,
  Sparkles,
  Info,
  CheckCircle,
  HelpCircle,
  ShieldAlert,
  Clock,
  Layers,
  Flame,
  ArrowRight,
  Compass,
  Copy,
  Check,
  Building2,
  ExternalLink,
  RotateCcw,
  Bot,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardBody } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { ImageUploader } from '../components/forms/ImageUploader';
import { LocationPickerMap } from '../components/map/LocationPickerMap';
import { reportService } from '../services/reportService';

export function ReportLitterPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'plastic',
    severity: 'medium',
    estimatedKg: 5,
    address: '',
    latitude: null,
    longitude: null,
  });

  const [locationSelected, setLocationSelected] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState(null);
  const [formError, setFormError] = useState(null);
  const [copiedId, setCopiedId] = useState(false);

  const handleImageChange = (dataUrl) => {
    setImagePreview(dataUrl);
    setFormError(null);
  };

  const handleImageClear = () => {
    setImagePreview(null);
  };

  const handleLocationChange = async (lat, lng) => {
    setLocationSelected(true);
    setFormError(null);

    const fallbackAddr = `GPS Pin: ${lat.toFixed(5)}°, ${lng.toFixed(5)}°`;
    setFormData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      address: prev.address && !prev.address.startsWith('GPS Pin:')
        ? prev.address
        : fallbackAddr,
    }));

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { Accept: 'application/json' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          const parts = [];
          if (data.address?.road) parts.push(data.address.road);
          if (data.address?.suburb || data.address?.neighbourhood) {
            parts.push(data.address.suburb || data.address.neighbourhood);
          }
          if (data.address?.city || data.address?.town) {
            parts.push(data.address.city || data.address.town);
          }
          const resolved = parts.length > 0 ? parts.join(', ') : data.display_name.split(',').slice(0, 3).join(',');
          setFormData((prev) => ({
            ...prev,
            address: resolved.trim(),
          }));
        }
      }
    } catch (err) {
      // Gracefully fall back to coordinates
    }
  };

  const handleCopyId = (id) => {
    if (!id) return;
    navigator.clipboard?.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  const handleResetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'plastic',
      severity: 'medium',
      estimatedKg: 5,
      address: '',
      latitude: null,
      longitude: null,
    });
    setLocationSelected(false);
    setImagePreview(null);
    setSubmittedReport(null);
    setFormError(null);
  };

  // Environmental impact details based on material category
  const materialImpacts = {
    plastic: {
      degradation: '~450 Years',
      danger: 'High Marine & Microplastic Hazard',
      badge: 'bg-rose-50 text-rose-800 border-rose-200',
      recommendation: 'Targeted for municipal plastic baling and circular polymer recycling.',
    },
    glass: {
      degradation: '1,000,000+ Years',
      danger: 'Severe Physical Injury & Fire Risk',
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
      recommendation: 'Requires motorized vacuum collector to eliminate micro-shards.',
    },
    metal: {
      degradation: '~80-100 Years',
      danger: 'Sharp Debris & Soil Oxidation',
      badge: 'bg-blue-50 text-blue-800 border-blue-200',
      recommendation: 'High scrap value; routed to scrap metal processing facility.',
    },
    hazardous: {
      degradation: 'Permanent Chemical Residue',
      danger: 'Groundwater Contamination & Toxicity',
      badge: 'bg-rose-100 text-rose-900 border-rose-300',
      recommendation: 'Priority HazMat dispatch with sealed containment drums.',
    },
    paper: {
      degradation: '~2-6 Weeks',
      danger: 'Storm Drain Clogging & Clutter',
      badge: 'bg-slate-100 text-slate-800 border-slate-200',
      recommendation: 'Street sweeper sweep before rainstorms.',
    },
    organic: {
      degradation: '~1-6 Months',
      danger: 'Pest Vector & Odor Hazard',
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      recommendation: 'Municipal green-bin compost collection.',
    },
    mixed: {
      degradation: 'Decades to Centuries',
      danger: 'Public Sanitation Degradation',
      badge: 'bg-sage-100 text-sage-900 border-sage-200',
      recommendation: 'General municipal crew sorting and disposal.',
    },
  };

  const currentImpact = materialImpacts[formData.category] || materialImpacts.mixed;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.title.trim() || formData.title.trim().length < 3) {
      setFormError('Please enter a descriptive incident title (at least 3 characters).');
      return;
    }

    if (!imagePreview) {
      setFormError('Please attach photographic evidence (JPG, PNG, or WebP) for verification.');
      return;
    }

    if (!locationSelected || formData.latitude === null || formData.longitude === null) {
      setFormError('Please select the incident location on the interactive map or click "Locate Me".');
      return;
    }

    if (
      formData.latitude < -90 ||
      formData.latitude > 90 ||
      formData.longitude < -180 ||
      formData.longitude > 180
    ) {
      setFormError('Coordinates must be between -90/90 latitude and -180/180 longitude.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await reportService.createReport({
        ...formData,
        imageUrl: imagePreview,
      });

      setSubmittedReport(response);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setFormError(err.message || 'Failed to submit report. Please verify connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8 font-sans">
      {/* Header */}
      <div className="text-center sm:text-left space-y-2 pb-6 border-b border-[#1B4332]/10">
        <Badge variant="pista" dot pulse dotColor="bg-[#092421]">
          Citizen Action Portal
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#10241B] tracking-tight">
          Report Pollution Incident
        </h1>
        <p className="text-xs sm:text-sm text-[#556E55] max-w-2xl leading-relaxed font-medium">
          Upload photographic evidence and confirm GPS coordinates for automated computer vision triage and municipal crew dispatch.
        </p>
      </div>

      {/* Confirmation View (Shown when report is successfully created) */}
      {submittedReport ? (
        <div className="space-y-6 animate-fadeIn">
          <Card className="border-2 border-emerald-300 bg-gradient-to-b from-[#F2F8F4] to-white shadow-soft-lg">
            <CardBody className="p-6 sm:p-8 space-y-6">
              {/* Success Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-emerald-200">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-soft">
                    <CheckCircle className="w-7 h-7 text-emerald-200" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                      Official Incident Filed
                    </span>
                    <h2 className="text-2xl font-serif font-bold text-[#092421]">
                      Report Received & Queued
                    </h2>
                  </div>
                </div>

                {/* Report ID with Copy Button */}
                <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-emerald-200 shadow-xs">
                  <div className="text-left">
                    <span className="block text-[10px] text-charcoal-500 font-bold uppercase tracking-wide">
                      Incident Tracking ID
                    </span>
                    <span className="font-mono text-sm font-extrabold text-[#092421]">
                      {submittedReport.id}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyId(submittedReport.id)}
                    className="p-1.5 rounded-lg text-emerald-800 hover:bg-emerald-50 active:scale-95 transition-all"
                    title="Copy Report ID"
                  >
                    {copiedId ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-emerald-800" />
                    )}
                  </button>
                </div>
              </div>

              {/* Core Incident Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Jurisdiction Assignment */}
                <div className="p-4 rounded-xl bg-white border border-sage-200 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#092421]">
                    <Building2 className="w-4 h-4 text-[#1B4A45]" />
                    <span>Jurisdiction Assignment</span>
                  </div>
                  {submittedReport.municipalityName ? (
                    <div>
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#DEF5F1] text-[#092421] border border-[#98E0D5]">
                        {submittedReport.municipalityName}
                      </span>
                      <p className="text-xs text-charcoal-600 mt-1">
                        Ward: <span className="font-bold">{submittedReport.wardId || 'Main Operational Ward'}</span>
                        {submittedReport.zoneId ? ` (Zone: ${submittedReport.zoneId})` : ''}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        Pending Regional Routing
                      </span>
                      <p className="text-xs text-charcoal-500 mt-1">
                        Location is currently awaiting administrative jurisdiction assignment.
                      </p>
                    </div>
                  )}
                </div>

                {/* AI Computer Vision Status & Limitations */}
                <div className="p-4 rounded-xl bg-white border border-sage-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#092421]">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#74D7CB]" />
                      <span>Computer Vision Triage</span>
                    </div>
                    {submittedReport.aiStatus === 'completed' ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold">
                        Analysis Completed
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold">
                        Limitation Visible: Manual Triage
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-charcoal-700 leading-relaxed">
                    {submittedReport.detectionNote || 'Classification based on citizen-provided evidence.'}
                  </p>
                  {submittedReport.detections && submittedReport.detections.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {submittedReport.detections.map((det, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-sage-100 text-sage-900 font-semibold"
                        >
                          {det.label} ({(det.confidence * 100).toFixed(0)}%)
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Photo & Location Summary */}
              <div className="flex flex-col sm:flex-row items-start gap-4 p-4 rounded-xl bg-sage-50/70 border border-sage-200">
                {submittedReport.imageUrl && (
                  <img
                    src={submittedReport.imageUrl}
                    alt="Submitted Evidence"
                    className="w-28 h-24 object-cover rounded-lg border border-sage-300 shadow-xs shrink-0"
                  />
                )}
                <div className="space-y-1 text-xs text-charcoal-800">
                  <h4 className="font-extrabold text-[#092421] text-sm">
                    {submittedReport.title}
                  </h4>
                  <p className="text-charcoal-600 font-medium">
                    {submittedReport.address || 'Geo-coordinate location'}
                  </p>
                  <p className="font-mono text-[11px] text-[#1B4A45]">
                    GPS: {submittedReport.latitude?.toFixed(5)}°, {submittedReport.longitude?.toFixed(5)}°
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <span className="capitalize font-bold text-[11px]">
                      Category: {submittedReport.category}
                    </span>
                    <span>•</span>
                    <span className="capitalize font-bold text-[11px]">
                      Severity: {submittedReport.severity}
                    </span>
                    <span>•</span>
                    <span className="font-bold text-[11px]">
                      Est: {submittedReport.estimatedKg} kg
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-emerald-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={RotateCcw}
                  onClick={handleResetForm}
                  className="w-full sm:w-auto"
                >
                  File Another Incident
                </Button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={Compass}
                    onClick={() => navigate('/map')}
                    className="w-full sm:w-auto"
                  >
                    View Public Map
                  </Button>
                  <Button
                    type="button"
                    variant="pista"
                    size="sm"
                    icon={ArrowRight}
                    glow
                    onClick={() => navigate('/my-reports')}
                    className="w-full sm:w-auto font-black"
                  >
                    Track in My Reports
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      ) : (
        <>
          {/* Progress Steps Indicator */}
          <div className="grid grid-cols-3 gap-3 p-2 bg-[#102D27] rounded-full border border-[#23584E] shadow-inner text-xs font-semibold">
            <div
              className={`p-2.5 rounded-full flex items-center justify-center gap-2 transition-all ${
                imagePreview
                  ? 'bg-[#74D7CB] text-[#092421] shadow-xs font-black'
                  : 'bg-white/10 text-white font-bold'
              }`}
            >
              <Camera className="w-4 h-4 shrink-0" />
              <span className="truncate">1. Photo</span>
            </div>
            <div
              className={`p-2.5 rounded-full flex items-center justify-center gap-2 transition-all ${
                locationSelected
                  ? 'bg-[#74D7CB] text-[#092421] shadow-xs font-black'
                  : 'bg-white/10 text-white font-bold'
              }`}
            >
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="truncate">2. Location</span>
            </div>
            <div
              className={`p-2.5 rounded-full flex items-center justify-center gap-2 transition-all ${
                formData.title.trim().length >= 3
                  ? 'bg-[#74D7CB] text-[#092421] shadow-xs font-black'
                  : 'bg-white/10 text-white font-bold'
              }`}
            >
              <Layers className="w-4 h-4 shrink-0" />
              <span className="truncate">3. Classification</span>
            </div>
          </div>

          {formError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 flex items-center gap-3 shadow-soft animate-fadeIn">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <p className="text-xs font-bold">{formError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Step 1: Photographic Evidence */}
            <Card className="border-sage-300/90 shadow-soft">
              <CardHeader
                title="1. Photo Evidence"
                subtitle="Upload authentic photographic evidence. Supports JPG, JPEG, PNG, and WebP up to 25MB."
                icon={Camera}
              />
              <CardBody className="space-y-4">
                <ImageUploader
                  imagePreview={imagePreview}
                  onImageChange={handleImageChange}
                  onImageClear={handleImageClear}
                />

                {/* AI Computer Vision Capability Strip */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-[#F4F7F2] via-[#E8F4EC] to-[#F4F7F2] border border-[#74D7CB]/40 flex items-start gap-3.5 shadow-xs">
                  <div className="w-8 h-8 rounded-xl bg-[#092421] text-[#74D7CB] flex items-center justify-center shrink-0 mt-0.5 shadow-xs border border-[#27403C]">
                    <Sparkles className="w-4 h-4 text-[#74D7CB]" />
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-darkgreen-950">
                        Computer Vision Inference & Fallback
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-pista-100 text-[#092421] font-bold border border-pista-300">
                        Resilient AI
                      </span>
                    </div>
                    <p className="text-charcoal-700 leading-relaxed text-[11px] font-medium">
                      Uploaded photos undergo YOLOv8 object detection to identify waste types and bounding boxes. If the AI model is temporarily unavailable, reports are safely preserved with manual classifications and flagged for municipal supervisor review.
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Step 2: Location Selection */}
            <Card className="border-sage-300/90 shadow-soft">
              <CardHeader
                title="2. Incident Location"
                subtitle="Select location by clicking on the interactive map or clicking 'Locate Me'. Drag marker to correct."
                icon={MapPin}
              />
              <CardBody className="space-y-4">
                {/* Location Selection Status Banner */}
                {!locationSelected ? (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-center gap-2.5 text-xs font-semibold animate-pulse">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      Location Required: Click anywhere on the map below or click "Locate Me" to place your incident pin.
                    </span>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center justify-between gap-2.5 text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>
                        Location Confirmed: {formData.latitude?.toFixed(5)}°, {formData.longitude?.toFixed(5)}°
                      </span>
                    </div>
                    <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                      GPS Validated
                    </span>
                  </div>
                )}

                <LocationPickerMap
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  onChange={handleLocationChange}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-charcoal-800 mb-1">
                      Location / Landmark (Auto-resolved, editable)
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-forest-700 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-sage-300 focus:outline-none focus:ring-2 focus:ring-forest-500 bg-white font-medium"
                        placeholder="Click map or type street landmark..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block font-bold text-charcoal-800 mb-1">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.latitude !== null ? formData.latitude : ''}
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : null;
                          setFormData({ ...formData, latitude: val });
                          if (val !== null && formData.longitude !== null) setLocationSelected(true);
                        }}
                        placeholder="Click map"
                        className="w-full px-3 py-2.5 rounded-xl border border-sage-300 font-mono focus:outline-none focus:ring-2 focus:ring-forest-500 bg-white font-semibold text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-charcoal-800 mb-1">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.longitude !== null ? formData.longitude : ''}
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : null;
                          setFormData({ ...formData, longitude: val });
                          if (val !== null && formData.latitude !== null) setLocationSelected(true);
                        }}
                        placeholder="Click map"
                        className="w-full px-3 py-2.5 rounded-xl border border-sage-300 font-mono focus:outline-none focus:ring-2 focus:ring-forest-500 bg-white font-semibold text-xs"
                      />
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Step 3: Incident Classification & Ecological Impact */}
            <Card className="border-sage-300/90 shadow-soft">
              <CardHeader
                title="3. Waste Classification"
                subtitle="Specify waste category and estimated volume for cleanup crew priority."
                icon={Layers}
              />
              <CardBody className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-charcoal-800 mb-1">
                    Incident Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-sage-300 focus:outline-none focus:ring-2 focus:ring-forest-500 bg-white font-semibold"
                    placeholder="e.g. Plastic bottles on riverside footpath"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-charcoal-800 mb-1">
                      Waste Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-sage-300 focus:outline-none focus:ring-2 focus:ring-forest-500 bg-white font-semibold"
                    >
                      <option value="plastic">Plastics & Packaging</option>
                      <option value="glass">Glass Bottles & Shards</option>
                      <option value="metal">Metal & Aluminum Cans</option>
                      <option value="paper">Paper & Cardboard</option>
                      <option value="hazardous">Hazardous / E-Waste</option>
                      <option value="organic">Organic Food Waste</option>
                      <option value="mixed">Mixed Public Litter</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-charcoal-800 mb-1">
                      Urgency / Severity
                    </label>
                    <select
                      value={formData.severity}
                      onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-sage-300 focus:outline-none focus:ring-2 focus:ring-forest-500 bg-white font-semibold"
                    >
                      <option value="low">Low (Light scattered debris)</option>
                      <option value="medium">Medium (Moderate dump accumulation)</option>
                      <option value="high">Critical (Severe dump / hazard risk)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-charcoal-800 mb-1">
                      Est. Waste Mass (kg)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={formData.estimatedKg}
                      onChange={(e) => setFormData({ ...formData, estimatedKg: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-sage-300 focus:outline-none focus:ring-2 focus:ring-forest-500 bg-white font-mono font-semibold"
                    />
                  </div>
                </div>

                {/* Material Environmental Impact Capsule */}
                <div className="p-4 rounded-2xl bg-[#F4F7F2] border border-[#1B4332]/10 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-darkgreen-950 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-botanical-700" />
                      Ecological Impact Assessment
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${currentImpact.badge}`}>
                      Decomposition: {currentImpact.degradation}
                    </span>
                  </div>
                  <p className="text-charcoal-700 text-[11px] leading-relaxed font-medium">
                    <b className="text-darkgreen-950">Threat Profile:</b> {currentImpact.danger}. {currentImpact.recommendation}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-charcoal-800 mb-1">
                    Field Observations & Context Notes
                  </label>
                  <textarea
                    rows="3"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-sage-300 focus:outline-none focus:ring-2 focus:ring-forest-500 bg-white leading-relaxed"
                    placeholder="Include proximity to storm drains, wildlife habitat, school crossings, or truck accessibility..."
                  />
                </div>
              </CardBody>
            </Card>

            {/* Submit Actions */}
            <div className="flex items-center justify-end gap-4 pt-4 border-t border-sage-200">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="md"
                icon={Send}
                loading={isSubmitting}
                glow
                className="shadow-soft-md"
              >
                Submit Verified Report
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}