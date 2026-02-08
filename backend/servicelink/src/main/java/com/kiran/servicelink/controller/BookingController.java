package com.kiran.servicelink.controller;

import com.kiran.servicelink.dto.request.BookingCreateRequest;
import com.kiran.servicelink.dto.response.BookingResponseDTO;
import com.kiran.servicelink.entity.ServiceProvider;
import com.kiran.servicelink.entity.User;
import com.kiran.servicelink.exception.ResourceNotFoundException;
import com.kiran.servicelink.repository.ServiceProviderRepository;
import com.kiran.servicelink.repository.UserRepository;
import com.kiran.servicelink.security.jwt.JwtTokenProvider;
import com.kiran.servicelink.service.BookingService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * REST API for booking management
 * 
 * Base path: /api/bookings
 * 
 * ENDPOINTS:
 * - POST   /                           Create booking (customer)
 * - GET    /{id}                       Get booking by ID
 * - GET    /my-bookings                Get customer's bookings
 * - GET    /my-bookings/upcoming       Get customer's upcoming bookings
 * - GET    /my-bookings/past           Get customer's past bookings
 * - GET    /provider/bookings          Get provider's bookings
 * - GET    /provider/bookings/pending  Get provider's pending bookings
 * - GET    /provider/bookings/upcoming Get provider's upcoming bookings
 * - GET    /provider/bookings/date     Get provider's bookings for specific date
 * - PUT    /{id}/confirm               Confirm booking (provider)
 * - PUT    /{id}/start                 Start service (provider)
 * - PUT    /{id}/complete              Complete service (provider)
 * - PUT    /{id}/cancel                Cancel booking (customer/provider)
 * 
 * AUTHENTICATION:
 * - All endpoints require authentication
 * - JWT token in Authorization header
 * 
 * AUTHORIZATION:
 * - Service layer validates ownership
 * - Controller validates roles
 */
@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
@Slf4j
public class BookingController {

    private final BookingService bookingService;
    private final UserRepository userRepository;
    private final ServiceProviderRepository providerRepository;
    private final JwtTokenProvider jwtTokenProvider;

    // ========== CREATE BOOKING ==========

    /**
     * Create a new booking
     * 
     * POST /api/bookings
     * 
     * Request body: BookingCreateRequest (validated)
     * 
     * Authorization: Any authenticated user (customer or provider)
     * 
     * Returns: 201 Created with booking details
     */
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BookingResponseDTO> createBooking(
            @Valid @RequestBody BookingCreateRequest request,
            HttpServletRequest httpRequest) {

        log.info("POST /api/bookings - Creating booking for service: {}, slot: {}",
                request.getServiceId(), request.getSlotId());

        // Get authenticated user
        Integer userId = getAuthenticatedUserId(httpRequest);
        User customer = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Create booking
        BookingResponseDTO booking = bookingService.createBooking(request, customer);

        log.info("Booking created successfully - ID: {}", booking.getId());

        return ResponseEntity.status(HttpStatus.CREATED).body(booking);
    }

    // ========== GET BOOKING BY ID ==========

    /**
     * Get booking by ID
     * 
     * GET /api/bookings/{id}
     * 
     * Authorization: Customer, provider, or admin
     * Service layer validates access
     * 
     * Returns: 200 OK with booking details
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BookingResponseDTO> getBookingById(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {

        log.info("GET /api/bookings/{} - Fetching booking", id);

        Integer userId = getAuthenticatedUserId(httpRequest);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        BookingResponseDTO booking = bookingService.getBookingById(id, user);

        return ResponseEntity.ok(booking);
    }

    // ========== CUSTOMER ENDPOINTS ==========

    /**
     * Get all bookings for authenticated customer
     * 
     * GET /api/bookings/my-bookings
     * 
     * Returns: List of bookings (newest first)
     */
    @GetMapping("/my-bookings")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<BookingResponseDTO>> getMyBookings(
            HttpServletRequest httpRequest) {

        log.info("GET /api/bookings/my-bookings - Fetching customer bookings");

        Integer userId = getAuthenticatedUserId(httpRequest);
        User customer = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<BookingResponseDTO> bookings = bookingService.getCustomerBookings(customer);

        log.info("Found {} bookings for customer {}", bookings.size(), userId);

        return ResponseEntity.ok(bookings);
    }

