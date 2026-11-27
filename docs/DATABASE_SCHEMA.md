# Vasundhara AI (EcoWatch AI) — Database Schema Specification

**Document Version:** 2.0.0  
**Supported Engines:** PostgreSQL 15+ (Production) | SQLite 3.38+ with WAL Mode (Development & Testing)  
**ORM:** SQLAlchemy 2.0  
**Last Updated:** November 2026  

---

## 1. Entity-Relationship Model Overview

```
 ┌──────────────────────┐         ┌──────────────────────┐
 │    municipalities    │1       *│   ward_boundaries    │
 │──────────────────────│─────────│──────────────────────│
 │ id (PK)              │         │ id (PK)              │
 │ code (UQ)            │         │ municipality_id (FK) │
 │ name                 │         │ ward_id              │
 │ boundary_geojson     │         │ geometry (GeoJSON)   │
 └──────────────────────┘         └──────────────────────┘
            │ 1                              │ 1
            │                                │
            │ *                              │ *
 ┌──────────────────────┐         ┌──────────────────────┐
 │        users         │1       *│       reports        │
 │──────────────────────│─────────│──────────────────────│
 │ id (PK)              │         │ id (PK)              │
 │ email (UQ)           │         │ citizen_user_id (FK) │
 │ password_hash        │         │ municipality_id (FK) │
 │ role                 │         │ ward_id              │
 │ municipality_id (FK) │         │ title, description   │
 │ permissions (JSON)   │         │ latitude, longitude  │
 └──────────────────────┘         │ category, severity   │
            │ 1                   │ status, image_url    │
            │                     │ ai_status, detections│
            │ *                   └──────────────────────┘
 ┌──────────────────────┐                    │ 1
 │    auth_sessions     │                    │
 │──────────────────────│                    │ 1
 │ token_hash (PK)      │         ┌──────────────────────┐
 │ user_id (FK)         │         │       cleanups       │
 │ expires_at           │         │──────────────────────│
 └──────────────────────┘         │ id (PK)              │
                                  │ report_id (FK)       │
 ┌──────────────────────┐         │ status               │
 │      audit_logs      │         │ assigned_team        │
 │──────────────────────│         │ before_image_url     │
 │ id (PK)              │         │ after_image_url      │
 │ actor_user_id (FK)   │         │ verification_status  │
 │ report_id (FK)       │         │ verified_by_user (FK)│
 │ action, details      │         └──────────────────────┘
 └──────────────────────┘
```

---

## 2. Table Definitions & Constraints

### 2.1 `municipalities`
Represents autonomous urban local bodies / corporations governing civic waste collection.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(64)` | PRIMARY KEY | Unique identifier (e.g., `PMC`, `PCMC`, `BMC`). |
| `code` | `VARCHAR(32)` | NOT NULL, UNIQUE, INDEX | Official jurisdiction code. |
| `name` | `VARCHAR(255)` | NOT NULL | Full municipal corporation title. |
| `boundary_geojson`| `JSON` | NOT NULL | Polygon or MultiPolygon GeoJSON defining cadastre boundary. |
| `boundary_source` | `VARCHAR(255)` | NULLABLE | Metadata source (e.g., "Official Pune GIS Cadastre"). |
| `active` | `BOOLEAN` | NOT NULL, DEFAULT `TRUE` | Whether the jurisdiction is actively monitored. |
| `created_at` | `TIMESTAMP WITH TZ` | NOT NULL, DEFAULT `utc_now` | Record initialization timestamp. |

### 2.2 `ward_boundaries`
Sub-jurisdictional wards and administrative sanitation zones.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(64)` | PRIMARY KEY | Unique identifier (e.g., `ward-pmc-04`). |
| `municipality_id` | `VARCHAR(64)` | NOT NULL, FK(`municipalities.id`) | Owning municipal corporation. |
| `ward_id` | `VARCHAR(64)` | NOT NULL, INDEX | Ward code or administrative identifier. |
| `zone_id` | `VARCHAR(64)` | NULLABLE | Sanitation zone identifier. |
| `geometry` | `JSON` | NOT NULL | GeoJSON boundary polygon. |
| `source` | `VARCHAR(255)` | NULLABLE | Spatial boundary source documentation. |

