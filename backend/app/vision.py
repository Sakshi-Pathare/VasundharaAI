"""
Vasundhara AI — YOLOv8 Computer Vision Litter Detection Module

Provides genuine object detection, model lifecycle management, bounding box
extraction, confidence scoring, and dataset documentation.

Follows strict transparency guidelines:
- Never fabricates fake detections or accuracy metrics.
- Recommends TACO (Trash Annotations in Context, CC BY 4.0) dataset for training.
- Accurately reports engine availability, hardware acceleration, and inference timing.
- Does not claim automated weight calculation from 2D photographs.
"""

import logging
import os
import time
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("ecowatch.vision")

# Standardized waste taxonomy mapped to municipal disposal streams
# Based on TACO (Trash Annotations in Context) core classes
SUPPORTED_WASTE_CLASSES: Dict[int, Dict[str, str]] = {
    0: {"label": "plastic_bottle", "category": "plastic", "display": "Plastic Bottle"},
    1: {"label": "plastic_bag", "category": "plastic", "display": "Plastic Bag / Film"},
    2: {"label": "drink_can", "category": "metal", "display": "Drink Can (Aluminum)"},
    3: {"label": "food_can", "category": "metal", "display": "Food Can (Tin/Steel)"},
    4: {"label": "paper_scrap", "category": "paper", "display": "Paper Scrap / Wrapper"},
    5: {"label": "cardboard", "category": "paper", "display": "Cardboard Box / Debris"},
    6: {"label": "glass_bottle", "category": "glass", "display": "Glass Bottle / Jar"},
    7: {"label": "hazardous_battery", "category": "hazardous", "display": "Battery / E-Waste"},
    8: {"label": "organic_waste", "category": "organic", "display": "Organic Food Waste"},
    9: {"label": "mixed_litter", "category": "mixed", "display": "Mixed Public Litter"},
}

DEFAULT_CONFIDENCE_THRESHOLD = 0.35
DEFAULT_IOU_THRESHOLD = 0.45


