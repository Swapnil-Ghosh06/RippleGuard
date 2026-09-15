from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from api.models.request_models import AnalyzeRequest

router = APIRouter(tags=["analyze"])

@router.post(
    "/analyze",
    status_code=status.HTTP_501_NOT_IMPLEMENTED,
    summary="Analyze package dependency graph and vulnerabilities"
)
async def analyze_package(request: AnalyzeRequest):
    """Stub route for package analysis — to be wired with graph_service."""
    return JSONResponse(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        content={"status": "not_implemented"}
    )
