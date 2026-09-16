# -*- coding: utf-8 -*-
"""
Historical Attack Replay Route for RippleGuard (Idea 4).

Provides endpoints to list famous open-source supply chain compromises (Log4Shell, Event-Stream, XZ Utils, etc.)
and retrieve detailed attack replay specs.
"""

from fastapi import APIRouter, HTTPException
from api.services.famous_attacks import get_famous_attacks, get_attack_by_id

router = APIRouter(prefix="/attacks", tags=["Famous Attacks"])


@router.get("", summary="Get all famous supply chain attack replays")
@router.get("/", summary="Get all famous supply chain attack replays")
def list_attacks():
    """Return the dataset of pre-loaded historical supply chain attack payloads."""
    return get_famous_attacks()


@router.get("/{attack_id}", summary="Get specific attack replay spec by ID")
def get_attack(attack_id: str):
    """Retrieve detailed historical attack specification by attack ID."""
    attack = get_attack_by_id(attack_id)
    if not attack:
        raise HTTPException(status_code=404, detail=f"Attack '{attack_id}' not found")
    return attack
