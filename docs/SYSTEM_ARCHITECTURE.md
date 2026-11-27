# Vasundhara AI — System Architecture

**Document Version:** 2.0.0  
**Classification:** Technical Architecture Specification  
**Status:** Approved for Production Deployment  
**Last Updated:** November 2026  

---

## 1. High-Level Architecture Overview

Vasundhara AI is engineered as an event-resilient, multi-tenant civic environmental monitoring platform. The architecture cleanly decouples client presentation from core business logic, spatial computation, and relational persistence.

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT TIER                                       |
|  React 18 SPA (Vite 5, Tailwind CSS, Leaflet GIS, Lucide, Recharts)               |
|  - Dynamic Route Code-Splitting (React.lazy / Suspense, 74 kB Initial Bundle)     |
|  - Client-Side Image Pre-Compression (1200x1200px max, WebP/JPEG, ~70% savings)    |
|  - Session Token Storage with In-Memory Axios/Fetch Interceptors                   |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼ HTTPS / TLS 1.3
+-----------------------------------------------------------------------------------+
|                             INGRESS & REVERSE PROXY                               |
|  Nginx 1.25 Alpine Container                                                      |
|  - SSL/TLS Termination, Gzip Compression, Security Headers (CSP, HSTS, X-Frame)   |
|  - Static Asset Caching (1y Immutable Hashed Assets; no-cache for index.html)     |
|  - Reverse Proxy routing: /api/ -> backend:8001, /static/uploads/ -> backend:8001 |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼ Internal Docker Network (vasundhara_net)
+-----------------------------------------------------------------------------------+
|                              APPLICATION TIER                                     |
|  FastAPI (Python 3.11+ ASGI Server via Uvicorn)                                    |
|                                                                                   |
|  ┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐  |
|  │  Security & Auth      │  │  Spatial Engine       │  │  Computer Vision      │  |
|  │  - PBKDF2 (310k iter) │  │  - Ray-Casting Cadastre│  │  - YOLOv8 Waste Cls   │  |
|  │  - SHA-256 Token Hash │  │  - 300m Clustering     │  │  - TACO Taxonomy      │  |
|  │  - Rate Limiting      │  │  - Deduplication       │  │  - Heuristic Fallback │  |
|  │  - RBAC Scope Guard   │  │  - 5-Factor Priority   │  │  - Confidence Bounds  │  |
|  └───────────────────────┘  └───────────────────────┘  └───────────────────────┘  |
|  ┌─────────────────────────────────────────────────────────────────────────────┐  |
|  │ Middleware: X-Request-ID Tracing, Global Error Envelope, DB Session Scope   │  |
|  └─────────────────────────────────────────────────────────────────────────────┘  |
+-----------------------------------------------------------------------------------+
                         │                                    │
                         ▼                                    ▼
