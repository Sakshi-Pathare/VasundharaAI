# Vasundhara AI — API Reference Documentation

**API Version:** 2.0.0  
**Base URL:** `/api/v1`  
**Authentication Scheme:** HTTP Bearer Token (`Authorization: Bearer <TOKEN>`)  
**Specification:** OpenAPI 3.1 compatible (Interactive Swagger UI available at `/docs` in non-production environments)  

---

## 1. Global Standards & Error Envelope

All successful responses return JSON. All error responses conform to a standardized error envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid latitude coordinate.",
    "details": [
      {
        "field": "latitude",
        "issue": "Input should be greater than or equal to -90"
      }
    ]
  },
  "requestId": "req_8c387fb679b4427c",
  "timestamp": "2026-11-27T14:10:00.000Z"
}
```

### Standard HTTP Status Codes
- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully persisted.
- `204 No Content`: Action succeeded with no body (e.g. Logout).
- `400 Bad Request`: Invalid payload, unsupported image format, or missing evidence.
- `401 Unauthorized`: Missing, invalid, or expired session token.
- `403 Forbidden`: Insufficient role permissions or cross-tenant violation.
- `404 Not Found`: Target resource does not exist (or concealed for security).
- `422 Unprocessable Content`: Schema or Pydantic validation failure.
- `429 Too Many Requests`: Rate limit threshold exceeded.
- `500 Internal Server Error`: Unhandled server exception with rollback.

---

## 2. Public Endpoints (No Auth Required)

### `GET /health`
Liveness check providing application version and detector availability.
- **Response `200 OK`:**
  ```json
  {
    "status": "ok",
    "service": "vasundhara-ai-api",
    "version": "2.0.0",
    "environment": "production",
    "database": "connected",
    "timestamp": "2026-11-27T14:10:00Z",
    "detector": { "available": false, "status": "heuristic_fallback" }
  }
  ```

### `GET /ready`
Readiness probe validating database connectivity and upload volume write access.
- **Response `200 OK`** or **`503 Service Unavailable`**.

### `GET /api/v1/public/reports`
Sanitized list of public litter incidents for community awareness. Excludes citizen personal data.
- **Query Params:** `category`, `severity`, `limit` (default 50, max 200), `offset`.
- **Response `200 OK`:** Array of sanitized incident objects.

### `GET /api/v1/public/metrics`
High-level civic statistics aggregated from genuine database records.
- **Response `200 OK`:**
  ```json
  {
    "totalReports": 142,
    "verifiedReports": 98,
    "pendingReports": 24,
    "activeHotspots": 7,
    "completedCleanups": 86,
    "wasteDivertedKg": 1840.5
  }
  ```

---

## 3. Authentication & Sessions

### `POST /api/v1/auth/register`
Citizen account registration with automatic PBKDF2 hashing.
- **Request Body:**
  ```json
  {
    "name": "Priya Sharma",
    "email": "priya.sharma@domain.eco",
    "password": "StewardPassword2026!",
    "phone": "+91-9876543210"
  }
  ```
- **Response `201 Created`:** User object + `accessToken`.

### `POST /api/v1/auth/login`
Authenticates credentials and issues a SHA-256 hashed revokable session. Protected by 5-attempt brute-force rate limiter.
- **Request Body:** `{ "email": "...", "password": "..." }`
- **Response `200 OK`:** `{ "accessToken": "...", "user": { ... } }`

### `POST /api/v1/auth/logout`
Revokes the bearer token immediately in database `auth_sessions`.
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Response `204 No Content`**

### `GET /api/v1/auth/me`
Retrieves authenticated user identity and active tenant scope.

---

## 4. Reporting Operations

### `POST /api/v1/reports`
Submits a new litter report with GPS coordinates and photographic evidence.
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Request Body:**
  ```json
  {
    "title": "Plastic Dumping on Riverbank",
    "description": "Discarded PET beverage bottles and polythene bags.",
    "latitude": 18.5300,
    "longitude": 73.8500,
    "address": "Mutha Riverbank Road, Shivajinagar",
    "category": "plastic",
    "severity": "high",
    "estimatedKg": 45.0,
    "imageUrl": "data:image/jpeg;base64,..."
  }
  ```
- **Response `201 Created`:** Created report with assigned jurisdiction (`PMC`), ward, and tracking ID (`EW-...`).

### `GET /api/v1/reports/mine`
Retrieves all reports filed by the calling citizen steward.

### `PATCH /api/v1/reports/{id}/status`
Administrative verification or rejection of an incident report.
- **Role Required:** `municipal_admin` or `super_admin`.
- **Request Body:** `{ "status": "verified", "notes": "Officer confirmed" }`

### `GET /api/v1/reports/export.csv`
Streams a comma-separated export of scoped incident records for municipal GIS cadastre systems.

---

## 5. Geospatial Hotspot Intelligence

### `GET /api/v1/hotspots`
Runs spatial accumulation clustering ($\le 300\text{m}$) and returns prioritized hotspots with 5-factor scoring.
- **Query Params:** `sortBy` (`priority` \| `recurrence` \| `date`), `radius_meters`, `ward_id`.
- **Response `200 OK`:**
  ```json
  [
    {
      "id": "HOT-PMC-001",
      "name": "Recurring litter cluster near Mutha Riverbank",
      "municipalityId": "PMC",
      "priorityScore": 78,
      "dominantCategory": "plastic",
      "reportCount": 5,
      "recurrenceCount": 3,
      "factors": {
        "wasteSeverity": { "score": 85.0, "weight": 0.30, "contribution": 25.5 },
        "reportRecurrence": { "score": 70.0, "weight": 0.25, "contribution": 17.5 },
        "cleanupLag": { "score": 75.0, "weight": 0.20, "contribution": 15.0 },
        "environmentalSensitivity": { "score": 90.0, "weight": 0.15, "contribution": 13.5 },
        "reportRecency": { "score": 70.0, "weight": 0.10, "contribution": 7.0 }
      }
    }
  ]
  ```

---

## 6. Cleanup Operations & Verification

### `POST /api/v1/cleanups`
Creates a remediation task from a verified report.
- **Request Body:**
  ```json
  {
    "reportId": "EW-4B0268D67888",
    "assignedTeam": "PMC Sanitation Squad 4",
    "scheduledDate": "2026-11-28",
    "notes": "Bring industrial rakes and polymer sorting bins."
  }
  ```

### `POST /api/v1/cleanups/{id}/evidence`
Uploads post-remediation photographic proof.
- **Request Body:** `{ "afterImageUrl": "data:image/jpeg;base64,...", "notes": "Debris collected." }`
- **Response `200 OK`:** Transitions task to `awaiting_verification`.

### `POST /api/v1/cleanups/{id}/verify`
Certifies cleanup completion. Updates both the cleanup task and linked report status to `cleaned`.
- **Request Body:** `{ "decision": "approve", "notes": "Evidence verified." }`
