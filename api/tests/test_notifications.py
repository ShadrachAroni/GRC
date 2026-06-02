import pyotp
import pytest
from fastapi.testclient import TestClient
from api.main import app
from api.models import User, Notification
from sqlalchemy.orm import Session
from api.routers.notifications import dispatch_notification

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

def test_list_notifications_tenant_isolation(db_session: Session):
    # Register user a and user b in different tenants
    token_a = create_authenticated_user("notif_a@securebank.com", "GRC Analyst", tenant_id="tenant-A")
    token_b = create_authenticated_user("notif_b@securebank.com", "GRC Analyst", tenant_id="tenant-B")
    
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}
    
    # Add a mock notification for tenant-A via DB directly
    notif_a = Notification(
        tenant_id="tenant-A",
        title="Alert Tenant A",
        message="Only A should see this",
        severity="Medium",
        type="system",
        is_read=False,
        channels="toast"
    )
    db_session.add(notif_a)
    db_session.commit()
    db_session.refresh(notif_a)
    
    # A queries notifications: should get 1 notification
    res_a = client.get("/api/notifications/", headers=headers_a)
    assert res_a.status_code == 200
    data_a = res_a.json()
    assert len(data_a) >= 1
    assert any(x["title"] == "Alert Tenant A" for x in data_a)
    
    # B queries notifications: should NOT get tenant-A's notification
    res_b = client.get("/api/notifications/", headers=headers_b)
    assert res_b.status_code == 200
    data_b = res_b.json()
    assert not any(x["title"] == "Alert Tenant A" for x in data_b)

def test_update_notification_read_status(db_session: Session):
    token = create_authenticated_user("notif_c@securebank.com", "GRC Analyst", tenant_id="tenant-C")
    headers = {"Authorization": f"Bearer {token}"}
    
    notif = Notification(
        tenant_id="tenant-C",
        title="Unread Alert",
        message="Needs verification",
        severity="Low",
        type="system",
        is_read=False,
        channels="toast"
    )
    db_session.add(notif)
    db_session.commit()
    db_session.refresh(notif)
    
    # Check currently unread
    assert notif.is_read is False
    
    # Mark as read
    res_update = client.patch(
        f"/api/notifications/{notif.id}",
        json={"is_read": True},
        headers=headers
    )
    assert res_update.status_code == 200
    assert res_update.json()["is_read"] is True
    
    # Mark invalid notification should return 404
    res_invalid = client.patch(
        "/api/notifications/99999",
        json={"is_read": True},
        headers=headers
    )
    assert res_invalid.status_code == 404

def test_mark_all_read(db_session: Session):
    token = create_authenticated_user("notif_d@securebank.com", "GRC Analyst", tenant_id="tenant-D")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Add multiple unread notifications
    n1 = Notification(tenant_id="tenant-D", title="A1", message="M1", is_read=False, channels="toast")
    n2 = Notification(tenant_id="tenant-D", title="A2", message="M2", is_read=False, channels="toast")
    db_session.add_all([n1, n2])
    db_session.commit()
    
    # Trigger mark all read
    res_all = client.post("/api/notifications/mark-all-read", headers=headers)
    assert res_all.status_code == 200
    
    # Query again and check they are all read
    res_query = client.get("/api/notifications/", headers=headers)
    data = res_query.json()
    assert len(data) >= 2
    assert all(x["is_read"] is True for x in data)

def test_dispatch_notification_helper(db_session: Session, capsys):
    # Directly test the helper dispatch_notification
    dispatch_notification(
        db=db_session,
        tenant_id="tenant-E",
        title="Helper Notification",
        message="Running checks",
        severity="High",
        type="compliance",
        channels="toast,email,push"
    )
    
    # Verify in DB
    notif = db_session.query(Notification).filter(Notification.tenant_id == "tenant-E").first()
    assert notif is not None
    assert notif.title == "Helper Notification"
    assert notif.severity == "High"
    assert notif.channels == "toast,email,push"
    
    # Verify console mock dispatch logging
    captured = capsys.readouterr()
    assert "[SIMULATED EMAIL ALERT]" in captured.out
    assert "[SIMULATED PUSH NOTIFICATION]" in captured.out
