from fastapi import APIRouter, Depends
from api.dependencies import get_current_user
from api.models import User

router = APIRouter()

@router.get("/")
def get_controls(current_user: User = Depends(get_current_user)):
    return {"message": "Controls router is active", "email": current_user.email, "tenant_id": current_user.tenant_id}

