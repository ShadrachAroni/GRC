import pyotp
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import text
from api.main import app
from api.models import User

client = TestClient(app)

def create_authenticated_user(email: str, role: str, tenant_id: str = "test-tenant") -> str:
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

def test_xss_sanitization():
    token = create_authenticated_user("analyst_xss@securebank.com", "GRC Analyst")
    headers = {"Authorization": f"Bearer {token}"}
    
    payload = {
        "risk_id": "R-XSS-1",
        "asset": "<script>alert('xss')</script>",
        "threat": "<img src=x onerror=alert(1)>",
        "likelihood": 3,
        "impact": 3,
        "mitigation": "<a href=\"javascript:alert(1)\">Mitigation</a>",
        "department": "Engineering",
        "owner": "Alice"
    }
    
    response = client.post("/api/risks/", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    
    # Verify html tags and quotes are escaped (single quotes are escaped to &#x27;)
    assert "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;" in data["asset"]
    assert "&lt;img src=x onerror=alert(1)&gt;" in data["threat"]
    assert "&lt;a href=&quot;javascript:alert(1)&quot;&gt;Mitigation&lt;/a&gt;" in data["mitigation"]

def test_xss_excluded_keys():
    # Verify password with special characters is not escaped in UserRegister
    email = "xss_exclude@securebank.com"
    password = "password<script>alert(1)</script>"
    reg_data = {
        "email": email,
        "password": password,
        "role": "Viewer",
        "tenant_id": "exclude-tenant"
    }
    response = client.post("/api/auth/register", json=reg_data)
    assert response.status_code == 201
    
    # Now verify login works with the original (unescaped) password
    login_res = client.post(
        "/api/auth/login",
        json={"email": email, "password": password}
    )
    assert login_res.status_code == 200
    assert "temp_token" in login_res.json()

def test_security_headers_on_api():
    response = client.get("/health")
    assert response.status_code == 200
    headers = response.headers
    assert headers.get("Strict-Transport-Security") == "max-age=63072000; includeSubDomains; preload"
    assert headers.get("Content-Security-Policy") == "default-src 'self'; frame-ancestors 'none';"
    assert headers.get("X-Frame-Options") == "DENY"
    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-XSS-Protection") == "1; mode=block"

def test_mfa_secret_encryption(db_session: Session):
    email = "encrypt_test@securebank.com"
    
    # Register & Enable MFA
    reg_data = {
        "email": email,
        "password": "supersecurepassword123",
        "role": "Viewer",
        "tenant_id": "encrypt-tenant"
    }
    reg_res = client.post("/api/auth/register", json=reg_data).json()
    otp_secret = reg_res["otp_secret"]
    
    # Query database directly using SQLAlchemy session to verify transparent encryption
    user = db_session.query(User).filter(User.email == email).first()
    assert user is not None
    
    # 1. Decrypted value returned via property access matches the original secret
    assert user.mfa_secret == otp_secret
    
    # 2. Raw value stored in database is encrypted (using raw SQL connection to bypass type mapping)
    result = db_session.execute(
        text("SELECT mfa_secret FROM users WHERE email = :email"),
        {"email": email}
    ).fetchone()
    raw_mfa_secret = result[0]
    
    # The raw string in database should not be plaintext, it should be ciphertext
    assert raw_mfa_secret != otp_secret
    # Fernet ciphertexts always start with "gAAAA" (base64 of version byte + timestamp etc.)
    assert raw_mfa_secret.startswith("gAAAA")
