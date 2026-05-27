import os
import io
import pyotp
import pytest
from unittest.mock import patch
from datetime import datetime, timedelta, date
from fastapi.testclient import TestClient
from api.main import app
from api.models import User, AuditFinding, Capa, SystemAuditLog
from sqlalchemy.orm import Session
from automation.capa_assigner import run_capa_assigner

client = TestClient(app)

def create_authenticated_user(email: str, role: str, tenant_id: str = "tenant-test") -> str:
    reg_data = {
        "email": email,
        "password": "supersecurepassword123",
        "role": role,
        "tenant_id": tenant_id
    }

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

def test_findings_crud_and_isolation(db_session: Session):
    token_analyst = create_authenticated_user("analyst_test@securebank.com", "GRC Analyst", tenant_id="tenant-X")
    token_other = create_authenticated_user("analyst_other@securebank.com", "GRC Analyst", tenant_id="tenant-Y")
    
    headers_analyst = {"Authorization": f"Bearer {token_analyst}"}
    headers_other = {"Authorization": f"Bearer {token_other}"}
    
    # 1. Create a finding
    payload = {
        "finding_id": "AF-101",
        "title": "Insecure Port 22 Open",
        "severity": "High",
        "control_id": "CC6.1",
        "recommendation": "Close port 22 or restrict access.",
        "status": "Open"
    }
    
    res = client.post("/api/audit/findings", json=payload, headers=headers_analyst)
    assert res.status_code == 201
    assert res.json()["finding_id"] == "AF-101"
    
    # 2. Duplicate ID check
    res_dup = client.post("/api/audit/findings", json=payload, headers=headers_analyst)
    assert res_dup.status_code == 400
    
    # 3. Retrieve finding
    res_get = client.get("/api/audit/findings/AF-101", headers=headers_analyst)
    assert res_get.status_code == 200
    assert res_get.json()["title"] == "Insecure Port 22 Open"
    
    # 4. Tenant isolation: Other tenant tries to retrieve it
    res_iso = client.get("/api/audit/findings/AF-101", headers=headers_other)
    assert res_iso.status_code == 404
    
    # 5. List findings
    res_list = client.get("/api/audit/findings", headers=headers_analyst)
    assert len(res_list.json()) == 1
    
    res_list_other = client.get("/api/audit/findings", headers=headers_other)
    assert len(res_list_other.json()) == 0
    
    # 6. Update finding
    res_update = client.put(
        "/api/audit/findings/AF-101",
        json={"title": "SSH Service Exposed", "status": "In Progress"},
        headers=headers_analyst
    )
    assert res_update.status_code == 200
    assert res_update.json()["title"] == "SSH Service Exposed"
    assert res_update.json()["status"] == "In Progress"
    
    # 7. Delete finding
    res_delete = client.delete("/api/audit/findings/AF-101", headers=headers_analyst)
    assert res_delete.status_code == 200
    
    res_get_deleted = client.get("/api/audit/findings/AF-101", headers=headers_analyst)
    assert res_get_deleted.status_code == 404

def test_capa_crud_and_isolation(db_session: Session):
    token_analyst = create_authenticated_user("analyst_capa@securebank.com", "GRC Analyst", tenant_id="tenant-X")
    headers = {"Authorization": f"Bearer {token_analyst}"}
    
    # Seed a finding first
    finding = AuditFinding(
        finding_id="AF-200",
        tenant_id="tenant-X",
        title="Unencrypted S3 Bucket",
        severity="Critical",
        status="Open"
    )
    db_session.add(finding)
    db_session.commit()
    
    # 1. Create CAPA
    capa_payload = {
        "capa_id": "CAPA-200",
        "finding_id": "AF-200",
        "title": "Enable S3 bucket default encryption",
        "root_cause": "Misconfigured cloudformation template",
        "action": "Enable AES256 encryption via AWS CLI",
        "owner": "Cloud Ops Team",
        "due_date": "2026-06-15",
        "status": "Open"
    }
    
    res = client.post("/api/audit/capas", json=capa_payload, headers=headers)
    assert res.status_code == 201
    assert res.json()["capa_id"] == "CAPA-200"
    
    # 2. Verify link
    res_get = client.get("/api/audit/capas/CAPA-200", headers=headers)
    assert res_get.status_code == 200
    assert res_get.json()["finding_id"] == "AF-200"

