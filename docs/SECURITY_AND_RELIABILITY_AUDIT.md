# Vasundhara AI — Security, Validation and Reliability Audit

**Document Version**: 2.0.0  
**Audit Conducted**: 2026-11-27  
**Auditor Role**: Senior Application Security & Systems Reliability Engineer  
**Scope**: Full Stack (FastAPI backend, React frontend, SQLite/PostgreSQL storage, YOLOv8 computer vision inference, RESTful APIs, and static asset pipeline).

---

## Executive Summary

A comprehensive application security and reliability audit was conducted across the **Vasundhara AI** environmental intelligence platform. The audit identified, remediated, and verified key controls spanning authentication, authorization, multi-tenant isolation, file upload validation, structured telemetry, and fault tolerance.

### Summary of Controls & Posture
| Control Domain | Status | Verification Mechanism |
| :--- | :--- | :--- |
| **Authentication & Password Hashing** | **SECURE** | PBKDF2-HMAC-SHA256 (310,000 rounds), Constant-Time Dummy Verification |
| **Session Management** | **SECURE** | Cryptographic random tokens (`secrets.token_urlsafe(36)`), SHA-256 hashed in DB, 12h TTL |
| **Authorization & Tenant Isolation** | **SECURE** | Strict RBAC (`citizen`, `municipal_admin`, `super_admin`) + GIS boundary scoping |
| **SQL Injection Exposure** | **ZERO EXPOSURE** | 100% Parameterized SQLAlchemy ORM query construction; zero raw string interpolation |
| **File Upload & Magic Bytes** | **SECURE** | Enforced 8MB cap, binary magic byte checks (JPEG/PNG/WebP), SVG/executable rejection, content hashing |
| **Path Traversal & Scheme Injection** | **SECURE** | Resolving upload parent boundaries, blocking traversal sequences (`..`), blocking non-image schemes |
| **Rate Limiting & Anti-Brute-Force** | **SECURE** | Sliding-window limiter on login (5/min) and registration (10/min) with `Retry-After` header |
| **Observability & Request Tracing** | **ENHANCED** | Distributed `X-Request-ID` generation, structured latency logging, security headers |
| **Fault Tolerance & Reliability** | **ENHANCED** | Automatic DB session rollback on exception, `/ready` probe, non-blocking online backups |

---

## 1. Backend Security Audit

### 1.1 Authentication & Password Storage
- **Algorithm**: `PBKDF2-HMAC-SHA256` with 310,000 rounds in production (`1,000` during isolated test runs).
- **Salt Generation**: 16 cryptographically secure random bytes via `secrets.token_bytes(16)` per password.
- **Timing Attack Mitigation**: When an unregistered email is queried during authentication, the backend executes `verify_password(payload.password, DUMMY_HASH)`. This ensures that invalid emails and valid emails require identical CPU cycles, preventing username/email enumeration via response timing discrepancies.

### 1.2 Session Management
- **Token Generation**: High-entropy tokens generated using `secrets.token_urlsafe(36)` (288 bits of entropy).
- **Database Storage**: Raw bearer tokens are **never stored** in plaintext. The database stores `token_hash = sha256(token).hexdigest()`. Even if an administrative database dump is compromised, active session tokens cannot be derived.
- **Lifecycle & Revocation**: Sessions expire after 12 hours. A dedicated `POST /api/v1/auth/logout` endpoint immediately deletes the active session record from the database.

### 1.3 Authorization & Role-Based Access Control (RBAC)
- **Roles**:
  - `citizen`: Can submit reports, view own reports, view public anonymized map, check karma score.
  - `municipal_admin`: Scoped strictly to their affiliated municipality ID. Can inspect reports, assign crews, verify cleanups, and view ward analytics for their jurisdiction.
  - `super_admin`: Platform-wide governance, municipality onboarding, and cross-boundary dispute resolution.
- **Multi-Tenant Isolation**: Municipal admins attempting to view or alter records from another municipality are blocked by GIS coordinate boundary routing and database tenant filters.

### 1.4 SQL Injection Analysis
- **Review Finding**: Zero raw SQL string formatting exists across the API routes. All database queries utilize SQLAlchemy ORM expressions (`select()`, `where()`, `delete()`, `func.count()`) which automatically compile to parameterized SQL statements with bound parameters.
- **DDL Synchronization**: The lightweight schema synchronizer in `database.py` interpolates only from hardcoded internal dictionary keys (`REPORT_COLUMNS`), never accepting user-controlled input.

### 1.5 Rate Limiting
- Built-in in-memory sliding-window rate limiter:
  - `login_rate_limiter`: Enforces maximum 5 attempts per 60-second window per IP/email.
  - `register_rate_limiter`: Enforces maximum 10 registrations per 60-second window per IP.
  - Returns HTTP `429 Too Many Requests` with a standard `Retry-After` header specifying wait duration in seconds.

---

## 2. File Upload & Asset Security

### 2.1 File Validation Architecture
- **Size Limits**: Enforced maximum file size of 8 MB (`MAX_IMAGE_BYTES`). Payloads exceeding 8MB immediately trigger HTTP `413 Payload Too Large`.
- **Magic Byte Verification**: Rather than trusting client-supplied `Content-Type` headers or file extensions, `_validate_image_bytes` inspects the initial byte signatures:
  - **JPEG**: `\xff\xd8\xff`
  - **PNG**: `\x89PNG\r\n\x1a\n`
  - **WebP**: `RIFF` with `WEBP` tag at byte offset 8–12.
- **SVG & XSS Prevention**: SVG files (`image/svg+xml`) are strictly rejected. SVGs can execute embedded `<script>` tags when rendered directly in browsers; disallowing SVGs completely prevents stored XSS via image uploads.
- **Executables & Polyglots**: Binary executables (ELF, PE `MZ`), archive scripts, and HTML files are rejected due to magic byte mismatches.

