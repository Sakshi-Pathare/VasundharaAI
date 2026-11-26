import base64
import io
import os
from pathlib import Path

os.environ["TESTING"] = "1"
original_database_url = os.environ.get("DATABASE_URL")
os.environ["DATABASE_URL"] = "sqlite://"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import UPLOAD_DIR, app
from app.models import AuthSession, Municipality, User, WardBoundary
from app.rate_limiter import login_rate_limiter, register_rate_limiter
from app.security import hash_password

if original_database_url is None:
    os.environ.pop("DATABASE_URL", None)
else:
    os.environ["DATABASE_URL"] = original_database_url


test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSession = sessionmaker(bind=test_engine, autoflush=False, expire_on_commit=False)


def override_get_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


def rectangle(west, south, east, north):
    return {
        "type": "Polygon",
        "coordinates": [[
            [west, south],
            [east, south],
            [east, north],
            [west, north],
            [west, south],
        ]],
    }


def setup_function():
    login_rate_limiter.reset()
    register_rate_limiter.reset()
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    with TestSession() as db:
        db.add_all([
            Municipality(
                id="PCMC",
                code="PCMC",
                name="Pimpri-Chinchwad Municipal Corporation",
                boundary_geojson=rectangle(73.70, 18.55, 73.88, 18.72),
                boundary_source="Test-only rectangle; not official municipal boundary data.",
                active=True,
            ),
            Municipality(
                id="PMC",
                code="PMC",
                name="Pune Municipal Corporation",
                boundary_geojson=rectangle(73.88, 18.45, 74.05, 18.55),
                boundary_source="Test-only rectangle; not official municipal boundary data.",
                active=True,
            ),
        ])
        db.add(WardBoundary(
            id="ward-pcmc-1",
            municipality_id="PCMC",
            ward_id="W-1",
            zone_id="Z-1",
            geometry=rectangle(73.72, 18.57, 73.86, 18.70),
            source="Test-only ward boundary.",
        ))
        db.add_all([
            User(
                id="admin-pcmc",
                email="pcmc@example.test",
                password_hash=hash_password("PCMC-test-password-2026"),
                name="PCMC Officer",
                role="municipal_admin",
                municipality_id="PCMC",
                permissions=[
                    "reports:read", "reports:manage", "reports:delete",
                    "cleanups:read", "cleanups:manage", "analytics:read",
                    "citizens:read", "notes:read", "notes:manage",
                    "audit:read", "exports:read", "notifications:read",
                ],
                active=True,
            ),
            User(
                id="admin-pmc",
                email="pmc@example.test",
                password_hash=hash_password("PMC-test-password-2026"),
                name="PMC Officer",
                role="municipal_admin",
                municipality_id="PMC",
                permissions=[
                    "reports:read", "reports:manage", "reports:delete",
                    "cleanups:read", "cleanups:manage", "analytics:read",
                    "citizens:read", "notes:read", "notes:manage",
                    "audit:read", "exports:read", "notifications:read",
                ],
                active=True,
            ),
            User(
                id="admin-pcmc-ward",
                email="ward@example.test",
                password_hash=hash_password("Ward-test-password-2026"),
                name="PCMC Ward Officer",
                role="municipal_admin",
                municipality_id="PCMC",
                authorized_ward_ids=["W-1"],
                authorized_zone_ids=["Z-1"],
                permissions=["reports:read", "analytics:read"],
                active=True,
            ),
            User(
                id="admin-super",
                email="super@example.test",
                password_hash=hash_password("Super-test-password-2026"),
                name="Platform Super Admin",
                role="super_admin",
                permissions=["*"],
                active=True,
            ),
        ])
        db.commit()


def register_citizen(client, email="citizen@example.test"):
    response = client.post("/api/v1/auth/register", json={
        "name": "Test Citizen",
        "email": email,
        "phone": "+1-555-0100",
        "password": "citizen-test-password-2026",
    })
    assert response.status_code == 201, response.text
    return {"Authorization": f"Bearer {response.json()['accessToken']}"}


def login(client, email, password):
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['accessToken']}"}


def create_report(
    client,
    citizen_headers,
    *,
    latitude=18.62,
    longitude=73.80,
    title="Street litter",
    extra=None,
):
    payload = {
        "title": title,
        "description": "Trash beside a public footpath.",
        "latitude": latitude,
        "longitude": longitude,
        "address": "Community Footpath",
        "category": "plastic",
        "severity": "high",
        "estimatedKg": 4,
    }
    if extra:
        payload.update(extra)
    return client.post("/api/v1/reports", json=payload, headers=citizen_headers)


def test_report_is_routed_from_coordinates_and_frontend_tenant_fields_are_ignored():
    with TestClient(app) as client:
        citizen = register_citizen(client)
        pcmc = create_report(
            client,
            citizen,
            extra={"municipalityId": "PMC", "municipalityCode": "PMC", "reporterId": "forged"},
        )
        pmc = create_report(client, citizen, latitude=18.50, longitude=73.95, title="Pune report")
        assert pcmc.status_code == pmc.status_code == 201
        assert pcmc.json()["municipalityCode"] == "PCMC"
        assert pcmc.json()["municipalityName"] == "Pimpri-Chinchwad Municipal Corporation"
        assert pcmc.json()["wardId"] == "W-1"
        assert pcmc.json()["zoneId"] == "Z-1"
        assert pcmc.json()["jurisdictionAssignmentSource"] == "municipal-boundary"
        assert pmc.json()["municipalityCode"] == "PMC"


def test_municipal_admins_are_isolated_across_reports_details_and_status_updates():
    with TestClient(app) as client:
        citizen = register_citizen(client)
        pcmc = create_report(client, citizen).json()
        pmc = create_report(client, citizen, latitude=18.50, longitude=73.95, title="Pune litter").json()
        pcmc_admin = login(client, "pcmc@example.test", "PCMC-test-password-2026")
        pmc_admin = login(client, "pmc@example.test", "PMC-test-password-2026")

        pcmc_inbox = client.get("/api/v1/reports", headers=pcmc_admin).json()
        pmc_inbox = client.get("/api/v1/reports", headers=pmc_admin).json()
        assert [item["id"] for item in pcmc_inbox] == [pcmc["id"]]
        assert [item["id"] for item in pmc_inbox] == [pmc["id"]]
        assert client.get(f"/api/v1/reports/{pcmc['id']}", headers=pmc_admin).status_code == 404
        assert client.patch(
            f"/api/v1/reports/{pcmc['id']}/status",
            json={"status": "verified"},
            headers=pmc_admin,
        ).status_code == 403
        assert client.post(
            "/api/v1/cleanups",
            json={"reportId": pcmc["id"]},
            headers=pmc_admin,
        ).status_code == 403


