from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_controls():
    return {"message": "Controls router is active"}
