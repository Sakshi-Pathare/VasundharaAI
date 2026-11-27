# Vasundhara AI (EcoWatch AI) — Known Limitations & System Boundaries

**Document Version:** 2.0.0  
**Status:** Engineering Transparency & Technical Disclosure  
**Last Updated:** November 2026  

---

## 1. Purpose of this Document

In adherence to industry engineering standards and production transparency, this document details known architectural boundaries, non-blocking environmental constraints, and operational assumptions of the current platform.

---

## 2. Technical Limitations & Environmental Constraints

### 2.1 Cadastre & Boundary Coverage
- **Current State:** Geometric ray-casting is configured and validated for **Pune Municipal Corporation (PMC)** and **Pimpri Chinchwad Municipal Corporation (PCMC)**.
- **Limitation:** Reports submitted with GPS coordinates outside PMC and PCMC boundaries are automatically flagged with `jurisdiction_status = "quarantined"` to prevent misrouting.
- **Remediation / Roadmap:** The Super Administrator dashboard (`/superadmin`) provides an interface to upload additional municipal GeoJSON boundary cadastre files (e.g., BMC Mumbai, TMC Thane, PCMC expansions) without codebase modifications.

### 2.2 Computer Vision & Weight Estimation
- **Current State:** The vision module (`backend/app/vision.py`) incorporates a YOLOv8-compatible inference pipeline using the open-source TACO taxonomy. In development or test environments where local PyTorch weights (`yolov8_waste.pt`) are not present, the system gracefully operates in **heuristic fallback mode**, logging transparent triage notes without failing submissions.
- **Physical Boundary:** Computer vision operates on 2D photographic images and **cannot physically measure volumetric mass or weight (kg)** without multi-view photogrammetry or density sensors. Estimated waste weights recorded in the database represent citizen estimates or post-remediation weighbridge figures measured at municipal baling centers.

### 2.3 Local Storage vs. Stateless Cloud Storage
- **Current State:** Uploaded before/after evidence photographs are stored on disk at `backend/uploads` with unique hexadecimal filenames and magic-byte validation.
- **Limitation:** If deployed in stateless container environments (e.g. AWS Lambda, Google Cloud Run) without persistent disk mounts, uploaded images will be lost when container instances scale down or restart.
- **Remediation / Roadmap:** For distributed cloud deployments, configure persistent Docker block volumes (`uploads_data`) or integrate an S3-compatible object store (AWS S3, Cloudflare R2, MinIO) by setting the storage provider configuration.

### 2.4 Database Concurrency & Horizontal Scaling
- **Current State:** The application supports both SQLite (with WAL mode enabled) and PostgreSQL 15+.
- **Limitation:** While SQLite easily handles 100+ concurrent reads and local testing, SQLite restricts write operations to a single process lock. Production multi-worker deployments (e.g. Uvicorn with 4+ worker processes) MUST use PostgreSQL with PgBouncer connection pooling to avoid `sqlite3.OperationalError: database is locked`.

### 2.5 Offline Mobile PWA Caching
- **Current State:** The web application is fully responsive on mobile viewports with touch targets $\ge 44\text{px}$.
- **Limitation:** ServiceWorker background sync for offline report queuing is not yet integrated. Citizens filing reports in areas without active cellular connectivity must maintain the page open until a network connection is re-established.
- **Remediation / Roadmap:** Phase 3 roadmap includes Workbox-based IndexedDB offline report queuing with automatic background transmission upon network restoration.

---

## 3. Engineering Sign-Off

None of the above limitations compromise platform security, multi-tenant isolation, or data integrity. All limitations degrade gracefully with user-facing diagnostic indicators.
