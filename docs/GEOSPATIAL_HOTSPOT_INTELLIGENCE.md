# Geospatial Hotspot Intelligence & Priority Scoring Architecture

## 1. Executive Summary

Vasundhara AI identifies geographic zones where civic litter repeatedly accumulates, computes geometric cluster centroids, deduplicates multi-citizen incident reports to prevent artificial score inflation, and calculates a transparent, deterministic **5-Factor Priority Score** normalized to a $0 - 100$ scale.

This document describes:
1. Spatial clustering algorithms and evaluation of single-linkage connected-component clustering.
2. The chaining effect limitation and the centroid-distance guard solution.
3. Incident deduplication rules to prevent recurrence inflation.
4. The 5-factor priority scoring weight matrix and mathematical formulas.
5. API endpoints and parameter specifications.

---

## 2. Evaluation of Connected-Component Clustering & Chaining Mitigation

### 2.1 The Baseline Graph Traversal
The baseline clustering algorithm constructs an undirected graph $G = (V, E)$ where vertices $V$ represent geo-located reports within a municipal jurisdiction. An edge $(u, v) \in E$ is formed if the Haversine distance between reports is within the configured buffer radius:
$$d(u, v) \le R \quad (R = \text{radius\_meters}, \text{default } 300\text{m})$$
Connected components in $G$ are extracted via Breadth-First Search (BFS) or Depth-First Search (DFS).

### 2.2 Limitation: Single-Linkage Chaining (Percolation)
In pure single-linkage clustering:
- If report $A$ is $250\text{m}$ from report $B$,
- Report $B$ is $250\text{m}$ from report $C$,
- Report $C$ is $250\text{m}$ from report $D$,
- Report $D$ is $250\text{m}$ from report $E$,

All five reports merge into a single connected component even though report $A$ and report $E$ are $1,000\text{m}$ apart ($> 3 \times R$). In dense urban corridors or along linear avenues, this produces "snake clusters" that chain across multiple distinct municipal wards, distorting the geometric centroid and generating an unmanageably large operational buffer.

### 2.3 The Seed-Distance Guard Solution
To prevent single-linkage chaining while preserving legitimate neighborhood clustering around street corners and adjacent alleyways, Vasundhara AI enforces a **centroid-distance guard** during cluster frontier expansion:
$$\text{Candidate } c \text{ is merged into cluster with seed } s \iff d(u, c) \le R \;\land\; d(s, c) \le 1.5 \times R$$

With $R = 300\text{m}$:
- Maximum radial distance from the seed is bounded by $450\text{m}$.
- Maximum cluster diameter is bounded by $2 \times 450\text{m} = 900\text{m}$.
- Uncontrolled linear chaining across wards is prevented.

---

## 3. Incident Deduplication (Anti-Inflation)

### 3.1 Problem: Multi-Citizen Corroboration vs. Recurrent Dumping
When a prominent garbage heap appears in a public square, multiple citizens often submit individual photographs from slightly different angles or distances within hours of each other.
- If each submission were counted as an independent recurrence, a single physical pile with 4 citizen submissions would falsely score higher than an alleyway that suffered 3 separate dumping events over 3 weeks.

### 3.2 Deduplication Rule
Within each spatial cluster, reports are clustered into distinct **physical incidents**:
Two reports $r_i$ and $r_j$ belong to the same incident if:
$$d(r_i, r_j) \le 30.0\text{ meters} \quad\land\quad |\Delta t(r_i, r_j)| \le 48.0\text{ hours}$$

- **`reportCount` ($N$)**: Total raw reports submitted by citizens (used for community engagement and verification audit).
- **`distinctIncidents` / `recurrenceCount` ($K$)**: Number of distinct physical dumping events (used for recurrence scoring).

---

## 4. Transparent 5-Factor Priority Scoring Matrix

The priority score is normalized strictly to $0 - 100$. Missing data is never treated as an invented positive score. The total score is the direct sum of five weighted components:

$$\text{Priority Score} = \min\left(100, \max\left(1, \text{round}(C_{\text{sev}} + C_{\text{rec}} + C_{\text{clean}} + C_{\text{env}} + C_{\text{recent}})\right)\right)$$

