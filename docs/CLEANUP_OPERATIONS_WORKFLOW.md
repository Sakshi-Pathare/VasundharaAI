# Cleanup Operations and Evidence Verification Workflow

This document specifies the complete cleanup management and photographic evidence verification lifecycle implemented in Vasundhara AI, connecting citizen litter reports, municipal administrators, and field cleanup operations squads.

---

## 1. Workflow Architecture & Lifecycle State Machine

The cleanup lifecycle coordinates field operations and municipal verification through a 6-stage validated state machine:

```
[Citizen Report: Submitted & Verified]
               │
               ▼ (Admin creates task)
         ┌───────────┐
         │  pending  │ ◄──────────────────────────────────────────────┐
         └─────┬─────┘                                                │
               │ (Assign squad)                                       │
               ▼                                                      │
         ┌───────────┐                                                │
         │  assigned │                                                │
         └─────┬─────┘                                                │
               │ (Squad starts work)                                  │
               ▼                                                      │
        ┌─────────────┐                                               │
        │ in_progress │                                               │
        └──────┬──────┘                                               │
               │ (Squad uploads after-image + completion notes)       │
               ▼                                                      │
 ┌───────────────────────────┐                                        │
 │   awaiting_verification   │                                        │
 └─────────────┬─────────────┘                                        │
               ├────────────────────────────┐                         │
 (Admin Verify │                            │ (Admin Rejects evidence)│
  Approved)    ▼                            ▼                         │
         ┌───────────┐                ┌──────────┐                    │
         │ completed │                │ reopened ├────────────────────┘
         └───────────┘                └──────────┘  (Reassigned / Reworked)
```

### Stage Definitions

| Workflow Status | Underlying Model Status | Verification Status | Allowed Transitions | Description |
|---|---|---|---|---|
| `pending` | `pending` | `pending` | `assigned`, `in_progress` | Cleanup task created from verified citizen report; squad pending assignment. |
| `assigned` | `pending` | `assigned` | `in_progress`, `pending` | Assigned to a specific field squad/team with deadline and notes. |
| `in_progress` | `in_progress` | `in_progress` | `awaiting_verification` | Squad has commenced remediation on-site. |
| `awaiting_verification` | `in_progress` | `awaiting_verification` | `completed`, `reopened` | Squad uploaded after-cleanup evidence and completion notes; pending admin inspection. |
| `completed` | `completed` | `verified` | None (Final) | Administrator certified genuine remediation; report transitions to `cleaned`. |
| `reopened` | `in_progress` | `rejected` | `assigned`, `in_progress` | Administrator rejected evidence with required corrective notes; squad must remediate. |

---

## 2. Evidence Verification Protocol

### A. Photographic Evidence Safeguards
1. **Preservation of Original Evidence**:
   - `before_image_url` is automatically populated from the verified citizen report upon cleanup creation.
   - It is permanently read-only and immutable for the lifetime of the cleanup.
2. **Genuine After-Cleanup Evidence Required**:
   - The after-cleanup photo uploaded by the field squad undergoes validation (file format, magic byte MIME-type verification, and secure storage).
   - Mock/stock images are strictly prohibited in production mode.
3. **No Automatic Verification**:
   - **Critical Rule**: Uploading an after-cleanup photograph **never** automatically marks the cleanup as `completed` or `verified`.
   - The task transitions strictly to `awaiting_verification`, leaving the underlying cleanup status as `in_progress` and the associated report status as `scheduled`.
4. **Audit Metadata Stored on Upload**:
   - `after_image_uploaded_at`: ISO 8601 UTC timestamp of submission.
   - `after_image_uploaded_by`: Username/ID of the field squad member or operator who submitted the photo.
   - `completion_notes`: Operational comments detailing waste volume cleared, disposal method, and special handling.

### B. Administrator Verification Protocol
1. **Approval (`decision == "approve"`)**:
   - Administrator visually compares before and after evidence in the verification portal.
   - Sets `verification_status = "verified"` and `status = "completed"`.
   - Records `verified_at` timestamp and `verified_by` administrator identifier.
   - Transitions the linked citizen report from `scheduled` $\rightarrow$ `cleaned`.
   - Automatically impacts geospatial hotspot calculations (the verified cleanup timestamp reduces the hotspot lag score).
