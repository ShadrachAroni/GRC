import pyotp
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from api.main import app
from api.models import User, Incident, SystemAuditLog
from sqlalchemy.orm import Session

client = TestClient(app)

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

def test_incident_input_validation():
    # Enforce Control 12: invalid severity or status enums must fail
    token = create_authenticated_user("analyst_inc1@securebank.com", "GRC Analyst")
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Invalid status
    payload_status = {
        "title": "Unauthorized login attempts",
        "severity": "High",
        "status": "In Progress" # Invalid enum status
    }
    response = client.post("/api/incidents/", json=payload_status, headers=headers)
    assert response.status_code == 422
    
    # 2. Invalid severity
    payload_severity = {
        "title": "SQLi attempt blocked",
        "severity": "Very High", # Invalid enum severity
        "status": "Open"
    }
    response = client.post("/api/incidents/", json=payload_severity, headers=headers)
    assert response.status_code == 422

def test_incident_crud_and_durations(db_session: Session):
    token = create_authenticated_user("analyst_inc2@securebank.com", "GRC Analyst")
    headers = {"Authorization": f"Bearer {token}"}
    
    detected_time = datetime.utcnow() - timedelta(minutes=45)
    
    # Create Incident
    payload = {
        "title": "Phishing campaign detected",
        "severity": "Medium",
        "status": "Open",
        "detected_at": detected_time.isoformat(),
        "description": "User reported suspicious email links",
        "assigned_to": "Bob GRC"
    }
    
    response = client.post("/api/incidents/", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "Open"
    assert data["mttd_minutes"] is None
    assert data["mttr_minutes"] is None
    
    incident_id = data["incident_id"]
    
    # Verify CREATE_INCIDENT audit log is generated
    audit_logs_res = client.get("/api/audit/logs", headers=headers)
    assert audit_logs_res.status_code == 200
    logs = audit_logs_res.json()
    assert len(logs) > 0
    assert logs[0]["action"] == "CREATE_INCIDENT"
    assert "Phishing campaign detected" in logs[0]["details"]

    # Update Incident to Resolved
    resolved_time = datetime.utcnow()
    update_payload = {
        "status": "Resolved",
        "resolved_at": resolved_time.isoformat()
    }
    
    response_update = client.put(f"/api/incidents/{incident_id}", json=update_payload, headers=headers)
    assert response_update.status_code == 200
    data_update = response_update.json()
    assert data_update["status"] == "Resolved"
    
    # Verify MTTD and MTTR are calculated
    # MTTD = created_at - detected_at
    # MTTR = resolved_at - detected_at
    created_at_dt = datetime.fromisoformat(data_update["created_at"].replace("Z", ""))
    detected_at_dt = datetime.fromisoformat(data_update["detected_at"].replace("Z", ""))
    resolved_at_dt = datetime.fromisoformat(data_update["resolved_at"].replace("Z", ""))
    
    expected_mttd = int((created_at_dt - detected_at_dt).total_seconds() / 60)
    expected_mttr = int((resolved_at_dt - detected_at_dt).total_seconds() / 60)
    
    assert data_update["mttd_minutes"] == expected_mttd
    assert data_update["mttr_minutes"] == expected_mttr
    
    # Move back to Open (should clear values)
    update_payload_reopen = {
        "status": "Open"
    }
    response_reopen = client.put(f"/api/incidents/{incident_id}", json=update_payload_reopen, headers=headers)
    assert response_reopen.status_code == 200
    data_reopen = response_reopen.json()
    assert data_reopen["status"] == "Open"
    assert data_reopen["resolved_at"] is None
    assert data_reopen["mttd_minutes"] is None
    assert data_reopen["mttr_minutes"] is None

    # Delete Incident
    response_delete = client.delete(f"/api/incidents/{incident_id}", headers=headers)
    assert response_delete.status_code == 200
    
    # Verify DELETE_INCIDENT audit log
    audit_logs_res = client.get("/api/audit/logs", headers=headers)
    logs = audit_logs_res.json()
    assert logs[0]["action"] == "DELETE_INCIDENT"

def test_tenant_isolation_incidents():
    # Control 15 (Tenant Isolation)
    token_a = create_authenticated_user("analyst_inca@securebank.com", "GRC Analyst", tenant_id="tenant-A")
    token_b = create_authenticated_user("analyst_incb@securebank.com", "GRC Analyst", tenant_id="tenant-B")
    
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}
    
    # Tenant A creates an incident
    payload_a = {
        "title": "Incident Tenant A",
        "severity": "Low",
        "status": "Open"
    }
    res_create = client.post("/api/incidents/", json=payload_a, headers=headers_a)
    assert res_create.status_code == 201
    incident_id = res_create.json()["incident_id"]
    
    # Tenant B tries to query Tenant A's incident (should fail with 404)
    res_query_b = client.get(f"/api/incidents/{incident_id}", headers=headers_b)
    assert res_query_b.status_code == 404
    
    # Tenant B lists incidents (should be empty)
    res_list_b = client.get("/api/incidents/", headers=headers_b)
    assert res_list_b.json() == []
