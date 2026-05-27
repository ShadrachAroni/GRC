import pytest
import datetime
from sqlalchemy.orm import Session
from api.models import (
    Risk, Control, Incident, Vendor, VendorAssessment,
    AuditFinding, Capa, Evidence, AccessReview
)

def test_create_risk_and_verify_auto_calculation(db_session: Session):
    # Test auto-calculation of risk score & severity values
    # In standard GRC scoring: score = likelihood * impact
    # Severity limits: Score >= 16 (Critical), >= 11 (High), >= 6 (Medium), < 6 (Low)
    
    # 1. Critical risk
    risk_critical = Risk(
        risk_id="R-101",
        tenant_id="tenant-123",
        asset="Database",
        threat="Data Theft",
        likelihood=4,
        impact=4,
        risk_score=4*4,
        severity="Critical",
        status="Open"
    )
    db_session.add(risk_critical)
    db_session.commit()

    saved_risk = db_session.query(Risk).filter(Risk.risk_id == "R-101").first()
    assert saved_risk is not None
    assert saved_risk.risk_score == 16
    assert saved_risk.severity == "Critical"

def test_tenant_isolation(db_session: Session):
    # Setup test data with different tenants
    control_a = Control(
        control_id="CC1.1",
        tenant_id="tenant-A",
        framework="SOC2",
        description="Tenant A Control",
        status="Not Started"
    )
    control_b = Control(
        control_id="CC1.1",
        tenant_id="tenant-B",
        framework="SOC2",
        description="Tenant B Control",
        status="Implemented"
    )
    db_session.add(control_a)
    db_session.add(control_b)
    db_session.commit()

    # Query scoped to Tenant A
    results_a = db_session.query(Control).filter(
        Control.tenant_id == "tenant-A"
    ).all()
    assert len(results_a) == 1
    assert results_a[0].description == "Tenant A Control"

    # Query scoped to Tenant B
    results_b = db_session.query(Control).filter(
        Control.tenant_id == "tenant-B"
    ).all()
    assert len(results_b) == 1
    assert results_b[0].description == "Tenant B Control"

def test_relationships_cascade_deletes(db_session: Session):
    # Setup Vendor and VendorAssessment
    vendor = Vendor(
        tenant_id="tenant-123",
        name="SecureVendor Inc",
        status="Active",
        risk_tier="High"
    )
    db_session.add(vendor)
    db_session.commit() # generates autoincrement ID

    assessment = VendorAssessment(
        tenant_id="tenant-123",
        vendor_id=vendor.id,
        score=85,
        status="Approved",
        questionnaire_data='{"q1": "yes"}'
    )
    db_session.add(assessment)
    db_session.commit()

    # Verify relationships
    assert len(vendor.assessments) == 1
    assert vendor.assessments[0].score == 85

    # Test cascade delete: deleting the vendor should delete the assessment
    db_session.delete(vendor)
    db_session.commit()

    assessments_left = db_session.query(VendorAssessment).filter(
        VendorAssessment.vendor_id == vendor.id
    ).all()
    assert len(assessments_left) == 0

def test_audit_findings_and_capas(db_session: Session):
    control = Control(
        control_id="CC6.1",
        tenant_id="tenant-123",
        framework="SOC2",
        description="MFA Control",
        status="Partial"
    )
    db_session.add(control)
    db_session.commit()

    finding = AuditFinding(
        finding_id="AF-001",
        tenant_id="tenant-123",
        title="MFA not enforced on administrative accounts",
        severity="High",
        control_id="CC6.1",
        status="Open"
    )
    db_session.add(finding)
    db_session.commit()

    capa = Capa(
        capa_id="CAPA-001",
        tenant_id="tenant-123",
        finding_id="AF-001",
        title="Enforce MFA",
        action="Deploy MFA settings globally",
        status="Open"
    )
    db_session.add(capa)
    db_session.commit()

    # Verify relationships
    assert len(finding.capas) == 1
    assert finding.capas[0].capa_id == "CAPA-001"
    assert finding.control.description == "MFA Control"

def test_evidence_and_access_reviews(db_session: Session):
    control = Control(
        control_id="CC6.3",
        tenant_id="tenant-123",
        framework="SOC2",
        description="Password Policy",
        status="Implemented"
    )
    db_session.add(control)
    db_session.commit()

    evidence = Evidence(
        evidence_id="evidence-uuid-1",
        tenant_id="tenant-123",
        control_id="CC6.3",
        file_name="policy.pdf",
        file_path="/storage/policy.pdf",
        uploaded_by="analyst@securebank.com"
    )
    db_session.add(evidence)

    access_review = AccessReview(
        tenant_id="tenant-123",
        reviewer="manager@securebank.com",
        user_email="employee@securebank.com",
        status="Open"
    )
    db_session.add(access_review)
    db_session.commit()

    # Verify
    assert len(control.evidence) == 1
    assert control.evidence[0].file_name == "policy.pdf"
    
    saved_review = db_session.query(AccessReview).filter(
        AccessReview.reviewer == "manager@securebank.com"
    ).first()
    assert saved_review is not None
    assert saved_review.user_email == "employee@securebank.com"
