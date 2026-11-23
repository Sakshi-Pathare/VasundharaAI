# Vasundhara AI — Production PostgreSQL Database Schema

---

## 1. Entity-Relationship Overview

```mermaid
erDiagram
    MUNICIPALITIES ||--o{ WARD_BOUNDARIES : contains
    MUNICIPALITIES ||--o{ USERS : assigns
    MUNICIPALITIES ||--o{ REPORTS : routes_to
    USERS ||--o{ AUTH_SESSIONS : owns
    USERS ||--o{ REPORTS : submits
    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--o{ AUDIT_LOGS : performs
    REPORTS ||--o| CLEANUPS : triggers
    REPORTS ||--o{ NOTIFICATIONS : references
    REPORTS ||--o{ AUDIT_LOGS : logs

    MUNICIPALITIES {
        varchar_32 id PK
        varchar_32 code UK "Indexed"
        varchar_180 name
        json boundary_geojson
        varchar_500 boundary_source
        timestamp boundary_updated_at
        boolean active "Indexed"
        timestamp created_at
    }

    WARD_BOUNDARIES {
        varchar_32 id PK
        varchar_32 municipality_id FK "Indexed"
        varchar_80 ward_id "Indexed"
        varchar_80 zone_id "Indexed"
        json geometry
        varchar_500 source
    }

    USERS {
        varchar_32 id PK
        varchar_254 email UK "Indexed"
        varchar_256 password_hash
        varchar_120 name
        varchar_40 phone
        varchar_32 role "Indexed, Check: citizen|municipal_admin|super_admin"
        varchar_32 municipality_id FK "Indexed"
        json authorized_ward_ids
        json authorized_zone_ids
        json permissions
        boolean active "Indexed"
        timestamp created_at
    }

    AUTH_SESSIONS {
        varchar_64 token_hash PK
        varchar_32 user_id FK "CASCADE, Indexed"
        timestamp expires_at "Indexed"
        timestamp created_at
    }

    REPORTS {
        varchar_32 id PK
        varchar_160 title
        text description
        float latitude "Check: -90..90"
        float longitude "Check: -180..180"
        varchar_300 address
        varchar_32 category "Indexed"
        varchar_16 severity "Indexed"
        varchar_24 status "Indexed"
        varchar_24 jurisdiction_status "Indexed"
        varchar_32 municipality_id FK "Indexed"
        varchar_80 ward_id
        varchar_80 zone_id
        varchar_40 jurisdiction_assignment_source
        timestamp jurisdiction_assignment_date
        varchar_32 citizen_user_id FK "SET NULL, Indexed"
        varchar_80 reporter_id
        varchar_120 reporter_name
        float estimated_kg "Check: >0..10000"
        varchar_500 image_url
        text detection_note
        json detections
        text internal_notes
        boolean is_archived "Indexed"
        timestamp archived_at
        timestamp reported_at "Indexed"
        timestamp updated_at
    }

    CLEANUPS {
        varchar_32 id PK
        varchar_32 report_id FK "SET NULL, UK, Indexed"
        varchar_180 task_name
        varchar_300 location
        varchar_160 assigned_team
        varchar_160 contact_lead
        varchar_40 scheduled_date
        varchar_20 status "Indexed, Check: pending|in_progress|completed"
        varchar_16 priority
        float estimated_hours
        varchar_80 waste_volume_estimate
        varchar_500 before_image_url
        varchar_500 after_image_url
        text notes
        timestamp completed_at
        timestamp created_at "Indexed"
        timestamp updated_at
    }

    NOTIFICATIONS {
        varchar_32 id PK
        varchar_32 user_id FK "CASCADE, Indexed"
        varchar_32 municipality_id FK "SET NULL, Indexed"
        varchar_32 report_id "Indexed"
        varchar_300 message
        timestamp read_at
        timestamp created_at
    }

    AUDIT_LOGS {
        varchar_32 id PK
        varchar_32 actor_user_id FK "SET NULL, Indexed"
        varchar_32 municipality_id FK "SET NULL, Indexed"
        varchar_32 report_id "Indexed"
        varchar_64 action "Indexed"
        json details
        timestamp created_at "Indexed"
    }
```

---

## 2. Table Specifications & Indexes

### 2.1. `reports` (Pollution Incidents)
- **Primary Key:** `id` (VARCHAR(32))
- **Foreign Keys:**
  - `municipality_id` $\rightarrow$ `municipalities.id` (`ON DELETE SET NULL`)
  - `citizen_user_id` $\rightarrow$ `users.id` (`ON DELETE SET NULL`)
- **Indexes:**
  - `ix_reports_status` on `status` (B-Tree: fast filtering by open/resolved state)
  - `ix_reports_reported_at` on `reported_at` (B-Tree: sorting reports chronologically)
  - `ix_reports_coordinates` on `(latitude, longitude)` (Compound index for spatial bounding queries)
  - `ix_reports_municipality_ward` on `(municipality_id, ward_id)` (Compound index for tenant and ward dispatch filtering)
  - `ix_reports_jurisdiction_status` on `jurisdiction_status` (Filtering reports pending review)
  - `ix_reports_archived` on `is_archived` (Filtering active vs archived reports)
- **Check Constraints:**
  - `chk_report_latitude`: `latitude BETWEEN -90.0 AND 90.0`
  - `chk_report_longitude`: `longitude BETWEEN -180.0 AND 180.0`
  - `chk_report_estimated_kg`: `estimated_kg > 0 AND estimated_kg <= 10000`

### 2.2. `cleanups` (Municipal Remediation Workflows)
- **Primary Key:** `id` (VARCHAR(32))
- **Foreign Key:** `report_id` $\rightarrow$ `reports.id` (`ON DELETE SET NULL`)
  > [!IMPORTANT]
  > Using `ON DELETE SET NULL` ensures that deleting or archiving an incident report **never accidentally destroys municipal cleanup operational history**, crew dispatch records, or after-cleanup photo verifications.
- **Indexes:**
  - `ix_cleanups_status` on `status` (B-Tree: pending, in_progress, completed)
  - `ix_cleanups_created_at` on `created_at` (B-Tree: task dispatch chronological ordering)
- **Check Constraints:**
  - `chk_cleanup_status`: `status IN ('pending', 'in_progress', 'completed')`

### 2.3. `users` (Multi-Role Authentication)
- **Primary Key:** `id` (VARCHAR(32))
- **Unique Indexes:** `ix_users_email` on `email` (Case-insensitive unique constraint)
- **Foreign Key:** `municipality_id` $\rightarrow$ `municipalities.id` (`ON DELETE SET NULL`)
- **Check Constraints:**
  - `chk_user_role`: `role IN ('citizen', 'municipal_admin', 'super_admin')`

### 2.4. `municipalities` & `ward_boundaries`
- **Primary Key:** `id` (VARCHAR(32))
- **Unique Index:** `ix_municipalities_code` on `code` (e.g. `PMC`, `PCMC`, `BMC`)
- **Ward Boundaries:** Cascades `ON DELETE CASCADE` when parent municipality is removed.
