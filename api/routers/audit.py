from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from api.database import get_db
from api.dependencies import RoleChecker
from api.models import User, SystemAuditLog
from api.schemas import AuditLogResponse
from typing import List

router = APIRouter()

@router.get("/")
def get_audit(current_user: User = Depends(RoleChecker(["Administrator", "GRC Analyst"]))):
    return {"message": "Audit router is active", "email": current_user.email, "tenant_id": current_user.tenant_id}

@router.get("/logs", response_model=List[AuditLogResponse])
def list_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "GRC Analyst"]))
):
    # Control 15 (Tenant Isolation): Retrieve system audit logs for user's tenant, ordered by newest first
    logs = db.query(SystemAuditLog).filter(
        SystemAuditLog.tenant_id == current_user.tenant_id
    ).order_by(SystemAuditLog.timestamp.desc()).all()
    return logs