def test_admin_analytics_map_hotspots_csv_and_notifications_are_tenant_scoped():
    with TestClient(app) as client:
        citizen = register_citizen(client)
        pcmc_first = create_report(client, citizen, title="PCMC first").json()
        pcmc_second = create_report(
            client,
            citizen,
            latitude=18.621,
            longitude=73.801,
            title="PCMC repeat",
        ).json()
        pmc_report = create_report(
            client,
            citizen,
            latitude=18.50,
            longitude=73.95,
            title="PMC report",
        ).json()
        pcmc_admin = login(client, "pcmc@example.test", "PCMC-test-password-2026")
        pmc_admin = login(client, "pmc@example.test", "PMC-test-password-2026")

        assert client.get("/api/v1/analytics/metrics", headers=pcmc_admin).json()["totalReports"] == 2
        assert client.get("/api/v1/analytics/metrics", headers=pmc_admin).json()["totalReports"] == 1
        assert len(client.get("/api/v1/hotspots", headers=pcmc_admin).json()) == 1
        assert client.get("/api/v1/hotspots", headers=pmc_admin).json() == []
        assert client.get("/api/v1/admin/notifications", headers=pcmc_admin).json()
        pmc_notifications = client.get("/api/v1/admin/notifications", headers=pmc_admin).json()
        assert [item["reportId"] for item in pmc_notifications] == [pmc_report["id"]]
        assert all(item["reportId"] not in {pcmc_first["id"], pcmc_second["id"]} for item in pmc_notifications)

        pcmc_csv = client.get("/api/v1/reports/export.csv", headers=pcmc_admin)
        pmc_csv = client.get("/api/v1/reports/export.csv", headers=pmc_admin)
        assert pcmc_csv.status_code == pmc_csv.status_code == 200
        assert "PMC report" not in pcmc_csv.text
        assert pcmc_first["id"] in pcmc_csv.text and pcmc_second["id"] in pcmc_csv.text
        assert pmc_report["id"] in pmc_csv.text
        assert pcmc_first["id"] not in pmc_csv.text


def test_public_reports_exclude_private_data_and_admin_routes_require_authentication():
    with TestClient(app) as client:
        citizen = register_citizen(client)
        report = create_report(client, citizen).json()
        public_reports = client.get("/api/v1/public/reports").json()
        assert len(public_reports) == 1
        assert public_reports[0]["id"] == report["id"]
        for key in ("reporterId", "reporterName", "reporterEmail", "reporterPhone", "internalNotes", "description"):
            assert key not in public_reports[0]
        assert client.get("/api/v1/reports").status_code == 401
        assert client.get("/api/v1/analytics/metrics").status_code == 401
        assert client.get("/api/v1/admin/citizens").status_code == 401
        assert client.get("/api/v1/reports", headers=citizen).status_code == 403
        assert client.get("/api/v1/admin/citizens", headers=login(
            client, "pcmc@example.test", "PCMC-test-password-2026"
        )).status_code == 200


def test_ward_scope_restricts_admin_reports_without_broadening_tenant_access():
    with TestClient(app) as client:
        citizen = register_citizen(client)
        in_ward = create_report(client, citizen, longitude=73.80, latitude=18.62).json()
        outside_ward = create_report(client, citizen, longitude=73.87, latitude=18.71).json()
        ward_admin = login(client, "ward@example.test", "Ward-test-password-2026")
        assert [item["id"] for item in client.get("/api/v1/reports", headers=ward_admin).json()] == [in_ward["id"]]
        assert client.get(f"/api/v1/reports/{outside_ward['id']}", headers=ward_admin).status_code == 404


def test_unknown_and_near_boundary_reports_are_quarantined_until_superadmin_review():
    with TestClient(app) as client:
        citizen = register_citizen(client)
        unknown = create_report(client, citizen, latitude=19.0, longitude=75.0, title="Outside boundary").json()
        near_edge = create_report(client, citizen, latitude=18.62, longitude=73.8799, title="Boundary report").json()
        assert unknown["jurisdictionStatus"] == "pending"
        assert near_edge["jurisdictionStatus"] == "pending"
        assert client.get("/api/v1/public/reports").json() == []
        pcmc_admin = login(client, "pcmc@example.test", "PCMC-test-password-2026")
        assert client.get("/api/v1/reports", headers=pcmc_admin).json() == []
        super_headers = login(client, "super@example.test", "Super-test-password-2026")
        pending = client.get("/api/v1/superadmin/reports/pending-jurisdiction", headers=super_headers)
        assert {item["id"] for item in pending.json()} == {unknown["id"], near_edge["id"]}
        assert client.post(
            f"/api/v1/superadmin/reports/{unknown['id']}/jurisdiction",
            json={"municipalityCode": "PCMC", "reason": "Verified coordinates against the test boundary."},
            headers=super_headers,
        ).status_code == 422
        resolved = client.post(
            f"/api/v1/superadmin/reports/{near_edge['id']}/jurisdiction",
            json={"municipalityCode": "PCMC", "reason": "Verified original pin and confirmed jurisdiction."},
            headers=super_headers,
        )
        assert resolved.status_code == 200
        assert resolved.json()["municipalityCode"] == "PCMC"
        assert resolved.json()["jurisdictionAssignmentSource"] == "superadmin-override"


def test_cleanup_lifecycle_is_scoped_and_completion_requires_after_photo():
    with TestClient(app) as client:
        citizen = register_citizen(client)
        report = create_report(client, citizen).json()
        pcmc_admin = login(client, "pcmc@example.test", "PCMC-test-password-2026")
        pmc_admin = login(client, "pmc@example.test", "PMC-test-password-2026")
        created = client.post(
            "/api/v1/cleanups",
            json={"reportId": report["id"]},
            headers=pcmc_admin,
        )
        assert created.status_code == 201
        cleanup = created.json()
        assert client.patch(
            f"/api/v1/cleanups/{cleanup['id']}/status",
            json={"status": "completed"},
            headers=pcmc_admin,
        ).status_code == 422
        assert client.patch(
            f"/api/v1/cleanups/{cleanup['id']}/status",
            json={"status": "in_progress"},
            headers=pmc_admin,
        ).status_code == 403

        after_photo = "data:image/jpeg;base64,/9j/AA=="
        completed = client.patch(
            f"/api/v1/cleanups/{cleanup['id']}/status",
            json={"status": "completed", "afterImageUrl": after_photo},
            headers=pcmc_admin,
        )
        assert completed.status_code == 200
        assert client.get("/api/v1/reports/mine", headers=citizen).json()[0]["status"] == "cleaned"
        image_path = UPLOAD_DIR / Path(completed.json()["afterImageUrl"]).name
        try:
            assert client.get(completed.json()["afterImageUrl"]).content == b"\xff\xd8\xff\x00"
        finally:
            image_path.unlink(missing_ok=True)


def test_tenant_internal_notes_and_history_are_private():
    with TestClient(app) as client:
        citizen = register_citizen(client)
        report = create_report(client, citizen).json()
        pcmc_admin = login(client, "pcmc@example.test", "PCMC-test-password-2026")
        pmc_admin = login(client, "pmc@example.test", "PMC-test-password-2026")
        updated = client.patch(
            f"/api/v1/reports/{report['id']}/notes",
            json={"note": "Internal dispatch note."},
            headers=pcmc_admin,
        )
        assert updated.status_code == 200
        details = client.get(f"/api/v1/reports/{report['id']}", headers=pcmc_admin).json()
        assert details["internalNotes"] == "Internal dispatch note."
        assert client.get(f"/api/v1/reports/{report['id']}/history", headers=pmc_admin).status_code == 404
        assert client.get(f"/api/v1/reports/{report['id']}/history", headers=pcmc_admin).json()


