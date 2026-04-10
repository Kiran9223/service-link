import math
import logging
from datetime import datetime, timezone
from app.config import settings

log = logging.getLogger(__name__)

# ── Scoring weights (must sum to 1.0) ────────────────────────────────────────
WEIGHT_RATING       = 0.40
WEIGHT_REVIEWS      = 0.20
WEIGHT_AVAILABILITY = 0.20
WEIGHT_DISTANCE     = 0.20

# ── Normalization caps ────────────────────────────────────────────────────────
MAX_REVIEW_COUNT    = 100   # reviews above this all score 1.0
MAX_DISTANCE_MILES  = 50    # distance above this scores 0.0


def compute_fairness_boost(service: dict) -> float:
    """
    Determine if a provider deserves a fairness boost.

    Boost criteria (either condition qualifies):
      1. Provider has fewer than MAX_BOOKINGS_FOR_BOOST total completed bookings
      2. Provider joined within the last NEW_PROVIDER_DAYS days

    Returns settings.fairness_boost_value (e.g. 0.15) or 0.0.
    """
    provider = service.get("provider", {})

    total_bookings = provider.get("totalBookingsCompleted", 0) or 0
    if total_bookings < settings.max_bookings_for_boost:
        log.debug(
            f"Fairness boost: provider {provider.get('id')} "
            f"has only {total_bookings} bookings"
        )
        return settings.fairness_boost_value

    # Check provider age via createdAt field
    created_at_str = provider.get("createdAt")
    if created_at_str:
        try:
            created_at = datetime.fromisoformat(
                created_at_str.replace("Z", "+00:00")
            )
            age_days = (datetime.now(timezone.utc) - created_at).days
            if age_days <= settings.new_provider_days:
                log.debug(
                    f"Fairness boost: provider {provider.get('id')} "
                    f"joined {age_days} days ago"
                )
                return settings.fairness_boost_value
        except (ValueError, TypeError):
            pass

    return 0.0


def normalize_rating(rating) -> float:
    """Convert 0-5 star rating to 0.0-1.0 score."""
    if rating is None:
        return 0.3   # neutral score for unrated providers
    return float(rating) / 5.0


def normalize_reviews(review_count) -> float:
    """Convert review count to 0.0-1.0 using log scale."""
    if not review_count:
        return 0.0
    # Log scale prevents providers with 500 reviews from dominating
    return min(math.log1p(review_count) / math.log1p(MAX_REVIEW_COUNT), 1.0)


def normalize_distance(distance_miles) -> float:
    """Convert distance to 0.0-1.0 where closer = higher score."""
    if distance_miles is None:
        return 0.5   # neutral if distance unknown
    clamped = min(float(distance_miles), MAX_DISTANCE_MILES)
    return 1.0 - (clamped / MAX_DISTANCE_MILES)


def normalize_availability(available_slots_count: int) -> float:
    """Convert slot count to 0.0-1.0. More slots = more flexible = higher score."""
    if not available_slots_count:
        return 0.0
    # Diminishing returns — 10 slots is nearly as good as 50
    return min(math.log1p(available_slots_count) / math.log1p(20), 1.0)


def compute_score(service: dict, distance_miles: float) -> dict:
    """
    Compute the composite fairness-aware score for a single service listing.

    Returns the service dict enriched with scoring metadata.
    """
    provider = service.get("provider", {})

    # Raw values
    rating        = provider.get("overallRating")
    review_count  = provider.get("totalBookingsCompleted", 0)
    # slot_count    = service.get("availableSlotCount", 0)

    # Normalized components (each 0.0 - 1.0)
    r_rating      = normalize_rating(rating)
    r_reviews     = normalize_reviews(review_count)
    r_distance    = normalize_distance(distance_miles)
    # r_avail       = normalize_availability(slot_count)

    # Fairness boost
    boost         = compute_fairness_boost(service)
    is_boosted    = boost > 0.0

    # Composite score
    base_score = (
        (r_rating      * WEIGHT_RATING)      +
        (r_reviews     * WEIGHT_REVIEWS)     +
        # (r_avail       * WEIGHT_AVAILABILITY)+
        (r_distance    * WEIGHT_DISTANCE)
    )
    final_score = base_score + boost

    log.debug(
        f"Score for service {service.get('id')}: "
        f"rating={r_rating:.2f} reviews={r_reviews:.2f} "
        # f"avail={r_avail:.2f} dist={r_distance:.2f} "
        f"boost={boost:.2f} → {final_score:.3f}"
    )

    return {
        **service,
        "_score":       round(final_score, 4),
        "_base_score":  round(base_score, 4),
        "_is_boosted":  is_boosted,
        "_distance":    distance_miles,
        "_components": {
            "rating":       round(r_rating, 3),
            "reviews":      round(r_reviews, 3),
            # "availability": round(r_avail, 3),
            "distance":     round(r_distance, 3),
            "boost":        round(boost, 3),
        }
    }


def rank_providers(
    services: list[dict],
    user_lat: float,
    user_lng: float,
    top_n: int = None
) -> list[dict]:
    """
    Main entry point: score and rank all services, return top N.

    Each service is scored independently. Multiple services from the same
    provider are deduplicated — only the highest-scoring service per
    provider is kept (prevents one provider dominating all slots).

    Args:
        services:  Raw service listing dicts from Spring Boot
        user_lat:  User's latitude for distance calculation
        user_lng:  User's longitude for distance calculation
        top_n:     How many results to return (default: settings.top_providers_count)

    Returns:
        Sorted list of scored service dicts, best first
    """
    if top_n is None:
        top_n = settings.top_providers_count

    if not services:
        return []

    # Score every service
    scored = []
    for service in services:
        provider = service.get("provider", {})
        distance = _haversine_miles(
            user_lat, user_lng,
            provider.get("latitude"),
            provider.get("longitude")
        )
        scored.append(compute_score(service, distance))

    # Deduplicate: one service per provider (best score wins)
    best_per_provider: dict[int, dict] = {}
    for s in scored:
        provider_id = s.get("provider", {}).get("id")
        if provider_id not in best_per_provider:
            best_per_provider[provider_id] = s
        elif s["_score"] > best_per_provider[provider_id]["_score"]:
            best_per_provider[provider_id] = s

    # Sort by score descending, take top N
    ranked = sorted(
        best_per_provider.values(),
        key=lambda x: x["_score"],
        reverse=True
    )

    result = ranked[:top_n]

    log.info(
        f"Ranked {len(services)} services → {len(best_per_provider)} unique providers "
        f"→ returning top {len(result)}"
    )

    return result


def _haversine_miles(lat1, lng1, lat2, lng2) -> float:
    """Calculate distance in miles between two lat/lng points."""
    if any(v is None for v in [lat1, lng1, lat2, lng2]):
        return 25.0  # default mid-range if coordinates missing

    R = 3959  # Earth radius in miles
    phi1, phi2 = math.radians(float(lat1)), math.radians(float(lat2))
    dphi = math.radians(float(lat2) - float(lat1))
    dlambda = math.radians(float(lng2) - float(lng1))

    a = math.sin(dphi / 2) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2

    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))