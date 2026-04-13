package com.kiran.servicelink.controller;

import com.kiran.servicelink.dto.request.RatingRequestDTO;
import com.kiran.servicelink.dto.response.RatingResponseDTO;
import com.kiran.servicelink.security.jwt.JwtTokenProvider;
import com.kiran.servicelink.service.RatingService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST API for reviews and ratings
 *
 * Base path: /api/ratings
 *
 * ENDPOINTS:
 * - POST   /                           Submit a review (authenticated customer)
 * - GET    /booking/{bookingId}        Get rating for a booking (authenticated)
 * - GET    /provider/{providerId}      Get all ratings for a provider (public)
 */
@RestController
@RequestMapping("/api/ratings")
@RequiredArgsConstructor
@Slf4j
public class RatingController {

    private final RatingService ratingService;
    private final JwtTokenProvider jwtTokenProvider;

    /**
     * Submit a rating for a completed booking
     *
     * POST /api/ratings
     *
     * Authorization: Authenticated customer who owns the booking
     * Returns: 201 Created with the new rating
     */
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<RatingResponseDTO> submitRating(
            @Valid @RequestBody RatingRequestDTO request,
            HttpServletRequest httpRequest) {

        log.info("POST /api/ratings - Submitting rating for booking: {}", request.getBookingId());

        Integer userId = getAuthenticatedUserId(httpRequest);
        RatingResponseDTO response = ratingService.submitRating(request, userId);

        log.info("Rating {} created for booking {}", response.getId(), request.getBookingId());

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get the rating for a specific booking
     *
     * GET /api/ratings/booking/{bookingId}
     *
     * Authorization: Authenticated (customer or provider)
     * Returns: 200 with rating, or 404 if no review submitted
     */
    @GetMapping("/booking/{bookingId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<RatingResponseDTO> getRatingByBooking(
            @PathVariable("bookingId") Long bookingId) {

        log.info("GET /api/ratings/booking/{} - Fetching rating", bookingId);

        return ratingService.getRatingByBookingId(bookingId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get all visible ratings for a provider
     *
     * GET /api/ratings/provider/{providerId}
     *
     * Authorization: Public (no JWT required)
     * Returns: 200 with list of ratings (newest first)
     */
    @GetMapping("/provider/{providerId}")
    public ResponseEntity<List<RatingResponseDTO>> getProviderRatings(
            @PathVariable("providerId") Integer providerId) {

        log.info("GET /api/ratings/provider/{} - Fetching provider ratings", providerId);

        List<RatingResponseDTO> ratings = ratingService.getProviderRatings(providerId);

        return ResponseEntity.ok(ratings);
    }

    // ── JWT helpers (same pattern as BookingController) ───────────────────────

    private Integer getAuthenticatedUserId(HttpServletRequest request) {
        String jwt = getJwtFromRequest(request);
        return jwtTokenProvider.getUserIdFromToken(jwt);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        throw new RuntimeException("JWT token not found in request");
    }
}
