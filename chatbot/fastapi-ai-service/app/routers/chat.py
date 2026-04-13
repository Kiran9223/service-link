# from fastapi import APIRouter, HTTPException
# from app.models.chat import ChatRequest, ChatResponse, ConversationState
# from app.services.session_service import create_session, get_session
# from app.services.geocoding_service import geocode_location
# from app.services.provider_service import (
#     resolve_category_id,
#     search_nearby_services,
#     get_provider_availability
# )

# router = APIRouter()

# @router.post("/chat", response_model=ChatResponse)
# async def chat(request: ChatRequest):
#     return ChatResponse(
#         message="ServiceLink AI is online. Full agent coming soon.",
#         session_id=request.session_id or "test-session",
#         state=ConversationState.GATHERING,
#         quick_replies=[]
#     )

# # ── Temporary test endpoints — remove before production ──────────────────────

# @router.get("/test/session")
# async def test_session():
#     """Verify Redis session create/read works."""
#     session = await create_session(user_id=None)
#     session_id = session["session_id"]

#     # Read it back
#     loaded = await get_session(session_id)
#     if loaded is None:
#         raise HTTPException(status_code=500, detail="Redis read failed")

#     return {
#         "status": "ok",
#         "session_id": session_id,
#         "session_loaded": loaded["state"] == "GATHERING"
#     }

# @router.get("/test/geocode")
# async def test_geocode(q: str = "Fullerton CA"):
#     """Verify Nominatim geocoding works."""
#     result = await geocode_location(q)
#     if result is None:
#         raise HTTPException(status_code=404, detail=f"Location not found: {q}")
#     return {"status": "ok", "query": q, "result": result}


# @router.get("/test/providers")
# async def test_providers(
#     service: str = "plumbing",
#     lat: float = 33.8826,
#     lng: float = -117.8851
# ):
#     """
#     Verify Spring Boot integration works.
#     Defaults to searching for plumbers near Fullerton.
#     """
#     category_id = resolve_category_id(service)
#     if category_id is None:
#         raise HTTPException(
#             status_code=400,
#             detail=f"Unknown service type: {service}. "
#                    f"Try: plumbing, electrical, cleaning, hvac, etc."
#         )

#     services = await search_nearby_services(
#         category_id=category_id,
#         user_lat=lat,
#         user_lng=lng
#     )

#     return {
#         "status": "ok",
#         "service_type": service,
#         "category_id": category_id,
#         "location": {"lat": lat, "lng": lng},
#         "services_found": len(services),
#         "services": services[:3]  # show first 3 only in test
#     }

# @router.get("/test/availability/{provider_id}")
# async def test_availability(provider_id: int):
#     """Verify availability fetch from Spring Boot works."""
#     slots = await get_provider_availability(provider_id=provider_id)
#     return {
#         "status": "ok",
#         "provider_id": provider_id,
#         "slots_found": len(slots),
#         "next_3_slots": slots[:3]
#     }

from fastapi import APIRouter, HTTPException
from app.models.chat import ChatRequest, ChatResponse, ConversationState
from app.chains.booking_agent import process_message
from app.services.session_service import create_session, get_session
from app.services.geocoding_service import geocode_location
from app.services.provider_service import (
    resolve_category_id, search_nearby_services, get_provider_availability
)
import logging

log = logging.getLogger(__name__)
router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        result = await process_message(
            user_message=request.message,
            session_id=request.session_id,
            user_id=request.user_id,
            user_jwt=request.user_jwt,
        )
        return ChatResponse(
            message=result["message"],
            session_id=result["session_id"],
            state=ConversationState(result["state"]),
            quick_replies=result.get("quick_replies", []),
            booking_confirmation=result.get("booking_confirmation"),
            booking=result.get("booking"),
        )
    except Exception as e:
        log.error(f"Chat endpoint error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Test endpoints (keep for debugging) ───────────────────────────────────────

@router.get("/test/session")
async def test_session():
    session = await create_session(user_id=None)
    session_id = session["session_id"]
    loaded = await get_session(session_id)
    if loaded is None:
        raise HTTPException(status_code=500, detail="Redis read failed")
    return {"status": "ok", "session_id": session_id, "session_loaded": loaded["state"] == "GATHERING"}

@router.get("/test/geocode")
async def test_geocode(q: str = "Fullerton CA"):
    result = await geocode_location(q)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Location not found: {q}")
    return {"status": "ok", "query": q, "result": result}

@router.get("/test/providers")
async def test_providers(service: str = "plumbing", lat: float = 33.8826, lng: float = -117.8851):
    category_id = resolve_category_id(service)
    if category_id is None:
        raise HTTPException(status_code=400, detail=f"Unknown service type: {service}")
    services = await search_nearby_services(category_id=category_id, user_lat=lat, user_lng=lng)
    return {"status": "ok", "services_found": len(services), "services": services[:3]}

@router.get("/test/availability/{provider_id}")
async def test_availability(provider_id: int):
    slots = await get_provider_availability(provider_id=provider_id)
    return {"status": "ok", "provider_id": provider_id, "slots_found": len(slots), "next_3_slots": slots[:3]}