+------------------------------------+    +------------------------------------+
|          PERSISTENCE TIER          |    |           STORAGE TIER             |
|  PostgreSQL 16 (or SQLite WAL)     |    |  Persistent Docker Volume / S3     |
|  - ACID Transaction Isolation      |    |  - Uploaded Image Evidence         |
|  - Spatial & Composite Indexes     |    |  - Model Weights Cache (/models)   |
|  - Auto Exception Rollback         |    |  - Database Online Backups         |
+------------------------------------+    +------------------------------------+
```

---

## 2. Core Architectural Subsystems

### 2.1 Citizen Reporting & Image Ingestion Pipeline
1. **Client-Side Optimization:** Citizen uploads a photograph (camera or disk). Before network transmission, `ImageUploader` rescales oversized mobile camera images (often 8–15 MB) to a maximum $1200\times1200\text{px}$ dimension at 0.72 quality, reducing payload size by ~70% without perceptible loss in visual fidelity.
2. **Defensive Ingestion:** The backend reads the raw bytes, performs **magic number verification** (ensuring headers match `\xff\xd8\xff` for JPEG, `\x89PNG` for PNG, or `RIFF...WEBP` for WebP), rejects scripts disguised as images, enforces strict $8\text{ MB}$ thresholds, and saves with a cryptographically randomized hex filename (`upload_<hex>.jpg`).
3. **Automated Ray-Casting Jurisdiction Assignment:** The coordinates are matched against the municipal boundaries of Pune Municipal Corporation (PMC) and Pimpri Chinchwad Municipal Corporation (PCMC) using geometric ray-casting. Reports outside known boundaries are quarantined for administrative review.
4. **Computer Vision Triage:** The image is passed to the YOLOv8 vision engine. If model weights are loaded, bounding boxes and waste classes (plastic, metal, paper, hazardous, glass) are extracted. If weights are not installed, the engine gracefully transitions to heuristic analysis, logging an informative triage note without failing the submission.

### 2.2 Geospatial Hotspot Intelligence & Priority Calculation
To prevent single overflowing dumpsters from artificially skewing statistics, the engine employs a two-tier spatial algorithm:
1. **Incident Deduplication:** Proximate submissions within a spatial radius of $\le 30\text{m}$ and a temporal window of $\le 48\text{h}$ are grouped as multiple reports of the *same physical incident*.
2. **Cluster Accumulation:** Distinct incidents within a configurable clustering distance ($\le 300\text{m}$) form a Hotspot Cluster (`HOT-<MUNICIPALITY>-<INDEX>`).
3. **5-Factor Normalized Priority Score:**
   $$\text{Priority Score} = \sum_{i=1}^5 (w_i \times S_i) \in [1, 100]$$
   - **Waste Severity (30%):** Weighted average of hazardous (100), high (85), medium (55), and low (25) reports.
   - **Report Recurrence (25%):** Logarithmic scale based on deduplicated distinct incident count.
   - **Cleanup Lag (20%):** Days elapsed since oldest uncleaned report or time since last verified remediation.
   - **Environmental Sensitivity (15%):** Proximity to water bodies (Mutha river, canals), schools, parks, or hospitals.
   - **Report Recency (10%):** Decay penalty for aging incidents.

### 2.3 Remediation Lifecycle & Chain-of-Custody Verification
Remediation follows a strict finite state machine:
$$\text{Pending} \xrightarrow{\text{Admin Verify}} \text{Verified} \xrightarrow{\text{Dispatch}} \text{Assigned} \xrightarrow{\text{Squad Start}} \text{In Progress} \xrightarrow{\text{After-Photo}} \text{Awaiting Verification} \xrightarrow{\text{Admin Certify}} \text{Cleaned}$$

- **Chain-of-Custody Rule:** A task cannot be marked completed or verified without uploading authentic after-cleanup photographic evidence.
- **Audit Traceability:** Every status change writes an immutable record to `audit_logs` capturing the actor user ID, previous state, new state, timestamp, and optional administrative notes.

---

## 3. Multi-Tenant Security & Isolation Architecture

1. **Role-Based Access Control (RBAC):**
   - `super_admin`: Platform governance, cross-municipal audit, boundary cadastre updates.
   - `municipal_admin`: Tenant-isolated operations. An officer from PMC cannot inspect, query, verify, or dispatch cleanups for incidents assigned to PCMC. Attempted cross-tenant queries return HTTP 404 (concealed) rather than 403 to prevent identifier enumeration.
   - `citizen`: Can file reports and query public metrics/maps. In personal ledger (`/reports/mine`), citizens only see their own submissions.
2. **Public Data Sanitization:**
   - Public map and report listings (`/api/v1/public/reports`) strip all PII (reporter name, phone, email, and municipal internal notes).
3. **Session Revocation:**
   - Instead of unrevokable stateless JWTs, sessions are stored as SHA-256 hashes in `auth_sessions`. When a user logs out, the hash is immediately deleted from the database, invalidating the bearer token in real-time.

---

## 4. Operational Reliability & Resilience

- **Atomic Transactions & Auto-Rollback:** All database operations utilize SQLAlchemy's scoped session pattern. Any uncaught exception triggers an immediate `db.rollback()`, preventing orphaned or partial records.
- **Orchestration Probes:**
  - `GET /health`: Liveness probe reporting API version, environment mode, and uptime.
  - `GET /ready`: Readiness probe confirming active database connectivity, read-write access to upload storage volume, and detector status.
- **Backups:** Online SQLite backup API and PostgreSQL `pg_dump` automation scripts with SHA-256 checksum verification and 30-day retention policies.
