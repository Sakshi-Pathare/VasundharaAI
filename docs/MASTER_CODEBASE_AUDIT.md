# Vasundhara AI — Master Codebase Audit
**Authoritative Architectural Report**  
**Date:** November 2026 | **Version:** 2.1.0  
**Status:** Architecture Stabilized & Duplicate Trees Resolved

---

## 1. Executive Summary

Vasundhara AI (formerly Vasundhara AI) is a sovereign smart-city environmental monitoring and municipal litter intelligence platform. It provides civic crowdsourced litter reporting, YOLO-assisted image diagnostics, interactive Leaflet/OSM geospatial cartography, automated recurrence hotspot calculation, isolated municipal dispatch workflows, and verified before-and-after remediation audits.

This audit establishes the **authoritative codebase baseline**, eliminates conflicting duplicate directory trees, documents the state of all frontend and backend services, assesses security and data flow, and establishes the blueprint for production PostgreSQL and FastAPI integration.

---

## 2. Directory Structure & Authoritative Trees

### 2.1 Redundant Tree Resolution
Previously, the repository contained a redundant root directory called `VasundharaAI-legacy/` which mirrored parts of the project with outdated components and caused developer confusion.

- **Authoritative React Frontend:** Root `/src`
  - Houses the full 12-section long-scrolling public landing website (`/`), the operational application portal (`/app`), dark-green navigation/footer theme, and unified Maharashtra telemetry datasets.
  - Preserved and integrated `SuperAdminPage.jsx`, `superAdminService.js`, and `ApiConnectionNotice.jsx` into the root.
- **Authoritative FastAPI Backend:** Root `/backend`
  - Contains all SQLAlchemy models (`models.py`), FastAPI route definitions (`api.py`), jurisdiction & boundary ray-casting algorithms (`jurisdiction.py`), security & session management (`security.py`), and YOLO detection hooks (`vision.py`).
- **Resolution:** `VasundharaAI-legacy/` has been completely purged from the repository after migrating unique assets into root `/src` and `/docs`.

```
evs-final/
├── backend/                  # Authoritative FastAPI Backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── api.py           # REST route handlers & schema validation
│   │   ├── database.py      # SQLAlchemy engine, session & auto-migration
│   │   ├── jurisdiction.py  # GeoJSON polygon point-in-polygon & distance
│   │   ├── main.py          # FastAPI app factory, CORS, static mounts
│   │   ├── models.py        # SQLAlchemy relational entities
│   │   ├── security.py      # PBKDF2-SHA256 password hashing & Bearer auth
│   │   └── vision.py        # YOLOv8 object detection integration hooks
│   ├── tests/
│   │   └── test_api.py      # 9 comprehensive multi-tenant isolation tests
│   ├── uploads/             # Managed local storage for incident photography
│   ├── .env.example
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   └── requirements-ai.txt
├── docs/                     # Architectural, audit, and design records
│   ├── MASTER_CODEBASE_AUDIT.md
│   ├── FEATURE_IMPLEMENTATION_MATRIX.md
│   ├── KNOWN_BUGS.md
│   ├── INTEGRATION_ROADMAP.md
│   └── ARCHITECTURE.md
├── public/                   # Static browser assets
│   ├── images/              # High-res logos, hero banners, textures
│   └── leaf.svg
├── src/                      # Authoritative React 18 + Vite Frontend
│   ├── components/
│   │   ├── common/          # Atomic UI widgets (Button, Card, Badge, Modal, Navbar, Footer)
│   │   ├── forms/           # Form inputs & ImageUploader
│   │   ├── landing/         # 12 editorial storytelling sections for public portal
│   │   └── map/             # Leaflet GIS cartography, custom SVG pin markers
│   ├── contexts/            # React AuthContext (multi-role state & demo profiles)
│   ├── data/                # Maharashtra localized mock data & baseline seeds
│   ├── hooks/               # useScrollReveal (IntersectionObserver)
│   ├── layouts/             # LandingLayout (public) & AppLayout (operational app)
│   ├── pages/               # 10 core application and portal views
│   ├── services/            # Client abstraction services (API, Auth, Reports, Hotspots, Cleanups)
│   └── utils/               # Date, formatting, geo-distance, IndexedDB helpers
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.js
```

---

## 3. Technology Stack & Runtime Verification

| Layer | Technology | Version | Verification Method | Status |
|---|---|---|---|---|
| **Frontend Framework** | React | 18.3.1 | `npm run build` | Operational |
| **Bundler & Dev Server** | Vite | 5.4.21 | HMR on port 3000 | Operational |
| **Styling Engine** | Tailwind CSS | 3.4.13 | PostCSS compilation | Operational |
| **Mapping Engine** | Leaflet / React-Leaflet | 1.9.4 / 4.2.1 | OSM vector tiles + GeoJSON | Operational |
| **Charting Engine** | Recharts | 2.13.0 | Responsive SVG charts | Operational |
| **Backend Framework** | FastAPI | 0.115+ (0.141 installed) | Uvicorn ASGI server | Operational |
| **ORM / Data Layer** | SQLAlchemy | 2.0+ (2.0.52 installed) | Declarative 2.0 models | Operational |
| **Database Engine** | PostgreSQL / SQLite fallback | 3.2+ (psycopg3) | In-memory / file verified | Operational |
| **AI Inference** | Ultralytics YOLOv8 | 8.3+ | `vision.py` detector hooks | Staged / Graceful Fallback |
| **Testing Harness** | Pytest | 9.1.1 | 9/9 Backend tests passing | Passing |

