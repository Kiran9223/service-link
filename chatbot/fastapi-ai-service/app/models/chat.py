from pydantic import BaseModel
from typing import Optional
from enum import Enum

class ConversationState(str, Enum):
    GATHERING   = "GATHERING"
    PRESENTING  = "PRESENTING"
    CONFIRMING  = "CONFIRMING"
    BOOKED      = "BOOKED"
    ERROR       = "ERROR"

class QuickReply(BaseModel):
    label: str
    value: str

class BookingConfirmation(BaseModel):
    service_id: int
    provider_id: int
    provider_name: str
    service_name: str
    date: str
    time: str
    price: str
    price_type: str
    slot_id: int
    is_fairness_boost: bool = False

class BookingResult(BaseModel):
    booking_id: int
    provider_name: str
    date: str
    time: str

# ── Request ───────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    user_id: Optional[int] = None
    user_jwt: Optional[str] = None

# ── Response ──────────────────────────────────────────────────────────────────
class ChatResponse(BaseModel):
    message: str
    session_id: str
    state: ConversationState
    quick_replies: list[QuickReply] = []
    booking_confirmation: Optional[dict] = None
    booking: Optional[dict] = None