import json
import logging
from typing import Optional
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from app.config import settings
from app.services.session_service import (
    get_session, create_session, save_session, append_message, update_entities
)
from app.services.geocoding_service import geocode_location
from app.services.provider_service import (
    resolve_category_id, search_nearby_services, get_provider_availability,
    get_user_bookings, get_service_coverage_areas
)
from app.services.ranking_service import rank_providers

log = logging.getLogger(__name__)

# ── LLM instance (shared, stateless) ─────────────────────────────────────────
llm = ChatGroq(
    api_key=settings.groq_api_key,
    model=settings.llm_model,
    temperature=settings.llm_temperature,
    max_tokens=settings.llm_max_tokens,
)

# ── System prompt ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are ServiceLink's booking assistant. You help users book home services 
(plumbing, electrical, HVAC, cleaning, lawn care, handyman, painting, carpentry, roofing, locksmith).

Your job is to extract booking intent from the user's message and return structured JSON.

ALWAYS respond with ONLY valid JSON — no prose, no markdown, no explanation.

Response format:
{
  "intent": "BOOK_SERVICE" | "SELECT_PROVIDER" | "CONFIRM_BOOKING" | "CANCEL" | "LOOKUP_BOOKING" | "CHITCHAT" | "OUT_OF_SCOPE",
  "entities": {
    "service_type": string | null,
    "service_location_raw": string | null,
    "date": "YYYY-MM-DD" | null,
    "time_preference": "HH:MM" | null,
    "budget_max": number | null
  },
  "provider_selection": number | null,
  "confirmation": "yes" | "no" | null,
  "reply": string
}

Rules:
- Extract service_type as a single lowercase noun: "plumbing", "electrical", "cleaning", etc.
  Even if the user mentions a service in past tense ("it was about a broken pipe",
  "twas about broken pipe", "I had a plumbing issue"), still extract service_type
  and set intent to BOOK_SERVICE — assume they want to book again unless they say otherwise.
  "twas about broken pipe" → service_type: "plumbing", intent: "BOOK_SERVICE"
- LOOKUP_BOOKING intent: use when the user asks about a previous, existing, or past booking.
  Examples: "do you remember my booking?", "what was my last booking?", "show my bookings",
  "what did I book?", "did my booking go through?"
- Extract service_location_raw exactly as the user stated it
- For dates, convert relative terms to actual YYYY-MM-DD. Today is {TODAY}.
  "today" → today's date, "tomorrow" → tomorrow's date,
  "this Saturday" / "this weekend" → the coming Saturday's date,
  "next week" → the Monday of next week.
  "anytime this week" / "free for the next 2 days" / "sometime soon" → tomorrow's date, time_preference null.
  "asap" / "urgent" / "as soon as possible" / "emergency" → today's date, time_preference "09:00".
  "flexible" / "any day" / "any day this week" → leave date as null.
- For time, use 24h format: "morning" → "09:00", "afternoon" → "13:00", "evening" → "16:00".
  "any time" / "flexible" / "doesn't matter" / "whenever" → time_preference "09:00".
- provider_selection: if user picks a provider by number (1, 2, 3) or by name, set this to their list position (1-indexed)
- confirmation: "yes" if user confirms/agrees, "no" if user declines
- reply: Sound like a helpful human assistant, not a bot.
  Vary your language — never use the same opener twice.
  Reference what the user actually said (e.g. "broken pipe" not just "plumbing").
  If user expresses urgency ("broken pipe", "emergency", "asap"), acknowledge it warmly.
  Never use parenthetical form labels like "(city, zip code, or neighborhood)".
  Keep it warm and brief — 1-2 sentences max.
  When intent is CHITCHAT and user is greeting (hi, hello, hey, hola):
    reply with exactly 1 warm sentence. Vary it each time:
    "Hey! What can I help you with today?",
    "Hi there! Looking for a home service?",
    "Hey, good to hear from you! What do you need help with?"
    Never say "home service needs" (too formal) or "assist" (too robotic).