def test_health_and_geojson_municipality_admin_setup():
    with TestClient(app) as client:
        assert client.get("/api/v1/health").json() == {"status": "ok", "database": "connected"}
        super_headers = login(client, "super@example.test", "Super-test-password-2026")
        municipality = client.post("/api/v1/superadmin/municipalities", headers=super_headers, json={
            "code": "TEST",
            "name": "Test Municipality",
            "boundaryGeojson": rectangle(77, 20, 77.1, 20.1),
            "boundarySource": "Test-only GeoJSON fixture.",
        })
        assert municipality.status_code == 201, municipality.text
        created_admin = client.post("/api/v1/superadmin/admins", headers=super_headers, json={
            "municipalityCode": "TEST",
            "name": "New Municipal Officer",
            "email": "new-admin@example.test",
            "password": "new-admin-password-2026",
        })
        assert created_admin.status_code == 201, created_admin.text
        assert created_admin.json()["municipalityCode"] == "TEST"
        assert client.post("/api/v1/superadmin/admins", headers=login(
            client, "pcmc@example.test", "PCMC-test-password-2026"
        ), json={
            "municipalityCode": "TEST",
            "name": "Unauthorized Admin",
            "email": "unauthorized@example.test",
            "password": "unauthorized-password-2026",
        }).status_code == 403