### 2.2 Filename Sanitization & Storage Integrity
- **Cryptographic Content Addressing**: Uploaded files are renamed using their SHA-256 digest: `up-{sha256[:20]}.{ext}`. User-controlled filenames (e.g. `../../evil.php` or null bytes `%00`) are discarded.
- **Path Traversal Defense**:
  - `target = (UPLOAD_DIR / clean_name).resolve()`
  - Enforces `target.parent == UPLOAD_DIR.resolve()`.
  - Blocks explicit `..` sequences and URL-encoded `%2e%2e` sequences.
- **Dangerous Scheme Blocking**:
  - Rejects `javascript:`, `file:`, `data:text/html`, and arbitrary protocol schemes in image URL fields.

---

## 3. Reliability & Operational Fault Tolerance

### 3.1 Structured Logging & Correlation
- **Request Tracking Middleware**:
  - Generates a unique correlation ID (`req_<uuid16>`) for every incoming request or propagates a valid upstream `X-Request-ID`.
  - Attaches `X-Request-ID` to response headers.
  - Logs structured telemetry with client IP, HTTP method, URL path, status code, and latency in milliseconds.

### 3.2 Security Headers
The API middleware attaches standard defensive headers to every HTTP response:
```http
X-Request-ID: req_2bf5603e3a504e23
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
```

### 3.3 Consistent Error Envelope
All error responses follow a consistent, parseable schema:
```json
{
  "detail": "Descriptive message",
  "error": {
    "code": "HTTP_403",
    "message": "Your account is not permitted to perform this action.",
    "details": null
  },
  "requestId": "req_2bf5603e3a504e23",
  "timestamp": "2026-11-27T04:17:56.234074+00:00"
}
```
Unhandled server exceptions (`500 Internal Server Error`) log the full traceback correlated with the request ID, but return a sanitized error message to prevent leaking internal database paths, stack frames, or environment variables to clients.

### 3.4 Database Session Rollback on Error
In `backend/app/database.py`, `get_db()` wraps session execution in an exception block:
```python
def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    except Exception as exc:
        db.rollback()
        logger.error(f"Database session rolled back due to error: {exc}")
        raise
    finally:
        db.close()
```
This guarantees that dirty transactions are rolled back immediately upon any unhandled route exception.

### 3.5 Health & Readiness Probes
- **`/health` (Liveness)**: Validates that the application server is responsive, executes `SELECT 1` on the database, and reports AI detector availability.
- **`/ready` (Readiness)**: Verifies that the database is active, and the upload directory is writable. Returns `200 OK` when ready or `503 Service Unavailable` if dependencies fail.

---

## 4. Frontend Security Review

### 4.1 Token Storage & Authentication State
- Tokens are stored in browser `localStorage` or `sessionStorage` via `src/services/apiClient.js`.
- The client automatically clears cached tokens upon receiving `401 Unauthorized` and dispatches an authentication expiration event.

### 4.2 Protected Routing
- React client-side route guard `<ProtectedRoute>` enforces role checks before rendering component trees.
- Even if a client bypasses frontend routing via DOM manipulation, every backend API route performs independent, authoritative session and RBAC validation.

### 4.3 Public Data Anonymization
- Public incident endpoints (`GET /reports`) invoke `_public_report_json()`, which strips:
  - Citizen name, email, and phone number
  - Internal administrative notes
  - Sensitive internal audit histories

---

## 5. Security & Reliability Test Verification

The test suite (`backend/tests/`) contains 32 comprehensive tests verifying security constraints:
- `test_unauthorized_access_to_protected_endpoints`: 401 on unauthenticated access.
- `test_privilege_escalation_defense`: 403 on role escalation attempts.
- `test_file_upload_security`: 400 on empty files, spoofed executables, and SVG XSS payloads; 413 on oversized files.
- `test_path_traversal_prevention`: 400 on traversal sequences and dangerous URI schemes.
- `test_input_validation`: 422 on boundary violations, out-of-range coordinates, and blank titles.
- `test_session_revocation`: Immediate token invalidation upon logout.
- `test_login_rate_limiting`: 429 lockout and `Retry-After` header.
- `test_request_tracking`: Verification of `X-Request-ID` and security headers.
- `test_readiness_probe`: Verification of `/ready` health diagnostics.

**Test Run Results**:
$$\textbf{31 Passed, 1 Skipped (Postgres live probe), 0 Failed in 7.11s (100\% Passing)}$$

---

## 6. Documented Security Limitations & Roadmap

While the application demonstrates high defensive maturity, the following operational limitations are documented:

1. **In-Memory Rate Limiter in Distributed Deployments**:
   - The current sliding-window rate limiter stores timestamps in local process memory (`rate_limiter.py`). In a multi-replica container deployment behind a round-robin load balancer, rate limits are per-node rather than global.
   - *Recommendation*: Deploy Redis and use Redis-backed token-bucket rate limiting for clustered production setups.
2. **Local Static File Storage**:
   - Uploaded evidence photos are currently stored on the local filesystem (`backend/uploads`).
   - *Recommendation*: In enterprise cloud deployments, transition `UPLOAD_DIR` to an S3-compatible or Google Cloud Storage bucket with signed URLs and private access controls.
3. **Session Revocation Storage**:
   - Active session tokens are stored in the database. While high-performing on SQLite with WAL mode, high-frequency token verification at scale should leverage an in-memory Redis cache with short TTLs.
4. **Content Security Policy (CSP)**:
   - Security headers enforce `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY`. A strict Content Security Policy (`CSP`) should be configured at the reverse proxy (Nginx / Cloudflare) to restrict external script origins.
