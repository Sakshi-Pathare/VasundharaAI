# Vasundhara AI — Frontend–Backend Integration Matrix

**Project:** Vasundhara AI (EcoWatch AI)  
**Version:** 2.0.0 (Architecture Stabilization & Full Integration)  
**Date:** November 2026  
**Status:** Complete & Verified  

---

## 1. Architectural Architecture & Principles

1. **Zero Silent Mock Fallbacks:** All operational user flows (Citizen reporting, Municipal triage, Cleanup assignment, Hotspot intelligence, Analytics, SuperAdmin governance) connect to genuine FastAPI `/api/v1` endpoints backed by SQLAlchemy / PostgreSQL.
2. **Centralized Client:** Requests flow through `src/services/apiClient.js` with:
   - Configurable `VITE_API_BASE_URL` (defaulting to `/api/v1` via Vite proxy).
   - Bearer token authorization header auto-injection.
   - 15-second configurable request timeouts with `AbortController`.
   - Global 401 handling dispatching `vasundhara:unauthorized` to reset session state cleanly.
   - Multipart and JSON payloads.
3. **Cross-User & Cross-Browser Persistence:** Reports and mutations are committed to the backend database. A report submitted by a citizen on one machine/browser is immediately visible in real-time to municipal officers on another browser upon querying the backend.

---

## 2. Comprehensive Service Integration Matrix