    /**
     * Get upcoming bookings for authenticated customer
     * 
     * GET /api/bookings/my-bookings/upcoming
     * 
     * Returns: List of future bookings (PENDING, CONFIRMED, IN_PROGRESS)
     */
    @GetMapping("/my-bookings/upcoming")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<BookingResponseDTO>> getMyUpcomingBookings(
            HttpServletRequest httpRequest) {

        log.info("GET /api/bookings/my-bookings/upcoming");

        Integer userId = getAuthenticatedUserId(httpRequest);
        User customer = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<BookingResponseDTO> bookings = bookingService.getCustomerUpcomingBookings(customer);

        return ResponseEntity.ok(bookings);
    }

    /**
     * Get past bookings for authenticated customer
     * 
     * GET /api/bookings/my-bookings/past
     * 
     * Returns: List of completed/cancelled bookings
     */
    @GetMapping("/my-bookings/past")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<BookingResponseDTO>> getMyPastBookings(
            HttpServletRequest httpRequest) {

        log.info("GET /api/bookings/my-bookings/past");

        Integer userId = getAuthenticatedUserId(httpRequest);
        User customer = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<BookingResponseDTO> bookings = bookingService.getCustomerPastBookings(customer);

        return ResponseEntity.ok(bookings);
    }

    // ========== PROVIDER ENDPOINTS ==========

    /**
     * Get all bookings for authenticated provider
     * 
     * GET /api/bookings/provider/bookings
     * 
     * Authorization: Must be a service provider
     * 
     * Returns: List of provider's bookings (newest first)
     */
    @GetMapping("/provider/bookings")
    @PreAuthorize("hasRole('SERVICE_PROVIDER')")
    public ResponseEntity<List<BookingResponseDTO>> getProviderBookings(
            HttpServletRequest httpRequest) {

        log.info("GET /api/bookings/provider/bookings - Fetching provider bookings");

        Integer userId = getAuthenticatedUserId(httpRequest);
        ServiceProvider provider = providerRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Provider profile not found"));

        List<BookingResponseDTO> bookings = bookingService.getProviderBookings(provider);

        log.info("Found {} bookings for provider {}", bookings.size(), userId);

        return ResponseEntity.ok(bookings);
    }

    /**
     * Get pending bookings for authenticated provider
     * 
     * GET /api/bookings/provider/bookings/pending
     * 
     * Returns: List of bookings awaiting confirmation
     */
    @GetMapping("/provider/bookings/pending")
    @PreAuthorize("hasRole('SERVICE_PROVIDER')")
    public ResponseEntity<List<BookingResponseDTO>> getProviderPendingBookings(
            HttpServletRequest httpRequest) {

        log.info("GET /api/bookings/provider/bookings/pending");

        Integer userId = getAuthenticatedUserId(httpRequest);
        ServiceProvider provider = providerRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Provider profile not found"));

        List<BookingResponseDTO> bookings = bookingService.getProviderPendingBookings(provider);

        log.info("Found {} pending bookings for provider {}", bookings.size(), userId);

        return ResponseEntity.ok(bookings);
    }

    /**
     * Get upcoming confirmed bookings for authenticated provider
     * 
     * GET /api/bookings/provider/bookings/upcoming
     * 
     * Returns: List of future confirmed bookings
     */
    @GetMapping("/provider/bookings/upcoming")
    @PreAuthorize("hasRole('SERVICE_PROVIDER')")
    public ResponseEntity<List<BookingResponseDTO>> getProviderUpcomingBookings(
            HttpServletRequest httpRequest) {

        log.info("GET /api/bookings/provider/bookings/upcoming");

        Integer userId = getAuthenticatedUserId(httpRequest);
        ServiceProvider provider = providerRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Provider profile not found"));

        List<BookingResponseDTO> bookings = bookingService.getProviderUpcomingBookings(provider);

        return ResponseEntity.ok(bookings);
    }

    /**
     * Get provider's bookings for a specific date
     * 
     * GET /api/bookings/provider/bookings/date?date=2025-02-10
     * 
     * Query param: date (ISO format: YYYY-MM-DD)
     * 
     * Returns: List of bookings for that date (sorted by time)
     */
    @GetMapping("/provider/bookings/date")
    @PreAuthorize("hasRole('SERVICE_PROVIDER')")
    public ResponseEntity<List<BookingResponseDTO>> getProviderBookingsForDate(
            @RequestParam LocalDate date,
            HttpServletRequest httpRequest) {

        log.info("GET /api/bookings/provider/bookings/date?date={}", date);

        Integer userId = getAuthenticatedUserId(httpRequest);
        ServiceProvider provider = providerRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Provider profile not found"));

        List<BookingResponseDTO> bookings = bookingService.getProviderBookingsForDate(provider, date);

        return ResponseEntity.ok(bookings);
    }

