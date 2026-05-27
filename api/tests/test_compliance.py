import os
import io
import pyotp
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from api.main import app
from api.models import User, Control, Evidence, AuditFinding
from sqlalchemy.orm import Session
from automation.mfa_checker import run_mfa_checker
import shutil

client = TestClient(app)

# Helper function to create authenticated users
def create_authenticated_user(email: str, role: str, tenant_id: str = None) -> str:
    reg_data = {
        "email": email,
        "password": "supersecurepassword123",
        "role": role,
    }
    if tenant_id:
        reg_data["tenant_id"] = tenant_id

    reg_res = client.post("/api/auth/register", json=reg_data).json()
    otp_secret = reg_res["otp_secret"]
    
    # Enable MFA
    totp = pyotp.TOTP(otp_secret)
    client.post(
        "/api/auth/mfa/enable",
        json={"email": email, "code": totp.now()},
    )
    
    # Login Credentials
    login_res = client.post(
        "/api/auth/login",
        json={"email": email, "password": "supersecurepassword123"}
    ).json()
    temp_token = login_res["temp_token"]
    
    # Login Verify MFA
    verify_res = client.post(
        "/api/auth/login/verify",
        json={"temp_token": temp_token, "code": totp.now()}
    ).json()
    
    return verify_res["access_token"]

@pytest.fixture(scope="function")
def cleanup_storage():
    yield
    # Cleanup storage directory if created in tests
    if os.path.exists("storage"):
        # Let's delete test tenant folders specifically or entire storage if we want
        # To be safe, let's remove the test-tenant subdirectories created during tests
        for folder in os.listdir("storage"):
            if folder.startswith("tenant-") or folder.startswith("test-"):
                shutil.rmtree(os.path.join("storage", folder), ignore_errors=True)

def test_controls_listing_and_tenant_isolation(db_session: Session):
    token_a = create_authenticated_user("analyst_a@securebank.com", "GRC Analyst", tenant_id="tenant-A")
    token_b = create_authenticated_user("analyst_b@securebank.com", "GRC Analyst", tenant_id="tenant-B")

    # Seed controls
    control_a = Control(
        control_id="CC6.1",
        tenant_id="tenant-A",
        framework="SOC2",
        description="Tenant A Control",
        status="Not Started"
    )
    control_b = Control(
        control_id="CC6.1",
        tenant_id="tenant-B",
        framework="SOC2",
        description="Tenant B Control",
        status="Implemented"
    )
    db_session.add(control_a)
    db_session.add(control_b)
    db_session.commit()

    # Query as Tenant A
    headers_a = {"Authorization": f"Bearer {token_a}"}
    res_a = client.get("/api/controls/", headers=headers_a)
    assert res_a.status_code == 200
    controls_a = res_a.json()
    assert len(controls_a) == 1
    assert controls_a[0]["description"] == "Tenant A Control"

    # Query as Tenant B
    headers_b = {"Authorization": f"Bearer {token_b}"}
    res_b = client.get("/api/controls/", headers=headers_b)
    assert res_b.status_code == 200
    controls_b = res_b.json()
    assert len(controls_b) == 1
    assert controls_b[0]["description"] == "Tenant B Control"

def test_patch_control_status_and_roles(db_session: Session):
    token_admin = create_authenticated_user("admin@securebank.com", "Administrator", tenant_id="tenant-A")
    token_viewer = create_authenticated_user("viewer@securebank.com", "Viewer", tenant_id="tenant-A")
    token_tenant_b = create_authenticated_user("other@securebank.com", "GRC Analyst", tenant_id="tenant-B")

    control = Control(
        control_id="CC6.3",
        tenant_id="tenant-A",
        framework="SOC2",
        description="Password Policy Control",
        status="Not Started"
    )
    db_session.add(control)
    db_session.commit()

    # 1. Viewer trying to patch status (should fail with 403)
    res_viewer = client.patch(
        "/api/controls/CC6.3",
        json={"status": "In Progress"},
        headers={"Authorization": f"Bearer {token_viewer}"}
    )
    assert res_viewer.status_code == 403

    # 2. Different tenant trying to patch status (should fail with 404)
    res_other = client.patch(
        "/api/controls/CC6.3",
        json={"status": "In Progress"},
        headers={"Authorization": f"Bearer {token_tenant_b}"}
    )
    assert res_other.status_code == 404

    # 3. Admin patching status (should succeed with 200)
    res_admin = client.patch(
        "/api/controls/CC6.3",
        json={"status": "Implemented", "owner": "admin@securebank.com"},
        headers={"Authorization": f"Bearer {token_admin}"}
    )
    assert res_admin.status_code == 200
    updated = res_admin.json()
    assert updated["status"] == "Implemented"
    assert updated["owner"] == "admin@securebank.com"