### 2.3 `users`
System actors across citizen, municipal officer, and super-administrator roles.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(64)` | PRIMARY KEY | System identifier (`USR-<HEX>`). |
| `email` | `VARCHAR(255)` | NOT NULL, UNIQUE, INDEX | Validated electronic mail address. |
| `phone` | `VARCHAR(32)` | NULLABLE | Mobile phone for SMS/dispatch alerts. |
| `password_hash` | `VARCHAR(255)` | NOT NULL | PBKDF2-SHA256 hash (310,000 iterations). |
| `name` | `VARCHAR(255)` | NOT NULL | User's full name. |
| `role` | `VARCHAR(32)` | NOT NULL, INDEX | `citizen`, `municipal_admin`, `super_admin`. |
| `municipality_id` | `VARCHAR(64)` | NULLABLE, FK(`municipalities.id`) | Assigned jurisdiction for municipal officers. |
| `authorized_ward_ids`| `JSON` | NULLABLE | List of specific wards assigned to officer. |
| `authorized_zone_ids`| `JSON` | NULLABLE | List of specific zones assigned to officer. |
| `permissions` | `JSON` | NOT NULL, DEFAULT `[]` | Explicit capability list (`reports:read`, etc.). |
| `active` | `BOOLEAN` | NOT NULL, DEFAULT `TRUE` | Account authorization flag. |

### 2.4 `reports`
Core citizen and automated environmental incident records.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(64)` | PRIMARY KEY | Incident Tracking ID (`EW-<HEX>`). |
| `citizen_user_id` | `VARCHAR(64)` | NULLABLE, FK(`users.id`) | Submitting citizen steward identifier. |
| `municipality_id` | `VARCHAR(64)` | NULLABLE, FK(`municipalities.id`) | Assigned municipal corporation. |
| `ward_id` | `VARCHAR(64)` | NULLABLE, INDEX | Resolved administrative ward. |
| `zone_id` | `VARCHAR(64)` | NULLABLE | Resolved sanitation zone. |
| `jurisdiction_status`| `VARCHAR(32)`| NOT NULL, INDEX | `assigned`, `unassigned`, `quarantined`. |
| `title` | `VARCHAR(255)` | NOT NULL | Short summary of litter accumulation. |
| `description` | `TEXT` | NULLABLE | Citizen observations. |
| `latitude` | `FLOAT` | NOT NULL, CHECK(`-90 <= lat <= 90`) | GPS latitude coordinate. |
| `longitude` | `FLOAT` | NOT NULL, CHECK(`-180 <= lon <= 180`)| GPS longitude coordinate. |
| `address` | `VARCHAR(512)` | NULLABLE | Reverse-geocoded street address. |
| `category` | `VARCHAR(64)` | NOT NULL, DEFAULT `'plastic'` | `plastic`, `metal`, `paper`, `hazardous`, etc. |
| `severity` | `VARCHAR(32)` | NOT NULL, DEFAULT `'medium'` | `low`, `medium`, `high`, `critical`. |
| `estimated_kg` | `FLOAT` | NOT NULL, DEFAULT `5.0` | Estimated physical mass in kg. |
| `status` | `VARCHAR(32)` | NOT NULL, INDEX | `pending`, `verified`, `scheduled`, `cleaned`, `rejected`. |
| `image_url` | `VARCHAR(512)` | NULLABLE | Storage path for before-remediation photo. |
| `ai_status` | `VARCHAR(32)` | NOT NULL, DEFAULT `'completed'` | `completed`, `unavailable`, `failed`. |
| `detections` | `JSON` | NOT NULL, DEFAULT `[]` | YOLO bounding boxes, classes, and confidence. |
| `detection_note` | `TEXT` | NULLABLE | Heuristic triage or inference diagnostics. |
| `reported_at` | `TIMESTAMP WITH TZ` | NOT NULL, INDEX, DEFAULT `utc_now` | Incident submission timestamp. |
| `is_archived` | `BOOLEAN` | NOT NULL, DEFAULT `FALSE` | Soft-deletion and archival flag. |

