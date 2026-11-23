# Vasundhara AI — Environment Configuration & API Infrastructure

---

## 1. Overview & Architecture

Vasundhara AI uses a decoupled client-server architecture:
- **Frontend:** React 18 + Vite running on port `3000`.
- **Backend:** Python + FastAPI running on port `8001`.
- **Reverse Proxy:** Vite's built-in development proxy routes `/api`, `/static`, and `/health` requests directly to `http://localhost:8001`, eliminating browser CORS issues in local development.
- **Production Mode:** All requests dispatch directly to `/api/v1` or the configured origin with standard Bearer authorization headers and strict mock-mode prevention.

```
+-------------------------------------------------------------+
| Browser / User Client                                       |
| http://localhost:3000                                       |
+-------------------------------------------------------------+
            |
            | (All /api, /static, and /health requests)
            v
+-------------------------------------------------------------+
| Vite Development Server (Port 3000)                         |
| Reverse Proxy -> http://localhost:8001                      |
+-------------------------------------------------------------+
            |
            v
+-------------------------------------------------------------+
| FastAPI Application Server (Port 8001)                      |
| - /health                (Root Diagnostics)                 |
| - /api/v1/health         (Database Connectivity)            |
| - /api/v1/...            (Protected API Endpoints)          |
| - /static/uploads/...    (Uploaded Incident Photos)         |
+-------------------------------------------------------------+
```

---

## 2. Environment Variables

### Frontend Configuration (`.env.example` $\rightarrow$ `.env`)

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `/api/v1` | Base endpoint path for all API calls. |
| `VITE_API_PROXY_TARGET` | `http://localhost:8001` | Target FastAPI server for the Vite development reverse proxy. |
| `VITE_API_TIMEOUT_MS` | `15000` | Global HTTP request timeout (in milliseconds). |
| `VITE_ENABLE_MOCK` | `false` | **Development-only mock toggle.** Strictly ignored in production builds. Set to `true` only for completely offline development. |

### Backend Configuration (`backend/.env.example` $\rightarrow$ `backend/.env`)

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `ENVIRONMENT` | `development` | Environment tier: `development`, `testing`, or `production`. |
| `API_HOST` | `0.0.0.0` | IP binding address for Uvicorn server. |
| `API_PORT` | `8001` | Port number for Uvicorn server. |
| `DATABASE_URL` | `sqlite:///backend/ecowatch.db` | SQLAlchemy connection string. SQLite uses Write-Ahead Logging (WAL) and 30s timeout automatically. Use `postgresql+psycopg://...` for production. |
| `CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173` | Comma-separated list of allowed origins. |
| `ECOWATCH_SUPERADMIN_EMAIL` | *(optional)* | Email for initial platform super-administrator bootstrap. |
| `ECOWATCH_SUPERADMIN_PASSWORD` | *(optional)* | Password for initial superadmin (minimum 12 characters). |
| `UPLOAD_DIR` | `backend/uploads` | Path for uploaded photographic evidence. |
| `MAX_IMAGE_BYTES` | `8388608` | Maximum allowable upload file size (8 MB). |
| `LOG_LEVEL` | `INFO` | Python logging level (`DEBUG`, `INFO`, `WARNING`, `ERROR`). |
| `JURISDICTION_BOUNDARY_MARGIN_METERS` | `25.0` | Spatial ambiguity buffer for municipal jurisdiction routing. |
| `YOLO_MODEL_PATH` | *(optional)* | Filesystem path to YOLOv8 litter detection model weights. |

---

## 3. Critical Production Requirement: Mock-Mode Removal

1. **Production Invariance:**
   - The production application **never** renders simulated mock data as genuine platform records.
   - Mock data is strictly restricted to development environments when `VITE_ENABLE_MOCK=true` is explicitly set in `.env.local` or `.env.development`.
2. **Transparent Error Surfaces:**
   - If the FastAPI server is unreachable or offline, the client does not silently fall back to `localStorage`.
   - Instead, the [`ApiConnectionNotice`](file:///c:/Users/Sakshi%20Pathare/OneDrive/CODING/PROJECTS/evs%20final/src/components/common/ApiConnectionNotice.jsx) banner renders at the top of the interface, clearly alerting the user and providing a single-click retry action.
   - API calls reject with an [`ApiError`](file:///c:/Users/Sakshi%20Pathare/OneDrive/CODING/PROJECTS/evs%20final/src/services/apiClient.js) containing `isNetwork: true` or `isTimeout: true`.

---

## 4. Centralized API Client Architecture

All network traffic dispatches through [`src/services/apiClient.js`](file:///c:/Users/Sakshi%20Pathare/OneDrive/CODING/PROJECTS/evs%20final/src/services/apiClient.js):

- **Authentication:** Injects `Authorization: Bearer <token>` from persistent or session storage.
- **Payload Handling:** Transparently handles both JSON objects (`Content-Type: application/json`) and `FormData` (browser-managed boundary for file uploads).
- **Timeouts & Cancellation:** Uses standard `AbortController` coupled with `VITE_API_TIMEOUT_MS`. Callers may pass their own `signal` for manual request cancellation.
- **Session Expiration:** On HTTP `401 Unauthorized`, fires a global `vasundhara:unauthorized` window event enabling clean user redirection or token invalidation.
- **Error Typing:**
  ```javascript
  try {
    const data = await api.get('/reports');
  } catch (err) {
    if (err.isTimeout) console.error('Request timed out:', err.message);
    if (err.isNetwork) console.error('Backend offline:', err.message);
    if (err.isAuth) console.error('Session expired, re-login required');
  }
  ```

---

## 5. Health Check & Diagnostics

The backend provides two health endpoints:

1. **Root Health Check (`GET /health`):**
   ```json
   {
     "status": "ok",
     "service": "vasundhara-ai-api",
     "version": "2.0.0",
     "environment": "development",
     "database": "connected",
     "timestamp": "2026-11-23T18:25:00.000000+00:00",
     "detector": {
       "available": false,
       "model": null,
       "message": "No trained detector configured. Reports remain manually classified."
     }
   }
   ```

2. **API Namespace Health Check (`GET /api/v1/health`):**
   ```json
   {
     "status": "ok",
     "database": "connected"
   }
   ```

---

## 6. How to Run Frontend & Backend Independently

### Backend Startup (Terminal 1)
```powershell
# From project root
$env:PYTHONPATH="backend"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend Startup (Terminal 2)
```powershell
# From project root
npm run dev
# Server will open on http://localhost:3000 with active proxy to port 8001
```
