import hmac
import hashlib
import time
from fastapi.testclient import TestClient
from api.main import app
from api.config import settings

client = TestClient(app)

def test_stripe_webhook_valid_signature():
    payload = b'{"id": "evt_test", "object": "event", "type": "checkout.session.completed"}'
    timestamp = str(int(time.time()))
    signed_payload = f"{timestamp}.".encode() + payload
    
    # Calculate valid signature using the mock secret from settings
    signature = hmac.new(
        settings.STRIPE_WEBHOOK_SECRET.encode(),
        signed_payload,
        hashlib.sha256
    ).hexdigest()
    
    headers = {
        "Stripe-Signature": f"t={timestamp},v1={signature}"
    }
    
    response = client.post("/api/payments/webhook", content=payload, headers=headers)
    assert response.status_code == 200
    assert response.json() == {"status": "success"}

def test_stripe_webhook_invalid_signature():
    payload = b'{"id": "evt_test", "object": "event", "type": "checkout.session.completed"}'
    headers = {
        "Stripe-Signature": "t=123456789,v1=invalidsignature"
    }
    response = client.post("/api/payments/webhook", content=payload, headers=headers)
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid signature"

def test_stripe_webhook_missing_header():
    payload = b'{"id": "evt_test", "object": "event", "type": "checkout.session.completed"}'
    response = client.post("/api/payments/webhook", content=payload)
    assert response.status_code == 400
    assert response.json()["detail"] == "Missing stripe-signature header"


def test_flutterwave_webhook_valid_signature():
    payload = b'{"event": "charge.completed", "data": {"id": 12345}}'
    headers = {
        "verif-hash": settings.FLUTTERWAVE_WEBHOOK_SECRET
    }
    response = client.post("/api/payments/webhook/flutterwave", content=payload, headers=headers)
    assert response.status_code == 200
    assert response.json() == {"status": "success"}


def test_flutterwave_webhook_invalid_signature():
    payload = b'{"event": "charge.completed", "data": {"id": 12345}}'
    headers = {
        "verif-hash": "wrong-hash"
    }
    response = client.post("/api/payments/webhook/flutterwave", content=payload, headers=headers)
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid signature"


def test_flutterwave_webhook_missing_header():
    payload = b'{"event": "charge.completed", "data": {"id": 12345}}'
    response = client.post("/api/payments/webhook/flutterwave", content=payload)
    assert response.status_code == 400
    assert response.json()["detail"] == "Missing verif-hash header"


def test_flutterwave_webhook_invalid_payload():
    payload = b'invalid-raw-non-json'
    headers = {
        "verif-hash": settings.FLUTTERWAVE_WEBHOOK_SECRET
    }
    response = client.post("/api/payments/webhook/flutterwave", content=payload, headers=headers)
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid payload"
