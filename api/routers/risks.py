from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_risks():
    return {"message": "Risks router is active"}