| UI Component / Page | Service Function | HTTP Method & Route | Request Payload / Params | Response Structure | Database Operation | UI State & View Updates |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Navbar / Quick Login / LoginPage** (`AuthContext.jsx`) | `authService.login(email, password)` | `POST /api/v1/auth/login` | `{ email, password }` | `{ accessToken, tokenType, user: { id, email, name, role, municipalityId, permissions } }` | Authenticates against `users` table via Argon2/bcrypt hash verification. | Stores token in `localStorage`, updates `currentUser` state, redirects to relevant dashboard. |
| **RegisterModal / RegisterPage** | `authService.register(userData)` | `POST /api/v1/auth/register` | `{ name, email, phone, password }` | `{ accessToken, tokenType, user: {...} }` | `INSERT INTO users` with hashed password and role `citizen`. | Authenticates user, initializes citizen profile, grants access to reporting. |
| **App Startup / Page Refresh** (`AuthContext.jsx`) | `authService.getCurrentUser()` | `GET /api/v1/auth/me` | None (Bearer header) | `{ id, email, name, role, municipalityId, permissions, active }` | `SELECT * FROM users WHERE id = :user_id` | Hydrates session; if token expired/invalid (401), clears session state. |
| **Report Litter Form** (`ReportLitterPage.jsx`) | `reportService.createReport(data)` | `POST /api/v1/reports` | `{ title, description, latitude, longitude, address, category, severity, estimatedKg, imageUrl }` | `{ id: "EW-...", status: "submitted", municipalityId: "PMC", wardId: "W-1", ... }` | Spatial polygon intersection assigns `municipality_id` and `ward_id`. `INSERT INTO reports`. | Shows success card with backend `EW-...` tracking ID, resets submission form. |
| **Citizen Reports History** (`MyReportsPage.jsx`, `UserDashboard.jsx`) | `reportService.getUserReports()` | `GET /api/v1/reports/mine` | None (Bearer header) | `List[ReportResponse]` | `SELECT * FROM reports WHERE user_id = :user_id ORDER BY created_at DESC` | Renders report list, status badges (`submitted`, `verified`, `scheduled`, `cleaned`), and coordinates. |
| **Public Map & Hotspot Map** (`PollutionMapPage.jsx`) | `reportService.getAllReports()` | `GET /api/v1/public/reports` | Query params (optional bounds) | `List[PublicReportResponse]` | `SELECT id, title, latitude, longitude, category, severity, status, created_at FROM reports` | Plots interactive Leaflet map pins, filters by severity/category, displays report info popup. |
| **Public & Admin Hotspots** (`HotspotManagementPage.jsx`, `AdminDashboard.jsx`) | `hotspotService.getHotspots(filter)` | `GET /api/v1/hotspots` or `GET /api/v1/public/hotspots` | `{ min_points, eps_meters }` | `List[HotspotCluster]` | Geospatial clustering of open and high-severity reports across geographic bounding boxes. | Highlights high-density pollution zones, risk level meters, and target cleanup wards. |
| **Municipal Triage Queue** (`AdminDashboard.jsx`) | `reportService.getAllReports()` | `GET /api/v1/reports` | None (Admin Bearer) | `List[ReportResponse]` filtered by admin municipality | `SELECT * FROM reports WHERE municipality_id = :admin_mun` | Displays triage table with severity badges, reporter details, and action triggers. |
| **Verify Report Action** (`AdminDashboard.jsx`) | `reportService.updateReportStatus(id, 'verified')` | `PATCH /api/v1/reports/{id}/status` | `{ status: "verified" }` | `{ id, status: "verified", ... }` | `UPDATE reports SET status = 'verified', updated_at = NOW() WHERE id = :id`. Logs to `audit_logs`. | Updates badge to `Verified`, refreshes KPI counters. |
| **Dispatch Cleanup** (`AdminDashboard.jsx`, `CleanupManagementPage.jsx`) | `cleanupService.createTask(taskData)` | `POST /api/v1/cleanups` | `{ reportId, assignedTeam, scheduledDate }` | `{ id: "CLN-...", reportId: "EW-...", status: "scheduled", assignedTeam, ... }` | `INSERT INTO cleanups`. Updates report status to `scheduled`. | Adds task to cleanup queue, updates dispatch status. |
| **Assign Squad & Team** (`CleanupManagementPage.jsx`) | `cleanupService.assignTeam(id, team, date, notes)` | `PATCH /api/v1/cleanups/{id}/assign` | `{ assignedTeam, scheduledDate, notes }` | `{ id, status: "in_progress", assignedTeam, ... }` | `UPDATE cleanups SET assigned_team = :team, status = 'in_progress' WHERE id = :id`. | Updates squad card to in-progress, displays assigned crew. |
| **Complete Cleanup Task** (`CleanupManagementPage.jsx`) | `cleanupService.updateTaskStatus(id, 'completed', afterImg, notes)` | `PATCH /api/v1/cleanups/{id}/status` | `{ status: "completed", afterImageUrl, notes }` | `{ id, status: "completed", afterImageUrl, ... }` | Validates `afterImageUrl` is present. `UPDATE cleanups SET status = 'completed'`. Linked `reports` status set to `cleaned`. | Moves card to completed column, triggers "Before & After" photo verification view. |
| **Municipal Operational Notes** (`AdminDashboard.jsx`) | `reportService.updateInternalNotes(id, note)` | `PATCH /api/v1/reports/{id}/notes` | `{ note: string }` | `{ id, internalNotes, ... }` | `UPDATE reports SET internal_notes = :note WHERE id = :id`. | Displays saved internal notes for municipal teams. |
| **Delete Illegal / Duplicate Report** (`AdminDashboard.jsx`) | `reportService.deleteReport(id)` | `DELETE /api/v1/reports/{id}` | None (Admin Bearer) | `{ success: true, message: "Report deleted" }` | Soft-deletes or removes record, ensuring cleanup references cascade safely. | Removes row from triage table, updates metrics. |
| **CSV Export** (`AdminDashboard.jsx`) | `reportService.exportReportsCsv()` | `GET /api/v1/reports/export.csv` | None (Admin Bearer) | Text stream (`text/csv` with UTF-8 BOM) | `SELECT * FROM reports WHERE municipality_id = :admin_mun` | Triggers browser download of `ecowatch_reports_YYYY-MM-DD.csv`. |
| **Executive Metrics & KPIs** (`AdminDashboard.jsx`, `UserDashboard.jsx`) | `analyticsService.getDashboardMetrics()` | `GET /api/v1/analytics/metrics` or `/public/metrics` | None | `{ totalReports, pendingReports, verifiedReports, completedCleanups, totalWasteKg }` | SQL aggregation queries across `reports` and `cleanups`. | Updates KPI metric widgets, trends, and progress bars. |
| **Trends & Category Charts** (`AdminDashboard.jsx`) | `analyticsService.getPollutionTrends()`, `getCategoryBreakdown()` | `GET /api/v1/analytics/trends`, `GET /api/v1/analytics/categories` | None | Time series points and categorical slices | SQL `GROUP BY date(created_at)` and `GROUP BY category`. | Recharts AreaChart (weekly trend) and PieChart (waste breakdown). |
| **Municipal Ward Statistics** (`AdminDashboard.jsx`, `SuperAdminPage.jsx`) | `analyticsService.getWardStats()` | `GET /api/v1/admin/ward-stats` | None (Admin Bearer) | `List[{ wardId, totalReports, resolvedReports, pendingReports, hotnessScore }]` | SQL `GROUP BY ward_id` join with boundaries. | Renders ward priority leaderboard. |
| **SuperAdmin System Overview** (`SuperAdminPage.jsx`) | Multiple admin endpoints | `GET /api/v1/superadmin/...` | SuperAdmin Bearer | Tenant status, system health, audit logs | Cross-tenant database queries. | Displays all municipalities, server health, and governance controls. |

