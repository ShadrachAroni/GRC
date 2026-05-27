import os
import uuid
import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from api.database import get_db
from api.dependencies import get_current_user, RoleChecker
from api.models import User, Control, Evidence
from api.schemas import ControlResponse, ControlUpdate, EvidenceResponse, FrameworkSpecResponse
from api.audit_logging import audit_log
from api.cache import cache_response

router = APIRouter()

STORAGE_DIR = "storage"

def verify_file_mime(file_bytes: bytes, filename: str) -> str:
    # PDF check
    if file_bytes.startswith(b'%PDF'):
        return "application/pdf"
    # PNG check
    if file_bytes.startswith(b'\x89PNG\r\n\x1a\n'):
        return "image/png"
    # JPEG check
    if file_bytes.startswith(b'\xff\xd8\xff'):
        return "image/jpeg"
    # CSV check
    try:
        text = file_bytes.decode('utf-8')
        if '\x00' not in text:
            if filename.lower().endswith('.csv'):
                return "text/csv"
            return "text/plain"
    except UnicodeDecodeError:
        pass
    return None

@router.get("/", response_model=List[ControlResponse])
def list_controls(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Control 15 (Tenant Isolation): Scoped strictly to user's tenant
    controls = db.query(Control).filter(Control.tenant_id == current_user.tenant_id).all()
    return controls

@router.get("/frameworks", response_model=List[FrameworkSpecResponse])
@cache_response(expire=3600)
def list_frameworks(
    current_user: User = Depends(get_current_user)
):
    return [
        {
            "id": "SOC2",
            "name": "SOC 2 Type II",
            "description": "Trust Services Criteria for Security, Availability, Processing Integrity, Confidentiality, and Privacy.",
            "version": "2017",
            "category": "Security & Privacy",
            "total_controls": 5
        },
        {
            "id": "ISO27001",
            "name": "ISO/IEC 27001",
            "description": "International standard for information security management systems (ISMS).",
            "version": "2022",
            "category": "Information Security",
            "total_controls": 3
        },
        {
            "id": "PCI-DSS",
            "name": "PCI-DSS",
            "description": "Payment Card Industry Data Security Standard for securing credit card transactions.",
            "version": "4.0",
            "category": "Payment Security",
            "total_controls": 2
        }
    ]


@router.patch("/{control_id}", response_model=ControlResponse)
@audit_log("UPDATE_CONTROL")
def update_control(
    control_id: str,
    request: Request,
    body: ControlUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "GRC Analyst"]))
):
    # Control 15 (Tenant Isolation): Verify ownership before patching
    control = db.query(Control).filter(
        Control.control_id == control_id,
        Control.tenant_id == current_user.tenant_id
    ).first()
    if not control:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Control not found"
        )

    # Update only the provided fields
    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(control, key, value)

    db.commit()
    db.refresh(control)
    return control

@router.post("/{control_id}/evidence", response_model=EvidenceResponse, status_code=status.HTTP_201_CREATED)
@audit_log("UPLOAD_EVIDENCE")
async def upload_evidence(
    control_id: str,
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "GRC Analyst"]))
):
    # Verify control exists and belongs to the user's tenant
    control = db.query(Control).filter(
        Control.control_id == control_id,
        Control.tenant_id == current_user.tenant_id
    ).first()
    if not control:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Control not found"
        )

    # Read content to check file size and MIME type
    contents = await file.read()
    
    # 1. Enforce size validation (< 1MB)
    if len(contents) > 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="File too large. Maximum size allowed is 1MB."
        )

    # 2. Enforce MIME type validation (do not trust Content-Type header alone)
    mime_type = verify_file_mime(contents, file.filename)
    allowed_mimes = ["application/pdf", "image/png", "image/jpeg", "text/csv"]
    if not mime_type or mime_type not in allowed_mimes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Supported formats: PDF, PNG, JPG, CSV."
        )

    # Control 3 (Storage RLS): Save files to paths scoped by tenant_id
    evidence_id = str(uuid.uuid4())
    tenant_dir = os.path.join(STORAGE_DIR, current_user.tenant_id)
    os.makedirs(tenant_dir, exist_ok=True)

    file_name_on_disk = f"{evidence_id}_{file.filename}"
    file_path = os.path.join(tenant_dir, file_name_on_disk)

    with open(file_path, "wb") as f:
        f.write(contents)

    # Create evidence entry
    evidence_record = Evidence(
        evidence_id=evidence_id,
        tenant_id=current_user.tenant_id,
        control_id=control_id,
        file_name=file.filename,
        file_path=file_path.replace("\\", "/"), # Standardize paths
        uploaded_by=current_user.email
    )
    db.add(evidence_record)
    db.commit()
    db.refresh(evidence_record)
    
    return evidence_record

@router.get("/{control_id}/evidence", response_model=List[EvidenceResponse])
def list_control_evidence(
    control_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Control 15 (Tenant Isolation): Filter evidence scoped strictly by user's tenant
    evidence = db.query(Evidence).filter(
        Evidence.control_id == control_id,
        Evidence.tenant_id == current_user.tenant_id
    ).all()
    return evidence

@router.get("/{control_id}/evidence/{evidence_id}/download")
def download_evidence(
    control_id: str,
    evidence_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Control 3 (Storage RLS): Validate file paths restrict cross-user/tenant access
    evidence = db.query(Evidence).filter(
        Evidence.evidence_id == evidence_id,
        Evidence.control_id == control_id,
        Evidence.tenant_id == current_user.tenant_id
    ).first()
    
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )

    file_path = os.path.abspath(evidence.file_path)
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on storage server"
        )

    return FileResponse(file_path, filename=evidence.file_name)
