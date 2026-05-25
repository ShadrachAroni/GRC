from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_audit():
    return {"message": "Audit router is active"}