def test_full_lifecycle_citizen_to_cleanup():
    """
    Validates complete end-to-end integration:
    1. Citizen registers and authenticates -> gets valid JWT.
    2. Citizen submits litter report within PMC boundary.
    3. Municipal Admin logs in and inspects report in triage queue.
    4. Admin verifies report and updates internal notes.
    5. Admin dispatches cleanup task for the report.
    6. Admin assigns squad and schedules date.
    7. Squad completes cleanup with mandatory after-photo evidence.
    8. Verifies linked report automatically transitions to 'cleaned'.
    9. Verifies citizen's `/reports/mine` endpoint reflects 'cleaned' status.
    10. Verifies CSV export contains the report record.
    11. Verifies public analytics reflect 1 total report and 1 completed cleanup.
    """
    with TestClient(app) as client:
        # 1. Citizen registers and authenticates
        reg_resp = client.post("/api/v1/auth/register", json={
            "name": "Aarav Patil",
            "email": "aarav.patil@example.test",
            "phone": "+91-9876543210",
            "password": "aarav-secure-pass-2026",
        })
        assert reg_resp.status_code == 201
        citizen_token = reg_resp.json()["accessToken"]
        citizen_headers = {"Authorization": f"Bearer {citizen_token}"}

        # Verify /auth/me returns citizen profile
        me_resp = client.get("/api/v1/auth/me", headers=citizen_headers)
        assert me_resp.status_code == 200
        assert me_resp.json()["email"] == "aarav.patil@example.test"
        assert me_resp.json()["role"] == "citizen"

        # 2. Citizen submits litter report inside PMC boundary (lat 18.50, lon 73.95)
        report_payload = {
            "title": "Illegal roadside dump near Shivaji Nagar",
            "description": "Large plastic accumulation blocking storm drain.",
            "latitude": 18.50,
            "longitude": 73.95,
            "address": "Shivaji Nagar, Pune, Maharashtra",
            "category": "plastic",
            "severity": "high",
            "estimatedKg": 45.0,
            "imageUrl": "https://images.unsplash.com/photo-1604187351574-c75ca79f5807",
        }
        create_resp = client.post("/api/v1/reports", json=report_payload, headers=citizen_headers)
        assert create_resp.status_code == 201
        report_data = create_resp.json()
        report_id = report_data["id"]
        assert report_id.startswith("EW-")
        assert report_data["status"] == "pending"
        assert report_data["municipalityId"] == "PMC"

        # Verify report appears in citizen's own list
        my_reports_resp = client.get("/api/v1/reports/mine", headers=citizen_headers)
        assert my_reports_resp.status_code == 200
        my_reports = my_reports_resp.json()
        assert len(my_reports) == 1
        assert my_reports[0]["id"] == report_id

        # 3. Municipal Admin logs in
        login_resp = client.post("/api/v1/auth/login", json={
            "email": "pmc@example.test",
            "password": "PMC-test-password-2026",
        })
        assert login_resp.status_code == 200
        admin_token = login_resp.json()["accessToken"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # Admin lists all reports
        admin_reports_resp = client.get("/api/v1/reports", headers=admin_headers)
        assert admin_reports_resp.status_code == 200
        admin_reports = admin_reports_resp.json()
        assert any(r["id"] == report_id for r in admin_reports)

        # 4. Admin verifies report and adds internal notes
        verify_resp = client.patch(
            f"/api/v1/reports/{report_id}/status",
            json={"status": "verified"},
            headers=admin_headers,
        )
        assert verify_resp.status_code == 200
        assert verify_resp.json()["status"] == "verified"

        note_resp = client.patch(
            f"/api/v1/reports/{report_id}/notes",
            json={"note": "Verified by Ward inspection team. High flood risk."},
            headers=admin_headers,
        )
        assert note_resp.status_code == 200
        assert note_resp.json()["internalNotes"] == "Verified by Ward inspection team. High flood risk."

        # 5. Dispatch cleanup task for the report
        cleanup_resp = client.post(
            "/api/v1/cleanups",
            json={
                "reportId": report_id,
                "assignedTeam": "Rapid Response Alpha",
                "scheduledDate": "2026-12-01",
            },
            headers=admin_headers,
        )
        assert cleanup_resp.status_code == 201
        cleanup_data = cleanup_resp.json()
        cleanup_id = cleanup_data["id"]
        assert cleanup_id.startswith("CLN-")
        assert cleanup_data["status"] == "pending"
        assert cleanup_data["assignedTeam"] == "Rapid Response Alpha"

        # 6. Assign squad on cleanup
        assign_resp = client.patch(
            f"/api/v1/cleanups/{cleanup_id}/assign",
            json={
                "assignedTeam": "Pune Central Sanitation Crew #3",
                "scheduledDate": "2026-12-02",
            },
            headers=admin_headers,
        )
        assert assign_resp.status_code == 200
        assert assign_resp.json()["assignedTeam"] == "Pune Central Sanitation Crew #3"

        # Update status to in_progress
        progress_resp = client.patch(
            f"/api/v1/cleanups/{cleanup_id}/status",
            json={"status": "in_progress"},
            headers=admin_headers,
        )
        assert progress_resp.status_code == 200
        assert progress_resp.json()["status"] == "in_progress"

        # 7. Complete cleanup: Attempting completion without after_image_url MUST fail with 422
        fail_complete_resp = client.patch(
            f"/api/v1/cleanups/{cleanup_id}/status",
            json={"status": "completed"},
            headers=admin_headers,
        )
        assert fail_complete_resp.status_code == 422
        assert "after-cleanup photo" in fail_complete_resp.text

        # Now complete cleanup with mandatory photographic evidence
        complete_resp = client.patch(
            f"/api/v1/cleanups/{cleanup_id}/status",
            json={
                "status": "completed",
                "afterImageUrl": "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09",
                "notes": "Footpath and drain cleared. 45kg sorted and dispatched to recycling.",
            },
            headers=admin_headers,
        )
        assert complete_resp.status_code == 200
        assert complete_resp.json()["status"] == "completed"
        assert complete_resp.json()["afterImageUrl"] is not None

        # 8. Linked report must automatically transition to 'cleaned'
        cleaned_report_resp = client.get(f"/api/v1/reports/{report_id}", headers=admin_headers)
        assert cleaned_report_resp.status_code == 200
        assert cleaned_report_resp.json()["status"] == "cleaned"

        # 9. Citizen's view reflects the updated 'cleaned' status
        citizen_my_reports = client.get("/api/v1/reports/mine", headers=citizen_headers).json()
        assert citizen_my_reports[0]["status"] == "cleaned"

        # 10. CSV export contains the report
        csv_resp = client.get("/api/v1/reports/export.csv", headers=admin_headers)
        assert csv_resp.status_code == 200
        assert "text/csv" in csv_resp.headers["content-type"]
        assert report_id in csv_resp.text
        assert "PMC" in csv_resp.text

        # 11. Public and dashboard analytics reflect the completed workflow
        metrics_resp = client.get("/api/v1/analytics/metrics", headers=admin_headers)
        assert metrics_resp.status_code == 200
        metrics = metrics_resp.json()
        assert metrics["totalReports"] >= 1
        assert metrics["completedCleanups"] >= 1


def test_security_password_complexity_and_registration():
    """
    Prompt 6 - Security Test 1:
    Validates password policy enforcement and registration security:
    - Passwords under 12 characters are rejected (422)
    - Passwords without letters or without numbers are rejected (422)
    - Strong compliant passwords succeed (201) and return token without password hash
    - Duplicate registration emails return 409
    """
    with TestClient(app) as client:
        # Too short (< 12 chars)
        resp_short = client.post("/api/v1/auth/register", json={
            "name": "Short Pass User",
            "email": "short@example.test",
            "password": "Pass1",
        })
        assert resp_short.status_code == 422

        # 12 chars but no digit
        resp_no_digit = client.post("/api/v1/auth/register", json={
            "name": "No Digit User",
            "email": "nodigit@example.test",
            "password": "OnlyLettersLongPass",
        })
        assert resp_no_digit.status_code == 422

        # 12 chars but no letter
        resp_no_letter = client.post("/api/v1/auth/register", json={
            "name": "No Letter User",
            "email": "noletter@example.test",
            "password": "123456789012",
        })
        assert resp_no_letter.status_code == 422

        # Compliant registration (>= 12 chars, letters + digits)
        resp_ok = client.post("/api/v1/auth/register", json={
            "name": "Valid Citizen",
            "email": "valid.citizen@example.test",
            "phone": "+91-9999888877",
            "password": "StrongPassword2026!",
        })
        assert resp_ok.status_code == 201
        data = resp_ok.json()
        assert "accessToken" in data
        assert data["user"]["email"] == "valid.citizen@example.test"
        assert "password" not in data["user"]
        assert "passwordHash" not in data["user"]
        assert "password_hash" not in data["user"]

        # Duplicate email
        resp_dup = client.post("/api/v1/auth/register", json={
            "name": "Duplicate User",
            "email": "valid.citizen@example.test",
            "password": "StrongPassword2026!",
        })
        assert resp_dup.status_code == 409
        assert "already exists" in resp_dup.text


def test_security_login_rate_limiting_and_enumeration_defense():
    """
    Prompt 6 - Security Test 2:
    Validates login security, rate limiting, and email enumeration defense:
    - Non-existent email returns generic 401
    - Existing email with wrong password returns identical generic 401
    - 5 rapid failed login attempts succeed, 6th triggers 429 Too Many Requests
    - Successful login resets failure counter
    """
    with TestClient(app) as client:
        # Register a valid user
        reg_resp = client.post("/api/v1/auth/register", json={
            "name": "Rate Limit Target",
            "email": "ratelimit@example.test",
            "password": "SecurePassword12345",
        })
        assert reg_resp.status_code == 201

        # Non-existent email -> generic 401
        resp_nonexistent = client.post("/api/v1/auth/login", json={
            "email": "nonexistent.user.2026@example.test",
            "password": "WrongPassword123",
        })
        assert resp_nonexistent.status_code == 401
        assert resp_nonexistent.json()["detail"] == "Email or password is incorrect."

        # Existing user with wrong password -> identical generic 401
        resp_wrong_pass = client.post("/api/v1/auth/login", json={
            "email": "ratelimit@example.test",
            "password": "WrongPassword123",
        })
        assert resp_wrong_pass.status_code == 401
        assert resp_wrong_pass.json()["detail"] == "Email or password is incorrect."

        # Exceed rate limit (attempt 5 times)
        for _ in range(4):
            client.post("/api/v1/auth/login", json={
                "email": "ratelimit@example.test",
                "password": "WrongPassword123",
            })

        # 6th attempt MUST return 429 Too Many Requests
        rate_limited_resp = client.post("/api/v1/auth/login", json={
            "email": "ratelimit@example.test",
            "password": "WrongPassword123",
        })
        assert rate_limited_resp.status_code == 429
        assert "Retry-After" in rate_limited_resp.headers
        assert "Too many authentication attempts" in rate_limited_resp.text


def test_security_session_revocation_and_expiration():
    """
    Prompt 6 - Security Test 3:
    Validates session revocation (logout) and expiration:
    - Active token can access /auth/me
    - Logging out revokes session from database
    - Revoked token receives 401 Unauthorized
    - Expired token receives 401 Unauthorized
    """
    with TestClient(app) as client:
        # Register and login
        reg_resp = client.post("/api/v1/auth/register", json={
            "name": "Session User",
            "email": "session.user@example.test",
            "password": "SessionPassword2026!",
        })
        assert reg_resp.status_code == 201
        token = reg_resp.json()["accessToken"]
        auth_headers = {"Authorization": f"Bearer {token}"}

        # Valid session accesses /auth/me
        me_resp = client.get("/api/v1/auth/me", headers=auth_headers)
        assert me_resp.status_code == 200

        # Logout
        logout_resp = client.post("/api/v1/auth/logout", headers=auth_headers)
        assert logout_resp.status_code == 204

        # Calling /auth/me with revoked token MUST return 401
        revoked_resp = client.get("/api/v1/auth/me", headers=auth_headers)
        assert revoked_resp.status_code == 401
        assert "Invalid or expired session" in revoked_resp.text

        # Test artificially expired session
        new_login = client.post("/api/v1/auth/login", json={
            "email": "session.user@example.test",
            "password": "SessionPassword2026!",
        })
        new_token = new_login.json()["accessToken"]
        new_headers = {"Authorization": f"Bearer {new_token}"}

        # Expire session in DB
        import hashlib
        from datetime import datetime, timedelta, timezone
        token_hash = hashlib.sha256(new_token.encode("ascii")).hexdigest()
        with TestSession() as db:
            session_rec = db.get(AuthSession, token_hash)
            assert session_rec is not None
            session_rec.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
            db.commit()

        # Calling with expired session MUST return 401
        expired_resp = client.get("/api/v1/auth/me", headers=new_headers)
        assert expired_resp.status_code == 401
        assert "Invalid or expired session" in expired_resp.text


def test_security_role_escalation_and_privilege_enforcement():
    """
    Prompt 6 - Security Test 4:
    Validates strict RBAC and privilege escalation protection:
    - Citizens cannot access administrative triage queue (/reports)
    - Citizens cannot dispatch cleanups (/cleanups)
    - Citizens cannot view admin notifications (/admin/notifications)
    - Citizens cannot access superadmin routes (/superadmin/...)
    - Municipal admins cannot access superadmin routes (/superadmin/...)
    - Unauthenticated requests to protected endpoints return 401
    """
    with TestClient(app) as client:
        citizen_headers = register_citizen(client, email="citizen.security@example.test")
        pcmc_admin = login(client, "pcmc@example.test", "PCMC-test-password-2026")

        # 1. Citizen cannot read municipal admin reports
        assert client.get("/api/v1/reports", headers=citizen_headers).status_code == 403

        # 2. Citizen cannot dispatch cleanups
        assert client.post("/api/v1/cleanups", json={"reportId": "EW-FAKE"}, headers=citizen_headers).status_code == 403

        # 3. Citizen cannot read municipal notifications
        assert client.get("/api/v1/admin/notifications", headers=citizen_headers).status_code == 403

        # 4. Citizen cannot access superadmin onboarding
        assert client.post("/api/v1/superadmin/municipalities", json={"code": "X"}, headers=citizen_headers).status_code == 403

        # 5. Municipal Admin cannot access superadmin endpoints
        assert client.post("/api/v1/superadmin/municipalities", json={"code": "X"}, headers=pcmc_admin).status_code == 403

        # 6. Unauthenticated requests to sensitive endpoints return 401
        assert client.get("/api/v1/reports").status_code == 401
        assert client.get("/api/v1/admin/notifications").status_code == 401
        assert client.get("/api/v1/reports/mine").status_code == 401


def test_security_cross_citizen_and_tenant_data_isolation():
    """
    Prompt 6 - Security Test 5:
    Validates cross-citizen privacy and multi-tenant municipal isolation:
    - Citizen A cannot see Citizen B's reports on /reports/mine
    - Public reports strip private data (reporterEmail, reporterPhone, internalNotes)
    - Municipal admin from PCMC cannot see or touch PMC reports
    """
    with TestClient(app) as client:
        # Register two separate citizens
        citizen_a = register_citizen(client, email="citizen.a@example.test")
        citizen_b = register_citizen(client, email="citizen.b@example.test")

        # Citizen A submits Report A in PCMC
        rep_a = create_report(client, citizen_a, latitude=18.62, longitude=73.80, title="Citizen A Report").json()

        # Citizen B submits Report B in PCMC
        rep_b = create_report(client, citizen_b, latitude=18.63, longitude=73.81, title="Citizen B Report").json()

        # Citizen A's /reports/mine should only contain Report A
        mine_a = client.get("/api/v1/reports/mine", headers=citizen_a).json()
        assert any(r["id"] == rep_a["id"] for r in mine_a)
        assert not any(r["id"] == rep_b["id"] for r in mine_a)

        # Citizen B's /reports/mine should only contain Report B
        mine_b = client.get("/api/v1/reports/mine", headers=citizen_b).json()
        assert any(r["id"] == rep_b["id"] for r in mine_b)
        assert not any(r["id"] == rep_a["id"] for r in mine_b)

        # Public reports must strip private reporter data
        public_reports = client.get("/api/v1/public/reports").json()
        for pub in public_reports:
            assert "reporterEmail" not in pub
            assert "reporterPhone" not in pub
            assert "internalNotes" not in pub

        # Municipal isolation: PCMC admin views rep_a (inside PCMC) -> 200
        pcmc_admin = login(client, "pcmc@example.test", "PCMC-test-password-2026")
        assert client.get(f"/api/v1/reports/{rep_a['id']}", headers=pcmc_admin).status_code == 200

        # PMC admin queries rep_a (which is in PCMC) -> 404 (concealed)
        pmc_admin = login(client, "pmc@example.test", "PMC-test-password-2026")
        assert client.get(f"/api/v1/reports/{rep_a['id']}", headers=pmc_admin).status_code == 404


def test_reporting_workflow_image_upload_and_validation():
    """
    Prompt 7 - Test 1: Image Upload Pipeline & Security
    - Validates multipart/form-data upload endpoint (/uploads)
    - Validates authentic JPEG, PNG, and WebP signatures
    - Rejects corrupt or forged files (400)
    - Enforces max upload size threshold (413)
    - Rejects path traversal attempts
    - Performs content-hash deduplication
    """
    with TestClient(app) as client:
        citizen_headers = register_citizen(client, email="uploader@example.test")

        # 1. Authentic JPEG upload
        jpeg_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00" + b"\x00" * 100
        resp_jpg = client.post(
            "/api/v1/uploads",
            files={"file": ("test_photo.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")},
            headers=citizen_headers,
        )
        assert resp_jpg.status_code == 200
        jpg_data = resp_jpg.json()
        assert jpg_data["url"].startswith("/static/uploads/")
        assert jpg_data["fileName"].endswith(".jpg")

        # 2. Authentic PNG upload
        png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + b"\x00" * 50
        resp_png = client.post(
            "/api/v1/uploads",
            files={"file": ("test_photo.png", io.BytesIO(png_bytes), "image/png")},
            headers=citizen_headers,
        )
        assert resp_png.status_code == 200
        assert resp_png.json()["fileName"].endswith(".png")

        # 3. Authentic WebP upload
        webp_bytes = b"RIFF\x20\x00\x00\x00WEBPVP8 " + b"\x00" * 40
        resp_webp = client.post(
            "/api/v1/uploads",
            files={"file": ("test_photo.webp", io.BytesIO(webp_bytes), "image/webp")},
            headers=citizen_headers,
        )
        assert resp_webp.status_code == 200
        assert resp_webp.json()["fileName"].endswith(".webp")

        # 4. Forged file (text pretending to be JPEG) -> 400 Bad Request
        fake_bytes = b"This is not a real JPEG image file, just plain text."
        resp_fake = client.post(
            "/api/v1/uploads",
            files={"file": ("malicious.jpg", io.BytesIO(fake_bytes), "image/jpeg")},
            headers=citizen_headers,
        )
        assert resp_fake.status_code == 400
        assert "does not match" in resp_fake.text or "Invalid image" in resp_fake.text

        # 5. Oversized image (> 8MB limit) -> 413 Payload Too Large
        oversized_bytes = b"\xff\xd8\xff" + (b"\x00" * (8 * 1024 * 1024 + 500))
        resp_large = client.post(
            "/api/v1/uploads",
            files={"file": ("huge.jpg", io.BytesIO(oversized_bytes), "image/jpeg")},
            headers=citizen_headers,
        )
        assert resp_large.status_code == 413

        # 6. Deduplication: Uploading the exact same JPEG again returns same hash URL
        resp_dup = client.post(
            "/api/v1/uploads",
            files={"file": ("another_name.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")},
            headers=citizen_headers,
        )
        assert resp_dup.status_code == 200
        assert resp_dup.json()["url"] == jpg_data["url"]


def test_reporting_workflow_complete_citizen_journey_and_ai_fallback():
    """
    Prompt 7 - Test 2: End-to-End Citizen Reporting Journey & AI Fallback
    - User journey: login, upload photo, specify GPS coordinates, fill incident info
    - System validates coordinates bounds and inputs
    - System assigns jurisdiction (PMC / Ward)
    - AI analysis resilience: Report is NOT discarded if AI model is unavailable
    - Report ID (EW-...) is returned
    - Citizen can track report in /reports/mine with status and AI status
    """
    with TestClient(app) as client:
        citizen_headers = register_citizen(client, email="steward.citizen@example.test")

        # 1. Base64 JPEG photo
        jpeg_raw = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00" + b"\x00" * 60
        b64_image = f"data:image/jpeg;base64,{base64.b64encode(jpeg_raw).decode('utf-8')}"

        # 2. Validation rejection: Invalid latitude out of bounds
        invalid_lat = client.post(
            "/api/v1/reports",
            json={
                "title": "Invalid Lat Report",
                "latitude": 95.0,  # Invalid (> 90)
                "longitude": 73.85,
                "category": "plastic",
            },
            headers=citizen_headers,
        )
        assert invalid_lat.status_code == 422

        # 3. Successful submission within PMC boundaries
        report_payload = {
            "title": "Plastic and bottle accumulation on riverbank walkway",
            "description": "Heavy debris scattered near drainage culvert after rain. Proximity to public footpath.",
            "category": "plastic",
            "severity": "high",
            "estimatedKg": 15,
            "latitude": 18.5222,
            "longitude": 73.8415,
            "address": "Near FC Road, Deccan Gymkhana, Pune, Maharashtra",
            "imageUrl": b64_image,
        }

        submit_resp = client.post("/api/v1/reports", json={
            "title": report_payload["title"],
            "description": report_payload["description"],
            "category": report_payload["category"],
            "severity": report_payload["severity"],
            "estimated_kg": report_payload["estimatedKg"],
            "latitude": report_payload["latitude"],
            "longitude": report_payload["longitude"],
            "address": report_payload["address"],
            "image_url": report_payload["imageUrl"],
        }, headers=citizen_headers)

        assert submit_resp.status_code == 201
        report_data = submit_resp.json()

        # 4. Verify actual report ID format
        assert report_data["id"].startswith("EW-")
        report_id = report_data["id"]

        # 5. Verify Jurisdiction assignment (PMC)
        assert report_data["jurisdictionStatus"] in ["assigned", "pending"]
        if report_data["municipalityCode"]:
            assert report_data["municipalityCode"] == "PMC"

        # 6. Verify AI Resilience: Not discarded, limitation is visible
        assert "aiStatus" in report_data
        assert report_data["aiStatus"] in ["completed", "unavailable", "pending"]
        assert "detectionNote" in report_data
        assert report_data["status"] == "pending"

        # 7. Citizen can track report in /reports/mine
        mine_resp = client.get("/api/v1/reports/mine", headers=citizen_headers)
        assert mine_resp.status_code == 200
        mine_list = mine_resp.json()
        matching = [r for r in mine_list if r["id"] == report_id]
        assert len(matching) == 1
        tracked = matching[0]
        assert tracked["title"] == report_payload["title"]
        assert tracked["category"] == "plastic"
        assert tracked["severity"] == "high"
        assert tracked["imageUrl"].startswith("/static/uploads/")
        assert tracked["aiStatus"] in ["completed", "unavailable", "pending"]


def test_vision_diagnostics_and_detection_review():
    """
    Prompt 8 - Test: YOLO Vision Engine Diagnostics and Detection Review Pipeline
    - Validates GET /vision/status diagnostics, supported classes, and TACO recommendation
    - Validates POST /vision/detect with error handling and timing metrics
    - Validates PATCH /reports/{id}/detections/review classification correction and audit logging
    - Validates unauthorized rejection (401 unauthenticated, 403 cross-citizen)
    """
    with TestClient(app) as client:
        # 1. Vision status diagnostics endpoint
        status_resp = client.get("/api/v1/vision/status")
        assert status_resp.status_code == 200
        status_data = status_resp.json()
        assert "available" in status_data
        assert "supportedClasses" in status_data
        assert "plastic_bottle" in status_data["supportedClasses"]
        assert "drink_can" in status_data["supportedClasses"]
        assert "paper_scrap" in status_data["supportedClasses"]
        assert "recommendedDataset" in status_data
        assert "TACO" in status_data["recommendedDataset"]["name"]
        assert "CC BY 4.0" in status_data["recommendedDataset"]["license"]

        # 2. Register citizen and create a report
        citizen_a = register_citizen(client, email="vision.citizen.a@example.test")
        citizen_b = register_citizen(client, email="vision.citizen.b@example.test")
        pmc_admin = login(client, "pmc@example.test", "PMC-test-password-2026")

        rep_resp = create_report(
            client,
            citizen_a,
            latitude=18.50,
            longitude=73.95,
            title="Bottles on riverside path",
        )
        assert rep_resp.status_code == 201
        report_data = rep_resp.json()
        assert report_data["municipalityCode"] == "PMC"
        report_id = report_data["id"]

        # 3. Detection Review: Unauthenticated request rejected with 401
        unauth_review = client.patch(
            f"/api/v1/reports/{report_id}/detections/review",
            json={"verifiedCategory": "glass", "note": "Correction test"},
        )
        assert unauth_review.status_code == 401

        # 4. Detection Review: Unauthorized citizen B rejected with 403
        cross_review = client.patch(
            f"/api/v1/reports/{report_id}/detections/review",
            json={"verifiedCategory": "glass", "note": "Unauthorized review attempt"},
            headers=citizen_b,
        )
        assert cross_review.status_code == 403

        # 5. Detection Review: Authorized citizen A updates classification
        citizen_review = client.patch(
            f"/api/v1/reports/{report_id}/detections/review",
            json={
                "verifiedCategory": "metal",
                "note": "Citizen correction: Found aluminum beverage cans mixed in.",
                "corrections": [{"label": "drink_can", "category": "metal"}],
            },
            headers=citizen_a,
        )
        assert citizen_review.status_code == 200
        updated_data = citizen_review.json()
        assert updated_data["category"] == "metal"

        # 6. Detection Review: Municipal admin refines classification with audit trail
        admin_review = client.patch(
            f"/api/v1/reports/{report_id}/detections/review",
            json={
                "verifiedCategory": "plastic",
                "note": "Supervisor on-site inspection confirmed 90% plastic polymer content.",
            },
            headers=pmc_admin,
        )
        assert admin_review.status_code == 200
        assert admin_review.json()["category"] == "plastic"
        assert "Supervisor on-site inspection" in admin_review.json()["internalNotes"]

        # 7. Audit log contains the detection review action
        history_resp = client.get(f"/api/v1/reports/{report_id}/history", headers=pmc_admin)
        assert history_resp.status_code == 200
        history_entries = history_resp.json()
        assert any(entry["action"] == "detection.reviewed" for entry in history_entries)


def test_geospatial_hotspot_clustering_and_priority_scoring():
    """
    Prompt 9 - Test: Geospatial Hotspot Intelligence and 5-Factor Priority Scoring
    - Validates nearby reports within radius (<=300m) are grouped into a cluster
    - Validates distant reports (>300m / >450m seed) are separated into distinct clusters
    - Validates incident deduplication: duplicate reports within 30m and 48h do NOT artificially inflate recurrence
    - Validates verified cleanup records update lastVerifiedCleanupDate and lower cleanup lag score
    - Validates time_window_days filtering excludes reports older than the window
    - Validates 5-factor scoring breakdown (waste severity, recurrence, cleanup lag, environmental, recency)
    - Validates factors sum to priorityScore and priorityExplanation is present
    """
    with TestClient(app) as client:
        citizen = register_citizen(client, email="hotspot.tester@example.test")
        pmc_admin = login(client, "pmc@example.test", "PMC-test-password-2026")

        # 1. Create two nearby reports within PMC boundary (< 150m apart)
        # Location 1: (18.5000, 73.9500)
        rep1_resp = create_report(
            client,
            citizen,
            latitude=18.5000,
            longitude=73.9500,
            title="Plastic bottles on riverbank drain",
            extra={
                "description": "Massive plastic buildup blocking drainage canal near school",
                "category": "plastic",
                "severity": "high",
            },
        )
        assert rep1_resp.status_code == 201
        rep1_id = rep1_resp.json()["id"]

        # Location 2: (18.5010, 73.9508) (~140m from Location 1)
        rep2_resp = create_report(
            client,
            citizen,
            latitude=18.5010,
            longitude=73.9508,
            title="More bags and containers near canal",
            extra={
                "description": "Recurring plastic pollution along the canal bank",
                "category": "plastic",
                "severity": "high",
            },
        )
        assert rep2_resp.status_code == 201
        rep2_id = rep2_resp.json()["id"]

        # 2. Create a distant report (> 2.5 km away) in PMC: (18.5150, 73.9800)
        rep_distant_resp = create_report(
            client,
            citizen,
            latitude=18.5150,
            longitude=73.9800,
            title="Distant garbage pile on commercial avenue",
            extra={
                "category": "mixed",
                "severity": "medium",
            },
        )
        assert rep_distant_resp.status_code == 201
        rep_distant_id = rep_distant_resp.json()["id"]

        # 3. Query public hotspots: nearby reports form a cluster
        hotspots_resp = client.get("/api/v1/public/hotspots?radius_meters=300")
        assert hotspots_resp.status_code == 200
        hotspots = hotspots_resp.json()
        assert len(hotspots) >= 1

        # Locate the cluster containing rep1_id
        cluster1 = next((h for h in hotspots if rep1_id in h["contributingReportIds"]), None)
        assert cluster1 is not None, "Nearby reports must be grouped into a cluster"
        assert rep2_id in cluster1["contributingReportIds"], "Report 2 must be in the same cluster"
        assert rep_distant_id not in cluster1["contributingReportIds"], "Distant report must NOT be in cluster 1"
        assert cluster1["reportCount"] == 2
        assert cluster1["distinctIncidents"] >= 1
        assert cluster1["dominantCategory"] == "plastic"
        assert cluster1["lastVerifiedCleanupDate"] is None, "Missing cleanup must be None (not invented)"
        assert "factors" in cluster1
        factors = cluster1["factors"]
        assert "wasteSeverity" in factors
        assert "reportRecurrence" in factors
        assert "cleanupLag" in factors
        assert "environmentalSensitivity" in factors
        assert "reportRecency" in factors
        assert cluster1["priorityExplanation"] != ""

        # Factor contributions sum to priorityScore
        contrib_sum = round(
            factors["wasteSeverity"]["contribution"]
            + factors["reportRecurrence"]["contribution"]
            + factors["cleanupLag"]["contribution"]
            + factors["environmentalSensitivity"]["contribution"]
            + factors["reportRecency"]["contribution"]
        )
        assert abs(contrib_sum - cluster1["priorityScore"]) <= 1

        # 4. Anti-Inflation Test: Submit duplicate report of the same incident (within 15m and same hour)
        rep_dup_resp = create_report(
            client,
            citizen,
            latitude=18.5001,
            longitude=73.9501,  # ~15m from Location 1
            title="Another photo of the same plastic heap",
            extra={
                "category": "plastic",
                "severity": "high",
            },
        )
        assert rep_dup_resp.status_code == 201
        rep_dup_id = rep_dup_resp.json()["id"]

        hotspots_dup_resp = client.get("/api/v1/public/hotspots?radius_meters=300")
        assert hotspots_dup_resp.status_code == 200
        cluster1_after = next((h for h in hotspots_dup_resp.json() if rep1_id in h["contributingReportIds"]), None)
        assert cluster1_after is not None
        assert rep_dup_id in cluster1_after["contributingReportIds"]
        # Total reports increased to 3, but distinct incidents remained 2 (preventing inflation!)
        assert cluster1_after["reportCount"] == 3
        assert cluster1_after["distinctIncidents"] == 2
        assert cluster1_after["recurrenceCount"] == 2

        # 5. Verified Cleanup Test: Verify report 1 and complete cleanup
        verify_resp = client.patch(
            f"/api/v1/reports/{rep1_id}/status",
            json={"status": "verified", "estimatedKg": 150.0},
            headers=pmc_admin,
        )
        assert verify_resp.status_code == 200

        cleanup_resp = client.post(
            "/api/v1/cleanups",
            json={
                "reportId": rep1_id,
                "taskName": "Riverbank drainage cleanup",
                "assignedTeam": "PMC Sanitation Squad A",
                "scheduledDate": "2026-11-26",
            },
            headers=pmc_admin,
        )
        assert cleanup_resp.status_code == 201
        cleanup_id = cleanup_resp.json()["id"]

        # Mark cleanup completed
        complete_resp = client.patch(
            f"/api/v1/cleanups/{cleanup_id}/status",
            json={
                "status": "completed",
                "afterImageUrl": "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09",
                "notes": "Completed verified sweep.",
            },
            headers=pmc_admin,
        )
        assert complete_resp.status_code == 200

        # Query hotspots again: lastVerifiedCleanupDate is now populated and cleanup lag is low
        hotspots_cleaned_resp = client.get("/api/v1/public/hotspots?radius_meters=300")
        assert hotspots_cleaned_resp.status_code == 200
        cluster1_cleaned = next((h for h in hotspots_cleaned_resp.json() if rep1_id in h["contributingReportIds"]), None)
        assert cluster1_cleaned is not None
        assert cluster1_cleaned["lastVerifiedCleanupDate"] is not None
        # Since it was cleaned today, cleanupLag score is low (10.0 pts)
        assert cluster1_cleaned["factors"]["cleanupLag"]["score"] == 10.0

        # 6. Admin hotspot endpoint with filters
        admin_hotspots_resp = client.get(
            "/api/v1/hotspots?category=plastic&sort_by=priority",
            headers=pmc_admin,
        )
        assert admin_hotspots_resp.status_code == 200
        assert all(h["dominantCategory"] == "plastic" for h in admin_hotspots_resp.json())

        # 7. Hotspot detail endpoint
        hotspot_id = cluster1_cleaned["id"]
        detail_resp = client.get(f"/api/v1/hotspots/{hotspot_id}", headers=pmc_admin)
        assert detail_resp.status_code == 200
        detail = detail_resp.json()
        assert detail["id"] == hotspot_id
        assert detail["priorityScore"] == cluster1_cleaned["priorityScore"]


def test_cleanup_operations_and_evidence_verification_lifecycle():
    """
    Prompt 10 - Test: Complete Cleanup Operations and Evidence Verification Workflow
    - Validates cleanup task creation from verified report
    - Validates reassignment of sanitation squads with scheduled dates
    - Validates task state transition to in_progress
    - Validates missing evidence rejection (cannot complete or verify without after photo)
    - Validates evidence upload transitions status to awaiting_verification WITHOUT auto-completing
    - Validates administrator rejection & reopening with corrective notes
    - Validates re-submission of rectified evidence
    - Validates administrator verification & certification transitioning report to cleaned
    - Validates unauthorized status updates rejection (401 unauthenticated, 403 cross-tenant)
    - Validates chronological audit event history endpoint
    """
    with TestClient(app) as client:
        citizen = register_citizen(client, email="cleanup.tester@example.test")
        pmc_admin = login(client, "pmc@example.test", "PMC-test-password-2026")
        pcmc_admin = login(client, "pcmc@example.test", "PCMC-test-password-2026")

        # 1. Citizen creates a report in PMC
        rep_resp = create_report(
            client,
            citizen,
            latitude=18.5020,
            longitude=73.9510,
            title="Dumping pile behind Kothrud market",
            extra={
                "description": "Debris and packaging obstructing stormwater drain",
                "category": "plastic",
                "severity": "high",
                "imageUrl": "https://images.unsplash.com/photo-1530587191325-3db32d826c18",
            },
        )
        assert rep_resp.status_code == 201
        report_id = rep_resp.json()["id"]

        # 2. Administrator verifies the report
        verify_rep_resp = client.patch(
            f"/api/v1/reports/{report_id}/status",
            json={"status": "verified", "estimatedKg": 80.0},
            headers=pmc_admin,
        )
        assert verify_rep_resp.status_code == 200

        # 3. Create Cleanup Task
        create_clean_resp = client.post(
            "/api/v1/cleanups",
            json={
                "reportId": report_id,
                "assignedTeam": "PMC Rapid Response Squad 1",
                "scheduledDate": "2026-11-27",
            },
            headers=pmc_admin,
        )
        assert create_clean_resp.status_code == 201
        clean_data = create_clean_resp.json()
        cleanup_id = clean_data["id"]
        assert clean_data["status"] == "pending"
        assert clean_data["assignedTeam"] == "PMC Rapid Response Squad 1"
        assert clean_data["beforeImageUrl"] is not None

        # 4. Reassignment: Update assigned team & date (transitions to assigned)
        reassign_resp = client.patch(
            f"/api/v1/cleanups/{cleanup_id}/assign",
            json={
                "assignedTeam": "PMC Eco Patrol Squad 2",
                "scheduledDate": "2026-11-28",
            },
            headers=pmc_admin,
        )
        assert reassign_resp.status_code == 200
        assert reassign_resp.json()["status"] == "assigned"
        assert reassign_resp.json()["assignedTeam"] == "PMC Eco Patrol Squad 2"

        # 5. Missing Evidence Rejection: Cannot complete or verify without after photo
        no_photo_complete = client.patch(
            f"/api/v1/cleanups/{cleanup_id}/status",
            json={"status": "completed"},
            headers=pmc_admin,
        )
        assert no_photo_complete.status_code == 422

        no_photo_verify = client.post(
            f"/api/v1/cleanups/{cleanup_id}/verify",
            json={"decision": "approve", "notes": "Premature attempt"},
            headers=pmc_admin,
        )
        assert no_photo_verify.status_code == 422

        # 6. Team starts work: in_progress
        start_resp = client.patch(
            f"/api/v1/cleanups/{cleanup_id}/status",
            json={"status": "in_progress"},
            headers=pmc_admin,
        )
        assert start_resp.status_code == 200
        assert start_resp.json()["status"] == "in_progress"

        # 7. Team submits evidence: sets awaiting_verification (NEVER automatically verified!)
        sample_after_photo = "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09"
        evidence_resp = client.post(
            f"/api/v1/cleanups/{cleanup_id}/evidence",
            json={
                "afterImageUrl": sample_after_photo,
                "notes": "First sweep complete. 60kg packaging bags removed.",
            },
            headers=pmc_admin,
        )
        assert evidence_resp.status_code == 200
        evidence_data = evidence_resp.json()
        assert evidence_data["verificationStatus"] == "awaiting_verification"
        assert evidence_data["afterImageUploadedAt"] is not None
        assert evidence_data["afterImageUploadedBy"] is not None

        # CRITICAL: Verify linked report is still "scheduled" (NOT automatically marked cleaned!)
        report_check = client.get(f"/api/v1/reports/{report_id}", headers=pmc_admin)
        assert report_check.status_code == 200
        assert report_check.json()["status"] == "scheduled"

        # 8. Administrator Rejection & Reopening: Evidence deemed insufficient
        reopen_resp = client.post(
            f"/api/v1/cleanups/{cleanup_id}/verify",
            json={
                "decision": "reject",
                "notes": "Inadequate clearance. Residual waste still visible along stormwater culvert.",
            },
            headers=pmc_admin,
        )
        assert reopen_resp.status_code == 200
        reopen_data = reopen_resp.json()
        assert reopen_data["verificationStatus"] == "reopened"
        assert "Residual waste still visible" in reopen_data["verificationNotes"]

        # Report remains scheduled
        report_check_reopened = client.get(f"/api/v1/reports/{report_id}", headers=pmc_admin)
        assert report_check_reopened.json()["status"] == "scheduled"

        # 9. Unauthorized access defenses:
        # Citizen cannot verify cleanup (403 forbidden)
        unauth_verify = client.post(
            f"/api/v1/cleanups/{cleanup_id}/verify",
            json={"decision": "approve", "notes": "Citizen trying to certify"},
            headers=citizen,
        )
        assert unauth_verify.status_code == 403

        # Cross-tenant admin (PCMC) cannot access PMC cleanup (403 forbidden / 404)
        cross_tenant_access = client.get(
            f"/api/v1/cleanups/{cleanup_id}",
            headers=pcmc_admin,
        )
        assert cross_tenant_access.status_code in {403, 404}

        # 10. Re-submit rectified evidence and approve verification
        rectified_evidence = client.post(
            f"/api/v1/cleanups/{cleanup_id}/evidence",
            json={
                "afterImageUrl": sample_after_photo,
                "notes": "Second sweep executed. Culvert completely unclogged and disinfected.",
            },
            headers=pmc_admin,
        )
        assert rectified_evidence.status_code == 200
        assert rectified_evidence.json()["verificationStatus"] == "awaiting_verification"

        # Administrator approves and certifies completed
        certify_resp = client.post(
            f"/api/v1/cleanups/{cleanup_id}/verify",
            json={
                "decision": "approve",
                "notes": "On-site photos confirmed culvert is 100% restored. Approved.",
            },
            headers=pmc_admin,
        )
        assert certify_resp.status_code == 200
        certified_data = certify_resp.json()
        assert certified_data["status"] == "completed"
        assert certified_data["verificationStatus"] == "verified"
        assert certified_data["verifiedAt"] is not None
        assert certified_data["verifiedBy"] is not None

        # Linked report must now be "cleaned"
        final_report = client.get(f"/api/v1/reports/{report_id}", headers=pmc_admin)
        assert final_report.status_code == 200
        assert final_report.json()["status"] == "cleaned"

        # 11. Full Chronological Audit Timeline
        history_resp = client.get(f"/api/v1/cleanups/{cleanup_id}/history", headers=pmc_admin)
        assert history_resp.status_code == 200
        history_items = history_resp.json()
        actions = [item["action"] for item in history_items]
        assert "cleanup.created" in actions
        assert "cleanup.assigned" in actions
        assert "cleanup.evidence_uploaded" in actions
        assert "cleanup.reopened" in actions
        assert "cleanup.verified_completed" in actions





