package com.kiran.servicelink.service;

import com.kiran.servicelink.dto.request.BookingCreateRequest;
import com.kiran.servicelink.dto.response.BookingResponseDTO;
import com.kiran.servicelink.entity.*;
import com.kiran.servicelink.enums.BookingStatus;
import com.kiran.servicelink.exception.ForbiddenException;
import com.kiran.servicelink.exception.ResourceNotFoundException;
import com.kiran.servicelink.exception.ValidationException;
import com.kiran.servicelink.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service layer for booking management
 * 
 * CRITICAL PATTERNS:
 * 1. Always use pessimistic locking for slot operations
 * 2. Validate slot availability before booking
 * 3. Create audit trail for every state change
 * 4. Handle bidirectional slot ↔ booking relationship
 * 5. Verify user permissions (customer vs provider)
 * 
 * TRANSACTION BOUNDARIES:
 * - Each public method = one transaction
 * - Slot update + booking creation = atomic
 * - Audit entry creation = same transaction
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BookingService {

    private final BookingRepository bookingRepository;
    private final BookingAuditRepository auditRepository;
    private final AvailabilitySlotRepository slotRepository;
    private final ServiceListingRepository serviceRepository;
    private final ServiceProviderRepository providerRepository;
    private final UserRepository userRepository;
    private final BookingEventProducer eventProducer;

    // ========== CREATE BOOKING ==========

    /**
     * Create a new booking
     * 
     * FLOW:
     * 1. Validate request (times, dates, business rules)
     * 2. Load and lock slot (pessimistic lock)
     * 3. Verify slot is available
     * 4. Load and validate service
     * 5. Calculate price
     * 6. Create booking entity
     * 7. Save booking
     * 8. Mark slot as booked
     * 9. Create audit entry
     * 10. Return DTO
     * 
     * CONCURRENCY:
     * - Uses pessimistic write lock on slot
     * - Two users trying to book same slot:
     *   - User A gets lock, creates booking
     *   - User B waits, then sees slot.isBooked=true, fails validation
     * 
     * @param request Validated booking request
     * @param customer Authenticated customer (from JWT)
     * @return Created booking as DTO
     * @throws ValidationException if business rules violated
     * @throws ResourceNotFoundException if slot/service not found
     */
    @Transactional
    public BookingResponseDTO createBooking(
            BookingCreateRequest request,
            User customer) {

        log.info("Creating booking for customer {} - service: {}, slot: {}",
                customer.getId(), request.getServiceId(), request.getSlotId());

        // 1. Additional business validation
        validateBookingRequest(request);

        // 2. Load and lock slot (CRITICAL: pessimistic lock)
        AvailabilitySlot slot = slotRepository
                .findByIdWithLock(request.getSlotId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Availability slot not found with id: " + request.getSlotId()));

        // 3. Verify slot is bookable
        if (!slot.isBookable()) {
            log.warn("Attempted to book unavailable slot: {}", slot.getId());
            throw new ValidationException(
                    "This time slot is no longer available. Please choose another slot.");
        }

        // 4. Validate slot matches request times
        validateSlotMatchesRequest(slot, request);

        // 5. Load and validate service
        ServiceListing service = serviceRepository
                .findById(request.getServiceId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Service not found with id: " + request.getServiceId()));

        if (!service.getIsActive()) {
            throw new ValidationException("Service is no longer active");
        }

        // 6. Verify service belongs to slot's provider (data integrity)
        if (!service.getProvider().getId().equals(slot.getProvider().getId())) {
            log.error("Service provider mismatch - service: {}, slot: {}",
                    service.getProvider().getId(),
                    slot.getProvider().getId());
            throw new ValidationException("Service does not belong to this provider");
        }

        // 7. Calculate total price
        BigDecimal hours = BigDecimal.valueOf(request.getDurationHours());
        BigDecimal totalPrice = service.getHourlyRate().multiply(hours);

        log.debug("Calculated price: {} hours × ${} = ${}",
                hours, service.getHourlyRate(), totalPrice);

        // 8. Create booking entity
        Booking booking = Booking.builder()
                .customer(customer)
                .provider(slot.getProvider())
                .service(service)
                .slot(slot)
                .scheduledDate(request.getScheduledDate())
                .scheduledStartTime(request.getScheduledStartTime())
                .scheduledEndTime(request.getScheduledEndTime())
                .durationHours(hours)
                .serviceAddress(request.getServiceAddress())
                .serviceCity(request.getServiceCity())
                .serviceState(request.getServiceState())
                .servicePostalCode(request.getServicePostalCode())
                .totalPrice(totalPrice)
                .specialInstructions(request.getSpecialInstructions())
                .status(BookingStatus.PENDING)
                .build();

        // 9. Save booking (creates FK in slot.booking_id)
        booking = bookingRepository.save(booking);
        log.info("Booking created with id: {}", booking.getId());

        // 10. Mark slot as booked (establishes bidirectional link)
        slot.markAsBooked(booking);
        slotRepository.save(slot);
        log.debug("Slot {} marked as booked", slot.getId());

        // 11. Create audit entry
        BookingAudit audit = BookingAudit.forCreation(booking, customer);
        auditRepository.save(audit);

        // 12. Publish Kafka event for notifications
        try {
            eventProducer.publishBookingCreated(booking);
            log.debug("Published BOOKING_CREATED event for booking {}", booking.getId());
        } catch (Exception e) {
            log.error("Failed to publish BOOKING_CREATED event for booking {}", booking.getId(), e);
            // Don't fail the booking - notification is secondary concern
        }
        log.info("Booking {} created successfully - status: PENDING", booking.getId());

        return mapToResponseDTO(booking);
    }

    // ========== CONFIRM BOOKING (Provider Action) ==========

    /**
     * Provider confirms a pending booking
     * 
     * AUTHORIZATION:
     * - Only the provider who owns the booking can confirm
     * 
     * STATE TRANSITION:
     * - PENDING → CONFIRMED
     * 
     * @param bookingId ID of booking to confirm
     * @param provider Authenticated provider (from JWT)
     * @return Updated booking
     * @throws ResourceNotFoundException if booking not found
     * @throws ForbiddenException if provider doesn't own booking
     * @throws ValidationException if status transition invalid
     */
    @Transactional
    public BookingResponseDTO confirmBooking(Long bookingId, User provider) {

        log.info("Provider {} confirming booking {}", provider.getId(), bookingId);

        // Load booking with lock
        Booking booking = bookingRepository
                .findByIdWithLock(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Booking not found with id: " + bookingId));

        // Verify provider owns this booking
        if (!booking.getProvider().getId().equals(provider.getId())) {
            throw new ForbiddenException("You can only confirm your own bookings");
        }

        // Capture old status for audit
        String oldStatus = booking.getStatus().name();

        // Update status (validates transition)
        try {
            booking.updateStatus(BookingStatus.CONFIRMED);
        } catch (IllegalStateException e) {
            throw new ValidationException(e.getMessage());
        }

        booking = bookingRepository.save(booking);
        log.info("Booking {} confirmed by provider {}", bookingId, provider.getId());

        // Create audit entry
        BookingAudit audit = BookingAudit.forStatusChange(
                booking,
                oldStatus,
                booking.getStatus().name(),
                provider
        );
        auditRepository.save(audit);

        // Publish Kafka event for customer notification
        try {
            eventProducer.publishBookingConfirmed(booking);
            log.debug("Published BOOKING_CONFIRMED event for booking {}", bookingId);
        } catch (Exception e) {
            log.error("Failed to publish BOOKING_CONFIRMED event for booking {}", bookingId, e);
            // Don't fail the confirmation - notification is secondary
        }
        return mapToResponseDTO(booking);
    }

    // ========== START SERVICE (Provider Action) ==========

    /**
     * Provider marks service as started (arrives on-site)
     * 
     * STATE TRANSITION:
     * - CONFIRMED → IN_PROGRESS
     * 
     * SIDE EFFECTS:
     * - Sets actualStartTime to now
     * 
     * @param bookingId ID of booking
     * @param provider Authenticated provider
     * @return Updated booking
     */
    @Transactional
    public BookingResponseDTO startService(Long bookingId, User provider) {

        log.info("Provider {} starting service for booking {}", provider.getId(), bookingId);

        Booking booking = bookingRepository
                .findByIdWithLock(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Booking not found with id: " + bookingId));

        // Verify provider owns this booking
        if (!booking.getProvider().getId().equals(provider.getId())) {
            throw new ForbiddenException("You can only start your own bookings");
        }

        // Capture old status
        String oldStatus = booking.getStatus().name();

        // Update status and set actual start time
        try {
            booking.updateStatus(BookingStatus.IN_PROGRESS);
            booking.setActualStartTime(LocalDateTime.now());
        } catch (IllegalStateException e) {
            throw new ValidationException(e.getMessage());
        }

        booking = bookingRepository.save(booking);
        log.info("Service started for booking {} at {}", bookingId, booking.getActualStartTime());

        // Create audit entry
        BookingAudit audit = BookingAudit.forStatusChange(
                booking,
                oldStatus,
                booking.getStatus().name(),
                provider
        );
        auditRepository.save(audit);

        // Publish Kafka event for customer notification
        try {
            eventProducer.publishBookingStarted(booking);
            log.debug("Published BOOKING_STARTED event for booking {}", bookingId);
        } catch (Exception e) {
            log.error("Failed to publish BOOKING_STARTED event for booking {}", bookingId, e);
            // Don't fail the service start - notification is secondary
        }

        return mapToResponseDTO(booking);
    }

    // ========== COMPLETE SERVICE (Provider Action) ==========

    /**
     * Provider marks service as completed
     * 
     * STATE TRANSITION:
     * - IN_PROGRESS → COMPLETED
     * 
     * SIDE EFFECTS:
     * - Sets actualEndTime to now
     * - Calculates actualDurationHours
     * 
     * @param bookingId ID of booking
     * @param provider Authenticated provider
     * @return Updated booking
     */
    @Transactional
    public BookingResponseDTO completeService(Long bookingId, User provider) {

        log.info("Provider {} completing service for booking {}", provider.getId(), bookingId);

        Booking booking = bookingRepository
                .findByIdWithLock(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Booking not found with id: " + bookingId));

        // Verify provider owns this booking
        if (!booking.getProvider().getId().equals(provider.getId())) {
            throw new ForbiddenException("You can only complete your own bookings");
        }

        // Verify actualStartTime was set
        if (booking.getActualStartTime() == null) {
            throw new ValidationException(
                    "Cannot complete service - service was never started. " +
                    "Please mark service as started first.");
        }

        // Capture old status
        String oldStatus = booking.getStatus().name();

        // Update status and set actual end time
        try {
            booking.updateStatus(BookingStatus.COMPLETED);
            booking.setActualEndTime(LocalDateTime.now());
        } catch (IllegalStateException e) {
            throw new ValidationException(e.getMessage());
        }

        booking = bookingRepository.save(booking);
        log.info("Service completed for booking {} at {} - actual duration: {} hours",
                bookingId,
                booking.getActualEndTime(),
                booking.getActualDurationHours());

        // Create audit entry
        BookingAudit audit = BookingAudit.forStatusChange(
                booking,
                oldStatus,
                booking.getStatus().name(),
                provider
        );
        auditRepository.save(audit);

        // Publish Kafka event for both parties + trigger review request
        try {
            eventProducer.publishBookingCompleted(booking);
            log.debug("Published BOOKING_COMPLETED event for booking {}", bookingId);
        } catch (Exception e) {
            log.error("Failed to publish BOOKING_COMPLETED event for booking {}", bookingId, e);
            // Don't fail the completion - notification is secondary
        }

        return mapToResponseDTO(booking);
    }

    // ========== CANCEL BOOKING ==========

    /**
     * Cancel a booking
     * 
     * AUTHORIZATION:
     * - Customer can cancel their own bookings
     * - Provider can cancel bookings for their services
     * - Admin can cancel any booking
     * 
     * SIDE EFFECTS:
     * - Releases slot (marks as available again)
     * 
     * @param bookingId ID of booking to cancel
     * @param user User requesting cancellation
     * @param reason Cancellation reason
     * @return Updated booking
     */
    @Transactional
    public BookingResponseDTO cancelBooking(
            Long bookingId,
            User user,
            String reason) {

        log.info("User {} cancelling booking {} - reason: {}", user.getId(), bookingId, reason);

        // Load booking with relationships
        Booking booking = bookingRepository
                .findByIdWithRelationships(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Booking not found with id: " + bookingId));

        // Verify user can cancel this booking
        boolean isCustomer = booking.getCustomer().getId().equals(user.getId());
        boolean isProvider = booking.getProvider().getId().equals(user.getId());
        boolean isAdmin = user.getRole().equals("admin");

        if (!isCustomer && !isProvider && !isAdmin) {
            throw new ForbiddenException("You cannot cancel this booking");
        }

        // Verify booking is cancellable
        if (!booking.getStatus().isCancellable()) {
            throw new ValidationException(
                    "Booking cannot be cancelled - current status: " + booking.getStatus());
        }

        // Determine who cancelled
        String cancelledBy = isCustomer ? "customer" :
                            isProvider ? "provider" : "admin";

        // Cancel booking
        booking.cancel(cancelledBy, reason);
        booking = bookingRepository.save(booking);

        // Release slot if it exists
        if (booking.getSlot() != null) {
            AvailabilitySlot slot = booking.getSlot();
            slot.release();
            slotRepository.save(slot);
            log.info("Slot {} released after cancellation", slot.getId());
        }

        log.info("Booking {} cancelled by {} - reason: {}", bookingId, cancelledBy, reason);

        // Create audit entry
        BookingAudit audit = BookingAudit.forCancellation(booking, user, reason);
        auditRepository.save(audit);

        // Publish Kafka event for notification to other party
        try {
            // Determine who cancelled (CUSTOMER or PROVIDER)
            String cancelledByRole;
            if (booking.getCustomer().getId().equals(user.getId())) {
                cancelledByRole = "CUSTOMER";
            } else if (booking.getProvider().getId().equals(user.getId())) {
                cancelledByRole = "PROVIDER";
            } else {
                cancelledByRole = "ADMIN"; // Fallback
            }

            eventProducer.publishBookingCancelled(booking, cancelledByRole, reason);
            log.debug("Published BOOKING_CANCELLED event for booking {}", bookingId);
        } catch (Exception e) {
            log.error("Failed to publish BOOKING_CANCELLED event for booking {}", bookingId, e);
            // Don't fail the cancellation - notification is secondary
        }
        return mapToResponseDTO(booking);
    }

    // ========== QUERY METHODS ==========

    /**
     * Get booking by ID
     * 
     * AUTHORIZATION:
     * - Customer can view their bookings
     * - Provider can view their bookings
     * - Admin can view all
     */
    @Transactional(readOnly = true)
    public BookingResponseDTO getBookingById(Long bookingId, User user) {

        Booking booking = bookingRepository
                .findByIdWithRelationships(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Booking not found with id: " + bookingId));

        // Verify access
        boolean isCustomer = booking.getCustomer().getId().equals(user.getId());
        boolean isProvider = booking.getProvider().getId().equals(user.getId());
        boolean isAdmin = user.getRole().equals("admin");

        if (!isCustomer && !isProvider && !isAdmin) {
            throw new ForbiddenException("Access denied");
        }

        return mapToResponseDTO(booking);
    }

    /**
     * Get all bookings for a customer
     */
    @Transactional(readOnly = true)
    public List<BookingResponseDTO> getCustomerBookings(User customer) {

        log.debug("Fetching bookings for customer {}", customer.getId());

        List<Booking> bookings = bookingRepository
                .findByCustomerOrderByScheduledDateDesc(customer);

        return bookings.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get upcoming bookings for a customer
     */
    @Transactional(readOnly = true)
    public List<BookingResponseDTO> getCustomerUpcomingBookings(User customer) {

        LocalDate today = LocalDate.now();
        List<Booking> bookings = bookingRepository
                .findUpcomingBookingsForCustomer(customer, today);

        return bookings.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get past bookings for a customer
     */
    @Transactional(readOnly = true)
    public List<BookingResponseDTO> getCustomerPastBookings(User customer) {

        List<Booking> bookings = bookingRepository
                .findPastBookingsForCustomer(customer);

        return bookings.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get all bookings for a provider
     */
    @Transactional(readOnly = true)
    public List<BookingResponseDTO> getProviderBookings(ServiceProvider provider) {

        log.debug("Fetching bookings for provider {}", provider.getId());

        List<Booking> bookings = bookingRepository
                .findByProviderOrderByScheduledDateDesc(provider);

        return bookings.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get pending bookings for provider (need confirmation)
     */
    @Transactional(readOnly = true)
    public List<BookingResponseDTO> getProviderPendingBookings(ServiceProvider provider) {

        List<Booking> bookings = bookingRepository
                .findPendingBookingsForProvider(provider);

        return bookings.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get upcoming confirmed bookings for provider
     */
    @Transactional(readOnly = true)
    public List<BookingResponseDTO> getProviderUpcomingBookings(ServiceProvider provider) {

        LocalDate today = LocalDate.now();
        List<Booking> bookings = bookingRepository
                .findUpcomingBookingsForProvider(provider, today);

        return bookings.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get provider's bookings for a specific date (daily schedule)
     */
    @Transactional(readOnly = true)
    public List<BookingResponseDTO> getProviderBookingsForDate(
            ServiceProvider provider,
            LocalDate date) {

        List<Booking> bookings = bookingRepository
                .findProviderBookingsForDate(provider, date);

        return bookings.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // ========== VALIDATION HELPERS ==========

    /**
     * Validate booking request business rules
     */
    private void validateBookingRequest(BookingCreateRequest request) {

        // Validate time range
        if (!request.hasValidTimeRange()) {
            throw new ValidationException("End time must be after start time");
        }

        // Validate date is within bookable range (10 days)
        if (!request.isWithinBookableRange()) {
            throw new ValidationException(
                    "Booking date must be within the next 10 days");
        }

        // Validate duration is reasonable (e.g., max 8 hours per booking)
        double hours = request.getDurationHours();
        if (hours < 0.5) {
            throw new ValidationException("Booking duration must be at least 30 minutes");
        }
        if (hours > 8.0) {
            throw new ValidationException("Booking duration cannot exceed 8 hours");
        }
    }

    /**
     * Validate slot matches request times
     */
    private void validateSlotMatchesRequest(
            AvailabilitySlot slot,
            BookingCreateRequest request) {

        boolean dateMatches = slot.getSlotDate().equals(request.getScheduledDate());
        boolean startMatches = slot.getStartTime().equals(request.getScheduledStartTime());
        boolean endMatches = slot.getEndTime().equals(request.getScheduledEndTime());

        if (!dateMatches || !startMatches || !endMatches) {
            log.warn("Slot mismatch - Slot: {}/{}/{} vs Request: {}/{}/{}",
                    slot.getSlotDate(), slot.getStartTime(), slot.getEndTime(),
                    request.getScheduledDate(), request.getScheduledStartTime(),
                    request.getScheduledEndTime());

            throw new ValidationException(
                    "Selected time slot does not match the requested time. " +
                    "Please refresh and select the slot again.");
        }
    }

    // ========== DTO MAPPING ==========

    /**
     * Map Booking entity to BookingResponseDTO
     * 
     * Handles:
     * - Nested summary objects
     * - Calculated fields
     * - Null-safe operations
     */
    private BookingResponseDTO mapToResponseDTO(Booking booking) {

        // Build customer summary
        User customer = booking.getCustomer();
        BookingResponseDTO.CustomerSummary customerSummary =
                BookingResponseDTO.CustomerSummary.builder()
                        .id(customer.getId())
                        .name(customer.getName())
                        .email(customer.getEmail())
                        .phone(customer.getPhone())
                        .city(customer.getCity())
                        .state(customer.getState())
                        .build();

        // Build provider summary
        ServiceProvider provider = booking.getProvider();
        User providerUser = provider.getUser();
        BookingResponseDTO.ProviderSummary providerSummary =
                BookingResponseDTO.ProviderSummary.builder()
                        .id(provider.getId())
                        .businessName(provider.getBusinessName())
                        .ownerName(providerUser.getName())
                        .phone(providerUser.getPhone())
                        .email(providerUser.getEmail())
                        .overallRating(provider.getOverallRating())
                        .totalBookingsCompleted(provider.getTotalBookingsCompleted())
                        .profilePhotoUrl(provider.getProfilePhotoUrl())
                        .yearsOfExperience(provider.getYearsOfExperience())
                        .isCertified(provider.getIsCertified())
                        .isInsured(provider.getIsInsured())
                        .build();

        // Build service summary
        ServiceListing service = booking.getService();
        BookingResponseDTO.ServiceSummary serviceSummary =
                BookingResponseDTO.ServiceSummary.builder()
                        .id(service.getId())
                        .serviceName(service.getServiceName())
                        .description(service.getDescription())
                        .categoryName(service.getCategory().getName())
                        .hourlyRate(service.getHourlyRate())
                        .estimatedDurationHours(service.getEstimatedDurationHours())
                        .build();

        // Build slot summary (if slot exists)
        BookingResponseDTO.SlotSummary slotSummary = null;
        if (booking.getSlot() != null) {
            AvailabilitySlot slot = booking.getSlot();
            slotSummary = BookingResponseDTO.SlotSummary.builder()
                    .id(slot.getId())
                    .slotDate(slot.getSlotDate())
                    .startTime(slot.getStartTime())
                    .endTime(slot.getEndTime())
                    .isAvailable(slot.getIsAvailable())
                    .isBooked(slot.getIsBooked())
                    .build();
        }

        // Calculate actual duration if both times exist
        BigDecimal actualDuration = BookingResponseDTO.calculateActualDuration(
                booking.getActualStartTime(),
                booking.getActualEndTime()
        );

        // Format full address
        String fullAddress = BookingResponseDTO.formatFullAddress(
                booking.getServiceAddress(),
                booking.getServiceCity(),
                booking.getServiceState(),
                booking.getServicePostalCode()
        );

        // Calculate time-based flags
        LocalDate scheduledDate = booking.getScheduledDate();
        LocalDate today = LocalDate.now();
        boolean isPast = scheduledDate.isBefore(today);
        boolean isToday = scheduledDate.isEqual(today);
        boolean isFuture = scheduledDate.isAfter(today);
        long daysUntil = BookingResponseDTO.calculateDaysUntil(scheduledDate);

        // Build main DTO
        return BookingResponseDTO.builder()
                .id(booking.getId())
                .status(booking.getStatus())
                .customer(customerSummary)
                .provider(providerSummary)
                .service(serviceSummary)
                .slot(slotSummary)
                .scheduledDate(booking.getScheduledDate())
                .scheduledStartTime(booking.getScheduledStartTime())
                .scheduledEndTime(booking.getScheduledEndTime())
                .durationHours(booking.getDurationHours())
                .actualStartTime(booking.getActualStartTime())
                .actualEndTime(booking.getActualEndTime())
                .actualDurationHours(actualDuration)
                .serviceAddress(booking.getServiceAddress())
                .serviceCity(booking.getServiceCity())
                .serviceState(booking.getServiceState())
                .servicePostalCode(booking.getServicePostalCode())
                .fullServiceAddress(fullAddress)
                .serviceLatitude(booking.getServiceLatitude())
                .serviceLongitude(booking.getServiceLongitude())
                .totalPrice(booking.getTotalPrice())
                .specialInstructions(booking.getSpecialInstructions())
                .cancellationReason(booking.getCancellationReason())
                .cancelledBy(booking.getCancelledBy())
                .requestedAt(booking.getRequestedAt())
                .confirmedAt(booking.getConfirmedAt())
                .completedAt(booking.getCompletedAt())
                .cancelledAt(booking.getCancelledAt())
                // Calculated fields
                .canCancel(booking.getStatus().isCancellable())
                .awaitingProviderAction(booking.getStatus().isAwaitingProviderAction())
                .isActive(booking.getStatus().isActive())
                .isPast(isPast)
                .isToday(isToday)
                .isFuture(isFuture)
                .daysUntilBooking(daysUntil)
                .hasReview(false)  // TODO: Query ratings table
                .build();
    }
}