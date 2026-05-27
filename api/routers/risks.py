from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from api.database import get_db
from api.dependencies import get_current_user, RoleChecker
from api.models import User, Risk
from api.schemas import RiskCreate, RiskUpdate, RiskResponse
from api.audit_logging import audit_log
from typing import List

router = APIRouter()

@router.get("/", response_model=List[RiskResponse])
def list_risks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Control 15 (Tenant Isolation): Filter query scoped strictly by user's tenant
    risks = db.query(Risk).filter(Risk.tenant_id == current_user.tenant_id).all()
    return risks

@router.post("/", response_model=RiskResponse, status_code=status.HTTP_201_CREATED)
@audit_log("CREATE_RISK")
def create_risk(
    request: Request,
    body: RiskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "GRC Analyst"]))
):
    # Check duplicate risk_id under current tenant
    existing_risk = db.query(Risk).filter(
        Risk.risk_id == body.risk_id,
        Risk.tenant_id == current_user.tenant_id
    ).first()
    if existing_risk:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Risk ID '{body.risk_id}' already exists in this tenant"
        )
    
    # Create new risk model object
    new_risk = Risk(
        risk_id=body.risk_id,
        tenant_id=current_user.tenant_id,
        asset=body.asset,
        threat=body.threat,
        likelihood=body.likelihood,
        impact=body.impact,
        mitigation=body.mitigation,
        status=body.status or "Open",
        owner=body.owner,
        department=body.department,
        review_date=body.review_date
    )
    
    # Risk score and severity will be automatically set by the SQLAlchemy save hook
    db.add(new_risk)
    db.commit()
    db.refresh(new_risk)
    return new_risk

@router.get("/{risk_id}", response_model=RiskResponse)
def get_risk(
    risk_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Control 15 (Tenant Isolation)
    risk = db.query(Risk).filter(
        Risk.risk_id == risk_id,
        Risk.tenant_id == current_user.tenant_id
    ).first()
    if not risk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Risk not found"
        )
    return risk

@router.put("/{risk_id}", response_model=RiskResponse)
@audit_log("UPDATE_RISK")
def update_risk(
    risk_id: str,
    request: Request,
    body: RiskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "GRC Analyst"]))
):
    # Control 15 (Tenant Isolation)
    risk = db.query(Risk).filter(
        Risk.risk_id == risk_id,
        Risk.tenant_id == current_user.tenant_id
    ).first()
    if not risk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Risk not found"
        )
    
    # Update fields if provided
    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(risk, key, value)
        
    db.commit()
    db.refresh(risk)
    return risk

@router.delete("/{risk_id}", status_code=status.HTTP_200_OK)
@audit_log("DELETE_RISK")
def delete_risk(
    risk_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "GRC Analyst"]))
):
    # Control 15 (Tenant Isolation)
    risk = db.query(Risk).filter(
        Risk.risk_id == risk_id,
        Risk.tenant_id == current_user.tenant_id
    ).first()
    if not risk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Risk not found"
        )
        
    db.delete(risk)
    db.commit()
    return {"message": f"Risk '{risk_id}' deleted successfully"}
