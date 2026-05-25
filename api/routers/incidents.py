from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_incidents():
    return {"message": "Incidents router is active"}
