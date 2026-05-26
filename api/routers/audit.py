from fastapi import APIRouter, Depends
from api.dependencies import RoleChecker
from api.models import User

router = APIRouter()

@router.get("/")
def get_audit(current_user: User = Depends(RoleChecker(["Administrator", "GRC Analyst"]))):
    return {"message": "Audit router is active", "email": current_user.email, "tenant_id": current_user.tenant_id}