2. **Rejection & Reopening (`decision == "reject"`)**:
   - Requires explicit `notes` explaining why the evidence was unsatisfactory (e.g., residual debris, incorrect GPS angle, low-quality photograph).
   - Sets `verification_status = "rejected"` and workflow status to `reopened`.
   - The cleanup remains `in_progress`; the report remains `scheduled`.
   - A descriptive audit event is recorded, alerting the field team for remediation.

---

## 3. Database Schema & Data Integrity

### Table Schema Additions (`cleanups`)

```sql
ALTER TABLE cleanups ADD COLUMN after_image_uploaded_at DATETIME;
ALTER TABLE cleanups ADD COLUMN after_image_uploaded_by VARCHAR(255);
ALTER TABLE cleanups ADD COLUMN completion_notes TEXT;
ALTER TABLE cleanups ADD COLUMN verification_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE cleanups ADD COLUMN verified_at DATETIME;
ALTER TABLE cleanups ADD COLUMN verified_by VARCHAR(255);
ALTER TABLE cleanups ADD COLUMN verification_notes TEXT;
```

### Transition Integrity Rules
1. **Valid Report Linkage**: Every cleanup task must reference an existing report (`report_id`). If the report does not exist or belongs to another municipal tenant, the API rejects creation with `404 Not Found` or `403 Forbidden`.
2. **Tenant Scoping**: All operations (`GET`, `PATCH`, `POST`) enforce multi-tenant isolation. Municipal staff can only view and update cleanups within their authorized jurisdiction (`municipality_id`).
3. **State Invariants**:
   - Direct transitions from `pending` to `completed` are rejected (`400 Bad Request`).
   - A cleanup cannot transition to `awaiting_verification` without an after-cleanup image URL.
   - Verification decisions can only be made on tasks that are `awaiting_verification`.

---

## 4. Chronological Audit History (`GET /cleanups/{id}/history`)

All lifecycle transitions, assignments, evidence uploads, rejections, and approvals are recorded in the `audit_events` ledger:

```json
[
  {
    "id": 101,
    "timestamp": "2026-11-26T06:10:00Z",
    "action": "cleanup_created",
    "performedBy": "admin_central",
    "details": "Assigned to Green Squad with deadline 2026-11-28"
  },
  {
    "id": 102,
    "timestamp": "2026-11-26T06:12:00Z",
    "action": "cleanup_status_updated",
    "performedBy": "green_squad_lead",
    "details": "Status changed to in_progress"
  },
  {
    "id": 103,
    "timestamp": "2026-11-26T06:14:00Z",
    "action": "evidence_submitted",
    "performedBy": "green_squad_lead",
    "details": "After-cleanup evidence uploaded: 2 bags of plastic bottles removed"
  },
  {
    "id": 104,
    "timestamp": "2026-11-26T06:15:00Z",
    "action": "cleanup_rejected",
    "performedBy": "admin_central",
    "details": "Evidence rejected: Residual cardboard debris visible near curb"
  },
  {
    "id": 105,
    "timestamp": "2026-11-26T06:18:00Z",
    "action": "evidence_submitted",
    "performedBy": "green_squad_lead",
    "details": "Resubmitted after-cleanup evidence: All cardboard cleared"
  },
  {
    "id": 106,
    "timestamp": "2026-11-26T06:20:00Z",
    "action": "cleanup_verified",
    "performedBy": "admin_central",
    "details": "Remediation verified and certified. Location clean."
  }
]
```

---

## 5. Frontend Interface (`CleanupManagementPage.jsx`)

The React management UI provides:
1. **Operational Status Tabs**: Quick filtering across `All`, `Pending`, `In Progress`, `Awaiting Verification`, `Completed`, and `Reopened`.
2. **Visual Task Cards**: Displaying report details, priority badge, assigned team, scheduled date, and actionable workflow buttons.
3. **Before & After Visual Comparison Modal**:
   - Side-by-side or responsive split view of the original citizen photo vs. field squad evidence.
   - Clear inspection tags and metadata (uploader, upload time).
4. **Administrator Verification Controls**:
   - `Approve & Certify`: Instantly approves evidence, completes the task, and marks report as cleaned.
   - `Reject & Reopen`: Prompts for mandatory corrective notes and sends task back to squad.
5. **Interactive Audit Timeline**:
   - Full event history drawer detailing who performed each action, when, and the associated comments.
6. **Squad Reassignment & Evidence Upload Modals**:
   - Squad leaders can upload new photographic evidence directly with client-side image compression and validation.
