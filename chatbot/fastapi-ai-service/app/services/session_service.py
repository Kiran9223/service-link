import json
import uuid
from typing import Optional
import redis.asyncio as aioredis
from app.config import settings

# ── Redis connection pool (shared across requests) ────────────────────────────
redis_client: Optional[aioredis.Redis] = None

async def get_redis() -> aioredis.Redis:
    global redis_client
    if redis_client is None:
        redis_client = aioredis.from_url(
            settings.redis_url,
            decode_responses=True
        )
    return redis_client

# ── Session schema stored in Redis ───────────────────────────────────────────
# Key: session:{session_id}
# TTL: 30 minutes (reset on every interaction)
#
# {
#   "session_id": "abc-123",
#   "user_id": null,
#   "state": "GATHERING",
#   "collected_entities": {
#     "service_type": "plumbing",
#     "service_location_raw": "Fullerton CA",
#     "service_location_lat": 33.8826,
#     "service_location_lng": -117.8851,
#     "service_location_display": "Fullerton, CA",
#     "date": null,
#     "time_preference": null,
#     "budget_max": null
#   },
#   "conversation_history": [
#     {"role": "user", "content": "I need a plumber"},
#     {"role": "assistant", "content": "Where do you need the work done?"}
#   ],
#   "last_providers_shown": [],
#   "selected_provider_id": null,
#   "selected_slot_id": null
# }

def _session_key(session_id: str) -> str:
    return f"session:{session_id}"

async def create_session(user_id: Optional[int] = None) -> dict:
    """Create a new session and persist it to Redis."""
    session_id = str(uuid.uuid4())
    session = {
        "session_id": session_id,
        "user_id": user_id,
        "state": "GATHERING",
        "collected_entities": {
            "service_type": None,
            "service_location_raw": None,
            "service_location_lat": None,
            "service_location_lng": None,
            "service_location_display": None,
            "date": None,
            "time_preference": None,
            "budget_max": None
        },
        "conversation_history": [],
        "last_providers_shown": [],
        "selected_provider_id": None,
        "selected_slot_id": None
    }
    await save_session(session)
    return session

async def get_session(session_id: str) -> Optional[dict]:
    """Load session from Redis. Returns None if expired or not found."""
    r = await get_redis()
    data = await r.get(_session_key(session_id))
    if data is None:
        return None
    return json.loads(data)

async def save_session(session: dict) -> None:
    """Persist session to Redis and reset TTL."""
    r = await get_redis()
    await r.setex(
        _session_key(session["session_id"]),
        settings.session_ttl_seconds,
        json.dumps(session)
    )

async def update_entities(session: dict, new_entities: dict) -> dict:
    """Merge new extracted entities into the session and save."""
    for key, value in new_entities.items():
        if value is not None:  # never overwrite with None
            session["collected_entities"][key] = value
    await save_session(session)
    return session

async def append_message(session: dict, role: str, content: str) -> dict:
    """Add a message to conversation history and save."""
    session["conversation_history"].append({
        "role": role,
        "content": content
    })
    # Keep last 20 messages to avoid context bloat
    if len(session["conversation_history"]) > 20:
        session["conversation_history"] = session["conversation_history"][-20:]
    await save_session(session)
    return session

async def delete_session(session_id: str) -> None:
    """Explicitly delete a session (e.g., after booking complete)."""
    r = await get_redis()
    await r.delete(_session_key(session_id))