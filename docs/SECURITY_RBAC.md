# Security Architecture and Role-Based Access Control (RBAC)

This document outlines the authentication, authorization, multi-tenant isolation, password policy, and rate-limiting infrastructure for **EcoWatch AI**.

---

## 1. User Roles & Permission Hierarchy

EcoWatch AI implements a strict hierarchical role-based access model with three primary actor roles:

| Role | Scope | Permitted Capabilities |
| :--- | :--- | :--- |
| **`citizen`** | Public / Self | - Submit civic waste reports with GPS coordinates, photos, and descriptions.<br>- View public pollution map and verified incidents (with privacy stripping).<br>- View and track own submitted reports in `/my-reports`.<br>- Manage personal profile. |
| **`municipal_admin`** | Municipality-Scoped | - Manage civic waste reports within assigned municipality.<br>- Verify reports, change status, assign severity/priority levels.<br>- Dispatch cleanup crews and assign tasks to cleanup teams.<br>- Mark cleanups completed (requires mandatory after-cleanup photo validation).<br>- Access municipal dashboard, analytics, and operational metrics. |
| **`super_admin`** | Platform-Wide | - Full administrative oversight across all municipalities.<br>- Create, configure, and manage municipalities and ward boundaries.<br>- Provision municipal admin accounts.<br>- View system-wide security audit logs and aggregated platform analytics. |

---

## 2. Password Security & Defense Mechanisms

### 2.1 Password Complexity Policy
All registration (`POST /auth/register`) and admin user creation (`POST /superadmin/users`) enforce robust password complexity:
- **Minimum length**: 12 characters.
- **Character diversity**: Must contain at least one letter (`[A-Za-z]`) and at least one numeric digit (`[0-9]`).
- Submissions failing these requirements are rejected with HTTP 422 containing explicit guidance.

### 2.2 Password Storage
- Passwords are encrypted using **PBKDF2-HMAC-SHA256** with high-iteration salt generation.
- Plaintext passwords are never logged, stored in databases, or included in API responses.

### 2.3 Timing Attack & User Enumeration Mitigation
- Authentication (`POST /auth/login`) computes a constant-time cryptographic hash comparison even when the requested email does not exist in the database.
- A pre-computed dummy hash (`DUMMY_HASH`) is verified against the supplied password before returning HTTP 401. This guarantees that latency for non-existent accounts matches valid accounts, defeating side-channel user enumeration timing attacks.
- Login failure error messages are uniformly generic: *"Invalid email or password"*.

---

## 3. Rate Limiting

EcoWatch AI includes a memory-efficient sliding-window rate limiter (`backend/app/rate_limiter.py`):

- **Login Attempts**: Limited to **5 failed attempts per 60 seconds** per IP/email.
- **Registration Requests**: Limited to **10 requests per 60 seconds** per IP.
- **Exceeded Threshold Response**:
  - HTTP `429 Too Many Requests`.
  - Includes `Retry-After: <seconds>` response header.
  - Returns clear JSON explaining the temporary lockout.

---

## 4. Multi-Tenant Data Isolation & Privacy Stripping

### 4.1 Cross-Citizen Data Isolation
- Citizens can only query their own reports in `/reports/mine`.
- Accessing a report belonging to another citizen via private inspection endpoints results in HTTP `403 Forbidden`.

### 4.2 Public Data Stripping
- Public queries (`GET /reports` without elevated role) systematically redact sensitive fields:
  - Reporter email address, phone number, and reporter ID are stripped.
  - Internal municipality investigation notes are removed.
- Prevents civic reporting doxxing and harassment.

### 4.3 Multi-Tenant Municipal Isolation & Concealed 404
- Municipal officers are strictly scoped to their assigned `municipality_id`.
- When an officer attempts to retrieve or update an incident outside their jurisdiction, the system returns **HTTP 404 Not Found** (rather than 403 Forbidden) to avoid leaking the existence of sensitive municipal records across administrative boundaries.

---

## 5. Session Management & Frontend Protection

### 5.1 Token-Based Session Lifecycle
- Sessions are issued via secure cryptographic tokens upon login.
- Logout explicitly revokes the active session in PostgreSQL / SQLite (`is_revoked = True`).
- Revoked or expired sessions immediately trigger HTTP 401, prompting the frontend to clear authentication storage.

### 5.2 React Protected Routes (`ProtectedRoute.jsx`)
- Sensitive client-side routes are wrapped in `<ProtectedRoute>`:
  - `/dashboard`, `/report`, `/my-reports`: Protected for authenticated users (`citizen`, `municipal_admin`, `super_admin`).
  - `/admin`, `/cleanups`: Restricted to `municipal_admin` and `super_admin`.
  - `/superadmin`: Restricted exclusively to `super_admin`.
- Unauthenticated requests are redirected to `/login`, preserving the intended target path in navigation state.
- Insufficient permissions render a dedicated "Access Restricted" view without exposing backend route structures.

---

## 6. Verification & Automated Test Suite

All security requirements are validated in `backend/tests/test_api.py`:
- `test_security_password_complexity_and_registration`: Password constraints, uniqueness, and credential stripping.
- `test_security_login_rate_limiting_and_enumeration_defense`: Generic 401 messages, constant-time dummy hashing, and 429 lockout.
- `test_security_session_revocation_and_expiration`: Token invalidation on logout and session expiration handling.
- `test_security_role_escalation_and_privilege_enforcement`: Rejection of unauthorized role access on administrative routes.
- `test_security_cross_citizen_and_tenant_data_isolation`: Tenant-scoped 404 isolation and public data redaction.

**Test Results**: 24 passed, 1 skipped (100% passing).
