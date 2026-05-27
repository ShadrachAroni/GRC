import pyotp
import pytest
from fastapi.testclient import TestClient
from api.main import app
from api.models import User, Risk, SystemAuditLog
from sqlalchemy.orm import Session

client = TestClient(app)

def create_authenticated_user(email: str, role: str, tenant_id: str = None) -> str:
    # Utility function to register and log in a user to get an access token
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

def test_risk_input_validation():
    # Enforce Control 12: likelihood/impact strictly [1, 5]
    token = create_authenticated_user("analyst1@securebank.com", "GRC Analyst")
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Invalid likelihood (0)
    payload_low = {
        "risk_id": "R-1",
        "asset": "Server",
        "threat": "DDoS",
        "likelihood": 0,
        "impact": 3
    }
    response = client.post("/api/risks/", json=payload_low, headers=headers)
    assert response.status_code == 422
    
    # 2. Invalid impact (6)
    payload_high = {
        "risk_id": "R-1",
        "asset": "Server",
        "threat": "DDoS",
        "likelihood": 3,
        "impact": 6
    }
    response = client.post("/api/risks/", json=payload_high, headers=headers)
    assert response.status_code == 422

def test_risk_scoring_and_audit_trail(db_session: Session):
    token = create_authenticated_user("analyst2@securebank.com", "GRC Analyst")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create Risk
    payload = {
        "risk_id": "R-100",
        "asset": "Database",
        "threat": "SQL Injection",
        "likelihood": 4,
        "impact": 5, # 4 * 5 = 20 -> Critical (>= 16)
        "mitigation": "Enforce parameterized queries",
        "department": "Engineering",
        "owner": "Alice"
    }
    
    response = client.post("/api/risks/", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["risk_score"] == 20
    assert data["severity"] == "Critical"
    
    # Verify CREATE_RISK audit log is generated
    audit_logs_res = client.get("/api/audit/logs", headers=headers)
    assert audit_logs_res.status_code == 200
    logs = audit_logs_res.json()
    assert len(logs) > 0
    assert logs[0]["action"] == "CREATE_RISK"
    assert "R-100" in logs[0]["details"]

    # Update Risk
    update_payload = {
        "likelihood": 2,
        "impact": 3 # 2 * 3 = 6 -> Medium (>=6)
    }
    response_update = client.put("/api/risks/R-100", json=update_payload, headers=headers)
    assert response_update.status_code == 200
    data_update = response_update.json()
    assert data_update["risk_score"] == 6
    assert data_update["severity"] == "Medium"
    
    # Verify UPDATE_RISK audit log
    audit_logs_res = client.get("/api/audit/logs", headers=headers)
    logs = audit_logs_res.json()
    assert logs[0]["action"] == "UPDATE_RISK"
    
    # Delete Risk
    response_delete = client.delete("/api/risks/R-100", headers=headers)
    assert response_delete.status_code == 200
    
    # Verify DELETE_RISK audit log
    audit_logs_res = client.get("/api/audit/logs", headers=headers)
    logs = audit_logs_res.json()
    assert logs[0]["action"] == "DELETE_RISK"

def test_tenant_isolation_risks():
    # Control 15 (Tenant Isolation)
    # Register analyst A (Tenant A) and analyst B (Tenant B)
    token_a = create_authenticated_user("analyst_a@securebank.com", "GRC Analyst", tenant_id="tenant-A")
    token_b = create_authenticated_user("analyst_b@securebank.com", "GRC Analyst", tenant_id="tenant-B")
    
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}
    
    # Tenant A creates a risk
    payload_a = {
        "risk_id": "R-SHARED",
        "asset": "Tenant A Server",
        "threat": "Breach",
        "likelihood": 3,
        "impact": 3
    }
    res_create = client.post("/api/risks/", json=payload_a, headers=headers_a)
    assert res_create.status_code == 201
    
    # Tenant B tries to query Tenant A's risk (should fail with 404)
    res_query_b = client.get("/api/risks/R-SHARED", headers=headers_b)
    assert res_query_b.status_code == 404
    
    # Tenant B lists risks (should be empty, not showing Tenant A's risk)
    res_list_b = client.get("/api/risks/", headers=headers_b)
    assert res_list_b.json() == []

    # Tenant B tries to update Tenant A's risk (should get 404)
    res_update_b = client.put("/api/risks/R-SHARED", json={"asset": "Hacked"}, headers=headers_b)
    assert res_update_b.status_code == 404

    # Tenant B tries to delete Tenant A's risk (should get 404)
    res_delete_b = client.delete("/api/risks/R-SHARED", headers=headers_b)
    assert res_delete_b.status_code == 404
