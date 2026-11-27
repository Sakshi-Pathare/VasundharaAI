# Vasundhara AI — Environmental Intelligence Platform

[![CI/CD Quality Gate](https://img.shields.io/badge/Quality%20Gate-PASSED%20(100%25)-emerald.svg)](#testing-and-verification)
[![Python Version](https://img.shields.io/badge/Python-3.11%20%7C%203.12%20%7C%203.14-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev)
[![Docker Ready](https://img.shields.io/badge/Docker-Multi--Stage%20Hardened-2496ed.svg)](docs/DEPLOYMENT_GUIDE.md)

Vasundhara AI is an enterprise-grade civic environmental intelligence web platform designed to empower citizens, municipal corporations, and remediation contractors in identifying public litter, recording precise geographic coordinates, clustering recurring pollution hotspots, and executing verified cleanup operations.

Built with **FastAPI**, **React 18**, **PostgreSQL / SQLite (WAL)**, **Leaflet GIS**, and **YOLOv8 Computer Vision**, the application features strict multi-tenant boundary isolation across municipal jurisdictions (such as Pune Municipal Corporation and Pimpri Chinchwad Municipal Corporation).

---

## 1. Key Architectural Features

- **End-to-End Civic Remediation:** Complete citizen report $\rightarrow$ GPS ray-casting $\rightarrow$ Municipal officer triage $\rightarrow$ Hotspot priority clustering $\rightarrow$ Squad task dispatch $\rightarrow$ Photographic remediation evidence verification $\rightarrow$ Public ledger synchronization.
- **Geospatial Hotspot Intelligence:** Spatial accumulation clustering ($\le 300\text{m}$) with deduplication windows ($\le 30\text{m}$ radius, $\le 48\text{h}$) to eliminate duplicate report inflation, combined with a transparent 5-Factor Priority Score (Severity 30%, Recurrence 25%, Cleanup Lag 20%, Environmental Sensitivity 15%, Recency 10%).
- **Multi-Tenant Municipal Isolation:** Strict RBAC preventing cross-tenant data leaks between municipal corporations. Public endpoints strictly sanitize personal citizen contact telemetry.
- **Defensive Security & Reliability:** Magic byte file signature validation (JPEG/PNG/WebP), SHA-256 session token revocation, PBKDF2 (310,000 rounds) password hashing, rate limiting, atomic transaction rollbacks, and distributed `X-Request-ID` tracing.
- **High Performance & Lean Footprint:** Dynamic code-splitting with `React.lazy` and `Suspense`, reducing initial JavaScript bundle size by **78.7%** (74 kB initial JS). Sub-millisecond database queries (<0.5ms) and live health/readiness orchestrator probes.

---

## 2. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend SPA** | React 18, Vite 5, Tailwind CSS, Lucide Icons, React Router v6, Recharts |
| **GIS Mapping** | Leaflet, React-Leaflet, OpenStreetMap Cartography, GeoJSON Polygon Ray-Casting |
| **Backend API** | Python 3.11+, FastAPI (ASGI), Uvicorn, Pydantic v2, Pillow |
| **Database & ORM** | PostgreSQL 16 (production) / SQLite with WAL mode (local/testing), SQLAlchemy 2.0 |
| **Computer Vision** | Ultralytics YOLOv8, TACO (Trash Annotations in Context) taxonomy, Heuristic Fallback |
| **Containerization** | Multi-stage Docker, Nginx Reverse Proxy with Gzip & Security Headers, Docker Compose |
| **Testing & QA** | Pytest, FastAPI TestClient, Playwright (Headless Google Chrome automation) |

---

## 3. Quickstart & Local Installation

### Prerequisites
- Python 3.11+
- Node.js 18+ and `npm`
- (Optional) Docker & Docker Compose

### Option A: Local Development Setup

#### 1. Backend Service
```bash
# Navigate to project root
cd "evs final"

# Install backend dependencies
python -m pip install -r backend/requirements.txt

# Start FastAPI backend (port 8001)
$env:PYTHONPATH="backend"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

#### 2. Frontend Application
```bash
# In a separate terminal
npm install
npm run dev
# Frontend runs at http://localhost:3000 and proxies /api to http://localhost:8001
```

### Option B: Production Docker Deployment

```bash
# Copy and configure environment variables
cp .env.production.example .env.production

# Launch hardened multi-container stack
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# Verify running services
docker compose -f docker-compose.prod.yml ps
```

---

## 4. Default Seed & Demo Credentials

| Role | Name | Email | Password | Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | Dr. Ananya Roy | `admin@vasundhara.eco` | `Password123!` | System-wide Governance & Audit |
| **Municipal Officer** | Rajesh Sharma | `r.sharma@pune.gov.in` | `Password123!` | Pune Municipal Corporation (PMC) |
| **Citizen Steward** | Alex Morgan | `alex.steward@vasundhara.eco` | `Password123!` | Public Reporting & Personal Ledger |

*(Interactive quick-login pills are provided on the `/login` screen for rapid demonstration).*

---

## 5. Empirical Performance Benchmarks

*Measured empirically on local test workstation using `backend/tests/benchmark_performance.py`:*

| Metric / Endpoint | Empirical Result | Target Standard |
| :--- | :---: | :---: |
| **Initial JS Bundle Size** | **74.73 kB (22.05 kB gzip)** | $< 150\text{ kB}$ |
| **`GET /ready` Probe Latency** | **11.30 ms** | $< 50\text{ ms}$ |
| **`GET /api/v1/public/reports`** | **24.51 ms** | $< 100\text{ ms}$ |
| **`GET /api/v1/public/metrics`** | **19.56 ms** | $< 100\text{ ms}$ |
| **Raw SQL Report Count Query** | **0.436 ms** | $< 5\text{ ms}$ |
| **PBKDF2 Password Hashing (310k rounds)** | **352.89 ms** | OWASP Hardened (300–500ms) |
| **YOLO Vision Triage Pipeline** | **0.13 ms** | $< 50\text{ ms}$ |

---

## 6. Complete Documentation Directory

Detailed technical and operational documentation is maintained in [`docs/`](docs/):

- [SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md) — Comprehensive architectural specifications, component boundaries, and security model.
- [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) — Relational entity-relationship model, tables, indexes, and constraints.
- [API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) — Complete REST API endpoint reference and error formats.
- [AI_MODEL_DOCUMENTATION.md](docs/AI_MODEL_DOCUMENTATION.md) — YOLOv8 vision pipeline, TACO dataset integration, and diagnostics.
- [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) — Step-by-step production deployment guide with Nginx SSL, Docker, and backup automation.
- [USER_GUIDE.md](docs/USER_GUIDE.md) — Role-based operational user manuals for citizens, municipal administrators, and cleanup crews.
- [TESTING_REPORT.md](docs/TESTING_REPORT.md) — 43-test QA matrix, Playwright Chrome E2E test runs, and defect resolution logs.
- [KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md) — Honest boundary disclosures, non-blocking constraints, and future scalability roadmap.
- [FINAL_READINESS_REVIEW.md](docs/FINAL_READINESS_REVIEW.md) — Formal 11-dimension production readiness assessment and sign-off.

---

## 7. License

Licensed under the Apache License 2.0. Copyright © 2026 Vasundhara AI Foundation.
