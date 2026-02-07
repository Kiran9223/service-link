package com.kiran.servicelink.controller;

import com.kiran.servicelink.security.jwt.JwtTokenProvider;
import com.kiran.servicelink.dto.request.CreateAvailabilitySlotRequestDTO;
import com.kiran.servicelink.dto.response.AvailabilitySlotResponseDTO;
import com.kiran.servicelink.service.AvailabilitySlotService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * REST controller for availability slot management
 * Mix of authenticated (provider) and public (customer) endpoints
 */
@RestController
@RequestMapping("/api/availability")
@RequiredArgsConstructor
@Slf4j
public class AvailabilitySlotController {

    private final AvailabilitySlotService availabilitySlotService;
    private final JwtTokenProvider jwtTokenProvider;

    // ========== Provider Operations (Authenticated) ==========

    /**
     * POST /api/availability
     * Create a new availability slot
     * Requires: SERVICE_PROVIDER role
     */
    @PostMapping
    @PreAuthorize("hasRole('SERVICE_PROVIDER')")
    public ResponseEntity<AvailabilitySlotResponseDTO> createSlot(
            @Valid @RequestBody CreateAvailabilitySlotRequestDTO request,
            HttpServletRequest httpRequest) {

        log.info("POST /api/availability - Creating availability slot");

        Integer userId = getAuthenticatedUserId(httpRequest);
        AvailabilitySlotResponseDTO created = availabilitySlotService.createSlot(request, userId);

        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * PUT /api/availability/{id}
     * Update existing availability slot
     * Can only update own slots
     * Cannot update if already booked
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SERVICE_PROVIDER')")
    public ResponseEntity<AvailabilitySlotResponseDTO> updateSlot(
            @PathVariable Integer id,
            @Valid @RequestBody CreateAvailabilitySlotRequestDTO request,
            HttpServletRequest httpRequest) {

        log.info("PUT /api/availability/{} - Updating availability slot", id);

        Integer userId = getAuthenticatedUserId(httpRequest);
        AvailabilitySlotResponseDTO updated = availabilitySlotService.updateSlot(id, request, userId);

        return ResponseEntity.ok(updated);
    }

    /**
     * PATCH /api/availability/{id}/toggle
     * Toggle availability status (block/unblock time)
     * Request body: { "isAvailable": true/false }
     */
    @PatchMapping("/{id}/toggle")
    @PreAuthorize("hasRole('SERVICE_PROVIDER')")
    public ResponseEntity<AvailabilitySlotResponseDTO> toggleAvailability(
            @PathVariable Integer id,
            @RequestBody ToggleAvailabilityRequest request,
            HttpServletRequest httpRequest) {

        log.info("PATCH /api/availability/{}/toggle - Toggling to {}", id, request.isAvailable());

        Integer userId = getAuthenticatedUserId(httpRequest);
        AvailabilitySlotResponseDTO updated = availabilitySlotService
                .toggleAvailability(id, request.isAvailable(), userId);

        return ResponseEntity.ok(updated);
    }

    /**
     * DELETE /api/availability/{id}
     * Delete availability slot
     * Can only delete if not booked
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SERVICE_PROVIDER')")
    public ResponseEntity<Void> deleteSlot(
            @PathVariable Integer id,
            HttpServletRequest httpRequest) {

        log.info("DELETE /api/availability/{} - Deleting availability slot", id);

        Integer userId = getAuthenticatedUserId(httpRequest);
        availabilitySlotService.deleteSlot(id, userId);

        return ResponseEntity.noContent().build();
    }

    /**
     * GET /api/availability/my-slots
     * Get all slots for authenticated provider
     *
     * Optional query param:
     * - date: Filter by specific date (format: yyyy-MM-dd)
     */
    @GetMapping("/my-slots")
    @PreAuthorize("hasRole('SERVICE_PROVIDER')")
    public ResponseEntity<List<AvailabilitySlotResponseDTO>> getMySlots(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date,
            HttpServletRequest httpRequest) {

        Integer userId = getAuthenticatedUserId(httpRequest);

        List<AvailabilitySlotResponseDTO> slots;

        if (date != null) {
            log.info("GET /api/availability/my-slots?date={} - Fetching slots for date", date);
            slots = availabilitySlotService.getMySlotsForDate(date, userId);
        } else {
            log.info("GET /api/availability/my-slots - Fetching all slots");
            slots = availabilitySlotService.getMySlots(userId);
        }

        return ResponseEntity.ok(slots);
    }

    // ========== Public Operations (For Customers) ==========

    /**
     * GET /api/availability/provider/{providerId}
     * Get bookable slots for a provider (public)
     *
     * Optional query param:
     * - date: Filter by specific date (format: yyyy-MM-dd)
     *
     * Returns only bookable slots (isAvailable=true, isBooked=false, future dates)
     */
    @GetMapping("/provider/{providerId}")
    public ResponseEntity<List<AvailabilitySlotResponseDTO>> getProviderAvailability(
            @PathVariable Integer providerId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date) {

        List<AvailabilitySlotResponseDTO> slots;

        if (date != null) {
            log.info("GET /api/availability/provider/{}?date={} - Fetching bookable slots",
                    providerId, date);
            slots = availabilitySlotService.getBookableSlotsForProviderOnDate(providerId, date);
        } else {
            log.info("GET /api/availability/provider/{} - Fetching all bookable slots",
                    providerId);
            slots = availabilitySlotService.getBookableSlotsForProvider(providerId);
        }

        return ResponseEntity.ok(slots);
    }

    // ========== Helper Methods ==========

    /**
     * Extract authenticated user ID from JWT token in request header
     */
    private Integer getAuthenticatedUserId(HttpServletRequest request) {
        String jwt = getJwtFromRequest(request);

        if (jwt == null) {
            throw new RuntimeException("No JWT token found in request");
        }

        Integer userId = jwtTokenProvider.getUserIdFromToken(jwt);

        if (userId == null) {
            throw new RuntimeException("User ID not found in JWT token");
        }

        return userId;
    }

    /**
     * Extract JWT token from Authorization header
     */
    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");

        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }

        return null;
    }

    // ========== Inner Classes ==========

    /**
     * Request body for toggle endpoint
     */
    public record ToggleAvailabilityRequest(Boolean isAvailable) {
        public ToggleAvailabilityRequest {
            if (isAvailable == null) {
                throw new IllegalArgumentException("isAvailable field is required");
            }
        }
    }
}
