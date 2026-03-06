from fastapi import APIRouter, HTTPException
from app.models.chat import ChatRequest, ChatResponse, ConversationState
from app.services.session_service import create_session, get_session
from app.services.geocoding_service import geocode_location

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    return ChatResponse(
        message="ServiceLink AI is online. Full agent coming soon.",
        session_id=request.session_id or "test-session",
        state=ConversationState.GATHERING,
        quick_replies=[]
    )

# ── Temporary test endpoints — remove before production ──────────────────────

@router.get("/test/session")
async def test_session():
    """Verify Redis session create/read works."""
    session = await create_session(user_id=None)
    session_id = session["session_id"]

    # Read it back
    loaded = await get_session(session_id)
    if loaded is None:
        raise HTTPException(status_code=500, detail="Redis read failed")

    return {
        "status": "ok",
        "session_id": session_id,
        "session_loaded": loaded["state"] == "GATHERING"
    }

@router.get("/test/geocode")
async def test_geocode(q: str = "Fullerton CA"):
    """Verify Nominatim geocoding works."""
    result = await geocode_location(q)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Location not found: {q}")
    return {"status": "ok", "query": q, "result": result}