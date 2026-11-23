# Vasundhara AI — Step-by-Step Integration Roadmap

This roadmap defines the precise sequence of engineering operations required to migrate Vasundhara AI from mock/localStorage simulation to an enterprise-grade, persistent PostgreSQL and FastAPI production deployment.

---

## Phase 1: Codebase Audit & Baseline Stabilization [COMPLETED]
- [x] Inspect all frontend components, routes, and services.
- [x] Inspect FastAPI routes, models, security, and tests.
- [x] Compare duplicate trees (`root` vs `EcoWatchAI-main`).
- [x] Verify passing backend pytest suite (9/9 passed).
- [x] Verify production Vite frontend build (`npm run build`).
- [x] Generate master codebase audit, implementation matrix, and known bugs inventory.

---

## Phase 2: Architecture Stabilization & Project Structure [COMPLETED]
- [x] Establish root `/src` as the sole authoritative React frontend.
- [x] Establish root `/backend` as the sole authoritative FastAPI backend.
- [x] Migrate `SuperAdminPage.jsx`, `superAdminService.js`, and `ApiConnectionNotice.jsx` into root `/src`.
- [x] Archive previous design specifications into `docs/`.
- [x] Purge redundant `EcoWatchAI-main/` directory from repository.
- [x] Author comprehensive `docs/ARCHITECTURE.md`.

---

## Phase 3: Environment Configuration & API Infrastructure [NEXT STEP]
- [ ] Create root `.env.example` and `backend/.env.example`.
- [ ] Standardize API port conventions:
  - Frontend: `http://localhost:3000`
  - Backend: `http://localhost:8001`
  - Vite Proxy: `/api` -> `http://localhost:8001/api/v1`
  - Static Uploads: `/static/uploads` -> `http://localhost:8001/static/uploads`
- [ ] Upgrade `src/services/apiClient.js`:
  - Request timeout handling (e.g. 10s default via `AbortController`).
  - Standardized `ApiError` class with HTTP status codes and detail parsing.
  - Automatic Authorization header attachment from authenticated session.
  - Multipart/form-data support for file uploads.
- [ ] Mount `ApiConnectionNotice.jsx` at root of `AppLayout.jsx` with periodic health-check polling against `/api/v1/health`.
- [ ] Verify frontend-to-backend ping over Vite proxy.

---

## Phase 4: PostgreSQL Database Integration & Persistence
- [ ] Configure PostgreSQL `DATABASE_URL` format:
  `postgresql+psycopg://username:password@localhost:5432/vasundhara_db`
- [ ] Verify PostgreSQL schema creation via SQLAlchemy declarative metadata.
- [ ] Introduce indexes on high-frequency query columns:
  - `reports(status, created_at, municipality_id, ward_id)`
  - `cleanups(status, priority, scheduled_date)`
  - `auth_sessions(token_hash, expires_at)`
- [ ] Test transaction rollback behavior and foreign key integrity:
  - Report deletion safeguards: Cascade notifications, preserve audit log trail, prevent dangling cleanups.
- [ ] Verify test suite runs against PostgreSQL in addition to SQLite test client.

---

## Phase 5: Complete Frontend–Backend Feature Wiring
- [ ] **Authentication (`src/services/authService.js`):**
  - Replace mock demo switcher with actual `POST /api/v1/auth/login` and `POST /api/v1/auth/register`.
  - Store received Bearer token; fetch user profile via `GET /api/v1/auth/me`.
- [ ] **Incident Submission (`src/services/reportService.js`):**
  - Transition `createReport` to send `FormData` or JSON with uploaded photo to `POST /api/v1/reports`.
  - Inspect server-returned YOLO detections and municipal jurisdiction routing.
- [ ] **GIS Cartography & Public Feed (`src/pages/PollutionMapPage.jsx`):**
  - Fetch real incident coordinates via `GET /api/v1/public/reports`.
  - Display server-calculated hotspot clusters via `GET /api/v1/public/hotspots`.
- [ ] **Municipal Operations (`src/pages/CleanupManagementPage.jsx` & `AdminDashboard.jsx`):**
  - Fetch tenant-scoped incidents via `GET /api/v1/reports`.
  - Create and schedule cleanup squad tasks via `POST /api/v1/cleanups`.
  - Transition cleanup tasks to completed with required after-photo via `PATCH /api/v1/cleanups/{id}/status`.
- [ ] **Citizen Portal (`src/pages/UserDashboard.jsx` & `MyReportsPage.jsx`):**
  - Render live citizen report history via `GET /api/v1/reports/mine`.
- [ ] **Platform Governance (`src/pages/SuperAdminPage.jsx`):**
  - Onboard new municipalities and upload GeoJSON boundaries via `POST /api/v1/superadmin/municipalities`.
  - Resolve borderline/quarantined reports via `POST /api/v1/superadmin/reports/{id}/jurisdiction`.

---

## Phase 6: Multi-Device End-to-End Verification
- [ ] Submit an environmental incident report from Browser A (Citizen account).
- [ ] Verify image upload is persisted in `backend/uploads/`.
- [ ] Log in as Municipal Admin in Browser B (different browser/incognito session).
- [ ] Confirm the report appears in the municipal inbox without any local storage dependency.
- [ ] Dispatch a cleanup team and complete the task with an after-photo.
- [ ] Verify the citizen's dashboard in Browser A reflects the verified cleanup status.
