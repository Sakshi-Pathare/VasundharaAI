# Real Database-Driven Analytics Dashboard & Metric Taxonomy

This document outlines the architecture, database query derivations, aggregation mechanics, Recharts visualizations, and zero-fabrication guarantees implemented for the municipal analytics dashboard in Vasundhara AI.

---

## 1. Metric Taxonomy & Exact Database Derivations

All metrics displayed on the administrative command center and analytical pages are derived directly from actual database records (`reports`, `cleanups`, `audit_logs`, `municipalities`). No mock fallbacks, static placeholders, or fabricated activity percentages are used.

| Metric | API Field | Database Model & Query Logic | Definition & Anti-Double-Counting Rules |
|---|---|---|---|
| **Total Reports** | `totalReports` | `count(Report.id)` within tenant scope and time window | Total citizen litter submissions logged in the system. |
| **Verified Reports** | `verifiedReports` | `count(Report.status == "verified")` | Reports inspected and confirmed authentic by municipal officials. Mutually exclusive from pending and cleaned. |
| **Pending Review** | `pendingReports` | `count(Report.status == "pending")` | Submissions awaiting initial triage and evidence inspection. |
| **Rejected / Invalid** | `rejectedReports` | `count(Report.status == "rejected")` | Dismissed false reports or unserviceable submissions. |
| **Scheduled Cleanups** | `scheduledReports` | `count(Report.status == "scheduled")` | Verified reports actively assigned to a cleanup squad. |
| **Cleaned Sites** | `cleanedReports` | `count(Report.status == "cleaned")` | Remediation confirmed and photo evidence certified by administrator. |
| **Active Hotspots** | `activeHotspots` | `len(_hotspots(reports, db))` | Geospatial clusters identified by DBSCAN/centroid-distance clustering. |
| **High-Priority Hotspots** | `highPriorityHotspots` | `sum(h.priorityScore >= 70)` | Clusters meeting high or critical threshold requiring priority intervention. |
| **Cleanup Tasks** | `cleanupTasks` | `count(Cleanup.id)` | Total remediation tasks created for scoped reports. |
| **Completed Cleanups** | `completedCleanups` | `count(Cleanup.status == "completed")` | Squad concluded remediation work on-site and submitted after-photo evidence. |
| **Verified Cleanups** | `verifiedCleanups` | `count(Cleanup.verification_status == "verified")` | Administrator formally inspected before/after evidence and approved certification. Strictly distinguished from squad completion! |
| **Total Waste Collected** | `totalWasteCollectedKg` | `sum(Report.estimated_kg WHERE Report.status == 'cleaned')` | Aggregated mass of confirmed remediated waste. Uncleaned reports do not inflate this total. |
| **Avg Verification Time** | `averageVerificationTimeHours` | `mean(AuditLog.created_at - Report.reported_at)` | Average hours elapsed between citizen report submission and official verification. Returns `None` if zero verified reports exist. |
| **Avg Remediation Time** | `averageCleanupCompletionTimeHours` | `mean(Cleanup.verified_at - Cleanup.created_at)` | Average hours elapsed between task creation and certified verification. Returns `None` if zero verified cleanups exist. |

---

## 2. Analytics Endpoints

All endpoints support tenant isolation (`PMC` admins cannot access `PCMC` data) and optional query filters (`time_range`, `ward_id`, `municipality_id`).

### A. `GET /api/v1/analytics/metrics`
Returns high-level summary KPIs for the municipal command center.
- **Parameters**: `time_range` (`7d`, `30d`, `90d`, `180d`, `1y`, `all`), `ward_id`, `municipality_id`.
- **Response**:
  ```json
  {
    "totalReports": 5,
    "verifiedReports": 1,
    "pendingReports": 1,
    "rejectedReports": 1,
    "scheduledReports": 1,
    "cleanedReports": 1,
    "activeHotspots": 1,
    "highPriorityHotspots": 1,
    "criticalHotspots": 0,
    "cleanupTasks": 2,
    "completedCleanups": 1,
    "verifiedCleanups": 1,
    "awaitingVerificationCleanups": 0,
    "inProgressCleanups": 1,
    "pendingCleanups": 0,
    "averageVerificationTimeHours": 0.4,
    "averageCleanupCompletionTimeHours": 1.2,
    "totalWasteCollectedKg": 50.0
  }
  ```

### B. `GET /api/v1/analytics/trends`
Provides 6-month historical incidence and resolution trends.
- **Response**: Array of 6 monthly objects containing `month`, `reports`, `pending`, `verified`, `resolved`, `cleanupsCreated`, `cleanupsCompleted`.

### C. `GET /api/v1/analytics/categories`
Provides material composition breakdown derived from database records.
- **Response**: Array containing `category`, `name`, `count`, `value` (percentage rounded to 1 decimal place), `color`, and `estimatedKg`.
- **Empty Dataset Rule**: Returns `[]` if total reports is 0 (avoids division by zero or NaN percentages).

### D. `GET /api/v1/analytics/cleanup-trends`
Provides monthly operational tracking of cleanup tasks dispatched vs verified certified completions.
- **Response**: Array of monthly objects with `tasksCreated`, `tasksVerified`, `awaitingVerification`.

### E. `GET /api/v1/analytics/hotspot-distribution`
Provides breakdown of active clusters across 4 standardized priority bands:
- Critical (80–100)
- High (60–79)
- Medium (40–59)
- Low (0–39)

### F. `GET /api/v1/admin/ward-stats`
Aggregates reports, cleanups, and hotspots by municipal ward:
- `wardId`, `totalReports`, `verifiedReports`, `pendingReports`, `cleanedReports`, `cleanupTasks`, `hotspotsCount`, `avgPriorityScore`.

---

## 3. Recharts Implementation

Five distinct Recharts components deliver responsive, interactive data visualization across `AdminDashboard.jsx` and `HotspotIntelligencePage.jsx`:

1. **Monthly Reporting & Resolution Trends (`AreaChart`)**:
   - Area overlay comparing public reports logged against verified sites cleaned.
   - Smooth gradients (`#092421` and `#74D7CB`) matching the botanical aesthetic.
2. **Waste Material Distribution (`PieChart` / Donut)**:
   - Inner radius 55px, outer radius 80px donut chart with color mappings for all 7 standard waste streams.
   - Tooltip displays both percentage and exact report counts.
3. **Cleanup Remediation Trends (`BarChart`)**:
   - Compares tasks dispatched, certified completed, and awaiting inspection across monthly intervals.
4. **Hotspot Priority Band Distribution (`BarChart`)**:
   - Categorizes clusters into Critical, High, Medium, and Low bands with color-coded severity bars.
5. **Ward-Wise Comparative Analysis (`BarChart`)**:
   - Grouped bars showing total reports, cleaned sites, and active hotspots per municipal ward.

---

## 4. Zero-Fabrication & Empty State Handling

- **No Invented Numbers**: If a municipality has 0 reports, all KPI widgets display `0`, average durations display `N/A`, and charts display dedicated `EmptyState` cards explaining that no records exist for the selected filters.
- **Percentage Integrity**: When no reports are logged, category percentage calculations return an empty array rather than `NaN%` or `0%`.
- **Distinction of Completion vs Verification**: A cleanup is only counted as `verifiedCleanups` when an administrator has reviewed photographic evidence and approved the certification. Field squad upload alone only marks the task as `awaiting_verification`.
