from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from api.models.request_models import SimulateRequest

router = APIRouter(tags=["simulate"])

@router.post(
    "/simulate",
    status_code=status.HTTP_501_NOT_IMPLEMENTED,
    summary="Simulate compromise propagation across dependency graph"
)
async def simulate_compromise(request: SimulateRequest):
    """Stub route for compromise propagation simulation — to be wired with graph_service."""
    return JSONResponse(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        content={"status": "not_implemented"}
    )