def test_evidence_file_upload_validations(db_session: Session, cleanup_storage):
    token_analyst = create_authenticated_user("analyst@securebank.com", "GRC Analyst", tenant_id="tenant-A")
    headers = {"Authorization": f"Bearer {token_analyst}"}

    control = Control(
        control_id="CC6.1",
        tenant_id="tenant-A",
        framework="SOC2",
        description="MFA Control",
        status="Not Started"
    )
    db_session.add(control)
    db_session.commit()

    # 1. Test uploading PDF with correct magic bytes
    pdf_content = b"%PDF-1.4\n%..."
    res_pdf = client.post(
        "/api/controls/CC6.1/evidence",
        files={"file": ("test.pdf", pdf_content, "application/pdf")},
        headers=headers
    )
    assert res_pdf.status_code == 201
    pdf_data = res_pdf.json()
    assert pdf_data["file_name"] == "test.pdf"
    assert os.path.exists(pdf_data["file_path"])

    # 2. Test uploading PNG with correct magic bytes
    png_content = b"\x89PNG\r\n\x1a\n\x00\x00\x00"
    res_png = client.post(
        "/api/controls/CC6.1/evidence",
        files={"file": ("test.png", png_content, "image/png")},
        headers=headers
    )
    assert res_png.status_code == 201

    # 3. Test uploading JPG with correct magic bytes
    jpg_content = b"\xff\xd8\xff\xe0"
    res_jpg = client.post(
        "/api/controls/CC6.1/evidence",
        files={"file": ("test.jpg", jpg_content, "image/jpeg")},
        headers=headers
    )
    assert res_jpg.status_code == 201

    # 4. Test uploading CSV
    csv_content = b"header1,header2\nvalue1,value2\n"
    res_csv = client.post(
        "/api/controls/CC6.1/evidence",
        files={"file": ("test.csv", csv_content, "text/csv")},
        headers=headers
    )
    assert res_csv.status_code == 201

    # 5. Test uploading invalid MIME type (spoofed content-type header)
    bad_content = b"EXE file content \x00\x01\x02"
    res_bad = client.post(
        "/api/controls/CC6.1/evidence",
        files={"file": ("spoofed.pdf", bad_content, "application/pdf")},
        headers=headers
    )
    assert res_bad.status_code == 400
    assert "Invalid file type" in res_bad.json()["detail"]

    # 6. Test uploading file > 1MB
    large_content = b"A" * (1024 * 1024 + 1)
    res_large = client.post(
        "/api/controls/CC6.1/evidence",
        files={"file": ("large.pdf", large_content, "application/pdf")},
        headers=headers
    )
    # Note: Depending on ContentLengthLimitMiddleware or direct check, should fail with 413
    assert res_large.status_code in (413, 400)

def test_evidence_scoping_and_download(db_session: Session, cleanup_storage):
    token_a = create_authenticated_user("user_a@securebank.com", "GRC Analyst", tenant_id="tenant-A")
    token_b = create_authenticated_user("user_b@securebank.com", "GRC Analyst", tenant_id="tenant-B")

    control_a = Control(
        control_id="CC6.1",
        tenant_id="tenant-A",
        framework="SOC2",
        description="MFA",
        status="Not Started"
    )
    db_session.add(control_a)
    db_session.commit()

    # Upload evidence as Tenant A
    pdf_content = b"%PDF-1.4\n%..."
    res_upload = client.post(
        "/api/controls/CC6.1/evidence",
        files={"file": ("evidence_a.pdf", pdf_content, "application/pdf")},
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert res_upload.status_code == 201
    evidence_id = res_upload.json()["evidence_id"]

    # Try downloading as Tenant A (should succeed)
    res_download_a = client.get(
        f"/api/controls/CC6.1/evidence/{evidence_id}/download",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert res_download_a.status_code == 200
    assert res_download_a.content == pdf_content

    # Try downloading as Tenant B (should fail with 404 due to tenant isolation scoping)
    res_download_b = client.get(
        f"/api/controls/CC6.1/evidence/{evidence_id}/download",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert res_download_b.status_code == 404

def test_mfa_checker_script_integration(db_session: Session):
    # Setup Tenant A control CC6.1 - not implemented
    control_a = Control(
        control_id="CC6.1",
        tenant_id="tenant-A",
        framework="SOC2",
        description="MFA Check Control",
        status="Partial"
    )
    # Setup Tenant B control CC6.1 - implemented (should not trigger finding)
    control_b = Control(
        control_id="CC6.1",
        tenant_id="tenant-B",
        framework="SOC2",
        description="MFA Check Control",
        status="Implemented"
    )
    db_session.add(control_a)
    db_session.add(control_b)
    db_session.commit()

    # Run the background compliance script using patch to point it to test db_session
    with patch("automation.mfa_checker.SessionLocal", return_value=db_session):
        created = run_mfa_checker()
        assert created == 1

    # Verify that an Audit Finding was created for Tenant A, and NOT Tenant B
    finding_a = db_session.query(AuditFinding).filter(
        AuditFinding.tenant_id == "tenant-A",
        AuditFinding.control_id == "CC6.1"
    ).first()
    assert finding_a is not None
    assert finding_a.status == "Open"
    assert finding_a.severity == "High"

    finding_b = db_session.query(AuditFinding).filter(
        AuditFinding.tenant_id == "tenant-B",
        AuditFinding.control_id == "CC6.1"
    ).first()
    assert finding_b is None

    # Run checker again, verify no duplicate findings are created
    with patch("automation.mfa_checker.SessionLocal", return_value=db_session):
        created_again = run_mfa_checker()
        assert created_again == 0
