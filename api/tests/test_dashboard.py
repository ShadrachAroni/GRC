import pyotp
import pytest
from fastapi.testclient import TestClient
from api.main import app
from api.models import User, Risk, Control, Incident, AuditFinding, Capa
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
    
    totp = pyotp.TOTP(otp_secret)
    client.post(
        "/api/auth/mfa/enable",
        json={"email": email, "code": totp.now()},
    )
    
    login_res = client.post(
        "/api/auth/login",
        json={"email": email, "password": "supersecurepassword123"}
    ).json()
    temp_token = login_res["temp_token"]
    
    verify_res = client.post(
        "/api/auth/login/verify",
        json={"temp_token": temp_token, "code": totp.now()}
    ).json()
    
    return verify_res["access_token"]

def test_dashboard_summary_and_tenant_isolation(db_session: Session):
    token_a = create_authenticated_user("analyst_a@securebank.com", "GRC Analyst", tenant_id="tenant-A")
    token_b = create_authenticated_user("analyst_b@securebank.com", "GRC Analyst", tenant_id="tenant-B")
    
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}
    
    # Seed Tenant A
    db_session.add(Risk(risk_id="R-1", tenant_id="tenant-A", asset="Asset A1", threat="Threat A1", likelihood=3, impact=4, status="Open"))
    db_session.add(Risk(risk_id="R-2", tenant_id="tenant-A", asset="Asset A2", threat="Threat A2", likelihood=1, impact=2, status="Mitigated"))
    
    db_session.add(Control(control_id="CC1", tenant_id="tenant-A", framework="SOC2", description="Desc C1", status="Implemented"))
    db_session.add(Control(control_id="CC2", tenant_id="tenant-A", framework="SOC2", description="Desc C2", status="Not Started"))
    db_session.add(Control(control_id="ISO-1", tenant_id="tenant-A", framework="ISO27001", description="Desc C3", status="In Progress"))

    db_session.add(Incident(incident_id=1, tenant_id="tenant-A", title="Inc A1", severity="Critical", status="Open", mttd_minutes=10, mttr_minutes=None))
    db_session.add(Incident(incident_id=2, tenant_id="tenant-A", title="Inc A2", severity="Medium", status="Closed", mttd_minutes=20, mttr_minutes=60))

    db_session.add(AuditFinding(finding_id="F-1", tenant_id="tenant-A", title="Find A1", severity="High", status="Open"))
    db_session.add(Capa(capa_id="CP-1", tenant_id="tenant-A", finding_id="F-1", title="Capa A1", action="Act", status="Open"))

    # Seed Tenant B
    db_session.add(Risk(risk_id="R-3", tenant_id="tenant-B", asset="Asset B1", threat="Threat B1", likelihood=5, impact=5, status="Open"))
    db_session.add(Control(control_id="CC3", tenant_id="tenant-B", framework="SOC2", description="Desc C4", status="Implemented"))
    
    db_session.commit()
    
    # Fetch Tenant A Dashboard Summary
    res_a = client.get("/api/dashboard/summary", headers=headers_a)
    assert res_a.status_code == 200
    data_a = res_a.json()
    
    assert data_a["open_risks_count"] == 1
    assert data_a["total_risks_count"] == 2
    assert data_a["avg_risk_score"] == 7.0
    assert data_a["risks_by_severity"]["High"] == 1
    assert data_a["risks_by_severity"]["Low"] == 1
    
    assert data_a["implemented_controls_count"] == 1
    assert data_a["total_controls_count"] == 3
    assert data_a["compliance_score"] == 33.33
    assert data_a["controls_by_status"]["Implemented"] == 1
    assert data_a["controls_by_status"]["Not Started"] == 1
    assert data_a["controls_by_status"]["In Progress"] == 1
    
    assert data_a["controls_by_framework"]["SOC2"]["total"] == 2
    assert data_a["controls_by_framework"]["SOC2"]["implemented"] == 1
    assert data_a["controls_by_framework"]["SOC2"]["compliance_score"] == 50.0

    assert data_a["controls_by_framework"]["ISO27001"]["total"] == 1
    assert data_a["controls_by_framework"]["ISO27001"]["implemented"] == 0
    assert data_a["controls_by_framework"]["ISO27001"]["compliance_score"] == 0.0

    assert data_a["open_incidents_count"] == 1
    assert data_a["active_incidents_count"] == 1
    assert data_a["total_incidents_count"] == 2
    assert data_a["avg_mttd_minutes"] == 15.0
    assert data_a["avg_mttr_minutes"] == 60.0

    assert data_a["open_findings_count"] == 1
    assert data_a["total_findings_count"] == 1
    
    assert data_a["open_capas_count"] == 1
    assert data_a["total_capas_count"] == 1

    # Fetch Tenant B Dashboard Summary (Tenant Isolation Check)
    res_b = client.get("/api/dashboard/summary", headers=headers_b)
    assert res_b.status_code == 200
    data_b = res_b.json()
    
    assert data_b["open_risks_count"] == 1
    assert data_b["total_risks_count"] == 1
    assert data_b["avg_risk_score"] == 25.0
    assert data_b["risks_by_severity"]["Critical"] == 1
    assert data_b["implemented_controls_count"] == 1
    assert data_b["total_controls_count"] == 1
    assert data_b["compliance_score"] == 100.0
    assert data_b["open_incidents_count"] == 0
    assert data_b["open_findings_count"] == 0
    assert data_b["open_capas_count"] == 0

def test_dashboard_exports(db_session: Session):
    token_a = create_authenticated_user("analyst_export@securebank.com", "GRC Analyst", tenant_id="tenant-A")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    
    db_session.add(Risk(risk_id="R-EXP", tenant_id="tenant-A", asset="Asset Exp", threat="Threat Exp", likelihood=3, impact=4, status="Open"))
    db_session.add(AuditFinding(finding_id="F-EXP", tenant_id="tenant-A", title="Find Exp", severity="High", status="Open"))
    db_session.add(Capa(capa_id="CP-EXP", tenant_id="tenant-A", finding_id="F-EXP", title="Capa Exp", action="Act", status="Open"))
    db_session.commit()
    
    # Export Risks
    res_risks = client.get("/api/dashboard/export/risks", headers=headers_a)
    assert res_risks.status_code == 200
    assert res_risks.headers["Content-Disposition"] == "attachment; filename=risk_register_export.csv"
    assert "Risk ID,Asset,Threat" in res_risks.text
    assert "R-EXP,Asset Exp,Threat Exp" in res_risks.text
    
    # Export CAPAs
    res_capas = client.get("/api/dashboard/export/capas", headers=headers_a)
    assert res_capas.status_code == 200
    assert res_capas.headers["Content-Disposition"] == "attachment; filename=capa_tracker_export.csv"
    assert "CAPA ID,Finding ID,Title" in res_capas.text
    assert "CP-EXP,F-EXP,Capa Exp" in res_capas.text
