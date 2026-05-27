from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from api.database import get_db
from api.dependencies import get_current_user, RoleChecker
from api.models import User, Incident
from api.schemas import IncidentCreate, IncidentUpdate, IncidentResponse
from api.audit_logging import audit_log
from typing import List
from datetime import datetime

router = APIRouter()

def update_incident_durations(incident: Incident):
    if incident.status in ("Resolved", "Closed"):
        if not incident.resolved_at:
            incident.resolved_at = datetime.utcnow()
        created_ref = incident.created_at or datetime.utcnow()
        # Calculate MTTD: time from detection to creation/logging
        incident.mttd_minutes = max(0, int((created_ref - incident.detected_at).total_seconds() / 60))
        # Calculate MTTR: time from detection to resolution
        incident.mttr_minutes = max(0, int((incident.resolved_at - incident.detected_at).total_seconds() / 60))
    else:
        incident.resolved_at = None
        incident.mttd_minutes = None
        incident.mttr_minutes = None

@router.get("/", response_model=List[IncidentResponse])
def list_incidents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Control 15 (Tenant Isolation): Scoped strictly by user's tenant
    incidents = db.query(Incident).filter(Incident.tenant_id == current_user.tenant_id).all()
    return incidents

@router.post("/", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
@audit_log("CREATE_INCIDENT")
def create_incident(
    request: Request,
    body: IncidentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "GRC Analyst"]))
):
    # Create new incident object
    new_incident = Incident(
        tenant_id=current_user.tenant_id,
        title=body.title,
        severity=body.severity,
        status=body.status or "Open",
        detected_at=body.detected_at or datetime.utcnow(),
        resolved_at=body.resolved_at,
        description=body.description,
        assigned_to=body.assigned_to,
        created_at=datetime.utcnow()
    )
    
    # Calculate durations on creation if starting in a resolved state
    update_incident_durations(new_incident)

    db.add(new_incident)
    db.commit()
    db.refresh(new_incident)
    return new_incident

@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Control 15 (Tenant Isolation)
    incident = db.query(Incident).filter(
        Incident.incident_id == incident_id,
        Incident.tenant_id == current_user.tenant_id
    ).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found"
        )
    return incident

@router.put("/{incident_id}", response_model=IncidentResponse)
@audit_log("UPDATE_INCIDENT")
def update_incident(
    incident_id: int,
    request: Request,
    body: IncidentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "GRC Analyst"]))
):
    # Control 15 (Tenant Isolation)
    incident = db.query(Incident).filter(
        Incident.incident_id == incident_id,
        Incident.tenant_id == current_user.tenant_id
    ).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found"
        )
    
    # Apply update fields
    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(incident, key, value)

    # Automatically calculate durations upon resolution state changes
    update_incident_durations(incident)

    db.commit()
    db.refresh(incident)
    return incident

@router.delete("/{incident_id}", status_code=status.HTTP_200_OK)
@audit_log("DELETE_INCIDENT")
def delete_incident(
    incident_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "GRC Analyst"]))
):
    # Control 15 (Tenant Isolation)
    incident = db.query(Incident).filter(
        Incident.incident_id == incident_id,
        Incident.tenant_id == current_user.tenant_id
    ).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found"
        )
        
    db.delete(incident)
    db.commit()
    return {"message": f"Incident '{incident_id}' deleted successfully"}
