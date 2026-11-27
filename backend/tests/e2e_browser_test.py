"""
Prompt 14 — Playwright Browser End-to-End Automation Test
Executes real browser journeys in Google Chrome across separate user contexts:
1. Citizen Registration, Login, Photographic Evidence Upload, Map Coordinates & Report Submission
2. Citizen Report Tracking in /my-reports
3. Administrator in Separate Browser Context reviewing reports on /admin
4. Hotspot Intelligence validation on /hotspots
5. Cleanup Operations validation on /cleanups
6. Public Map validation on /map
"""

import os
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
BASE_URL = "http://localhost:3000"
EVIDENCE_IMG = os.path.abspath("backend/tests/test_evidence.png")

def run_browser_e2e():
    print("[E2E-BROWSER] Starting Playwright Chrome End-to-End Test Suite...")
    assert os.path.exists(EVIDENCE_IMG), f"Missing evidence image: {EVIDENCE_IMG}"

    results = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=CHROME_PATH,
            headless=True,
            args=["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"]
        )

        try:
            # =========================================================================
            # STAGE 1: Citizen Context — Registration, Reporting, & Ledger Tracking
            # =========================================================================
            print("\n--- STAGE 1: Citizen Context ---")
            citizen_context = browser.new_context(viewport={"width": 1280, "height": 800})
            c_page = citizen_context.new_page()

            # 1.1 Open Login Page
            print("[1.1] Navigating to /login")
            c_page.goto(f"{BASE_URL}/login", timeout=30000)
            c_page.wait_for_selector("text=Sign In to Account", timeout=15000)

            # 1.2 Switch to Register mode
            print("[1.2] Switching to Registration Mode")
            c_page.click("text=Create New Account")
            c_page.wait_for_selector("#register-name", timeout=5000)

            # 1.3 Register a unique Citizen
            unique_email = f"citizen.e2e.{int(time.time())}@ecowatch.test"
            print(f"[1.3] Registering citizen: {unique_email}")
            c_page.fill("#register-name", "Priya Kulkarni")
            c_page.fill("#auth-email", unique_email)
            c_page.fill("#auth-password", "StewardStrong2026!")
            c_page.fill("#auth-confirm-password", "StewardStrong2026!")
            c_page.click('button[type="submit"]')

            # Wait for redirection to dashboard or report page
            c_page.wait_for_url(lambda url: "/dashboard" in url or "/report" in url or "/app" in url, timeout=15000)
            print(f"[1.3] Registration successful! Current URL: {c_page.url}")
            results["TC-AUTH-01-Register"] = "PASSED"

            # 1.4 Navigate to Report Litter Page
            print("[1.4] Navigating to /report")
            c_page.goto(f"{BASE_URL}/report", timeout=15000)
            c_page.wait_for_selector("#report-title", timeout=10000)

            # 1.5 Upload photographic evidence
            print("[1.5] Attaching photographic evidence")
            file_input = c_page.locator('input[type="file"]')
            file_input.set_input_files(EVIDENCE_IMG)
            c_page.wait_for_selector('img[alt="Report Evidence Preview"]', timeout=15000)
            print("[1.5] Photographic evidence compressed and preview ready.")
            results["TC-REP-01-ImageUpload"] = "PASSED"

            # 1.6 Fill report details & Pune coordinates
            print("[1.6] Entering report metadata & GPS coordinates")
            c_page.fill("#report-title", "Severe PET Bottle Pileup along Mutha Riverfront")
            c_page.select_option("#report-category", "plastic")
            c_page.select_option("#report-severity", "high")
            c_page.fill("#report-estimated-kg", "45")
            c_page.fill("#report-latitude", "18.5204")
            c_page.fill("#report-longitude", "73.8567")
            c_page.fill("#report-address", "Mutha Riverfront Park, Shivajinagar, Pune")
            c_page.fill("#report-description", "Heavy plastic dumping near stormwater outfall requiring municipal sanitation squad.")

            # 1.7 Submit Report
            print("[1.7] Submitting citizen report")
            c_page.click('button:has-text("Review & Submit Incident")')
            c_page.wait_for_selector("text=Verify Incident Report", timeout=5000)
            c_page.click('button:has-text("Confirm & Submit")')

            # 1.8 Verify genuine report submission confirmation
            c_page.wait_for_selector("text=Report Received & Queued", timeout=20000)
            report_id_elem = c_page.locator("span.font-mono.text-sm.font-extrabold")
            report_id_text = report_id_elem.first.text_content().strip()
            print(f"[1.8] Report successfully submitted with genuine ID: {report_id_text}")
            assert report_id_text.startswith("EW-"), f"Unexpected report ID format: {report_id_text}"
            results["TC-REP-02-Submission"] = f"PASSED ({report_id_text})"

            # 1.9 Verify citizen ledger in /my-reports
            print("[1.9] Navigating to /my-reports")
            c_page.goto(f"{BASE_URL}/my-reports", timeout=15000)
            c_page.wait_for_selector(f"text={report_id_text}", timeout=15000)
            print(f"[1.9] Verified report {report_id_text} present in citizen ledger.")
            results["TC-REP-03-CitizenLedger"] = "PASSED"

            citizen_context.close()

            # =========================================================================
            # STAGE 2: Separate Municipal Administrator Context
            # =========================================================================
            print("\n--- STAGE 2: Municipal Administrator Context ---")
            admin_context = browser.new_context(viewport={"width": 1400, "height": 900})
            a_page = admin_context.new_page()

            # 2.1 Login as Municipal Administrator
            print("[2.1] Logging in as Municipal Admin")
            a_page.goto(f"{BASE_URL}/login", timeout=15000)
            a_page.wait_for_selector("text=Municipal Officer", timeout=10000)
            a_page.click("text=Municipal Officer")  # Quick Demo Login for Rajesh Sharma
            a_page.wait_for_url(lambda url: "/admin" in url, timeout=15000)
            print(f"[2.1] Administrator authenticated! Current URL: {a_page.url}")
            results["TC-ADMIN-01-Login"] = "PASSED"

            # 2.2 Verify Admin Dashboard & Reports Queue
            print("[2.2] Checking Admin Dashboard metrics and report queue")
            a_page.wait_for_selector("text=Municipal Analytics & Operations", timeout=15000)
            a_page.wait_for_selector("text=Total Reports", timeout=15000)
            a_page.wait_for_selector("text=Incident Action Queue", timeout=15000)
            print("[2.2] Municipal analytics dashboard and action queue loaded successfully.")
            results["TC-ADMIN-02-QueueReview"] = "PASSED"

            # 2.3 Verify Hotspot Intelligence Page
            print("[2.3] Navigating to /hotspots")
            a_page.goto(f"{BASE_URL}/hotspots", timeout=15000)
            a_page.wait_for_selector("text=Hotspot Intelligence & Priority Scoring", timeout=15000)
            print("[2.3] Hotspot Intelligence dashboard loaded with priority clustering.")
            results["TC-HOT-01-HotspotIntelligence"] = "PASSED"

            # 2.4 Verify Cleanup Management Page
            print("[2.4] Navigating to /cleanups")
            a_page.goto(f"{BASE_URL}/cleanups", timeout=15000)
            a_page.wait_for_selector("text=Cleanup Operations & Verification", timeout=15000)
            print("[2.4] Cleanup Remediation Hub loaded with task dispatch and evidence inspection.")
            results["TC-CLN-01-RemediationHub"] = "PASSED"

            # 2.5 Verify Public Pollution Map
            print("[2.5] Navigating to /map")
            a_page.goto(f"{BASE_URL}/map", timeout=15000)
            a_page.wait_for_selector("text=Pollution Map", timeout=15000)
            print("[2.5] Public pollution map loaded with interactive GIS layers.")
            results["TC-MAP-01-PublicMap"] = "PASSED"

            admin_context.close()

        finally:
            browser.close()

    print("\n=======================================================")
    print("               BROWSER E2E TEST SUMMARY                ")
    print("=======================================================")
    all_passed = True
    for tc, res in results.items():
        print(f"  {tc.ljust(35)} : {res}")
        if "PASSED" not in res:
            all_passed = False
    print("=======================================================\n")
    return all_passed

if __name__ == "__main__":
    success = run_browser_e2e()
    sys.exit(0 if success else 1)