- If service_location_raw is missing for a BOOK_SERVICE intent, ask for it in the reply
- Never make up provider names or availability
"""


def _build_llm_messages(session: dict, user_message: str) -> list:
    """Build the message list for the LLM call including conversation history."""
    from datetime import date
    today = date.today().isoformat()

    messages = [
        SystemMessage(content=SYSTEM_PROMPT.replace("{TODAY}", today))
    ]

    # Include last 6 messages for context (keep prompt short)
    history = session.get("conversation_history", [])[-6:]
    for msg in history:
        if msg["role"] == "user":
            messages.append(HumanMessage(content=msg["content"]))
        else:
            messages.append(AIMessage(content=msg["content"]))

    messages.append(HumanMessage(content=user_message))
    return messages


def _parse_llm_response(raw: str) -> dict:
    """Parse LLM JSON response, with fallback for malformed output."""
    try:
        # Strip markdown fences if present
        clean = raw.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        return json.loads(clean.strip())
    except Exception as e:
        log.warning(f"Failed to parse LLM response: {e}\nRaw: {raw}")
        return {
            "intent": "CHITCHAT",
            "entities": {},
            "provider_selection": None,
            "confirmation": None,
            "reply": "I didn't quite catch that. Could you tell me what service you need and where?"
        }


def _format_providers_message(ranked: list[dict]) -> tuple[str, list]:
    """
    Format ranked providers into a chat message and quick replies.
    Returns (message_text, quick_replies)
    """
    if not ranked:
        return (
            "I couldn't find any providers in your area for that service. "
            "Try expanding the search radius or a nearby city.",
            []
        )

    if len(ranked) == 1:
        intro = "I found one great option for you:\n"
    else:
        intro = f"Here are {len(ranked)} providers near you:\n"
    lines = [intro]
    quick_replies = []

    for i, service in enumerate(ranked, 1):
        provider = service.get("provider", {})
        name = provider.get("businessName", "Unknown")
        rating = provider.get("overallRating")
        bookings = provider.get("totalBookingsCompleted", 0)
        is_boosted = service.get("_is_boosted", False)
        score = service.get("_score", 0)
        distance = service.get("_distance")

        # Price display
        pricing_type = service.get("pricingType")
        if pricing_type == "FIXED":
            price_str = f"${service.get('fixedPrice', '?')}"
        elif pricing_type == "HOURLY":
            price_str = f"${service.get('hourlyRate', '?')}/hr"
        elif pricing_type == "RANGE":
            price_str = f"${service.get('minPrice', '?')}–${service.get('maxPrice', '?')}"
        else:
            price_str = "Price varies"

        # Rating display
        rating_str = f"{rating}★" if rating else "New"
        new_badge = " 🆕" if is_boosted else ""
        dist_str = f" • {distance:.1f} mi" if distance else ""

        lines.append(
            f"**{i}. {name}**{new_badge}\n"
            f"   {rating_str} • {bookings} jobs{dist_str}\n"
            f"   {service.get('serviceName', '')} — {price_str}\n"
        )

        quick_replies.append({
            "label": f"{i}. {name}",
            "value": str(i)
        })

    lines.append("\nWhich provider would you like? Reply with a number or name.")
    return "\n".join(lines), quick_replies


async def process_message(
    user_message: str,
    session_id: Optional[str],
    user_id: Optional[int],
    user_jwt: Optional[str] = None,
) -> dict:
    """
    Main agent entry point. Processes one message through the full pipeline:
    1. Load/create session
    2. LLM → intent + entities
    3. Merge entities into session
    4. Route by state + intent
    5. Return response dict

    Returns:
        {
          "message": str,
          "session_id": str,
          "state": str,
          "quick_replies": list,
          "booking_confirmation": dict | None,
          "booking": dict | None
        }
    """

    # ── 1. Session management ─────────────────────────────────────────────────
    session = None
    if session_id:
        session = await get_session(session_id)

    if session is None:
        session = await create_session(user_id=user_id)
        log.info(f"New session created: {session['session_id']}")

    # Store JWT so booking creation can authenticate against Spring Boot
    if user_jwt:
        session["user_jwt"] = user_jwt
        await save_session(session)
        session = await get_session(session["session_id"])

    # ── 2. LLM extraction ─────────────────────────────────────────────────────
    messages = _build_llm_messages(session, user_message)
    raw_response = llm.invoke(messages)
    parsed = _parse_llm_response(raw_response.content)

    log.info(f"LLM parsed: intent={parsed.get('intent')} entities={parsed.get('entities')}")

    # ── 3. Merge entities ─────────────────────────────────────────────────────
    new_entities = parsed.get("entities", {})
    if any(v is not None for v in new_entities.values()):
        await update_entities(session, new_entities)
        # Reload session after update
        session = await get_session(session["session_id"])

    # Save user message to history
    await append_message(session, "user", user_message)
    session = await get_session(session["session_id"])

    # ── 4. Route by state + intent ────────────────────────────────────────────
    intent = parsed.get("intent")
    state = session.get("state", "GATHERING")
    entities = session.get("collected_entities", {})

    response = await _route(session, intent, entities, parsed)

    # Save assistant reply to history
    await append_message(session, "assistant", response["message"])

    return response


async def _route(session: dict, intent: str, entities: dict, parsed: dict) -> dict:
    """Route to the appropriate handler based on current state and intent."""

    state = session.get("state", "GATHERING")

    # Handle cancel from any state
    if intent == "CANCEL":
        session["state"] = "GATHERING"
        session["last_providers_shown"] = []
        session["selected_provider_id"] = None
        session["date_preference_set"] = False
        session["time_preference_set"] = False
        await save_session(session)
        return _response(
            "No problem! Let's start over. What service do you need?",
            session, "GATHERING",
            quick_replies=[
                {"label": "🔧 Plumbing", "value": "I need a plumber"},
                {"label": "⚡ Electrical", "value": "I need an electrician"},
                {"label": "🧹 Cleaning", "value": "I need house cleaning"},
            ]
        )

    # Booking lookup — works from any state
    if intent == "LOOKUP_BOOKING":
        # If we already showed the booking this session, don't repeat
        if session.get("showed_booking_lookup"):
            session["showed_booking_lookup"] = False
            await save_session(session)
            return _response(
                "No worries! Is there anything else I can help you with? "
                "I can help you book a new service anytime.",
                session, state
            )

        # First time lookup
        user_jwt = session.get("user_jwt")
        if not user_jwt:
            return _response(
                "I'd need you to be logged in to pull up your bookings. "
                "You can check them on your Bookings page, "
                "or log in and ask me again!",
                session, state
            )

        bookings = await get_user_bookings(user_jwt)
        if not bookings:
            return _response(
                "I don't see any bookings on your account yet. "
                "Want to make one?",
                session, state,
                quick_replies=[
                    {"label": "Book a service", "value": "I need a service"}
                ]
            )

        latest = bookings[0]
        provider_name = latest.get("provider", {}).get("businessName", "a provider")
        date = latest.get("scheduledDate", "")
        status = latest.get("status", "").lower()

        # Set flag so next LOOKUP_BOOKING intent doesn't repeat this
        session["showed_booking_lookup"] = True
        await save_session(session)

        return _response(
            f"Your latest booking is with {provider_name} on {date} "
            f"and it's currently {status}. "
            "You can view full details in your Bookings page. "
            "Want to make a new booking?",
            session, state,
            quick_replies=[
                {"label": "📋 Make new booking", "value": "I need a service"},
                {"label": "👍 That's all, thanks", "value": "bye"},
            ]
        )

    # Out of scope
    if intent == "OUT_OF_SCOPE":
        return _response(
            "I can only help with booking home services. "
            "What service can I help you find today?",
            session, state
        )

    # CHITCHAT — greetings, farewells, small talk from any state
    if intent == "CHITCHAT":
        last_msg = session.get("conversation_history", [{}])[-1].get("content", "").lower()
        farewell_words = ["bye", "thanks", "thank you", "goodbye", "that's all", "no thanks"]
        if any(w in last_msg for w in farewell_words):
            return _response(
                "Anytime! 👋 Come back if you need anything.",
                session, "GATHERING"
            )

        # Location/coverage inquiry — fetch real provider cities dynamically
        location_inquiry_words = [
            "location", "area", "city", "cities", "where",
            "coverage", "available in", "what areas", "which areas"
        ]
        if any(w in last_msg for w in location_inquiry_words):
            service_type = entities.get("service_type")
            cities = await get_service_coverage_areas(service_type)

            if not cities:
                return _response(
                    "I can help you find services anywhere — "
                    "just tell me your location and I'll check!",
                    session, state
                )

            city_list = ", ".join(cities[:8])
            more = f" and {len(cities) - 8} more areas" if len(cities) > 8 else ""
            service_context = f" for {service_type}" if service_type else ""

            return _response(
                f"We currently have providers{service_context} in: "
                f"{city_list}{more}. "
                "Which area do you need service in?",
                session, state,
                quick_replies=[
                    {"label": f"📍 {city}", "value": city}
                    for city in cities[:4]
                ]
            )

        # Greetings and other chitchat — use LLM reply with service quick replies
        return _response(
            parsed.get("reply") or "Hey! What home service can I help you find?",
            session, state,
            quick_replies=[
                {"label": "🔧 Plumbing",    "value": "I need a plumber"},
                {"label": "⚡ Electrical",   "value": "I need an electrician"},
                {"label": "🧹 Cleaning",     "value": "I need house cleaning"},
                {"label": "❄️ HVAC",         "value": "I need HVAC service"},
            ]
        )

    # ── GATHERING state ───────────────────────────────────────────────────────
    if state == "GATHERING":
        return await _handle_gathering(session, entities, parsed)

    # ── PRESENTING state ──────────────────────────────────────────────────────
    if state == "PRESENTING":
        last_msg = session.get("conversation_history", [{}])[-1].get("content", "").strip()

        # Handle "book on {date}" quick reply — re-trigger provider selection with new date
        if last_msg.lower().startswith("book on ") and session.get("pending_provider_selection"):
            new_date = last_msg.split("book on ", 1)[1].strip()
            await update_entities(session, {"date": new_date})
            session = await get_session(session["session_id"])
            entities = session.get("collected_entities", {})
            parsed["provider_selection"] = session["pending_provider_selection"]
            return await _handle_provider_selection(session, parsed)

        # Handle "show providers" quick reply
        if last_msg.lower() == "show providers":
            providers = session.get("last_providers_shown", [])
            if providers:
                msg, qr = _format_providers_message(providers)
                return _response(msg, session, "PRESENTING", quick_replies=qr)

        # Bare digit fallback: if user typed "1"/"2"/"3" but LLM missed provider_selection
        if last_msg.isdigit() and not parsed.get("provider_selection"):
            parsed["provider_selection"] = int(last_msg)
        if intent == "SELECT_PROVIDER" or parsed.get("provider_selection"):
            return await _handle_provider_selection(session, parsed)
        # User sent something else — re-show providers
        providers = session.get("last_providers_shown", [])
        if providers:
            msg, qr = _format_providers_message(providers)
            return _response(msg, session, "PRESENTING", quick_replies=qr)
        # Fallback to gathering
        session["state"] = "GATHERING"
        await save_session(session)
        return await _handle_gathering(session, entities, parsed)

    # ── CONFIRMING state ──────────────────────────────────────────────────────
    if state == "CONFIRMING":
        if parsed.get("confirmation") == "yes":
            return await _handle_booking_creation(session)
        elif parsed.get("confirmation") == "no":
            session["state"] = "PRESENTING"
            await save_session(session)
            providers = session.get("last_providers_shown", [])
            msg, qr = _format_providers_message(providers)
            return _response(
                "No problem! Here are the providers again:\n\n" + msg,
                session, "PRESENTING", quick_replies=qr
            )

    # Default: keep gathering
    return await _handle_gathering(session, entities, parsed)


async def _handle_gathering(session: dict, entities: dict, parsed: dict) -> dict:
    """Check if we have enough entities to search, otherwise ask for missing ones."""

    service_type = entities.get("service_type")
    location_raw = entities.get("service_location_raw")

    # Missing service type
    if not service_type:
        return _response(
            parsed.get("reply") or
            "Hey! What kind of home service are you looking for today?",
            session, "GATHERING",
            quick_replies=[
                {"label": "🔧 Plumbing", "value": "I need a plumber"},
                {"label": "⚡ Electrical", "value": "I need an electrician"},
                {"label": "🧹 Cleaning", "value": "I need house cleaning"},
                {"label": "❄️ HVAC", "value": "I need HVAC service"},
            ]
        )

    # Missing location
    if not location_raw:
        return _response(
            parsed.get("reply") or f"Got it! Where do you need the {service_type} work done?",
            session, "GATHERING"
        )

    # Have both — try to resolve category and geocode
    category_id = resolve_category_id(service_type)
    if category_id is None:
        return _response(
            f"I don't recognize '{service_type}' as a service category. "
            "I can help with: plumbing, electrical, HVAC, cleaning, lawn care, "
            "handyman, painting, carpentry, roofing, or locksmith.",
            session, "GATHERING"
        )

    # Geocode if not already done
    if not entities.get("service_location_lat"):
        geo = await geocode_location(location_raw)
        if geo is None:
            return _response(
                f"I couldn't find '{location_raw}' on the map. "
                "Could you try a city name or zip code?",
                session, "GATHERING"
            )
        await update_entities(session, {
            "service_location_lat": geo["lat"],
            "service_location_lng": geo["lng"],
            "service_location_display": geo["display_name"],
        })
        session = await get_session(session["session_id"])
        entities = session.get("collected_entities", {})

    # Missing date preference — ask once (flag prevents re-asking when user picks "Flexible")
    if not entities.get("date") and not session.get("date_preference_set"):
        session["date_preference_set"] = True
        await save_session(session)
        return _response(
            parsed.get("reply") or f"When works best for you?",
            session, "GATHERING",
            quick_replies=[
                {"label": "Today",        "value": "today"},
                {"label": "Tomorrow",     "value": "tomorrow"},
                {"label": "This Weekend", "value": "this Saturday"},
                {"label": "Flexible",     "value": "any day this week"},
            ]
        )

    # Missing time preference — ask once
    if not entities.get("time_preference") and not session.get("time_preference_set"):
        session["time_preference_set"] = True
        await save_session(session)
        return _response(
            "What time of day works best for you?",
            session, "GATHERING",
            quick_replies=[
                {"label": "🌅 Morning (9am-11am)", "value": "morning"},
                {"label": "☀️ Afternoon (1pm-3pm)", "value": "afternoon"},
                {"label": "🌆 Evening (4pm-6pm)",   "value": "evening"},
            ]
        )

    # Search and rank providers
    lat = entities["service_location_lat"]
    lng = entities["service_location_lng"]
    budget = entities.get("budget_max")

    raw_services = await search_nearby_services(
        category_id=category_id,
        user_lat=lat,
        user_lng=lng,
        max_price=budget
    )

    ranked = rank_providers(raw_services, lat, lng)

    if not ranked:
        location_display = entities.get("service_location_display", location_raw)
        return _response(
            f"Hmm, I'm not finding anyone available near {location_display} "
            f"for {service_type} right now. "
            "Want to try a nearby area or a different service?",
            session, "GATHERING"
        )

    # Save ranked results and transition to PRESENTING
    session["last_providers_shown"] = ranked
    session["state"] = "PRESENTING"
    await save_session(session)

    msg, quick_replies = _format_providers_message(ranked)
    return _response(msg, session, "PRESENTING", quick_replies=quick_replies)


async def _handle_provider_selection(session: dict, parsed: dict) -> dict:
    """User selected a provider — fetch availability and show confirmation card."""

    providers = session.get("last_providers_shown", [])
    selection_idx = parsed.get("provider_selection")

    if not selection_idx or not providers:
        return _response(
            "Please select a provider by number (1, 2, or 3).",
            session, "PRESENTING"
        )

    try:
        selected = providers[int(selection_idx) - 1]
    except (IndexError, ValueError, TypeError):
        return _response(
            f"Please choose a number between 1 and {len(providers)}.",
            session, "PRESENTING"
        )

    provider = selected.get("provider", {})
    provider_id = provider.get("id")
    service_id = selected.get("id")

    # Fetch availability
    entities = session.get("collected_entities", {})
    slots = await get_provider_availability(
        provider_id=provider_id,
        service_id=service_id,
        date=entities.get("date")
    )

    # Filter to available slots only
    available = [s for s in slots if s.get("isAvailable") and not s.get("isBooked")]

    if not available:
        # Try to find next available slot across any date for this provider
        all_slots = await get_provider_availability(
            provider_id=provider_id,
            service_id=service_id,
        )
        available_any = [s for s in all_slots if s.get("isAvailable") and not s.get("isBooked")]

        # Save pending selection so "book on {date}" can re-trigger without re-picking
        session["pending_provider_selection"] = selection_idx
        await save_session(session)

        if available_any:
            next_slot = available_any[0]
            next_date = next_slot.get("slotDate")
            preferred_date = entities.get("date", "that date")
            return _response(
                f"{provider.get('businessName')} is fully booked on "
                f"{preferred_date} but has availability on {next_date}. "
                "Want to book then, or pick a different provider?",
                session, "PRESENTING",
                quick_replies=[
                    {"label": f"📅 Book on {next_date}", "value": f"book on {next_date}"},
                    {"label": "👥 See other providers", "value": "show providers"},
                ]
            )
        else:
            return _response(
                f"Looks like {provider.get('businessName')} is fully booked right now. "
                "Want to pick one of the other providers?",
                session, "PRESENTING"
            )

    # Pick best slot — prefer user's time preference, else first available
    chosen_slot = _pick_best_slot(available, entities.get("time_preference"))

    # Save selection
    session["selected_provider_id"] = provider_id
    session["selected_slot_id"] = chosen_slot.get("id")
    session["selected_slot_date"] = str(chosen_slot.get("slotDate", ""))
    session["selected_slot_start_time"] = str(chosen_slot.get("startTime", ""))
    session["selected_slot_end_time"] = str(chosen_slot.get("endTime", ""))
    session["state"] = "CONFIRMING"
    await save_session(session)

    # Build confirmation payload
    pricing_type = selected.get("pricingType")
    if pricing_type == "FIXED":
        price_str = f"${selected.get('fixedPrice')}"
    elif pricing_type == "HOURLY":
        price_str = f"${selected.get('hourlyRate')}/hr"
    elif pricing_type == "RANGE":
        price_str = f"${selected.get('minPrice')}–${selected.get('maxPrice')}"
    else:
        price_str = "Contact for price"

    booking_confirmation = {
        "serviceId": service_id,
        "providerId": provider_id,
        "providerName": provider.get("businessName"),
        "serviceName": selected.get("serviceName"),
        "date": str(chosen_slot.get("slotDate", "")),
        "time": str(chosen_slot.get("startTime", "")),
        "price": price_str,
        "priceType": pricing_type,
        "slotId": chosen_slot.get("id"),
        "isFairnessBoost": selected.get("_is_boosted", False)
    }

    return _response(
        f"Here's your booking summary for **{provider.get('businessName')}**. "
        "Shall I confirm this booking?",
        session, "CONFIRMING",
        booking_confirmation=booking_confirmation,
        quick_replies=[
            {"label": "✅ Confirm Booking", "value": "yes"},
            {"label": "❌ Cancel", "value": "no"},
        ]
    )


async def _handle_booking_creation(session: dict) -> dict:
    """Final step — create booking via Spring Boot API."""
    from app.services.provider_service import create_booking

    service_id = None
    slot_id = session.get("selected_slot_id")
    providers = session.get("last_providers_shown", [])
    provider_id = session.get("selected_provider_id")

    # Find the selected service
    for s in providers:
        if s.get("provider", {}).get("id") == provider_id:
            service_id = s.get("id")
            break

    if not service_id or not slot_id:
        return _response(
            "Something went wrong with your booking. Please try again.",
            session, "GATHERING"
        )

    entities = session.get("collected_entities", {})
    location_display = entities.get("service_location_display", "") or ""
    service_city = location_display.split(",")[0].strip() if location_display else "Unknown"

    booking = await create_booking(
        service_id=service_id,
        slot_id=slot_id,
        scheduled_date=session.get("selected_slot_date", ""),
        scheduled_start_time=session.get("selected_slot_start_time", ""),
        scheduled_end_time=session.get("selected_slot_end_time", ""),
        service_address=location_display or "Address not provided",
        service_city=service_city or "Unknown",
        user_jwt=session.get("user_jwt")
    )

    if booking is None:
        return _response(
            "I wasn't able to complete the booking — the slot may have just been taken. "
            "Would you like to choose another time or provider?",
            session, "PRESENTING"
        )

    # Reset session state
    session["state"] = "BOOKED"
    await save_session(session)

    provider_name = None
    for s in providers:
        if s.get("provider", {}).get("id") == provider_id:
            provider_name = s.get("provider", {}).get("businessName")
            break

    return _response(
        f"🎉 Booking confirmed! **{provider_name}** is scheduled. "
        f"You can track it in your bookings dashboard.",
        session, "BOOKED",
        booking={
            "bookingId": booking.get("id"),
            "providerName": provider_name,
            "date": str(booking.get("scheduledDate", "")),
            "time": str(booking.get("scheduledStartTime", "")),
        }
    )


def _pick_best_slot(slots: list[dict], time_preference: Optional[str]) -> dict:
    """Pick the slot closest to the user's time preference, or first available."""
    if not time_preference or not slots:
        return slots[0]

    try:
        pref_hour = int(time_preference.split(":")[0])
        best = min(
            slots,
            key=lambda s: abs(
                int(str(s.get("startTime", "09:00")).split(":")[0]) - pref_hour
            )
        )
        return best
    except Exception:
        return slots[0]


def _response(
    message: str,
    session: dict,
    state: str,
    quick_replies: list = None,
    booking_confirmation: dict = None,
    booking: dict = None
) -> dict:
    """Build the standard response dict."""
    return {
        "message": message,
        "session_id": session["session_id"],
        "state": state,
        "quick_replies": quick_replies or [],
        "booking_confirmation": booking_confirmation,
        "booking": booking,
    }