def test_roles_and_access_controls(db_session: Session):
    token_viewer = create_authenticated_user("viewer_roles@securebank.com", "Viewer", tenant_id="tenant-Z")
    token_analyst = create_authenticated_user("analyst_roles@securebank.com", "GRC Analyst", tenant_id="tenant-Z")
    token_admin = create_authenticated_user("admin_roles@securebank.com", "Administrator", tenant_id="tenant-Z")
    
    # 1. Test raw audit log endpoint (/api/audit/logs)
    res_logs_viewer = client.get("/api/audit/logs", headers={"Authorization": f"Bearer {token_viewer}"})
    assert res_logs_viewer.status_code == 403
    
    res_logs_analyst = client.get("/api/audit/logs", headers={"Authorization": f"Bearer {token_analyst}"})
    assert res_logs_analyst.status_code == 403
    
    res_logs_admin = client.get("/api/audit/logs", headers={"Authorization": f"Bearer {token_admin}"})
    assert res_logs_admin.status_code == 200
    
    # 2. Test logs download (CSV) endpoint (/api/audit/logs/download)
    res_dl_analyst = client.get("/api/audit/logs/download", headers={"Authorization": f"Bearer {token_analyst}"})
    assert res_dl_analyst.status_code == 403
    
    res_dl_admin = client.get("/api/audit/logs/download", headers={"Authorization": f"Bearer {token_admin}"})
    assert res_dl_admin.status_code == 200
    assert "text/csv" in res_dl_admin.headers["content-type"]

def test_database_audit_triggers(db_session: Session):
    token_admin = create_authenticated_user("admin_trigger@securebank.com", "Administrator", tenant_id="tenant-T")
    headers = {"Authorization": f"Bearer {token_admin}"}
    
    # Creating finding should automatically generate a CREATE_AUDITFINDING log in the DB
    payload = {
        "finding_id": "AF-T1",
        "title": "Insecure database encryption keys",
        "severity": "Critical",
        "recommendation": "Use AWS KMS",
        "status": "Open"
    }
    res = client.post("/api/audit/findings", json=payload, headers=headers)
    assert res.status_code == 201
    
    # Verify DB has audit entry for CREATE_AUDITFINDING
    audit_logs = db_session.query(SystemAuditLog).filter(
        SystemAuditLog.tenant_id == "tenant-T",
        SystemAuditLog.action == "CREATE_AUDITFINDING"
    ).all()
    assert len(audit_logs) > 0
    assert "AF-T1" in audit_logs[0].details
    assert audit_logs[0].user_email == "admin_trigger@securebank.com"

def test_capa_assigner_sla_calculation(db_session: Session):
    # Seed findings with different severities
    findings = [
        AuditFinding(finding_id="AF-C1", tenant_id="tenant-SLA", title="Finding Critical", severity="Critical", status="Open"),
        AuditFinding(finding_id="AF-H1", tenant_id="tenant-SLA", title="Finding High", severity="High", status="Open"),
        AuditFinding(finding_id="AF-M1", tenant_id="tenant-SLA", title="Finding Medium", severity="Medium", status="Open"),
        AuditFinding(finding_id="AF-L1", tenant_id="tenant-SLA", title="Finding Low", severity="Low", status="Open")
    ]
    
    for f in findings:
        db_session.add(f)
    db_session.commit()
    
    # Run assigner script with db_session mocked
    with patch("automation.capa_assigner.SessionLocal", return_value=db_session):
        created = run_capa_assigner()
        assert created == 4
        
    # Verify SLA due dates
    today = date.today()
    
    capa_critical = db_session.query(Capa).filter(Capa.finding_id == "AF-C1").first()
    assert capa_critical.due_date == today + timedelta(days=7)
    
    capa_high = db_session.query(Capa).filter(Capa.finding_id == "AF-H1").first()
    assert capa_high.due_date == today + timedelta(days=14)
    
    capa_medium = db_session.query(Capa).filter(Capa.finding_id == "AF-M1").first()
    assert capa_medium.due_date == today + timedelta(days=30)
    
    capa_low = db_session.query(Capa).filter(Capa.finding_id == "AF-L1").first()
    assert capa_low.due_date == today + timedelta(days=90)