### 2.5 `cleanups`
Municipal sanitation remediation tasks and evidence records.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(64)` | PRIMARY KEY | Cleanup Task ID (`CLN-<HEX>`). |
| `report_id` | `VARCHAR(64)` | NOT NULL, UNIQUE, FK(`reports.id`)| Associated incident report. |
| `assigned_team` | `VARCHAR(128)` | NOT NULL | Sanitation squad or contractor name. |
| `scheduled_date` | `DATE` | NULLABLE | Scheduled remediation date. |
| `status` | `VARCHAR(32)` | NOT NULL, INDEX | `pending`, `assigned`, `in_progress`, `completed`, `cancelled`. |
| `verification_status`| `VARCHAR(32)`| NOT NULL, INDEX | `unverified`, `awaiting_verification`, `verified`, `rejected`. |
| `before_image_url` | `VARCHAR(512)` | NULLABLE | Original evidence photograph. |
| `after_image_url` | `VARCHAR(512)` | NULLABLE | Mandatory post-cleanup restoration photo. |
| `completion_notes` | `TEXT` | NULLABLE | Squad field report notes. |
| `verified_by_user_id`| `VARCHAR(64)` | NULLABLE, FK(`users.id`) | Certifying municipal officer. |
| `verified_at` | `TIMESTAMP WITH TZ` | NULLABLE | Officer verification timestamp. |

### 2.6 `auth_sessions`
Active and revokable user authentication sessions.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `token_hash` | `VARCHAR(64)` | PRIMARY KEY | SHA-256 digest of bearer access token. |
| `user_id` | `VARCHAR(64)` | NOT NULL, FK(`users.id`), INDEX | Authenticated user account. |
| `expires_at` | `TIMESTAMP WITH TZ` | NOT NULL, INDEX | Expiration boundary (default 12 hours). |
| `created_at` | `TIMESTAMP WITH TZ` | NOT NULL, DEFAULT `utc_now` | Session issuance timestamp. |

### 2.7 `audit_logs`
Immutable compliance and forensic audit ledger.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(64)` | PRIMARY KEY | Audit Record ID (`AUD-<HEX>`). |
| `actor_user_id` | `VARCHAR(64)` | NULLABLE, FK(`users.id`), INDEX | User who performed the action. |
| `municipality_id` | `VARCHAR(64)` | NULLABLE, INDEX | Tenant jurisdiction. |
| `report_id` | `VARCHAR(64)` | NULLABLE, INDEX | Target report record. |
| `action` | `VARCHAR(64)` | NOT NULL, INDEX | Action type (e.g. `report:verify`, `cleanup:certify`). |
| `details` | `JSON` | NOT NULL, DEFAULT `{}` | Structured action parameters and diffs. |
| `created_at` | `TIMESTAMP WITH TZ` | NOT NULL, INDEX, DEFAULT `utc_now` | Immutable event timestamp. |

---

## 3. Performance & Composite Indexes

```sql
-- Spatial and filtering optimization
CREATE INDEX ix_reports_status ON reports (status);
CREATE INDEX ix_reports_reported_at ON reports (reported_at);
CREATE INDEX ix_reports_muni_status ON reports (municipality_id, status);
CREATE INDEX ix_reports_ward_id ON reports (ward_id);

-- Cleanup queries
CREATE INDEX ix_cleanups_status ON cleanups (status);
CREATE INDEX ix_cleanups_verification ON cleanups (verification_status);

-- Security and session lookup (0.4ms average latency)
CREATE INDEX ix_auth_sessions_user_id ON auth_sessions (user_id);
CREATE INDEX ix_auth_sessions_expires_at ON auth_sessions (expires_at);

-- Audit query optimization
CREATE INDEX ix_audit_actor_action ON audit_logs (actor_user_id, action);
```
