import pyotp
import pytest
from fastapi.testclient import TestClient
from api.main import app
from api.models import User, RefreshToken
from api.auth_utils import decode_token, hash_token

client = TestClient(app)

def test_register_and_mfa_setup():
    # 1. Register user
    reg_data = {
        "email": "testuser@securebank.com",
        "password": "supersecurepassword123",
        "role": "GRC Analyst",
    }
    response = client.post("/api/auth/register", json=reg_data)
    assert response.status_code == 201
    res_json = response.json()
    assert res_json["email"] == "testuser@securebank.com"
    assert res_json["role"] == "GRC Analyst"
    assert "tenant_id" in res_json
    assert "otp_secret" in res_json
    assert "otp_uri" in res_json

    otp_secret = res_json["otp_secret"]

    # 2. Try to enable MFA with invalid code
    mfa_payload = {"email": "testuser@securebank.com", "code": "000000"}
    response = client.post("/api/auth/mfa/enable", json=mfa_payload)
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid MFA code"

    # 3. Enable MFA with correct code
    totp = pyotp.TOTP(otp_secret)
    current_code = totp.now()
    mfa_payload["code"] = current_code
    response = client.post("/api/auth/mfa/enable", json=mfa_payload)
    assert response.status_code == 200
    res_mfa = response.json()
    assert res_mfa["message"] == "MFA enabled successfully."
    assert "recovery_codes" in res_mfa
    assert len(res_mfa["recovery_codes"]) == 5

def test_login_mfa_flow():
    # Register and enable MFA
    reg_data = {
        "email": "loginuser@securebank.com",
        "password": "loginpassword123",
    }
    reg_res = client.post("/api/auth/register", json=reg_data).json()
    otp_secret = reg_res["otp_secret"]

    totp = pyotp.TOTP(otp_secret)
    client.post(
        "/api/auth/mfa/enable",
        json={"email": "loginuser@securebank.com", "code": totp.now()},
    )

    # Login Step 1: Credentials
    login_payload = {
        "email": "loginuser@securebank.com",
        "password": "loginpassword123",
    }
    response = client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 200
    res_login = response.json()
    assert res_login["mfa_required"] is True
    assert "temp_token" in res_login
    temp_token = res_login["temp_token"]

    # Login Step 2: MFA verification
    mfa_verify_payload = {"temp_token": temp_token, "code": totp.now()}
    response = client.post("/api/auth/login/verify", json=mfa_verify_payload)
    assert response.status_code == 200
    res_verify = response.json()
    assert "access_token" in res_verify
    assert "refresh_token" in res_verify
    assert res_verify["role"] == "Viewer"
    assert res_verify["email"] == "loginuser@securebank.com"

