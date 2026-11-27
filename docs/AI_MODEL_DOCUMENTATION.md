# Vasundhara AI — Computer Vision & AI Model Documentation

**Document Version:** 2.0.0  
**Engine:** Ultralytics YOLOv8 / PyTorch Architecture  
**Dataset Standard:** TACO (Trash Annotations in Context, CC BY 4.0)  
**Status:** Integrated with Transparent Fallback & Production Telemetry  

---

## 1. Computer Vision Objectives & Architecture

The computer vision subsystem in Vasundhara AI (`backend/app/vision.py`) assists citizens and municipal triage officers by automatically classifying visible litter items and estimating incident severity from photographic evidence.

### Strict Transparency Principle
In accordance with production ethics guidelines:
1. **No Simulated Detections:** The platform never fabricates fake bounding boxes or synthetic confidence scores.
2. **Transparent Engine Diagnostics:** The `/health` and `/api/v1/vision/status` endpoints explicitly broadcast whether genuine YOLO weights are loaded (`status: "ready"`) or if the engine is running in heuristic fallback mode (`status: "heuristic_fallback"`).
3. **No Unverifiable Physical Claims:** 2D computer vision does not attempt to estimate physical weight (kg) from single-angle phone images; estimated weights remain citizen-reported and officer-validated.

---

## 2. Waste Taxonomy & Dataset Mapping

The model is structured around the **TACO (Trash Annotations in Context)** open-source dataset, licensed under **Creative Commons Attribution 4.0 International (CC BY 4.0)**.

### Supported Classes & Municipal Category Mapping

| Class ID | Internal Label | Display Title | Municipal Category | Disposal Stream |
| :---: | :--- | :--- | :--- | :--- |
| `0` | `plastic_bottle` | Plastic Beverage Bottle | `plastic` | Dry Recyclable Polymer |
| `1` | `plastic_bag` | Plastic Bag / Film | `plastic` | Single-Use Low-Density Polyethylene |
| `2` | `drink_can` | Aluminum Drink Can | `metal` | Scrap Aluminum Recycling |
| `3` | `food_can` | Tin / Steel Food Can | `metal` | Ferrous Scrap Collection |
| `4` | `paper_scrap` | Paper Scrap / Wrapper | `paper` | Paper Pulp Recycling |
| `5` | `cardboard` | Cardboard Box / Debris | `paper` | Corrugated Packaging Baler |
| `6` | `glass_bottle` | Glass Bottle / Jar | `glass` | Cullet Glass Processing |
| `7` | `hazardous_battery` | Battery / E-Waste | `hazardous` | Authorized Hazardous Disposal Facility |
| `8` | `organic_waste` | Organic Food Waste | `organic` | Wet Compost / Bio-Methanation |
| `9` | `mixed_litter` | Mixed Public Litter | `mixed` | Municipal Sorting Depot |

---

## 3. Model Inference Pipeline & Preprocessing

```
[Uploaded Image]
       │
       ▼
[Image Safety & Magic Bytes Validation] (Pillow JPEG/PNG/WebP, max 8MB)
       │
       ▼
[Resolution Normalization] (Resize to 640x640px, Letterbox aspect ratio)
       │
       ▼
[YOLOv8 Inference Engine]
       ├─ If YOLO_MODEL_PATH configured & weights present ──> [Torch Forward Pass]
       │                                                         │
       │                                                         ▼
       │                                                    [Non-Maximum Suppression (IoU 0.45)]
       │                                                         │
       │                                                         ▼
       │                                                    [Extract Bounding Boxes & Confidence]
       │
       └─ If weights absent ────────────────────────────────> [Graceful Heuristic Fallback]
                                                                 │
                                                                 ▼
                                                            [Log Diagnostic Triage Note]
       │
       ▼
[Persist Detections in Database & Attach to Incident Report]
```

### Hyperparameters
- **Input Resolution:** $640 \times 640$ pixels
- **Confidence Threshold ($\tau_{\text{conf}}$):** `0.35` (Items below 35% probability are suppressed)
- **NMS Intersection-over-Union ($\tau_{\text{iou}}$):** `0.45` (Prevents duplicate boxes on single debris items)
- **Inference Latency:**
  - NVIDIA CUDA GPU: **12–25 ms**
  - Modern CPU (x86_64): **45–120 ms**
  - Heuristic Fallback: **0.13 ms**

---

## 4. Fine-Tuning & Training Instructions

To train or fine-tune YOLOv8 on custom civic litter datasets:

```bash
# 1. Install Ultralytics dependencies
pip install ultralytics torch torchvision

# 2. Download TACO dataset annotations and partition train/val
python -m backend.scripts.prepare_taco_dataset --data-dir /data/taco

# 3. Train YOLOv8 nano/small model
yolo detect train \
    data=backend/models/taco_waste.yaml \
    model=yolov8n.pt \
    epochs=100 \
    imgsz=640 \
    batch=16 \
    project=backend/models \
    name=yolov8_waste_trained

# 4. Configure environment variable in .env
YOLO_MODEL_PATH=backend/models/yolov8_waste_trained/weights/best.pt
```

When `YOLO_MODEL_PATH` is pointed to the trained weights file, `VisionEngine` automatically validates the class mapping and loads the model into memory upon startup.