---

## 4. Subsystem Audits & Findings

### 4.1 Frontend Architecture
- **Two-Stage Separation:**
  1. **Stage 1 (Public Portal `/`):** Powered by `LandingLayout.jsx` and 12 modular landing components in `src/components/landing/`. Educates citizens, showcases GIS previews, and introduces platform capabilities without exposing high-density operational views prematurely.
  2. **Stage 2 (Operational Application `/app`, `/map`, `/dashboard`, etc.):** Powered by `AppLayout.jsx` with subtle botanical background watermark (`sidebar-botanical-vertical.jpg` at 13% opacity), persistent operational navigation, and direct access to workflows.
- **Client Service Layer:**
  - `src/services/apiClient.js`: Configured for `/api/v1` with Vite proxy to `http://localhost:8001`.
  - Currently, frontend services (`reportService.js`, `cleanupService.js`, `hotspotService.js`, `analyticsService.js`, `authService.js`) operate against local browser caches (`localStorage` and `IndexedDB`) with simulated network roundtrips.
  - `VasundharaAI-legacy` contained direct fetch calls to the FastAPI endpoints; this service layer must be unified and connected to the backend with robust connection retry logic.

### 4.2 Backend Architecture & Multi-Tenancy
- **Jurisdiction & Territorial Isolation:**
  - The backend implements a sovereign multi-tenant architecture where reports are bound to municipalities (`Municipality`) and wards (`WardBoundary`).
  - Reports submitted within municipal boundaries are assigned to the respective municipal corporation automatically via point-in-polygon ray-casting (`jurisdiction.py`).
  - Reports submitted outside known municipal boundaries or within 25 meters of a contentious border are tagged `jurisdiction_status="pending"` and quarantined for Super Admin triage.
  - Municipal officers (`role="municipal_admin"`) are strictly isolated to their tenant's data: they cannot view, modify, or delete reports from other municipalities.

### 4.3 Authentication & Security
- **Hashing:** Implements `PBKDF2-HMAC-SHA256` with 310,000 iterations and 16-byte random salt.
- **Tokens:** High-entropy 36-byte random Bearer session tokens with SHA-256 database hashing (`AuthSession`), 12-hour expiration, and explicit logout revocation.
- **Role Hierarchy:**
  - `citizen`: Can submit reports, view own submission history (`/reports/mine`), track status, earn eco-points.
  - `municipal_admin`: Tenant-isolated access to municipal inbox, cleanup dispatch, internal notes, ward telemetry, and CSV exports.
  - `routing_officer`: Cross-jurisdiction triage authority for ambiguous reports.
  - `super_admin`: Platform governor with authority to onboard municipalities, upload GeoJSON boundaries, provision admins, and resolve boundary disputes.
- **Audit Logging:** Every critical action (status change, task assignment, note addition, jurisdiction override) writes an immutable record to `audit_logs`.

### 4.4 Artificial Intelligence & Computer Vision (YOLO)
- `backend/app/vision.py` implements an LRU-cached detector hook for Ultralytics YOLOv8.
- When `YOLO_MODEL_PATH` is configured and model weights exist, images uploaded via report submission are automatically scanned for litter classes, returning bounding boxes, confidences, and labels.
- When no model is configured, the system degrades gracefully with clear diagnostics: `"AI detector not configured; report classification is user-provided."`

---

## 5. Verification Results

1. **Frontend Compilation:**
   ```bash
   npm run build
   # Result: 2472 modules transformed. Built in 9.20s with 0 errors.
   ```
2. **Backend Automated Pytest Suite:**
   ```bash
   pytest tests/test_api.py -v
   # Result: 9 passed, 1 warning in 8.30s (100% passing).
   ```
   - `test_report_is_routed_from_coordinates_and_frontend_tenant_fields_are_ignored` -> PASSED
   - `test_municipal_admins_are_isolated_across_reports_details_and_status_updates` -> PASSED
   - `test_admin_analytics_map_hotspots_csv_and_notifications_are_tenant_scoped` -> PASSED
   - `test_public_reports_exclude_private_data_and_admin_routes_require_authentication` -> PASSED
   - `test_ward_scope_restricts_admin_reports_without_broadening_tenant_access` -> PASSED
   - `test_unknown_and_near_boundary_reports_are_quarantined_until_superadmin_review` -> PASSED
   - `test_cleanup_lifecycle_is_scoped_and_completion_requires_after_photo` -> PASSED
   - `test_tenant_internal_notes_and_history_are_private` -> PASSED
   - `test_health_and_geojson_municipality_admin_setup` -> PASSED
