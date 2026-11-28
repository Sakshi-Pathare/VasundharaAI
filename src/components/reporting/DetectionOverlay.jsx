import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Tag,
  ShieldCheck,
  Edit3,
  X,
  Check,
  Info,
  Clock,
  Camera,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { reportService } from '../../services/reportService';

export function DetectionOverlay({
  imageUrl,
  detections = [],
  detectionNote = '',
  aiStatus = 'unavailable',
  reportId = null,
  currentCategory = 'mixed',
  onReviewSubmitted = null,
  isEditable = false,
}) {
  const [showBoxes, setShowBoxes] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(currentCategory);
  const [reviewNote, setReviewNote] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const hasDetections = Array.isArray(detections) && detections.length > 0;

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reportId) return;

    setSubmittingReview(true);
    try {
      const updated = await reportService.reviewReportDetections(reportId, {
        verifiedCategory: selectedCategory,
        note: reviewNote,
        corrections: detections.map((det, idx) => ({
          detectionIndex: idx,
          label: det.label,
          category: det.category,
        })),
      });

      setReviewSuccess(true);
      setTimeout(() => {
        setReviewSuccess(false);
        setIsReviewing(false);
      }, 2000);

      if (onReviewSubmitted) {
        onReviewSubmitted(updated);
      }
    } catch (err) {
      console.error('Failed to submit detection review:', err);
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="space-y-3 font-sans">
      {/* Image Container with Bounding Box SVG/HTML Overlay */}
      <div className="relative rounded-2xl overflow-hidden bg-black/5 border border-sage-200 shadow-soft group select-none">
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt="Incident Evidence"
              className="w-full h-auto max-h-96 object-contain block mx-auto"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.parentElement.querySelector('.overlay-img-fallback');
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            <div className="overlay-img-fallback hidden h-56 w-full bg-gradient-to-br from-[#10241B] via-[#1B4332] to-[#092421] flex-col items-center justify-center p-6 text-center select-none text-white">
              <Camera className="w-10 h-10 text-[#74D7CB] mb-2" />
              <h4 className="font-bold text-sm text-[#DEF5F1] tracking-wide">Vasundhara AI • Civic Evidence Record</h4>
              <p className="text-xs text-[#98E0D5] mt-1">Field photograph logged and registered in municipal ledger</p>
            </div>
          </>
        ) : (
          <div className="h-48 flex items-center justify-center text-charcoal-400 text-xs">
            No image attached
          </div>
        )}

        {/* Scalable Bounding Boxes (normalized [0-1] coordinates) */}
        {showBoxes && hasDetections && (
          <div className="absolute inset-0 pointer-events-none">
            {detections.map((det, idx) => {
              const norm = det.boxNormalized;
              if (!norm || norm.length !== 4) return null;

              const left = `${(norm[0] * 100).toFixed(2)}%`;
              const top = `${(norm[1] * 100).toFixed(2)}%`;
              const width = `${((norm[2] - norm[0]) * 100).toFixed(2)}%`;
              const height = `${((norm[3] - norm[1]) * 100).toFixed(2)}%`;

              const isHovered = hoveredIndex === idx;

              return (
                <div
                  key={idx}
                  style={{ left, top, width, height }}
                  className={`absolute transition-all duration-150 pointer-events-auto border-2 ${
                    isHovered
                      ? 'border-[#74D7CB] bg-[#74D7CB]/25 shadow-lg z-20'
                      : 'border-[#1B4A45] bg-[#1B4A45]/15 z-10'
                  }`}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <span
                    className={`absolute -top-6 left-0 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap transition-all ${
                      isHovered
                        ? 'bg-[#092421] text-[#74D7CB] scale-105'
                        : 'bg-[#1B4A45] text-white'
                    }`}
                  >
                    {det.displayLabel || det.label} ({((det.confidence || 0) * 100).toFixed(0)}%)
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Bounding Box Control Pill */}
        {hasDetections && (
          <div className="absolute top-3 right-3 z-30">
            <button
              type="button"
              onClick={() => setShowBoxes(!showBoxes)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#092421]/80 hover:bg-[#092421] backdrop-blur-md text-[#74D7CB] text-xs font-bold border border-[#74D7CB]/40 shadow-soft transition-all"
            >
              {showBoxes ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Hide Bounding Boxes</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>Show Bounding Boxes ({detections.length})</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Detections Strip or Limitation Information */}
      <div className="p-3.5 rounded-xl bg-sage-50 border border-sage-200 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-[#092421]">
            <Sparkles className="w-4 h-4 text-[#1B4A45]" />
            <span>Computer Vision Inference</span>
          </div>

          <div className="flex items-center gap-2">
            {hasDetections ? (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                {detections.length} Object(s) Tagged
              </span>
            ) : (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                Manual Review Mode
              </span>
            )}

            {isEditable && !isReviewing && (
              <Button
                variant="outline"
                size="sm"
                icon={Edit3}
                onClick={() => setIsReviewing(true)}
                className="text-[11px] py-1 px-2.5 h-7"
              >
                Review Detection
              </Button>
            )}
          </div>
        </div>

        <p className="text-charcoal-700 text-[11px] leading-relaxed">
          {detectionNote ||
            (hasDetections
              ? `YOLO identified ${detections.length} waste item(s). Confirm classification during triage.`
              : 'Trained model weights unconfigured. Civic waste classification requires fine-tuning on the open-source TACO (Trash Annotations in Context, CC BY 4.0) dataset.')}
        </p>

        {/* Detected Tags Pills */}
        {hasDetections && (
          <div className="flex flex-wrap gap-2 pt-1">
            {detections.map((det, idx) => (
              <span
                key={idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer border ${
                  hoveredIndex === idx
                    ? 'bg-[#DEF5F1] text-[#092421] border-[#74D7CB] shadow-xs'
                    : 'bg-white text-charcoal-800 border-sage-200'
                }`}
              >
                <Tag className="w-3 h-3 text-[#1B4A45]" />
                <span>{det.displayLabel || det.label}</span>
                <span className="text-emerald-700 font-bold">
                  {((det.confidence || 0) * 100).toFixed(0)}%
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Supervisor Review / Classification Correction Drawer */}
      {isReviewing && (
        <form
          onSubmit={handleReviewSubmit}
          className="p-4 rounded-xl bg-white border-2 border-forest-300 shadow-soft space-y-3 animate-fadeIn"
        >
          <div className="flex items-center justify-between pb-2 border-b border-sage-200">
            <span className="font-extrabold text-[#092421] text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-forest-700" />
              Municipal Supervisor Classification Review
            </span>
            <button
              type="button"
              onClick={() => setIsReviewing(false)}
              className="p-1 rounded text-charcoal-400 hover:text-charcoal-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-charcoal-800 mb-1">
                Verified Waste Stream
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-sage-300 bg-white font-semibold"
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
              <label className="block font-bold text-charcoal-800 mb-1">
                Audit Justification / Correction Notes
              </label>
              <input
                type="text"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="e.g. Verified by sanitation supervisor; corrected label"
                className="w-full px-3 py-2 text-xs rounded-lg border border-sage-300 bg-white"
              />
            </div>
          </div>

          {reviewSuccess && (
            <div className="p-2 rounded bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Audit review recorded successfully.</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsReviewing(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="pista"
              size="sm"
              loading={submittingReview}
              className="font-bold"
            >
              Confirm Classification
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
