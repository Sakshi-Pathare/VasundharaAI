# Vasundhara AI — Comprehensive User Manual

**Document Version:** 2.0.0  
**Target Audiences:** Citizen Stewards, Municipal Sanitation Officials, Cleanup Squads, Super Administrators  
**Last Updated:** November 2026  

---

## 1. Citizen Steward Guide

### 1.1 Account Registration & Authentication
1. Navigate to `http://localhost:3000/login` (or production URL).
2. Select **"Create New Account"**.
3. Enter your full name, email address, password (minimum 8 characters with numbers and capital letters), and optional mobile phone for SMS dispatch notifications.
4. Agree to the **Environmental Stewardship Code** and submit. You are automatically authenticated and redirected to your Citizen Dashboard (`/dashboard`).

### 1.2 Submitting an Environmental Incident Report
1. Click **"Report Litter"** from the navigation bar or floating action button.
2. **Attach Photographic Evidence:** Drag and drop or browse to select a photograph of the accumulation (JPG, PNG, or WebP). The system automatically compresses the image client-side to minimize upload time.
3. **Pin Location on GIS Map:**
   - Click anywhere on the interactive Leaflet map to drop an exact GPS pin, OR
   - Click the GPS target icon to use your browser's current geolocation.
   - The street address and municipal ward automatically reverse-geocode.
4. **Enter Incident Details:**
   - Enter a descriptive title (e.g., *"Discarded packaging and PET bottles near Mutha riverwalk"*).
   - Select primary waste material (`Plastic`, `Metal`, `Paper`, `Hazardous`, `Organic`, `Mixed`).
   - Choose observed severity (`Low`, `Medium`, `High`, `Critical`).
   - Enter estimated mass in kilograms.
5. Click **"Review & Submit Incident"**, inspect the summary in the pre-submission modal, and confirm.
6. A success screen presents your genuine **Incident Tracking ID** (`EW-XXXXXXXXXXXX`) along with assigned municipal jurisdiction and YOLO computer vision classification status.

### 1.3 Tracking Incident Progress
1. Open **"My Reports"** (`/my-reports`) from the user menu.
2. Track your submission's lifecycle badges:
   - **Pending Review:** Awaiting municipal verification.
   - **Verified:** Validated by municipal sanitation officer.
   - **Scheduled / In Progress:** Dispatched to local cleanup squad.
   - **Cleaned & Restored:** Remediation completed and certified with before/after evidence photos.

---

## 2. Municipal Administrator Guide

### 2.1 Accessing the Municipal Command Dashboard
1. Log in with your municipal officer credentials (e.g. `r.sharma@pune.gov.in`).
2. Navigate to **"Admin Dashboard"** (`/admin`).
3. View real-time database-driven metrics:
   - **Total Incident Reports**
   - **Verified vs. Pending Review**
   - **Active Hotspot Clusters**
   - **Cleaned & Restored Sites**
   - **6-Month Remediation & Waste Trends**

### 2.2 Reviewing & Verifying Incident Reports
1. In the **Incident Action Queue**, inspect newly logged citizen submissions.
2. Click on an incident row to inspect:
   - Original photographic evidence with YOLOv8 bounding boxes and detection confidence.
   - Exact GPS coordinates and assigned ward cadastre.
   - Submitting citizen contact information.
3. Actions:
   - Click **"Verify Report"** to approve valid civic reports for municipal dispatch.
   - Click **"Schedule Cleanup"** to generate an operational task.
   - Click **"Reject"** if the report is spam, private property, or duplicate.

### 2.3 Geospatial Hotspot Intelligence (`/hotspots`)
1. Open the **Hotspot Intelligence** dashboard.
2. Review automatically clustered accumulation zones:
   - Each cluster displays centroid GPS coordinates, report count, and deduplicated recurrence count.
   - Transparent **Priority Score (1–100)** broken down by Waste Severity (30%), Recurrence (25%), Cleanup Lag (20%), Environmental Proximity (15%), and Recency (10%).
3. Filter by Ward, Priority tier (`Critical`, `High`, `Medium`), or waste category.
4. Export geospatial GIS layers or generate targeted cleanup dispatches for top-priority hotspots.

---

## 3. Cleanup Squad & Remediation Workflow

### 3.1 Managing Cleanup Tasks (`/cleanups`)
1. Sanitation supervisors access **Cleanup Operations** (`/cleanups`).
2. Tasks display current assignment status:
   - **Assigned:** Task created, waiting for squad to deploy.
   - **In Progress:** Squad is on-site performing collection.
   - **Awaiting Verification:** Debris removed; awaiting officer sign-off.
   - **Verified Completed:** Final certification approved.

### 3.2 Uploading After-Cleanup Proof
1. Once litter is collected from the physical location, the squad supervisor opens the task.
2. Click **"Upload Evidence"**.
3. Upload an authentic photograph of the cleared, restored site.
4. Input completion notes (e.g. *"Collected 45kg polymers; transferred to Hadapsar baling plant"*).
5. Submit proof. The task status transitions to `awaiting_verification`.

### 3.3 Administrative Certification
1. Municipal officer reviews the side-by-side **Before vs. After** evidence imagery.
2. Click **"Verify Evidence"** $\rightarrow$ **"Approve Certification"**.
3. The cleanup is certified, the parent citizen report updates to `cleaned`, and the citizen ledger displays the restored photograph.

---

## 4. Super Administrator Guide

### 4.1 System Governance (`/superadmin`)
1. Super-administrators govern the multi-tenant platform at `http://localhost:3000/superadmin`.
2. Capabilities:
   - **Audit Logs:** Review immutable system audit logs with actor IDs, IP traces, and state diffs.
   - **Quarantined Incidents:** Review and manually route boundary-edge reports located between municipal jurisdictions.
   - **User Role Management:** Promote or reassign municipal administrators and ward officers.
   - **Cadastre Upload:** Import updated GeoJSON ward polygons and corporation boundary files.
