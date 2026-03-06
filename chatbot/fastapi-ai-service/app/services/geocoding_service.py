import httpx
from typing import Optional
import logging

log = logging.getLogger(__name__)

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

async def geocode_location(query: str) -> Optional[dict]:
    """
    Convert a location string to lat/lng using Nominatim (OpenStreetMap).
    
    Returns:
        { "lat": float, "lng": float, "display_name": str }
        or None if not found
    
    Examples:
        geocode_location("Fullerton CA")     → { lat: 33.87, lng: -117.92, ... }
        geocode_location("92831")            → { lat: 33.88, lng: -117.88, ... }
        geocode_location("Anaheim near Disney") → { lat: 33.81, lng: -117.92, ... }
    """
    # Bias toward Southern California where seed data lives
    # Remove this bias if you want truly global searches
    search_query = f"{query}, California, USA"

    params = {
        "q": search_query,
        "format": "json",
        "limit": 1,
        "addressdetails": 0
    }

    headers = {
        # Nominatim requires a User-Agent identifying your application
        # Required by their usage policy
        "User-Agent": "ServiceLink-AI/1.0 (thesis project)"
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                NOMINATIM_URL,
                params=params,
                headers=headers
            )
            response.raise_for_status()
            results = response.json()

            if not results:
                log.warning(f"Nominatim found no results for: {query}")
                return None

            result = results[0]
            return {
                "lat": float(result["lat"]),
                "lng": float(result["lon"]),
                "display_name": _extract_short_name(result.get("display_name", query))
            }

    except httpx.TimeoutException:
        log.error(f"Nominatim timeout for query: {query}")
        return None
    except Exception as e:
        log.error(f"Geocoding error for '{query}': {e}")
        return None


def _extract_short_name(full_display_name: str) -> str:
    """
    Convert Nominatim's verbose display name to a short readable form.
    
    Input:  "Fullerton, Orange County, California, 92831, United States"
    Output: "Fullerton, CA"
    """
    parts = [p.strip() for p in full_display_name.split(",")]
    if len(parts) >= 3:
        # Take city + state abbreviation
        city = parts[0]
        # Find California in the parts and abbreviate
        for part in parts:
            if "California" in part:
                return f"{city}, CA"
        return f"{parts[0]}, {parts[1]}"
    return parts[0] if parts else full_display_name