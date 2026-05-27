from pydantic import BaseModel, Field, ConfigDict, model_validator
from typing import Optional, List, Literal
from datetime import date, datetime
import html

class SanitizedBaseModel(BaseModel):
    @model_validator(mode="before")
    @classmethod
    def sanitize_strings(cls, data):
        if not isinstance(data, dict):
            return data
        
        excluded_keys = {
            "password", "code", "token", "temp_token", 
            "refresh_token", "redirect_uri", "mfa_secret"
        }
        
        def sanitize_val(key, val):
            if key in excluded_keys:
                return val
            if isinstance(val, str):
                return html.escape(val)
            if isinstance(val, dict):
                return {k: sanitize_val(k, v) for k, v in val.items()}
            if isinstance(val, list):
                return [sanitize_val(key, item) for item in val]
            return val

        return {k: sanitize_val(k, v) for k, v in data.items()}

class UserRegister(SanitizedBaseModel):
    model_config = ConfigDict(extra="forbid")
    
    email: str
    password: str = Field(..., min_length=8)
    tenant_id: Optional[str] = None
    role: Optional[str] = "Viewer"  # Viewer, GRC Analyst, Administrator

class UserLogin(SanitizedBaseModel):
    model_config = ConfigDict(extra="forbid")
    
    email: str
    password: str

class MFAEnableRequest(SanitizedBaseModel):
    model_config = ConfigDict(extra="forbid")
    
    email: str
    code: str

class MFALoginVerify(SanitizedBaseModel):
    model_config = ConfigDict(extra="forbid")
    
    temp_token: str
    code: str

class TokenResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    tenant_id: str
    email: str

class PasswordResetRequest(SanitizedBaseModel):
    model_config = ConfigDict(extra="forbid")
    
    email: str
    redirect_uri: Optional[str] = None

class PasswordResetConfirm(SanitizedBaseModel):
    model_config = ConfigDict(extra="forbid")
    
    token: str
    new_password: str = Field(..., min_length=8)

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")
    
    id: int
    email: str
    role: str
    tenant_id: str
    mfa_enabled: bool

class RegisterResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    message: str
    email: str
    tenant_id: str
    role: str
    otp_secret: str
    otp_uri: str


# --- GRC Business Entity Schemas (Phase 05) ---

# Risk Schemas
class RiskCreate(SanitizedBaseModel):
    model_config = ConfigDict(extra="forbid")
    risk_id: str
    asset: str
    threat: str
    likelihood: int = Field(..., ge=1, le=5)
    impact: int = Field(..., ge=1, le=5)
    mitigation: Optional[str] = None
    status: Optional[str] = "Open"
    owner: Optional[str] = None
    department: Optional[str] = None
    review_date: Optional[date] = None

class RiskUpdate(SanitizedBaseModel):
    model_config = ConfigDict(extra="forbid")
    asset: Optional[str] = None
    threat: Optional[str] = None
    likelihood: Optional[int] = Field(None, ge=1, le=5)
    impact: Optional[int] = Field(None, ge=1, le=5)
    mitigation: Optional[str] = None
    status: Optional[str] = None
    owner: Optional[str] = None
    department: Optional[str] = None
    review_date: Optional[date] = None

class RiskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")
    risk_id: str
    tenant_id: str
    asset: str
    threat: str
    likelihood: int
    impact: int
    risk_score: int
    severity: str
    mitigation: Optional[str] = None
    status: str
    owner: Optional[str] = None
    department: Optional[str] = None
    review_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime


# Control Schemas
class ControlCreate(SanitizedBaseModel):
    model_config = ConfigDict(extra="forbid")
    control_id: str
    framework: str
    description: str
    company_control: Optional[str] = None
    status: Optional[str] = "Not Started"
    owner: Optional[str] = None
    evidence_required: Optional[str] = None
    last_reviewed: Optional[date] = None

class ControlUpdate(SanitizedBaseModel):
    model_config = ConfigDict(extra="forbid")
    framework: Optional[str] = None
    description: Optional[str] = None
    company_control: Optional[str] = None
    status: Optional[str] = None
    owner: Optional[str] = None
    evidence_required: Optional[str] = None
    last_reviewed: Optional[date] = None

class ControlResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")
    control_id: str
    tenant_id: str
    framework: str
    description: str
    company_control: Optional[str] = None
    status: str
    owner: Optional[str] = None
    evidence_required: Optional[str] = None
    last_reviewed: Optional[date] = None
    created_at: datetime


