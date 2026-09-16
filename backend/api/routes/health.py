# -*- coding: utf-8 -*-
"""
Health Check Route for RippleGuard.
"""

from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Health Check")
def health_check():
    """Returns operational status of the RippleGuard API server."""
    return {"status": "ok", "version": "1.0.0"}
