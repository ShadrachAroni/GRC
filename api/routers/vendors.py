from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_vendors():
    return {"message": "Vendors router is active"}