| Factor | Metric | Weight | Raw Scale | Normalized Contribution |
| :--- | :--- | :---: | :---: | :---: |
| **1. Waste Severity** | Average severity of reports in cluster | **30%** | $0 - 100$ | $C_{\text{sev}} = 0.30 \times S_{\text{sev}}$ |
| **2. Report Recurrence** | Deduplicated incident count ($K$) | **25%** | $0 - 100$ | $C_{\text{rec}} = 0.25 \times S_{\text{rec}}$ |
| **3. Cleanup Lag** | Days since last verified cleanup (or oldest report) | **20%** | $0 - 100$ | $C_{\text{clean}} = 0.20 \times S_{\text{clean}}$ |
| **4. Environmental Sensitivity** | Material toxicity + sensitive asset buffer | **15%** | $0 - 100$ | $C_{\text{env}} = 0.15 \times S_{\text{env}}$ |
| **5. Report Recency** | Elapsed days since newest report | **10%** | $0 - 100$ | $C_{\text{recent}} = 0.10 \times S_{\text{recent}}$ |
| **Total** | | **100%** | | **Max 100 points** |

### Factor 1: Waste Severity ($S_{\text{sev}}$, 30%)
Report severity mappings:
- `critical`: $100.0$
- `high`: $85.0$
- `medium`: $55.0$
- `low`: $25.0$

$$S_{\text{sev}} = \frac{1}{N}\sum_{i=1}^N \text{weight}(r_i), \quad C_{\text{sev}} = \text{round}(0.30 \times S_{\text{sev}}, 1)$$

### Factor 2: Report Recurrence ($S_{\text{rec}}$, 25%)
Evaluated on distinct incidents $K$:
- $K = 1$: $S_{\text{rec}} = 20.0$
- $K = 2$: $S_{\text{rec}} = 45.0$
- $K = 3$: $S_{\text{rec}} = 70.0$
- $K = 4$: $S_{\text{rec}} = 85.0$
- $K \ge 5$: $S_{\text{rec}} = \min(100.0, 85.0 + (K - 4) \times 5.0)$

$$C_{\text{rec}} = \text{round}(0.25 \times S_{\text{rec}}, 1)$$

### Factor 3: Time Since Last Verified Cleanup ($S_{\text{clean}}$, 20%)
1. **When verified cleanup exists**:
   Let $\Delta t_{\text{clean}}$ be the days elapsed since the latest completed cleanup task in this cluster:
   - $\Delta t \le 3\text{ days}$: $S_{\text{clean}} = 10.0$ (recently cleaned, low backlog risk)
   - $\Delta t \le 7\text{ days}$: $S_{\text{clean}} = 25.0$
   - $\Delta t \le 14\text{ days}$: $S_{\text{clean}} = 50.0$
   - $\Delta t \le 30\text{ days}$: $S_{\text{clean}} = 75.0$
   - $\Delta t > 30\text{ days}$: $S_{\text{clean}} = \min(100.0, 75.0 + (\Delta t - 30) \times 0.8)$
2. **When no verified cleanup exists on record**:
   `lastVerifiedCleanupDate = None` (never an invented date).
   Lag is evaluated based on days $\Delta t_{\text{uncleaned}}$ since the oldest uncleaned report:
   $$S_{\text{clean}} = \min\left(100.0, \max\left(15.0, \text{round}(15.0 + \min(85.0, \Delta t_{\text{uncleaned}} \times 2.5), 1)\right)\right)$$

$$C_{\text{clean}} = \text{round}(0.20 \times S_{\text{clean}}, 1)$$

### Factor 4: Environmental Sensitivity ($S_{\text{env}}$, 15%)
Base score from dominant material toxicity:
- `hazardous`: $95.0$
- `electronic` / `e-waste`: $90.0$
- `plastic`: $75.0$
- `construction`: $65.0$
- `glass`: $55.0$
- `metal`: $50.0$
- `organic`: $45.0$
- `paper` / `cardboard`: $30.0$
- `mixed`: $50.0$

Ecological modifier: $+15.0$ (capped at $100.0$) if reports mention waterways, drains, nullahs, rivers, lakes, canals, schools, hospitals, or public markets.

