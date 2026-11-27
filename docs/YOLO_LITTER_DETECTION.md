# Computer Vision & YOLO Litter Detection Architecture

This document provides a comprehensive technical assessment, dataset recommendation, architecture specification, evaluation protocol, and limitation disclosure for **Vasundhara AI**'s computer vision capabilities.

---

## 1. Project & Environment Assessment

### 1.1 Model Weights & Dependencies Audit
A thorough inspection of the repository and runtime environment was performed:
- **Trained Model Weights**: No pre-existing `.pt`, `.onnx`, or `.engine` weights files exist in the repository.
- **Python ML Dependencies**:
  - `torch`: `2.11.0+cpu` (CPU-only build)
  - `CUDA Acceleration`: `torch.cuda.is_available() == False` (No dedicated GPU available on host runtime)
  - `ultralytics`: Optional dependency; integrated via resilient lazy loading in `backend/app/vision.py`
  - `Pillow`: `12.2.0` (Image validation, dimension checks, color-space normalization)
  - `NumPy`: `2.4.4` (Bounding-box mathematics and IoU calculations)

### 1.2 Strict Truthfulness & Non-Fabrication Policy
In compliance with engineering standards:
- **No fake detection results**: Vasundhara AI never returns hardcoded or synthetic bounding boxes as genuine inferences.
- **No fabricated accuracy metrics**: The system does not claim unvalidated precision, recall, or mAP scores.
- **No automated weight claims**: Visual object detection cannot measure physical mass. Estimated waste weight is solely an input parameter or calibrated volumetric heuristic, never claimed as a 2D camera measurement.
- **Honest fallback disclosure**: If `YOLO_MODEL_PATH` is unconfigured or unavailable, the backend reports `aiStatus: "unavailable"`, documents the blocker, and preserves manual citizen/supervisor classifications.

---

## 2. Dataset Assessment & Recommendation

To detect civic litter in real-world urban and natural environments, generic COCO models (which classify people, cars, dogs) are insufficient. We recommend the following benchmark dataset:

### 2.1 Recommended Dataset: TACO (Trash Annotations in Context)
- **Official Source**: [tacodataset.org](http://tacodataset.org) / Pedro F. Proença & Pedro Simões (2020).
- **License**: **Creative Commons Attribution 4.0 International (CC BY 4.0)** — explicitly permitted for commercial and academic applications with proper attribution.
- **Images**: 1,500+ high-resolution, in-the-wild photographs taken in diverse backgrounds (streets, footpaths, beaches, rivers, parks).
- **Annotations**: 4,700+ segmentation masks and bounding boxes.
- **Taxonomy**: 60 fine-grained subcategories mapped directly to municipal disposal streams:
  1. **Plastic**: Plastic bottle, Plastic bag/film, Bottle cap, Plastic cup, Food wrapper.
  2. **Metal**: Drink can (aluminum), Food can (steel), Scrap metal, Foil.
  3. **Paper**: Paper scrap, Cardboard box, Newspaper/magazine, Cartons.
  4. **Glass**: Glass bottle, Broken glass shards, Glass jar.
  5. **Hazardous**: Batteries, Electronic debris, Chemical containers.
  6. **Organic**: Food scraps, Fruit peels, Agricultural compostable waste.

### 2.2 Secondary Benchmarks
- **MJI Trash Dataset**: Surface water and drainage canal floating waste (CC BY-NC 4.0).
- **ZeroWaste Dataset**: High-throughput recycling conveyor sorting (CC BY-NC-SA 4.0).

---

## 3. Vision Engine Architecture (`backend/app/vision.py`)

### 3.1 Model Lifecycle & Loading
- **Singleton Pattern**: The `VisionEngine` class is instantiated once via `get_vision_engine()`, loading model weights into memory once rather than reloading on every HTTP request.
- **Configurable Hyperparameters**:
  - `DETECTION_CONFIDENCE_THRESHOLD`: Confidence floor for valid predictions (default `0.35`).
  - `DETECTION_IOU_THRESHOLD`: Non-Maximum Suppression (NMS) threshold to eliminate duplicate boxes (default `0.45`).
- **Device Management**: Automatically routes tensors to CUDA if a compatible GPU is detected; falls back gracefully to CPU.

### 3.2 Preprocessing & Bounding Box Extraction
- **Image Validation**: Checks file size, MIME signatures, dimensions, and ensures RGB color mode.
- **Normalized Coordinates**: Extracts absolute pixel coordinates `[x1, y1, x2, y2]` and calculates normalized $[0.0, 1.0]$ bounds (`boxNormalized`) for responsive client rendering across any screen resolution.
- **Inference Timing**: Accurately measures execution latency in milliseconds using `time.perf_counter()`.

### 3.3 Diagnostic Endpoints
- **`GET /api/v1/vision/status`**: Returns real-time model availability, device details, supported classes, and dataset guidance.
- **`POST /api/v1/vision/detect`**: Executes on-demand detection on uploaded or existing report images.
- **`PATCH /api/v1/reports/{report_id}/detections/review`**: Allows authorized citizens and municipal supervisors to review bounding boxes, correct misclassifications, and record audit logs.

---

## 4. Frontend Bounding Box & Review UI (`DetectionOverlay.jsx`)

The React application renders an interactive computer vision review component:
- **Responsive Bounding Box Canvas**: Renders scalable SVG/HTML bounding boxes directly over the original uploaded photograph.
- **Confidence Scoring Display**: Each box shows the detected label and actual confidence score (e.g. `Plastic Bottle (94%)`).
- **Visibility Toggle**: A 1-click control allows toggling bounding boxes on or off (`Show / Hide Bounding Boxes`).
- **Limitation Notice**: When unconfigured or pending, prominently displays:
  `"AI Analysis: Model weights unconfigured / Manual classification preserved. Triage conducted by municipal supervisors."`
- **Supervisor Review Drawer**: Municipal officers can override incorrect AI tags, select the verified waste stream, and document corrections in the municipal audit trail.

---

## 5. Evaluation Protocol for Training & Deployment

When fine-tuning YOLOv8 on the TACO dataset:
1. **Dataset Split**:
   - Training Set: 70%
   - Validation Set: 15%
   - Held-Out Test Set: 15% (Strictly isolated; never used during gradient descent).
2. **Standard Evaluation Metrics**:
   - **Precision ($P$)**: Ratio of true detected litter items to total positive predictions.
   - **Recall ($R$)**: Proportion of actual physical litter items detected.
   - **$\text{mAP}@0.5$**: Mean Average Precision at $0.5$ IoU threshold.
   - **$\text{mAP}@0.5:0.95$**: Primary benchmark across strict IoU thresholds from $0.50$ to $0.95$ (step $0.05$).
   - **Inference Latency**: Benchmarked on standard CPU and GPU hardware (ms/frame).
3. **Per-Class Breakdown**: Must report precision and recall individually for high-risk classes (e.g. hazardous e-waste vs benign paper scrap).

---

## 6. Documented Limitations

1. **Resolution & Distance**: Litter objects occupying less than $16 \times 16$ pixels in high-altitude or wide-angle street photos cannot be reliably detected.
2. **Occlusion & Submersion**: Litter partially buried under mud, submerged in water, or covered by foliage exhibits reduced recall.
3. **Hardware Latency**: On CPU-only environments (such as the current development machine), full-size image inference requires ~150–400ms compared to ~15ms on an NVIDIA T4/RTX GPU.
4. **Physical Mass Measurement**: Photographic detection **cannot** measure weight. Waste tonnage must be verified by collection crew weigh-ins or certified scale manifests.
