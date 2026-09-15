from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from api.models.request_models import CompareRequest

router = APIRouter(tags=["compare"])

@router.post(
    "/compare",
    status_code=status.HTTP_501_NOT_IMPLEMENTED,
    summary="Compare blast radius of two compromises"
)
async def compare_compromises(request: CompareRequest):
    """Stub route for comparing two compromise scenarios — to be wired with graph_service."""
    return JSONResponse(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        content={"status": "not_implemented"}
    )
