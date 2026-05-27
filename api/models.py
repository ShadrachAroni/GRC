from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, ForeignKey, Index, ForeignKeyConstraint
from sqlalchemy.orm import relationship
from api.database import Base
import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="Viewer", nullable=False)  # Viewer, GRC Analyst, Administrator
    tenant_id = Column(String, index=True, nullable=False)
    mfa_secret = Column(String, nullable=True)
    mfa_enabled = Column(Boolean, default=False, nullable=False)
    hashed_recovery_codes = Column(String, nullable=True)  # Comma-separated list of hashed recovery codes
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")

    __table_args__ = (
        Index('idx_users_tenant_created', 'tenant_id', 'created_at'),
    )

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token_hash = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_revoked = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="refresh_tokens")

class Risk(Base):
    __tablename__ = "risks"

    risk_id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, primary_key=True, index=True)
    asset = Column(String, nullable=False)
    threat = Column(String, nullable=False)
    likelihood = Column(Integer, nullable=False)
    impact = Column(Integer, nullable=False)
    risk_score = Column(Integer, nullable=False)
    severity = Column(String, nullable=False)
    mitigation = Column(String, nullable=True)
    status = Column(String, default="Open", nullable=False)
    owner = Column(String, nullable=True)
    department = Column(String, nullable=True)
    review_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    __table_args__ = (
        Index('idx_risks_tenant_created', 'tenant_id', 'created_at'),
    )

class Control(Base):
    __tablename__ = "controls"

    control_id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, primary_key=True, index=True)
    framework = Column(String, nullable=False)
    description = Column(String, nullable=False)
    company_control = Column(String, nullable=True)
    status = Column(String, default="Not Started", nullable=False)
    owner = Column(String, nullable=True)
    evidence_required = Column(String, nullable=True)
    last_reviewed = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    evidence = relationship(
        "Evidence",
        back_populates="control",
        cascade="all, delete-orphan",
        primaryjoin="and_(Control.control_id==Evidence.control_id, Control.tenant_id==Evidence.tenant_id)"
    )
    findings = relationship(
        "AuditFinding",
        back_populates="control",
        primaryjoin="and_(Control.control_id==AuditFinding.control_id, Control.tenant_id==AuditFinding.tenant_id)"
    )

    __table_args__ = (
        Index('idx_controls_tenant_created', 'tenant_id', 'created_at'),
    )

class Incident(Base):
    __tablename__ = "incidents"

    incident_id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String, index=True, nullable=False)
    title = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    status = Column(String, default="Open", nullable=False)
    detected_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)
    mttd_minutes = Column(Integer, nullable=True)
    mttr_minutes = Column(Integer, nullable=True)
    description = Column(String, nullable=True)
    assigned_to = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    __table_args__ = (
        Index('idx_incidents_tenant_created', 'tenant_id', 'created_at'),
    )

class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    status = Column(String, default="Pending", nullable=False)
    score = Column(Integer, nullable=True)
    risk_tier = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    assessments = relationship(
        "VendorAssessment",
        back_populates="vendor",
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index('idx_vendors_tenant_created', 'tenant_id', 'created_at'),
    )

class VendorAssessment(Base):
    __tablename__ = "vendor_assessments"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String, index=True, nullable=False)
    vendor_id = Column(Integer, ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False)
    assessed_by = Column(String, nullable=True)
    assessment_date = Column(DateTime, nullable=True)
    score = Column(Integer, nullable=True)
    status = Column(String, default="Draft", nullable=False)
    questionnaire_data = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    vendor = relationship("Vendor", back_populates="assessments")

    __table_args__ = (
        Index('idx_vendor_assessments_tenant_created', 'tenant_id', 'created_at'),
    )

class AuditFinding(Base):
    __tablename__ = "audit_findings"

    finding_id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    control_id = Column(String, nullable=True)
    recommendation = Column(String, nullable=True)
    status = Column(String, default="Open", nullable=False)
    detected_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    control = relationship(
        "Control",
        back_populates="findings",
        primaryjoin="and_(Control.control_id==AuditFinding.control_id, Control.tenant_id==AuditFinding.tenant_id)"
    )
    capas = relationship(
        "Capa",
        back_populates="finding",
        cascade="all, delete-orphan",
        primaryjoin="and_(AuditFinding.finding_id==Capa.finding_id, AuditFinding.tenant_id==Capa.tenant_id)"
    )

    __table_args__ = (
        ForeignKeyConstraint(
            ['control_id', 'tenant_id'],
            ['controls.control_id', 'controls.tenant_id'],
            ondelete="SET NULL"
        ),
        Index('idx_audit_findings_tenant_created', 'tenant_id', 'created_at'),
    )

class Capa(Base):
    __tablename__ = "capas"

    capa_id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, primary_key=True, index=True)
    finding_id = Column(String, nullable=False)
    title = Column(String, nullable=False)
    root_cause = Column(String, nullable=True)
    action = Column(String, nullable=False)
    owner = Column(String, nullable=True)
    due_date = Column(Date, nullable=True)
    status = Column(String, default="Open", nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    finding = relationship(
        "AuditFinding",
        back_populates="capas",
        primaryjoin="and_(AuditFinding.finding_id==Capa.finding_id, AuditFinding.tenant_id==Capa.tenant_id)"
    )

    __table_args__ = (
        ForeignKeyConstraint(
            ['finding_id', 'tenant_id'],
            ['audit_findings.finding_id', 'audit_findings.tenant_id'],
            ondelete="CASCADE"
        ),
        Index('idx_capas_tenant_created', 'tenant_id', 'created_at'),
    )

class Evidence(Base):
    __tablename__ = "evidence"

    evidence_id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, index=True, nullable=False)
    control_id = Column(String, nullable=False)
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    uploaded_by = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    control = relationship(
        "Control",
        back_populates="evidence",
        primaryjoin="and_(Control.control_id==Evidence.control_id, Control.tenant_id==Evidence.tenant_id)"
    )

    __table_args__ = (
        ForeignKeyConstraint(
            ['control_id', 'tenant_id'],
            ['controls.control_id', 'controls.tenant_id'],
            ondelete="CASCADE"
        ),
        Index('idx_evidence_tenant_uploaded', 'tenant_id', 'uploaded_at'),
    )

class AccessReview(Base):
    __tablename__ = "access_reviews"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String, index=True, nullable=False)
    reviewer = Column(String, nullable=False)
    user_email = Column(String, nullable=False)
    status = Column(String, default="Open", nullable=False)
    decision = Column(String, nullable=True)
    justification = Column(String, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    __table_args__ = (
        Index('idx_access_reviews_tenant_created', 'tenant_id', 'created_at'),
    )

class SystemAuditLog(Base):
    __tablename__ = "system_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String, index=True, nullable=False)
    user_email = Column(String, nullable=False)
    action = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    details = Column(String, nullable=True)

    __table_args__ = (
        Index('idx_audit_logs_tenant_created', 'tenant_id', 'timestamp'),
    )

from sqlalchemy import event

@event.listens_for(Risk, 'before_insert')
@event.listens_for(Risk, 'before_update')
def calculate_risk_score_and_severity(mapper, connection, target):
    likelihood = target.likelihood or 0
    impact = target.impact or 0
    target.risk_score = likelihood * impact
    if target.risk_score >= 16:
        target.severity = "Critical"
    elif target.risk_score >= 11:
        target.severity = "High"
    elif target.risk_score >= 6:
        target.severity = "Medium"
    else:
        target.severity = "Low"



