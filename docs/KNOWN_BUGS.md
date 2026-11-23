# Vasundhara AI — Known Bugs, Technical Debt & Architectural Risks

---

## 1. High-Priority Issues (Must Address First)

### BUG-001: Vite Backend Proxy Port Configuration Mismatch
- **Severity:** High (Blocks local API communication)
- **Component:** `vite.config.js` vs FastAPI server defaults
- **Root Cause:**
  - `vite.config.js` configures:
    ```js
    proxy: {
      '/api': 'http://localhost:8001',
      '/static': 'http://localhost:8001',
    }
    ```
  - Standard Uvicorn/FastAPI tutorials and commands often launch on port `8000`. If backend runs on `8000`, the frontend proxy fails with `504 Gateway Timeout` or `ECONNREFUSED`.
- **Resolution Plan:** Standardize `backend/README.md`, startup scripts, and `.env.example` to port `8001` (`uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload`), and provide an environment variable `VITE_API_PROXY_TARGET=http://localhost:8001` in Vite.

### BUG-002: Dual Service Implementations & LocalStorage Mock Decoupling
- **Severity:** High (Data does not persist across separate devices/browsers)
- **Component:** `src/services/reportService.js`, `cleanupService.js`, `hotspotService.js`, `authService.js`
- **Root Cause:**
  - Frontend services currently read and write to `localStorage` (`vasundhara_reports_v2_mh`, `vasundhara_cleanups_v2_mh`, etc.) rather than dispatching HTTP requests to `/api/v1`.
  - As a result, an incident reported by a citizen on one machine does not propagate to the municipal admin dashboard on another machine.
- **Resolution Plan:** Connect all service functions to `request(endpoint, options)` in `apiClient.js` with structured error handling and graceful connection banners (`ApiConnectionNotice.jsx`).

### BUG-003: Backend Database URL Default & Missing `backend/.env`
- **Severity:** Medium (Development environment friction)
- **Component:** `backend/app/database.py`
- **Root Cause:**
  - `backend/.env` does not exist by default; only `backend/.env.example` is tracked.
  - When no `DATABASE_URL` is configured, `database.py` defaults to `sqlite:///backend/ecowatch.db`.
  - On Windows OneDrive directories, SQLite file locks can experience latency or collisions if accessed across multiple asynchronous threads.
- **Resolution Plan:** Provide an automated script/command to copy `.env.example` to `.env` on first setup and set SQLite `timeout=30` and WAL mode (`journal_mode=WAL`) when running locally on SQLite.

---

## 2. Medium-Priority Technical Debt

### DEBT-001: Token Storage & Authentication State Synchronization
- **Component:** `src/contexts/AuthContext.jsx` vs `src/services/apiClient.js`
- **Issue:**
  - `src/services/apiClient.js` stores the Bearer JWT in `sessionStorage` (`ecowatch_access_token_v1`).
  - `src/contexts/AuthContext.jsx` stores current user metadata in `localStorage` (`vasundhara_current_user_v2`).
- **Remediation:** Standardize on consistent session management: store Bearer token in secure storage, validate on app mount via `GET /api/v1/auth/me`, and clear both simultaneously on `logout()`.

### DEBT-002: Asset URL Resolution for Uploaded Photography
- **Component:** `src/services/apiClient.js` (`resolveAssetUrls`)
- **Issue:**
  - When backend returns `/static/uploads/filename.jpg`, the frontend running on `http://localhost:3000` must resolve this relative to the Vite proxy (`/static/...`), whereas standalone production builds running on a separate domain must resolve against `API_ORIGIN`.
- **Remediation:** Centralize image URL resolution utility to cleanly prefix origin only when running cross-origin, and use relative paths when behind the reverse proxy.

### DEBT-003: Starlette Deprecation Warning in Python 3.14
- **Component:** `fastapi.testclient.TestClient`
- **Warning:** `StarletteDeprecationWarning: Using httpx with starlette.testclient is deprecated; install httpx2 instead.`
- **Remediation:** In upcoming dependency refresh, ensure `httpx` and `starlette` versions remain pinned to mutually tested releases in `requirements-dev.txt`.

---

## 3. Verified Non-Issues (Resolved Baseline)

- **Maharashtra Localization:** Completed. All active mock coordinates and test geometries are anchored to Maharashtra, India (`18.52N, 73.84E`).
- **Two-Stage Experience:** Verified. Public website (`/`) and operational application (`/app`) are cleanly separated by `LandingLayout` and `AppLayout`.
- **Backend Tenant Isolation:** Verified. 9/9 automated pytest tests verify that municipal admins cannot inspect or tamper with foreign municipality data.
