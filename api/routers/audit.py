from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from api.database import get_db
from api.dependencies import RoleChecker
from api.models import User, SystemAuditLog, AuditFinding, Capa
from api.schemas import (
    AuditLogResponse,
    AuditFindingCreate,
    AuditFindingUpdate,
    AuditFindingResponse,
    CapaCreate,
    CapaUpdate,
    CapaResponse
)
from typing import List
from datetime import datetime
import csv
import io

router = APIRouter()

@router.get("/")
def get_audit(current_user: User = Depends(RoleChecker(["Administrator", "GRC Analyst"]))):
    return {"message": "Audit router is active", "email": current_user.email, "tenant_id": current_user.tenant_id}

@router.get("/logs", response_model=List[AuditLogResponse])
def list_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator"]))
):
    # Control 6: Restrict raw log query access to Administrators only
    # Control 15: Tenant Isolation
    logs = db.query(SystemAuditLog).filter(
        SystemAuditLog.tenant_id == current_user.tenant_id
    ).order_by(SystemAuditLog.timestamp.desc()).all()
    return logs

@router.get("/logs/download")
def download_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator"]))
):
    # Control 6: Restrict raw log download access to Administrators only
    # Control 15: Tenant Isolation
    logs = db.query(SystemAuditLog).filter(
        SystemAuditLog.tenant_id == current_user.tenant_id
    ).order_by(SystemAuditLog.timestamp.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Timestamp", "User Email", "Action", "IP Address", "Details"])
    for log in logs:
        writer.writerow([
            log.id,
            log.timestamp.isoformat(),
            log.user_email,
            log.action,
            log.ip_address or "Internal",
            log.details or ""
        ])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=system_audit_logs.csv"}
    )

# --- Findings Endpoints ---

@router.get("/findings", response_model=List[AuditFindingResponse])
def list_findings(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "GRC Analyst", "Viewer"]))
):
    return db.query(AuditFinding).filter(AuditFinding.tenant_id == current_user.tenant_id).all()

@router.post("/findings", response_model=AuditFindingResponse, status_code=status.HTTP_201_CREATED)
def create_finding(
    body: AuditFindingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "GRC Analyst"]))
):
    existing = db.query(AuditFinding).filter(
        AuditFinding.finding_id == body.finding_id,
        AuditFinding.tenant_id == current_user.tenant_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Finding ID '{body.finding_id}' already exists in this tenant"
        )
    
    new_finding = AuditFinding(
        finding_id=body.finding_id,
        tenant_id=current_user.tenant_id,
        title=body.title,
        severity=body.severity,
        control_id=body.control_id,
        recommendation=body.recommendation,
        status=body.status or "Open",
        detected_at=datetime.utcnow()
    )
    db.add(new_finding)
    db.commit()
    db.refresh(new_finding)
    return new_finding

@router.get("/findings/{finding_id}", response_model=AuditFindingResponse)
def get_finding(
    finding_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "GRC Analyst", "Viewer"]))
):
    finding = db.query(AuditFinding).filter(
        AuditFinding.finding_id == finding_id,
        AuditFinding.tenant_id == current_user.tenant_id
    ).first()
    if not finding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Finding not found"
        )
    return finding

@router.put("/findings/{finding_id}", response_model=AuditFindingResponse)
def update_finding(
    finding_id: str,
    body: AuditFindingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "GRC Analyst"]))
):
    finding = db.query(AuditFinding).filter(
        AuditFinding.finding_id == finding_id,
        AuditFinding.tenant_id == current_user.tenant_id
    ).first()
    if not finding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Finding not found"
        )
    
    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(finding, key, value)
        
    db.commit()
    db.refresh(finding)
    return finding

@router.delete("/findings/{finding_id}", status_code=status.HTTP_200_OK)
def delete_finding(
    finding_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "GRC Analyst"]))
):
    finding = db.query(AuditFinding).filter(
        AuditFinding.finding_id == finding_id,
        AuditFinding.tenant_id == current_user.tenant_id
    ).first()
    if not finding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Finding not found"
        )
        
    db.delete(finding)
    db.commit()
    return {"message": f"Finding '{finding_id}' deleted successfully"}

# --- CAPA Endpoints ---

@router.get("/capas", response_model=List[CapaResponse])
def list_capas(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "GRC Analyst", "Viewer"]))
):
    return db.query(Capa).filter(Capa.tenant_id == current_user.tenant_id).all()

@router.post("/capas", response_model=CapaResponse, status_code=status.HTTP_201_CREATED)
def create_capa(
    body: CapaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "GRC Analyst"]))
):
    # Verify finding exists and belongs to user's tenant
    finding = db.query(AuditFinding).filter(
        AuditFinding.finding_id == body.finding_id,
        AuditFinding.tenant_id == current_user.tenant_id
    ).first()
    if not finding:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Associated Audit Finding '{body.finding_id}' not found in this tenant"
        )
        
    existing = db.query(Capa).filter(
        Capa.capa_id == body.capa_id,
        Capa.tenant_id == current_user.tenant_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"CAPA ID '{body.capa_id}' already exists in this tenant"
        )
        
    new_capa = Capa(
        capa_id=body.capa_id,
        tenant_id=current_user.tenant_id,
        finding_id=body.finding_id,
        title=body.title,
        root_cause=body.root_cause,
        action=body.action,
        owner=body.owner,
        due_date=body.due_date,
        status=body.status or "Open",
        created_at=datetime.utcnow()
    )
    db.add(new_capa)
    db.commit()
    db.refresh(new_capa)
    return new_capa

@router.get("/capas/{capa_id}", response_model=CapaResponse)
def get_capa(
    capa_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "GRC Analyst", "Viewer"]))
):
    capa = db.query(Capa).filter(
        Capa.capa_id == capa_id,
        Capa.tenant_id == current_user.tenant_id
    ).first()
    if not capa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CAPA item not found"
        )
    return capa

@router.put("/capas/{capa_id}", response_model=CapaResponse)
def update_capa(
    capa_id: str,
    body: CapaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "GRC Analyst"]))
):
    capa = db.query(Capa).filter(
        Capa.capa_id == capa_id,
        Capa.tenant_id == current_user.tenant_id
    ).first()
    if not capa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CAPA item not found"
        )
        
    update_data = body.model_dump(exclude_unset=True)
    # If the user tries to associate with a finding, verify finding exists and matches tenant
    if "finding_id" in update_data and update_data["finding_id"] is not None:
        finding = db.query(AuditFinding).filter(
            AuditFinding.finding_id == update_data["finding_id"],
            AuditFinding.tenant_id == current_user.tenant_id
        ).first()
        if not finding:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Associated Audit Finding '{update_data['finding_id']}' not found in this tenant"
            )
            
    for key, value in update_data.items():
        setattr(capa, key, value)
        
    db.commit()
    db.refresh(capa)
    return capa

@router.delete("/capas/{capa_id}", status_code=status.HTTP_200_OK)
def delete_capa(
    capa_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "GRC Analyst"]))
):
    capa = db.query(Capa).filter(
        Capa.capa_id == capa_id,
        Capa.tenant_id == current_user.tenant_id
    ).first()
    if not capa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CAPA item not found"
        )
        
    db.delete(capa)
    db.commit()
    return {"message": f"CAPA item '{capa_id}' deleted successfully"}