def test_recovery_code_login():
    # Register and enable MFA
    reg_data = {
        "email": "recoveryuser@securebank.com",
        "password": "loginpassword123",
    }
    reg_res = client.post("/api/auth/register", json=reg_data).json()
    otp_secret = reg_res["otp_secret"]

    totp = pyotp.TOTP(otp_secret)
    mfa_res = client.post(
        "/api/auth/mfa/enable",
        json={"email": "recoveryuser@securebank.com", "code": totp.now()},
    ).json()

    recovery_codes = mfa_res["recovery_codes"]
    used_code = recovery_codes[0]

    # Login Step 1
    login_res = client.post(
        "/api/auth/login",
        json={"email": "recoveryuser@securebank.com", "password": "loginpassword123"},
    ).json()
    temp_token = login_res["temp_token"]

    # Login Step 2: Use recovery code
    response = client.post(
        "/api/auth/login/verify",
        json={"temp_token": temp_token, "code": used_code},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()

    # Attempt to reuse the same recovery code (should fail)
    login_res2 = client.post(
        "/api/auth/login",
        json={"email": "recoveryuser@securebank.com", "password": "loginpassword123"},
    ).json()
    temp_token2 = login_res2["temp_token"]

    response2 = client.post(
        "/api/auth/login/verify",
        json={"temp_token": temp_token2, "code": used_code},
    )
    assert response2.status_code == 401

def test_refresh_token_rotation_and_replay_detection():
    # Register and login to get initial tokens
    reg_data = {"email": "rotateuser@securebank.com", "password": "loginpassword123"}
    reg_res = client.post("/api/auth/register", json=reg_data).json()
    otp_secret = reg_res["otp_secret"]
    totp = pyotp.TOTP(otp_secret)
    client.post("/api/auth/mfa/enable", json={"email": "rotateuser@securebank.com", "code": totp.now()})

    login_res = client.post("/api/auth/login", json={"email": "rotateuser@securebank.com", "password": "loginpassword123"}).json()
    verify_res = client.post("/api/auth/login/verify", json={"temp_token": login_res["temp_token"], "code": totp.now()}).json()

    refresh_token_1 = verify_res["refresh_token"]

    # First Refresh: should rotate tokens
    response_refresh = client.post("/api/auth/refresh", json={"refresh_token": refresh_token_1})
    assert response_refresh.status_code == 200
    res_data = response_refresh.json()
    assert "access_token" in res_data
    assert "refresh_token" in res_data
    refresh_token_2 = res_data["refresh_token"]

    # Attempt Replay Attack: Re-use refresh_token_1 (should fail and revoke all sessions)
    response_replay = client.post("/api/auth/refresh", json={"refresh_token": refresh_token_1})
    assert response_replay.status_code == 401
    assert "session revoked" in response_replay.json()["detail"]

    # Verify that the active refresh_token_2 is now also revoked
    response_refresh_2 = client.post("/api/auth/refresh", json={"refresh_token": refresh_token_2})
    assert response_refresh_2.status_code == 401

def test_password_reset_flow():
    reg_data = {"email": "resetuser@securebank.com", "password": "oldpassword123"}
    client.post("/api/auth/register", json=reg_data)

    # 1. Request Reset with invalid redirect_uri
    req_payload = {
        "email": "resetuser@securebank.com",
        "redirect_uri": "http://malicious-site.com",
    }
    response = client.post("/api/auth/password-reset/request", json=req_payload)
    assert response.status_code == 400
    assert "Redirect URI not authorized" in response.json()["detail"]

    # 2. Request Reset with authorized redirect_uri
    req_payload["redirect_uri"] = "http://localhost:3000/login"
    response = client.post("/api/auth/password-reset/request", json=req_payload)
    assert response.status_code == 200
    assert "If the email address is registered" in response.json()["message"]

    # For testing, we mock reset token creation. Since we can't easily capture logs,
    # let's generate a valid token programmatically or just check that user login fails after reset
    # Wait, we know the reset endpoint generates a JWT with type="reset" and sub="resetuser@securebank.com".
    # Let's generate it using jose.jwt for testing
    from api.auth_utils import create_access_token, datetime
    reset_claims = {"sub": "resetuser@securebank.com", "type": "reset"}
    reset_token = create_access_token(reset_claims, expires_delta=datetime.timedelta(minutes=5))

    # Confirm Reset
    confirm_payload = {"token": reset_token, "new_password": "newpassword123"}
    response_confirm = client.post("/api/auth/password-reset/confirm", json=confirm_payload)
    assert response_confirm.status_code == 200
    assert "Password has been reset successfully" in response_confirm.json()["message"]

    # Check login with new password
    login_res = client.post(
        "/api/auth/login",
        json={"email": "resetuser@securebank.com", "password": "newpassword123"},
    )
    assert login_res.status_code == 200
    assert login_res.json()["mfa_required"] is True

def test_protected_routes():
    # 1. Access without token (401)
    response = client.get("/api/risks/")
    assert response.status_code == 401

    # 2. Access with valid token
    reg_data = {"email": "protected@securebank.com", "password": "password123"}
    reg_res = client.post("/api/auth/register", json=reg_data).json()
    otp_secret = reg_res["otp_secret"]
    totp = pyotp.TOTP(otp_secret)
    client.post("/api/auth/mfa/enable", json={"email": "protected@securebank.com", "code": totp.now()})

    login_res = client.post("/api/auth/login", json={"email": "protected@securebank.com", "password": "password123"}).json()
    verify_res = client.post("/api/auth/login/verify", json={"temp_token": login_res["temp_token"], "code": totp.now()}).json()

    access_token = verify_res["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}
    response_risks = client.get("/api/risks/", headers=headers)
    assert response_risks.status_code == 200
    assert isinstance(response_risks.json(), list)

def test_rbac_controls():
    # 1. Register a Viewer user and enable MFA
    reg_viewer = {"email": "viewer@securebank.com", "password": "password123", "role": "Viewer"}
    reg_res = client.post("/api/auth/register", json=reg_viewer).json()
    otp_secret = reg_res["otp_secret"]
    totp = pyotp.TOTP(otp_secret)
    client.post("/api/auth/mfa/enable", json={"email": "viewer@securebank.com", "code": totp.now()})

    login_res = client.post("/api/auth/login", json={"email": "viewer@securebank.com", "password": "password123"}).json()
    verify_res = client.post("/api/auth/login/verify", json={"temp_token": login_res["temp_token"], "code": totp.now()}).json()
    viewer_token = verify_res["access_token"]

    # 2. Register an Analyst user and enable MFA
    reg_analyst = {"email": "analyst@securebank.com", "password": "password123", "role": "GRC Analyst"}
    reg_res2 = client.post("/api/auth/register", json=reg_analyst).json()
    otp_secret2 = reg_res2["otp_secret"]
    totp2 = pyotp.TOTP(otp_secret2)
    client.post("/api/auth/mfa/enable", json={"email": "analyst@securebank.com", "code": totp2.now()})

    login_res2 = client.post("/api/auth/login", json={"email": "analyst@securebank.com", "password": "password123"}).json()
    verify_res2 = client.post("/api/auth/login/verify", json={"temp_token": login_res2["temp_token"], "code": totp2.now()}).json()
    analyst_token = verify_res2["access_token"]

    # 3. Viewer attempts to access audit (should get 403)
    response_viewer = client.get("/api/audit/", headers={"Authorization": f"Bearer {viewer_token}"})
    assert response_viewer.status_code == 403
    assert response_viewer.json()["detail"] == "Access denied: Insufficient privileges"

    # 4. GRC Analyst attempts to access audit (should succeed with 200)
    response_analyst = client.get("/api/audit/", headers={"Authorization": f"Bearer {analyst_token}"})
    assert response_analyst.status_code == 200
    assert response_analyst.json()["email"] == "analyst@securebank.com"

