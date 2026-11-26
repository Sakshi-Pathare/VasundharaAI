import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  MapPin,
  Camera,
  ShieldCheck,
  Flame,
  ArrowRight,
  Sparkles,
  Layers,
  Cpu,
  CheckCircle2,
  Users,
  Building2,
  BarChart3,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { analyticsService } from '../services/analyticsService';
import { formatNumber } from '../utils/formatters';

export function LandingPage() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    analyticsService
      .getDashboardMetrics()
      .then(setMetrics)
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF8F3] text-[#12181A] font-sans selection:bg-[#102F24] selection:text-[#FAF8F3]">
      {/* =========================================================================
          01. HERO PRODUCT BRIEFING SECTION
          ========================================================================= */}
      <section
        id="overview"
        className="relative pt-12 sm:pt-20 pb-20 sm:pb-28 overflow-hidden border-b border-[#183D2B]/15 bg-cover bg-center bg-no-repeat transition-all"
        style={{
          backgroundImage:
            "linear-gradient(rgba(250, 248, 243, 0.45), rgba(250, 248, 243, 0.65)), url('/images/vasundhara-theme-bg.png')",
        }}
      >
        {/* Subtle Sovereign Tricolor Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#E99A43] via-white to-[#183D2B] opacity-90 z-20" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            {/* Left: Product Overview & Value Proposition */}
            <div className="lg:col-span-7 space-y-6 sm:space-y-7 text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/95 border border-[#183D2B]/20 shadow-xs backdrop-blur-md">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E99A43] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#183D2B]" />
                </span>
                <span className="text-[11px] font-mono font-bold tracking-widest text-[#102F24] uppercase">
                  Civic Environmental Intelligence Platform
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#A9C7AE]/30 text-[#102F24] font-bold border border-[#A9C7AE]/60">
                  v2.4
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-serif font-bold text-[#102F24] tracking-tight leading-[1.12]">
                Bridging Citizens & Cities <br />
                With{' '}
                <span className="text-[#183D2B] inline-block relative">
                  Actionable AI.
                  <span className="absolute bottom-1.5 left-0 w-full h-2.5 bg-[#74D7CB]/30 -z-10 rounded-sm" />
                </span>
              </h1>

              {/* Concise Briefing */}
              <p className="text-base sm:text-lg text-[#17251E]/90 leading-relaxed max-w-2xl font-sans font-medium">
                Vasundhara AI is an urban environmental intelligence platform. We combine citizen
                smartphone reporting with computer-vision triage and geospatial clustering to detect,
                prioritize, and eliminate street-level pollution hotspots with certified municipal accountability.
              </p>

              {/* Call-to-Action Buttons to Main Platform */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                <Link to="/app">
                  <Button
                    variant="primary"
                    size="lg"
                    icon={Compass}
                    className="w-full sm:w-auto bg-[#092421] hover:bg-[#123833] text-white border-2 border-[#74D7CB] rounded-full px-7 py-3.5 shadow-lg hover:shadow-xl font-bold tracking-wide font-mono text-sm group"
                  >
                    <span>Launch Platform</span>
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform text-[#74D7CB]" />
                  </Button>
                </Link>

                <Link to="/map">
                  <Button
                    variant="outline"
                    size="lg"
                    icon={MapPin}
                    className="w-full sm:w-auto bg-white/90 hover:bg-white text-[#102F24] border-2 border-[#183D2B]/30 rounded-full px-6 py-3.5 shadow-xs font-bold text-sm"
                  >
                    Explore Live Map
                  </Button>
                </Link>

                <Link to="/report">
                  <Button
                    variant="ghost"
                    size="lg"
                    icon={Camera}
                    className="w-full sm:w-auto text-[#183D2B] hover:bg-[#183D2B]/10 rounded-full px-5 py-3.5 font-bold text-sm"
                  >
                    Report Litter
                  </Button>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-[#52665B] font-medium border-t border-[#183D2B]/10">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#1B4A45]" />
                  <span>Automated Ward Geofencing</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#1B4A45]" />
                  <span>YOLO Computer Vision</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#1B4A45]" />
                  <span>Before-&-After Proof of Cleanup</span>
                </div>
              </div>
            </div>

            {/* Right: Product Blueprint / Telemetry Card */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl bg-white/95 border border-[#183D2B]/20 shadow-xl overflow-hidden backdrop-blur-md">
                {/* Header Strip */}
                <div className="bg-[#092421] text-white px-5 py-3.5 flex items-center justify-between border-b border-[#1B4A45]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#74D7CB] animate-pulse" />
                    <span className="text-xs font-mono font-bold tracking-wider uppercase text-[#74D7CB]">
                      Product Overview
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-white/70">Autonomous Grid</span>
                </div>

                {/* Architecture Flow Preview */}
                <div className="p-6 space-y-5">
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#52665B] font-mono">
                      How The System Connects
                    </p>

                    {/* Step A */}
                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D5]">
                      <div className="w-8 h-8 rounded-xl bg-[#DEF5F1] text-[#092421] flex items-center justify-center font-bold text-xs shrink-0 border border-[#98E0D5]">
                        1
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#102F24]">Citizen Crowdsourcing</h4>
                        <p className="text-[11px] text-[#52665B] mt-0.5">
                          Citizens submit photo evidence; GPS coordinates automatically resolve municipal boundaries and ward codes.
                        </p>
                      </div>
                    </div>

                    {/* Step B */}
                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D5]">
                      <div className="w-8 h-8 rounded-xl bg-[#FFF3DC] text-[#7A4B04] flex items-center justify-center font-bold text-xs shrink-0 border border-[#F6D28B]">
                        2
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#102F24]">AI Vision & Hotspot Radar</h4>
                        <p className="text-[11px] text-[#52665B] mt-0.5">
                          Computer vision verifies waste composition; spatial clustering detects recurrent chronic dump sites.
                        </p>
                      </div>
                    </div>

                    {/* Step C */}
                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D5]">
                      <div className="w-8 h-8 rounded-xl bg-[#EAF5EC] text-[#14532D] flex items-center justify-center font-bold text-xs shrink-0 border border-[#BBF7D0]">
                        3
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#102F24]">Municipal Execution & Audit</h4>
                        <p className="text-[11px] text-[#52665B] mt-0.5">
                          Sanitation squads receive work orders; completion requires photographic before-and-after proof.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Link to Main App */}
                  <div className="pt-2">
                    <Link
                      to="/app"
                      className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#092421] text-white hover:bg-[#123833] transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Compass className="w-4 h-4 text-[#74D7CB]" />
                        <span className="text-xs font-bold font-mono">Open Application Portal</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#74D7CB] group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          02. LIVE CIVIC METRICS STRIP
          ========================================================================= */}
      <section className="bg-white border-b border-[#183D2B]/10 py-8 font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center md:text-left">
            <div className="border-r-0 md:border-r border-[#183D2B]/10 pr-4">
              <p className="text-xs font-mono font-bold uppercase tracking-wider text-[#52665B]">
                Total Reports
              </p>
              <p className="text-2xl sm:text-3xl font-serif font-bold text-[#102F24] mt-1">
                {metrics?.totalReports ? formatNumber(metrics.totalReports) : '48'}
              </p>
              <p className="text-[11px] text-[#1B4A45] font-semibold mt-0.5">Crowdsourced city-wide</p>
            </div>

            <div className="border-r-0 md:border-r border-[#183D2B]/10 pr-4">
              <p className="text-xs font-mono font-bold uppercase tracking-wider text-[#52665B]">
                Sites Cleaned
              </p>
              <p className="text-2xl sm:text-3xl font-serif font-bold text-[#102F24] mt-1">
                {metrics?.completedCleanups ? formatNumber(metrics.completedCleanups) : '31'}
              </p>
              <p className="text-[11px] text-[#1B4A45] font-semibold mt-0.5">Photo-verified resolution</p>
            </div>

            <div className="border-r-0 md:border-r border-[#183D2B]/10 pr-4">
              <p className="text-xs font-mono font-bold uppercase tracking-wider text-[#52665B]">
                Waste Remediated
              </p>
              <p className="text-2xl sm:text-3xl font-serif font-bold text-[#102F24] mt-1">
                {metrics?.totalWasteKg ? `${formatNumber(metrics.totalWasteKg)} kg` : '1,840 kg'}
              </p>
              <p className="text-[11px] text-[#1B4A45] font-semibold mt-0.5">Diverted from storm drains</p>
            </div>

            <div>
              <p className="text-xs font-mono font-bold uppercase tracking-wider text-[#52665B]">
                Municipal Coverage
              </p>
              <p className="text-2xl sm:text-3xl font-serif font-bold text-[#102F24] mt-1">
                Pune & PCMC
              </p>
              <p className="text-[11px] text-[#1B4A45] font-semibold mt-0.5">Active GIS jurisdiction grid</p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          03. FOUR PILLARS OF THE PRODUCT
          ========================================================================= */}
      <section id="capabilities" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DEF5F1] text-[#092421] text-xs font-bold font-mono border border-[#98E0D5]">
            <Layers className="w-3.5 h-3.5 text-[#1B4A45]" />
            <span>Product Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#102F24] tracking-tight">
            Four Pillars of Environmental Intelligence
          </h2>
          <p className="text-sm text-[#52665B] font-medium leading-relaxed">
            A comprehensive, end-to-end civic infrastructure that transforms raw public observations into
            structured municipal operations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-3xl bg-white border border-[#183D2B]/15 shadow-soft hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#DEF5F1] text-[#092421] flex items-center justify-center border border-[#98E0D5] group-hover:scale-105 transition-transform">
                <Camera className="w-6 h-6 text-[#1B4A45]" />
              </div>
              <h3 className="text-lg font-serif font-bold text-[#102F24]">Citizen Crowdsourcing</h3>
              <p className="text-xs text-[#52665B] leading-relaxed">
                Mobile-optimized incident capture with instant GPS verification and automatic spatial
                assignment to the responsible municipal ward.
              </p>
            </div>
            <div className="pt-6 border-t border-[#183D2B]/10 mt-6">
              <Link
                to="/report"
                className="text-xs font-bold text-[#1B4A45] hover:text-[#092421] flex items-center gap-1 group-hover:gap-1.5 transition-all"
              >
                <span>Report an incident</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-3xl bg-white border border-[#183D2B]/15 shadow-soft hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#FFF3DC] text-[#7A4B04] flex items-center justify-center border border-[#F6D28B] group-hover:scale-105 transition-transform">
                <Cpu className="w-6 h-6 text-[#A05E03]" />
              </div>
              <h3 className="text-lg font-serif font-bold text-[#102F24]">AI-Driven Computer Vision</h3>
              <p className="text-xs text-[#52665B] leading-relaxed">
                YOLO vision models classify waste categories (plastic, organic, construction) and estimate
                debris volume to triage emergency priorities.
              </p>
            </div>
            <div className="pt-6 border-t border-[#183D2B]/10 mt-6">
              <Link
                to="/app"
                className="text-xs font-bold text-[#1B4A45] hover:text-[#092421] flex items-center gap-1 group-hover:gap-1.5 transition-all"
              >
                <span>Explore detection pipeline</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-3xl bg-white border border-[#183D2B]/15 shadow-soft hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#FEE2E2] text-[#991B1B] flex items-center justify-center border border-[#FECACA] group-hover:scale-105 transition-transform">
                <Flame className="w-6 h-6 text-[#DC2626]" />
              </div>
              <h3 className="text-lg font-serif font-bold text-[#102F24]">Hotspot Spatial Radar</h3>
              <p className="text-xs text-[#52665B] leading-relaxed">
                Algorithmic spatial density clustering pinpoints chronic illegal dumping corridors and high-risk
                monsoon drainage chokepoints.
              </p>
            </div>
            <div className="pt-6 border-t border-[#183D2B]/10 mt-6">
              <Link
                to="/hotspots"
                className="text-xs font-bold text-[#1B4A45] hover:text-[#092421] flex items-center gap-1 group-hover:gap-1.5 transition-all"
              >
                <span>View Hotspots Hub</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 4 */}
          <div className="p-6 rounded-3xl bg-white border border-[#183D2B]/15 shadow-soft hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EAF5EC] text-[#14532D] flex items-center justify-center border border-[#BBF7D0] group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6 text-[#16A34A]" />
              </div>
              <h3 className="text-lg font-serif font-bold text-[#102F24]">Verified Municipal Action</h3>
              <p className="text-xs text-[#52665B] leading-relaxed">
                Closed-loop sanitation dispatch with mandatory photographic before-and-after proof before any
                task can be certified complete.
              </p>
            </div>
            <div className="pt-6 border-t border-[#183D2B]/10 mt-6">
              <Link
                to="/cleanups"
                className="text-xs font-bold text-[#1B4A45] hover:text-[#092421] flex items-center gap-1 group-hover:gap-1.5 transition-all"
              >
                <span>Inspect Cleanups Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          04. THREE USER PATHWAYS (DIRECT ENTRY INTO MAIN WEBSITE)
          ========================================================================= */}
      <section id="audience" className="bg-[#FAF5EF] py-16 sm:py-24 border-y border-[#E4D2BF]/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#102F24] tracking-tight">
              Designed For Every Civic Stakeholder
            </h2>
            <p className="text-sm text-[#52665B] font-medium leading-relaxed">
              Select your role to access the dedicated tools and operational dashboards in the main application.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pathway 1: Citizen */}
            <div className="bg-white rounded-3xl p-8 border border-[#183D2B]/15 shadow-soft flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-[#DEF5F1] text-[#092421] flex items-center justify-center border border-[#98E0D5]">
                  <Users className="w-5 h-5 text-[#1B4A45]" />
                </div>
                <h3 className="text-xl font-serif font-bold text-[#102F24]">For Citizens & Volunteers</h3>
                <p className="text-xs text-[#52665B] leading-relaxed">
                  Report street-level trash with your phone, track verification progress in real time, view your
                  personal resolution history, and earn civic stewardship karma.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-[#183D2B]/10 space-y-2">
                <Link to="/report" className="block">
                  <Button variant="primary" size="sm" className="w-full bg-[#102F24] text-white font-bold text-xs">
                    File a New Report
                  </Button>
                </Link>
                <Link to="/dashboard" className="block">
                  <Button variant="ghost" size="sm" className="w-full text-[#102F24] font-bold text-xs">
                    Citizen Dashboard →
                  </Button>
                </Link>
              </div>
            </div>

            {/* Pathway 2: Municipalities */}
            <div className="bg-white rounded-3xl p-8 border-2 border-[#1B4A45]/40 shadow-md flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#092421] text-[#74D7CB] text-[10px] font-mono font-black uppercase px-3 py-1 rounded-bl-xl border-l border-b border-[#1B4A45]">
                Official Access
              </div>
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-[#092421] text-[#74D7CB] flex items-center justify-center border border-[#1B4A45]">
                  <Building2 className="w-5 h-5 text-[#74D7CB]" />
                </div>
                <h3 className="text-xl font-serif font-bold text-[#102F24]">For Municipal Corporations</h3>
                <p className="text-xs text-[#52665B] leading-relaxed">
                  Zonal officers triage reported incidents, monitor contractor SLA compliance, dispatch cleanup
                  squads, and review certified photographic evidence.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-[#183D2B]/10 space-y-2">
                <Link to="/admin" className="block">
                  <Button variant="pista" size="sm" glow className="w-full font-black text-xs">
                    Command Center Login
                  </Button>
                </Link>
                <Link to="/cleanups" className="block">
                  <Button variant="ghost" size="sm" className="w-full text-[#102F24] font-bold text-xs">
                    Cleanup Work Orders →
                  </Button>
                </Link>
              </div>
            </div>

            {/* Pathway 3: Researchers & Public */}
            <div className="bg-white rounded-3xl p-8 border border-[#183D2B]/15 shadow-soft flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-[#DEF5F1] text-[#092421] flex items-center justify-center border border-[#98E0D5]">
                  <BarChart3 className="w-5 h-5 text-[#1B4A45]" />
                </div>
                <h3 className="text-xl font-serif font-bold text-[#102F24]">For Researchers & Planners</h3>
                <p className="text-xs text-[#52665B] leading-relaxed">
                  Access transparent city-wide environmental cartography, analyze chronic waste generation trends
                  across wards, and export verified datasets.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-[#183D2B]/10 space-y-2">
                <Link to="/map" className="block">
                  <Button variant="outline" size="sm" className="w-full font-bold text-xs border-[#183D2B]/30">
                    Open Public Cartography
                  </Button>
                </Link>
                <Link to="/hotspots" className="block">
                  <Button variant="ghost" size="sm" className="w-full text-[#102F24] font-bold text-xs">
                    Hotspot Radar →
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          05. FINAL LAUNCH PLATFORM CALL-TO-ACTION
          ========================================================================= */}
      <section id="launch" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-[#092421] text-white p-8 sm:p-12 lg:p-16 relative overflow-hidden shadow-2xl border-2 border-[#74D7CB]">
          {/* Subtle Background Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#74D7CB]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1B4A45] text-[#74D7CB] text-xs font-mono font-bold border border-[#74D7CB]/40">
              <Sparkles className="w-3.5 h-3.5 text-[#74D7CB]" />
              <span>Ready for Immediate Deployment</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight text-white leading-tight">
              Ready to explore the active environmental platform?
            </h2>

            <p className="text-sm sm:text-base text-[#C4EAE2] font-medium leading-relaxed max-w-2xl">
              Access the interactive live map, municipal command center, or submit crowdsourced litter reports directly in the main platform.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <Link to="/app">
                <Button
                  variant="pista"
                  size="lg"
                  icon={Compass}
                  glow
                  className="w-full sm:w-auto font-black text-sm px-8 py-3.5 shadow-xl font-mono uppercase tracking-wider"
                >
                  Enter Main Platform
                </Button>
              </Link>

              <Link to="/login">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto text-[#74D7CB] border-[#74D7CB]/60 hover:bg-white/10 font-bold text-sm px-6 py-3.5"
                >
                  Sign In to Your Account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