    // ========== STATE TRANSITION ENDPOINTS ==========

    /**
     * Confirm a pending booking (provider action)
     * 
     * PUT /api/bookings/{id}/confirm
     * 
     * Authorization: Must be the provider who owns the booking
     * 
     * State transition: PENDING → CONFIRMED
     * 
     * Returns: 200 OK with updated booking
     */
    @PutMapping("/{id}/confirm")
    @PreAuthorize("hasRole('SERVICE_PROVIDER')")
    public ResponseEntity<BookingResponseDTO> confirmBooking(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {

        log.info("PUT /api/bookings/{}/confirm - Confirming booking", id);

        Integer userId = getAuthenticatedUserId(httpRequest);
        User provider = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        BookingResponseDTO booking = bookingService.confirmBooking(id, provider);

        log.info("Booking {} confirmed by provider {}", id, userId);

        return ResponseEntity.ok(booking);
    }

    /**
     * Start service (provider action)
     * 
     * PUT /api/bookings/{id}/start
     * 
     * Authorization: Must be the provider who owns the booking
     * 
     * State transition: CONFIRMED → IN_PROGRESS
     * Side effect: Sets actualStartTime
     * 
     * Returns: 200 OK with updated booking
     */
    @PutMapping("/{id}/start")
    @PreAuthorize("hasRole('SERVICE_PROVIDER')")
    public ResponseEntity<BookingResponseDTO> startService(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {

        log.info("PUT /api/bookings/{}/start - Starting service", id);

        Integer userId = getAuthenticatedUserId(httpRequest);
        User provider = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        BookingResponseDTO booking = bookingService.startService(id, provider);

        log.info("Service started for booking {} by provider {}", id, userId);

        return ResponseEntity.ok(booking);
    }

    /**
     * Complete service (provider action)
     * 
     * PUT /api/bookings/{id}/complete
     * 
     * Authorization: Must be the provider who owns the booking
     * 
     * State transition: IN_PROGRESS → COMPLETED
     * Side effect: Sets actualEndTime
     * 
     * Returns: 200 OK with updated booking
     */
    @PutMapping("/{id}/complete")
    @PreAuthorize("hasRole('SERVICE_PROVIDER')")
    public ResponseEntity<BookingResponseDTO> completeService(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {

        log.info("PUT /api/bookings/{}/complete - Completing service", id);

        Integer userId = getAuthenticatedUserId(httpRequest);
        User provider = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        BookingResponseDTO booking = bookingService.completeService(id, provider);

        log.info("Service completed for booking {} by provider {}", id, userId);

        return ResponseEntity.ok(booking);
    }

    /**
     * Cancel a booking
     * 
     * PUT /api/bookings/{id}/cancel
     * 
     * Request body: { "reason": "Cancellation reason" }
     * 
     * Authorization: Customer, provider, or admin
     * Service layer validates access
     * 
     * Side effects:
     * - Releases slot (marks as available)
     * - Creates audit entry
     * 
     * Returns: 200 OK with updated booking
     */
    @PutMapping("/{id}/cancel")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BookingResponseDTO> cancelBooking(
            @PathVariable Long id,
            @RequestBody Map<String, String> requestBody,
            HttpServletRequest httpRequest) {

        String reason = requestBody.get("reason");
        if (reason == null || reason.isBlank()) {
            reason = "No reason provided";
        }

        log.info("PUT /api/bookings/{}/cancel - Cancelling booking. Reason: {}", id, reason);

        Integer userId = getAuthenticatedUserId(httpRequest);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        BookingResponseDTO booking = bookingService.cancelBooking(id, user, reason);

        log.info("Booking {} cancelled by user {}", id, userId);

        return ResponseEntity.ok(booking);
    }

    // ========== JWT HELPER METHODS ==========

    /**
     * Extract authenticated user ID from JWT token
     * 
     * Pattern: Consistent with existing controllers
     * 
     * @param request HTTP request with Authorization header
     * @return User ID from JWT token
     * @throws RuntimeException if token invalid or missing
     */
    private Integer getAuthenticatedUserId(HttpServletRequest request) {
        String jwt = getJwtFromRequest(request);
        return jwtTokenProvider.getUserIdFromToken(jwt);
    }

    /**
     * Extract JWT token from Authorization header
     * 
     * Expected format: "Bearer <token>"
     * 
     * @param request HTTP request
     * @return JWT token string (without "Bearer " prefix)
     */
    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        throw new RuntimeException("JWT token not found in request");
    }
}