import httpx
import logging
from typing import Optional
from app.config import settings

log = logging.getLogger(__name__)

# ── Category name → ID mapping ────────────────────────────────────────────────
# Matches your seed data categories exactly.
# Used to convert LLM-extracted service type to a category ID for the API call.
CATEGORY_MAP = {
    "plumbing": 1,
    "plumber": 1,
    "electrical": 2,
    "electrician": 2,
    "electric": 2,
    "hvac": 3,
    "heating": 3,
    "cooling": 3,
    "air conditioning": 3,
    "ac": 3,
    "cleaning": 4,
    "house cleaning": 4,
    "home cleaning": 4,
    "lawn care": 5,
    "lawn": 5,
    "landscaping": 5,
    "handyman": 6,
    "general repair": 6,
    "painting": 7,
    "painter": 7,
    "carpentry": 8,
    "carpenter": 8,
    "roofing": 9,
    "roof": 9,
    "locksmith": 10,
    "locksmithing": 10,
}

def resolve_category_id(service_type: str) -> Optional[int]:
    """
    Convert a natural language service type to a category ID.
    Case-insensitive, partial match supported.
    
    Examples:
        "plumbing"    → 1
        "Electrician" → 2
        "AC repair"   → 3  (matches "ac")
    """
    normalized = service_type.lower().strip()

    # Exact match first
    if normalized in CATEGORY_MAP:
        return CATEGORY_MAP[normalized]

    # Partial match — check if any key is contained in the input
    for key, category_id in CATEGORY_MAP.items():
        if key in normalized:
            return category_id

    return None


async def search_nearby_services(
    category_id: int,
    user_lat: float,
    user_lng: float,
    max_price: Optional[float] = None,
) -> list[dict]:
    """
    Call Spring Boot GET /api/services/search/nearby
    Returns list of service listing DTOs.
    """
    params = {
        "categoryId": category_id,
        "userLat": user_lat,
        "userLng": user_lng,
    }
    if max_price is not None:
        params["maxPrice"] = max_price

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(
                f"{settings.spring_boot_url}/api/services/search/nearby",
                params=params
            )
            response.raise_for_status()
            services = response.json()
            log.info(
                f"Spring Boot returned {len(services)} services "
                f"for categoryId={category_id} near ({user_lat}, {user_lng})"
            )
            return services

    except httpx.TimeoutException:
        log.error("Spring Boot /search/nearby timed out")
        return []
    except httpx.HTTPStatusError as e:
        log.error(f"Spring Boot returned {e.response.status_code}: {e.response.text}")
        return []
    except Exception as e:
        log.error(f"Provider search failed: {e}")
        return []


async def get_provider_availability(
    provider_id: int,
    service_id: int,
    date: Optional[str] = None
) -> list[dict]:
    """
    Call Spring Boot GET /api/availability/provider/{providerId}
    Returns list of available time slots.
    
    Date format: "YYYY-MM-DD" (optional — returns next 10 days if omitted)
    """
    params = {}
    if date:
        params["date"] = date

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(
                f"{settings.spring_boot_url}/api/availability/provider/{provider_id}",
                params=params
            )
            response.raise_for_status()
            slots = response.json()
            log.info(
                f"Got {len(slots)} availability slots "
                f"for provider {provider_id}"
            )
            return slots

    except httpx.TimeoutException:
        log.error(f"Spring Boot availability timed out for provider {provider_id}")
        return []
    except Exception as e:
        log.error(f"Availability fetch failed for provider {provider_id}: {e}")
        return []


async def create_booking(
    service_id: int,
    slot_id: int,
    scheduled_date: str,
    scheduled_start_time: str,
    scheduled_end_time: str,
    service_address: str,
    service_city: str,
    user_jwt: Optional[str] = None
) -> Optional[dict]:
    """
    Call Spring Boot POST /api/bookings
    Returns the created booking or None on failure.

    Note: For AI-created bookings we need a JWT.
    If user is not logged in, this will fail — handle gracefully.
    """
    headers = {}
    if user_jwt:
        headers["Authorization"] = f"Bearer {user_jwt}"

    body = {
        "serviceId": service_id,
        "slotId": slot_id,
        "scheduledDate": scheduled_date,
        "scheduledStartTime": scheduled_start_time,
        "scheduledEndTime": scheduled_end_time,
        "serviceAddress": service_address,
        "serviceCity": service_city,
        "serviceState": "CA",
        "servicePostalCode": "00000",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{settings.spring_boot_url}/api/bookings",
                json=body,
                headers=headers
            )
            response.raise_for_status()
            booking = response.json()
            log.info(f"Booking created: ID {booking.get('id')}")
            return booking

    except httpx.HTTPStatusError as e:
        log.error(f"Booking creation failed {e.response.status_code}: {e.response.text}")
        return None
    except Exception as e:
        log.error(f"Booking creation error: {e}")
        return None


async def get_service_coverage_areas(category_name: Optional[str] = None) -> list[str]:
    """
    Get distinct cities where active providers exist.
    Optionally filter by service category name.
    Calls GET /api/services/coverage-areas
    """
    params = {}
    if category_name:
        params["category"] = category_name
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{settings.spring_boot_url}/api/services/coverage-areas",
                params=params
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        log.error(f"Failed to fetch coverage areas: {e}")
        return []
    return []


async def get_user_bookings(user_jwt: str) -> list[dict]:
    """
    Call Spring Boot GET /api/bookings/my-bookings
    Returns list of the authenticated user's bookings, newest first.
    """
    headers = {"Authorization": f"Bearer {user_jwt}"}
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(
                f"{settings.spring_boot_url}/api/bookings/my-bookings",
                headers=headers
            )
            response.raise_for_status()
            bookings = response.json()
            log.info(f"Fetched {len(bookings)} bookings for user")
            return bookings
    except httpx.HTTPStatusError as e:
        log.error(f"Failed to fetch bookings {e.response.status_code}: {e.response.text}")
        return []
    except Exception as e:
        log.error(f"Failed to fetch user bookings: {e}")
        return []
    return []