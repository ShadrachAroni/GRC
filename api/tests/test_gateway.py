import pytest
from fastapi.testclient import TestClient
from api.main import app
from api.limiter import limiter

client = TestClient(app, raise_server_exceptions=False)

def test_security_headers():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.headers.get("Strict-Transport-Security") == "max-age=63072000; includeSubDomains; preload"
    assert response.headers.get("Content-Security-Policy") == "default-src 'self'; frame-ancestors 'none';"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert response.headers.get("X-Content-Type-Options") == "nosniff"

def test_cors_headers():
    # Dev origin should be allowed
    response = client.get("/health", headers={"Origin": "http://localhost:3000"})
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"

    # Non-configured origin should be blocked (CORS middleware will not add the Access-Control-Allow-Origin header)
    response_blocked = client.get("/health", headers={"Origin": "http://malicious.com"})
    assert "access-control-allow-origin" not in response_blocked.headers

def test_payload_size_limit():
    # Construct a payload slightly larger than 1MB
    large_payload = "a" * (1024 * 1024 + 1)
    
    # We send it with Content-Length specified
    headers = {"Content-Length": str(len(large_payload))}
    response = client.post("/api/auth/register", content=large_payload, headers=headers)
    assert response.status_code == 413
    assert "Payload too large" in response.json()["detail"]

    # Valid smaller payload shouldn't trigger 413
    small_payload = '{"email": "test@example.com", "password": "short"}'
    headers_small = {"Content-Length": str(len(small_payload))}
    # It might return 422 because password is too short, but NOT 413!
    response_small = client.post("/api/auth/register", content=small_payload, headers=headers_small)
    assert response_small.status_code != 413

def test_extra_parameters_validation():
    # Sending input with extra properties triggers a 422 validation response
    payload = {
        "email": "extra@securebank.com",
        "password": "securepassword123",
        "extra_field_garbage": "not_allowed"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 422
    assert "extra_field_garbage" in response.text or "extra fields not permitted" in response.text or "extra" in response.text

def test_global_exception_handling():
    # Hitting the error trigger endpoint
    response = client.get("/api/test-error")
    assert response.status_code == 500
    assert response.json() == {"detail": "An unexpected error occurred. Please try again later."}

def test_rate_limiting_enforced():
    original_key_func = limiter._key_func
    limiter._key_func = lambda request: "gateway-test-unique-key"
    limiter.enabled = True
    try:
        # Auth login endpoint limit is 10/minute
        # Let's hit it 10 times
        payload = {"email": "rate@example.com", "password": "password"}
        for i in range(10):
            response = client.post("/api/auth/login", json=payload)
            # It should either be 401 Unauthorized or 200 (mfa pending) depending on database state, but NOT 429
            assert response.status_code != 429
            
        # 11th request should trigger 429
        response_throttled = client.post("/api/auth/login", json=payload)
        assert response_throttled.status_code == 429
        assert "Too Many Requests" in response_throttled.text or "limit exceeded" in response_throttled.text
    finally:
        limiter.enabled = False
        limiter._key_func = original_key_func