$$C_{\text{env}} = \text{round}(0.15 \times S_{\text{env}}, 1)$$

### Factor 5: Report Recency ($S_{\text{recent}}$, 10%)
Let $\Delta t_{\text{newest}}$ be the days elapsed since the most recent report in the cluster:
- $\Delta t \le 1\text{ day}$: $S_{\text{recent}} = 100.0$
- $\Delta t \le 3\text{ days}$: $S_{\text{recent}} = 85.0$
- $\Delta t \le 7\text{ days}$: $S_{\text{recent}} = 70.0$
- $\Delta t \le 14\text{ days}$: $S_{\text{recent}} = 50.0$
- $\Delta t \le 30\text{ days}$: $S_{\text{recent}} = 30.0$
- $\Delta t > 30\text{ days}$: $S_{\text{recent}} = \max(5.0, 30.0 - (\Delta t - 30) \times 0.5)$

$$C_{\text{recent}} = \text{round}(0.10 \times S_{\text{recent}}, 1)$$

---

## 5. API Endpoints

### 5.1 Public Hotspots
`GET /api/v1/public/hotspots`
- Query parameters:
  - `sort_by`: `priority` | `recurrence` | `date` | `severity` (default `priority`)
  - `time_window_days`: optional integer (e.g. `30`, `90`, `180`)
  - `radius_meters`: optional float between `50.0` and `2000.0` (default `300.0`)
  - `municipality_id`: optional string
  - `ward_id`: optional string
  - `category`: optional string
  - `severity`: optional string
  - `min_priority`: optional integer

### 5.2 Scoped Admin Hotspots
`GET /api/v1/hotspots`
- Enforces JWT authentication, tenant isolation, and `analytics:read` permission.
- Accepts the same query parameters as above.

### 5.3 Hotspot Detail
`GET /api/v1/hotspots/{hotspot_id}`
- Returns full factor score breakdown, contributing report IDs, and priority explanation.

---

## 6. Response Payload Example

```json
{
  "id": "HOT-PMC-001",
  "name": "Recurring litter cluster near Kothrud Depot",
  "district": "Pune Municipal Corporation",
  "municipality": "Pune Municipal Corporation",
  "municipalityId": "mun-pmc-001",
  "municipalityCode": "PMC",
  "ward": "Kothrud",
  "wardId": "ward-pmc-01",
  "latitude": 18.5024,
  "longitude": 73.8112,
  "coordinates": [18.5024, 73.8112],
  "radiusMeters": 300,
  "reportCount": 5,
  "recurrenceCount": 3,
  "distinctIncidents": 3,
  "dominantCategory": "plastic",
  "severity": "critical",
  "priorityScore": 82,
  "latestReportDate": "2026-11-26T10:00:00Z",
  "lastReportedDate": "2026-11-26T10:00:00Z",
  "oldestReportDate": "2026-11-05T08:30:00Z",
  "lastVerifiedCleanupDate": null,
  "contributingReportIds": ["EW-A1B2C3D4E5F6", "EW-B2C3D4E5F6A1", "EW-C3D4E5F6A1B2"],
  "factors": {
    "wasteSeverity": { "score": 85.0, "weight": 0.30, "contribution": 25.5 },
    "reportRecurrence": { "score": 70.0, "weight": 0.25, "contribution": 17.5 },
    "cleanupLag": { "score": 67.5, "weight": 0.20, "contribution": 13.5 },
    "environmentalSensitivity": { "score": 90.0, "weight": 0.15, "contribution": 13.5 },
    "reportRecency": { "score": 100.0, "weight": 0.10, "contribution": 10.0 }
  },
  "priorityExplanation": "Priority 82/100 (critical) driven by waste severity (25.5/30, dominant plastic) and 3 recurring incident(s) (17.5/25). Cleanup lag contribution: 13.5/20. Environmental sensitivity: 13.5/15. Report recency: 10.0/10.",
  "trend": "3 incident(s) across 5 report(s)",
  "environmentalRisk": "5 reports clustered within 300m; plastic hazard rating: 90/100.",
  "suggestedAction": "Deploy immediate sanitation dispatch and anti-dumping surveillance."
}
```
