-- ==============================================================================
-- Vasundhara AI — Judge Presentation SQL Showcase
-- Run these queries directly in VS Code to demonstrate live database integrity!
-- ==============================================================================

-- 1. VIEW ALL CITIZEN REPORTS (Live crowdsourced litter reports)
SELECT 
    id, 
    title, 
    category, 
    severity, 
    status, 
    address, 
    latitude, 
    longitude, 
    reported_at 
FROM reports 
ORDER BY reported_at DESC;

-- 2. VIEW CLEANUP TASKS & BEFORE/AFTER AUDIT STATUS
SELECT 
    id, 
    report_id, 
    assigned_team, 
    status, 
    verification_status, 
    after_image_uploaded_by, 
    completion_notes,
    created_at
FROM cleanups 
ORDER BY created_at DESC;

-- 3. VIEW SYSTEM USERS (Citizens, Municipal Admins, Superadmins)
SELECT 
    id, 
    name, 
    email, 
    role, 
    active, 
    created_at 
FROM users 
ORDER BY role ASC;

-- 4. VIEW MUNICIPAL BOUNDARY CONFIGURATION (PMC / PCMC geofencing)
SELECT 
    id, 
    code, 
    name, 
    boundary_source, 
    active 
FROM municipalities;

-- 5. VIEW IMMUTABLE AUDIT LOGS (Accountability trail)
SELECT 
    id, 
    action, 
    report_id, 
    actor_user_id, 
    created_at 
FROM audit_logs 
ORDER BY created_at DESC 
LIMIT 20;