# Incident Schemas
class IncidentCreate(SanitizedBaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(..., min_length=1)
    severity: Literal["Critical", "High", "Medium", "Low"]
    status: Optional[Literal["Open", "Contained", "Resolved", "Closed"]] = "Open"
    detected_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    description: Optional[str] = None
    assigned_to: Optional[str] = None

class IncidentUpdate(SanitizedBaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Optional[str] = None
    severity: Optional[Literal["Critical", "High", "Medium", "Low"]] = None
    status: Optional[Literal["Open", "Contained", "Resolved", "Closed"]] = None
    detected_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    description: Optional[str] = None
    assigned_to: Optional[str] = None

class IncidentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")
    incident_id: int
    tenant_id: str
    title: str
    severity: str
    status: str
    detected_at: datetime
    resolved_at: Optional[datetime] = None
    mttd_minutes: Optional[int] = None
    mttr_minutes: Optional[int] = None
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    created_at: datetime


# Vendor Schemas
class VendorCreate(SanitizedBaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str
    status: Optional[str] = "Pending"
    score: Optional[int] = None
    risk_tier: Optional[str] = None
    contact_email: Optional[str] = None

class VendorUpdate(SanitizedBaseModel):
    model_config = ConfigDict(extra="forbid")
    name: Optional[str] = None
    status: Optional[str] = None
    score: Optional[int] = None
    risk_tier: Optional[str] = None
    contact_email: Optional[str] = None

class VendorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")
    id: int
    tenant_id: str
    name: str
    status: str
    score: Optional[int] = None
    risk_tier: Optional[str] = None
    contact_email: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# Vendor Assessment Schemas
class VendorAssessmentCreate(SanitizedBaseModel):
    model_config = ConfigDict(extra="forbid")
    vendor_id: int
    assessed_by: Optional[str] = None
    assessment_date: Optional[datetime] = None
    score: Optional[int] = None
    status: Optional[str] = "Draft"
    questionnaire_data: Optional[str] = None

class VendorAssessmentUpdate(SanitizedBaseModel):
    model_config = ConfigDict(extra="forbid")
    vendor_id: Optional[int] = None
    assessed_by: Optional[str] = None
    assessment_date: Optional[datetime] = None
    score: Optional[int] = None
    status: Optional[str] = None
    questionnaire_data: Optional[str] = None

class VendorAssessmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")
    id: int
    tenant_id: str
    vendor_id: int
    assessed_by: Optional[str] = None
    assessment_date: Optional[datetime] = None
    score: Optional[int] = None
    status: str
    questionnaire_data: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# Audit Finding Schemas
class AuditFindingCreate(SanitizedBaseModel):
    model_config = ConfigDict(extra="forbid")
    finding_id: str
    title: str
    severity: str
    control_id: Optional[str] = None
    recommendation: Optional[str] = None
    status: Optional[str] = "Open"

class AuditFindingUpdate(SanitizedBaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Optional[str] = None
    severity: Optional[str] = None
    control_id: Optional[str] = None
    recommendation: Optional[str] = None
    status: Optional[str] = None

class AuditFindingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")
    finding_id: str
    tenant_id: str
    title: str
    severity: str
    control_id: Optional[str] = None
    recommendation: Optional[str] = None
    status: str
    detected_at: datetime
    created_at: datetime


# CAPA Schemas
class CapaCreate(SanitizedBaseModel):
    model_config = ConfigDict(extra="forbid")
    capa_id: str
    finding_id: str
    title: str
    root_cause: Optional[str] = None
    action: str
    owner: Optional[str] = None
    due_date: Optional[date] = None
    status: Optional[str] = "Open"

class CapaUpdate(SanitizedBaseModel):
    model_config = ConfigDict(extra="forbid")
    finding_id: Optional[str] = None
    title: Optional[str] = None
    root_cause: Optional[str] = None
    action: Optional[str] = None
    owner: Optional[str] = None
    due_date: Optional[date] = None
    status: Optional[str] = None

class CapaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")
    capa_id: str
    tenant_id: str
    finding_id: str
    title: str
    root_cause: Optional[str] = None
    action: str
    owner: Optional[str] = None
    due_date: Optional[date] = None
    status: str
    created_at: datetime


# Evidence Schemas
class EvidenceCreate(SanitizedBaseModel):
    model_config = ConfigDict(extra="forbid")
    evidence_id: str
    control_id: str
    file_name: str
    file_path: str
    uploaded_by: str

class EvidenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")
    evidence_id: str
    tenant_id: str
    control_id: str
    file_name: str
    file_path: str
    uploaded_by: str
    uploaded_at: datetime


# Access Review Schemas
class AccessReviewCreate(SanitizedBaseModel):
    model_config = ConfigDict(extra="forbid")
    reviewer: str
    user_email: str
    status: Optional[str] = "Open"
    decision: Optional[str] = None
    justification: Optional[str] = None

class AccessReviewUpdate(SanitizedBaseModel):
    model_config = ConfigDict(extra="forbid")
    reviewer: Optional[str] = None
    user_email: Optional[str] = None
    status: Optional[str] = None
    decision: Optional[str] = None
    justification: Optional[str] = None

class AccessReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")
    id: int
    tenant_id: str
    reviewer: str
    user_email: str
    status: str
    decision: Optional[str] = None
    justification: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime

class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")
    id: int
    tenant_id: str
    user_email: str
    action: str
    ip_address: Optional[str] = None
    timestamp: datetime
    details: Optional[str] = None


# Dashboard Schema
class DashboardSummaryResponse(BaseModel):
    open_risks_count: int
    total_risks_count: int
    avg_risk_score: float
    risks_by_severity: dict
    
    implemented_controls_count: int
    total_controls_count: int
    compliance_score: float
    controls_by_status: dict
    controls_by_framework: dict
    
    open_incidents_count: int
    active_incidents_count: int
    total_incidents_count: int
    avg_mttd_minutes: float
    avg_mttr_minutes: float
    incidents_by_severity: dict
    incidents_by_status: dict
    
    open_findings_count: int
    total_findings_count: int
    
    open_capas_count: int
    total_capas_count: int


# Framework Schemas
class FrameworkSpecResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    name: str
    description: str
    version: str
    category: str
    total_controls: int