class VisionEngine:
    """
    Singleton YOLO vision engine managing model loading, image preprocessing,
    bounding-box extraction, and inference timing.
    """

    def __init__(self):
        self.model_path_str: str = os.getenv("YOLO_MODEL_PATH", "").strip()
        self.confidence_threshold: float = float(
            os.getenv("DETECTION_CONFIDENCE_THRESHOLD", str(DEFAULT_CONFIDENCE_THRESHOLD))
        )
        self.iou_threshold: float = float(
            os.getenv("DETECTION_IOU_THRESHOLD", str(DEFAULT_IOU_THRESHOLD))
        )
        self._model = None
        self._initialized: bool = False
        self._init_error: Optional[str] = None
        self._model_version: str = "yolov8-custom-taco-v1"
        self._device: str = "cpu"

        self._load_model()

    def _load_model(self) -> None:
        """Loads the model once during initialization if configured."""
        if not self.model_path_str:
            self._init_error = (
                "YOLO_MODEL_PATH environment variable is not configured. "
                "Civic waste detection requires fine-tuned weights on the TACO dataset (CC BY 4.0). "
                "Reports remain classified by user and municipal supervisor triage."
            )
            return

        model_path = Path(self.model_path_str)
        if not model_path.is_file():
            self._init_error = f"Configured YOLO model file does not exist: {model_path}"
            return

        try:
            from ultralytics import YOLO
            import torch

            self._device = "cuda" if torch.cuda.is_available() else "cpu"
            self._model = YOLO(str(model_path))
            self._initialized = True
            logger.info(f"Loaded YOLO detector from {model_path} on device {self._device}")
        except ImportError as exc:
            self._init_error = (
                "Ultralytics package is not installed. "
                "Install with `pip install ultralytics` to enable YOLOv8 inference."
            )
            logger.warning(self._init_error)
        except Exception as exc:
            self._init_error = f"Failed to initialize YOLO model: {exc}"
            logger.error(self._init_error)

    @property
    def is_available(self) -> bool:
        return self._initialized and self._model is not None

    def get_diagnostics(self) -> Dict[str, Any]:
        """Returns comprehensive diagnostic and readiness information."""
        has_cuda = False
        try:
            import torch
            has_cuda = torch.cuda.is_available()
        except ImportError:
            pass

        return {
            "available": self.is_available,
            "engine": "ultralytics-yolo" if self.is_available else "unconfigured",
            "modelPath": self.model_path_str or None,
            "modelVersion": self._model_version if self.is_available else None,
            "device": self._device,
            "gpuAccelerationAvailable": has_cuda,
            "confidenceThreshold": self.confidence_threshold,
            "iouThreshold": self.iou_threshold,
            "supportedClasses": [c["label"] for c in SUPPORTED_WASTE_CLASSES.values()],
            "targetTaxonomy": [
                {"id": k, **v} for k, v in SUPPORTED_WASTE_CLASSES.items()
            ],
            "recommendedDataset": {
                "name": "TACO (Trash Annotations in Context)",
                "license": "Creative Commons Attribution 4.0 (CC BY 4.0)",
                "url": "http://tacodataset.org",
                "description": "Standard benchmark for real-world litter detection and category mapping.",
            },
            "statusMessage": (
                "YOLOv8 civic waste detector ready."
                if self.is_available
                else (self._init_error or "Detector unconfigured.")
            ),
        }

    def detect(
        self,
        image_path: Path,
        confidence_threshold: Optional[float] = None,
    ) -> Tuple[List[Dict[str, Any]], str, Dict[str, Any]]:
        """
        Runs object detection on an authentic image file.
        Returns: (detections, note, metrics)
        """
        if not self.is_available:
            return (
                [],
                self._init_error or "AI detector unconfigured; classification is user-provided.",
                {
                    "inferenceTimeMs": 0.0,
                    "objectsDetected": 0,
                    "status": "model_unavailable",
                },
            )

        resolved_path = image_path.resolve()
        if not resolved_path.is_file():
            return (
                [],
                f"Image file not found for inference: {image_path.name}",
                {"inferenceTimeMs": 0.0, "objectsDetected": 0, "status": "image_missing"},
            )

        threshold = confidence_threshold or self.confidence_threshold
        t0 = time.perf_counter()

        try:
            # Perform inference
            results = self._model.predict(
                source=str(resolved_path),
                conf=threshold,
                iou=self.iou_threshold,
                device=self._device,
                verbose=False,
            )
            elapsed_ms = (time.perf_counter() - t0) * 1000.0

            detections: List[Dict[str, Any]] = []
            for result in results:
                names = result.names
                boxes = result.boxes
                if boxes is None:
                    continue

                # Image dimensions for normalization
                orig_shape = result.orig_shape  # (height, width)
                img_h, img_w = orig_shape[0], orig_shape[1]

                for box in boxes:
                    class_id = int(box.cls.item())
                    conf = float(box.conf.item())
                    raw_coords = box.xyxy[0].tolist()  # [x1, y1, x2, y2] in pixels

                    # Compute normalized coordinates [0.0 - 1.0] for responsive frontend canvas
                    norm_coords = [
                        round(raw_coords[0] / img_w, 4),
                        round(raw_coords[1] / img_h, 4),
                        round(raw_coords[2] / img_w, 4),
                        round(raw_coords[3] / img_h, 4),
                    ]
                    pixel_coords = [round(float(v), 1) for v in raw_coords]

                    raw_label = str(names.get(class_id, f"class_{class_id}")).lower().replace(" ", "_")
                    
                    # Map to standardized municipal category
                    category = "mixed"
                    display_label = raw_label.replace("_", " ").title()
                    for item in SUPPORTED_WASTE_CLASSES.values():
                        if item["label"] == raw_label or raw_label in item["label"]:
                            category = item["category"]
                            display_label = item["display"]
                            break

                    detections.append({
                        "label": raw_label,
                        "displayLabel": display_label,
                        "category": category,
                        "confidence": round(conf, 4),
                        "box": pixel_coords,
                        "boxNormalized": norm_coords,
                        "imageDimensions": {"width": img_w, "height": img_h},
                    })

            metrics = {
                "inferenceTimeMs": round(elapsed_ms, 2),
                "objectsDetected": len(detections),
                "model": Path(self.model_path_str).name,
                "version": self._model_version,
                "device": self._device,
                "confidenceThreshold": threshold,
                "status": "completed",
            }

            if detections:
                note = (
                    f"YOLO detected {len(detections)} waste item(s) in {round(elapsed_ms, 1)}ms; "
                    "confirm classification during municipal supervisor review."
                )
            else:
                note = f"YOLO found no waste objects above confidence threshold ({threshold}) in {round(elapsed_ms, 1)}ms."

            return detections, note, metrics

        except Exception as exc:
            elapsed_ms = (time.perf_counter() - t0) * 1000.0
            logger.error(f"Inference execution failed on {image_path}: {exc}")
            return (
                [],
                f"Computer vision inference error: {exc}. Report preserved with manual classification.",
                {
                    "inferenceTimeMs": round(elapsed_ms, 2),
                    "objectsDetected": 0,
                    "status": "error",
                    "error": str(exc),
                },
            )


# Global singleton engine
_engine_instance: Optional[VisionEngine] = None


def get_vision_engine() -> VisionEngine:
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = VisionEngine()
    return _engine_instance


def detector_status() -> Dict[str, Any]:
    """Compatibility bridge for health-check and status endpoints."""
    engine = get_vision_engine()
    diag = engine.get_diagnostics()
    return {
        "available": diag["available"],
        "model": Path(diag["modelPath"]).name if diag["modelPath"] else None,
        "message": diag["statusMessage"],
    }


def detect_objects(image_path: Path) -> Tuple[List[Dict[str, Any]], str]:
    """Compatibility wrapper returning (detections, note) for report creation."""
    engine = get_vision_engine()
    detections, note, _ = engine.detect(image_path)
    return detections, note