---

## 3. End-to-End User Interaction Verification

### Scenario: Citizen Report $\rightarrow$ Municipal Verification $\rightarrow$ Cleanup Dispatch $\rightarrow$ Site Certified Clean

1. **Step 1: Citizen Submission**
   - **Actor:** Aarav Patil (Citizen, mobile browser).
   - **Action:** Uploads image of illegal waste at (18.53, 73.85) in Shivaji Nagar, Pune.
   - **Frontend:** `ReportLitterPage.jsx` calls `reportService.createReport(data)`.
   - **Backend:** `POST /api/v1/reports` calculates point-in-polygon $\rightarrow$ identifies `PMC` municipality, `W-1` ward.
   - **Database:** `reports` row inserted with ID `EW-...`, status `submitted`.
   - **UI Feedback:** Form displays success modal with tracking code `EW-...`.

2. **Step 2: Municipal Triage**
   - **Actor:** R. Sharma (PMC Sanitation Officer, desktop browser).
   - **Action:** Opens `AdminDashboard.jsx`.
   - **Frontend:** Dispatches `reportService.getAllReports()`.
   - **Backend:** `GET /api/v1/reports` returns all PMC reports.
   - **Database:** Fetches latest committed reports.
   - **UI Feedback:** `EW-...` appears in triage queue with high severity indicator.

3. **Step 3: Verification & Notes**
   - **Action:** Officer verifies photo and clicks "Mark as Verified".
   - **Frontend:** Calls `reportService.updateReportStatus(id, 'verified')`.
   - **Backend:** `PATCH /api/v1/reports/{id}/status` validates permissions.
   - **Database:** `reports.status` updated to `verified`.
   - **UI Feedback:** Status badge updates immediately to green `Verified`.

4. **Step 4: Cleanup Dispatch**
   - **Action:** Officer clicks "Schedule Sanitation" and assigns "Pune Central Crew #3".
   - **Frontend:** Calls `cleanupService.createTaskFromReport(report)`.
   - **Backend:** `POST /api/v1/cleanups` creates task `CLN-...` linked to `report_id`.
   - **Database:** `cleanups` table entry created; `reports.status` set to `scheduled`.
   - **UI Feedback:** Notification confirms task dispatch.

5. **Step 5: Execution & Photo Verification**
   - **Action:** Sanitation team clears site and submits after-cleanup photo.
   - **Frontend:** `CleanupManagementPage.jsx` calls `cleanupService.updateTaskStatus(id, 'completed', afterImg)`.
   - **Backend:** `PATCH /api/v1/cleanups/{id}/status` strictly validates presence of `afterImageUrl`.
   - **Database:** `cleanups.status` updated to `completed`; linked `reports.status` automatically updated to `cleaned`.
   - **UI Feedback:** Task moves to "Certified Clean" column with comparison modal.

6. **Step 6: Citizen Verification**
   - **Actor:** Citizen re-opens `MyReportsPage.jsx`.
   - **Frontend:** Calls `reportService.getUserReports()`.
   - **Backend:** `GET /api/v1/reports/mine` returns updated record.
   - **UI Feedback:** Status reflects `Cleaned` with green checkmark.

---

## 4. Automated Integration Verification

- **Automated Test Suite:** `backend/tests/test_full_integration.py`
  - Validates full citizen registration $\rightarrow$ login $\rightarrow$ report submission $\rightarrow$ municipal triage $\rightarrow$ cleanup scheduling $\rightarrow$ mandatory photo completion $\rightarrow$ auto report resolution $\rightarrow$ CSV export $\rightarrow$ metric updates.
- **Unit and API Suites:** `backend/tests/test_api.py`, `backend/tests/test_database.py`.
- **Frontend Build:** `npm run build` verifies clean bundling with zero errors.
