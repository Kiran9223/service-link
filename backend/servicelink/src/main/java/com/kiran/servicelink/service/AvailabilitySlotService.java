package com.kiran.servicelink.service;

import com.kiran.servicelink.dto.request.CreateAvailabilitySlotRequestDTO;
import com.kiran.servicelink.dto.response.AvailabilitySlotResponseDTO;
import com.kiran.servicelink.entity.AvailabilitySlot;
import com.kiran.servicelink.entity.ServiceProvider;
import com.kiran.servicelink.exception.ForbiddenException;
import com.kiran.servicelink.exception.ResourceNotFoundException;
//import com.kiran.servicelink.exception.ValidationException;
import com.kiran.servicelink.repository.AvailabilitySlotRepository;
import com.kiran.servicelink.repository.ServiceProviderRepository;
import jakarta.validation.ValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for managing provider availability slots
 * Enforces 10-day rolling window and prevents overlapping slots
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AvailabilitySlotService {

    private final AvailabilitySlotRepository availabilitySlotRepository;
    private final ServiceProviderRepository serviceProviderRepository;

    private static final int MAX_DAYS_AHEAD = 10;

    // ========== Provider Operations (Authenticated) ==========

    /**
     * Create a new availability slot
     * Validates: 10-day window, time range, no overlaps
     */
    @Transactional
    public AvailabilitySlotResponseDTO createSlot(
            CreateAvailabilitySlotRequestDTO request,
            Integer authenticatedUserId) {

        log.info("Creating availability slot for provider: {}", authenticatedUserId);

        // 1. Verify user is a provider
        ServiceProvider provider = getProviderOrThrow(authenticatedUserId);

        // 2. Validate date is within 10-day window
        validateDateWithinWindow(request.getSlotDate());

        // 3. Validate time range (end > start)
        validateTimeRange(request.getStartTime(), request.getEndTime());

        // 4. Check for overlapping slots
        List<AvailabilitySlot> overlapping = availabilitySlotRepository.findOverlappingSlots(
                provider,
                request.getSlotDate(),
                request.getStartTime(),
                request.getEndTime()
        );

        if (!overlapping.isEmpty()) {
            throw new ValidationException(
                    String.format("Slot overlaps with existing slot from %s to %s",
                            overlapping.get(0).getStartTime(),
                            overlapping.get(0).getEndTime())
            );
        }

        // 5. Create slot entity
        AvailabilitySlot slot = AvailabilitySlot.builder()
                .provider(provider)
                .slotDate(request.getSlotDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .isAvailable(true)  // Default to available
                .isBooked(false)    // Not booked yet
                .build();

        // 6. Save
        AvailabilitySlot saved = availabilitySlotRepository.save(slot);

        log.info("Availability slot created with id: {}", saved.getId());
        return mapToResponseDTO(saved);
    }

    /**
     * Update existing availability slot
     * Can update date/time if not booked
     * Can always update isAvailable flag
     */
    @Transactional
    public AvailabilitySlotResponseDTO updateSlot(
            Integer slotId,
            CreateAvailabilitySlotRequestDTO request,
            Integer authenticatedUserId) {

        log.info("Updating availability slot: {} by provider: {}", slotId, authenticatedUserId);

        // 1. Get existing slot
        AvailabilitySlot existing = availabilitySlotRepository.findById(slotId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Availability slot not found with id: " + slotId));

        // 2. Verify ownership
        if (!existing.getProvider().getId().equals(authenticatedUserId)) {
            throw new ForbiddenException("You can only update your own availability slots");
        }

        // 3. If slot is booked, only allow toggling isAvailable
        if (existing.getIsBooked()) {
            throw new ValidationException(
                    "Cannot modify date/time of a booked slot. You can only mark it unavailable.");
        }

        // 4. Validate new date is within 10-day window
        validateDateWithinWindow(request.getSlotDate());

        // 5. Validate time range
        validateTimeRange(request.getStartTime(), request.getEndTime());

        // 6. Check for overlaps (excluding this slot)
        List<AvailabilitySlot> overlapping = availabilitySlotRepository.findOverlappingSlotsExcluding(
                existing.getProvider(),
                request.getSlotDate(),
                request.getStartTime(),
                request.getEndTime(),
                slotId
        );

        if (!overlapping.isEmpty()) {
            throw new ValidationException(
                    String.format("Slot overlaps with existing slot from %s to %s",
                            overlapping.get(0).getStartTime(),
                            overlapping.get(0).getEndTime())
            );
        }

        // 7. Update fields
        existing.setSlotDate(request.getSlotDate());
        existing.setStartTime(request.getStartTime());
        existing.setEndTime(request.getEndTime());

        // 8. Save
        AvailabilitySlot updated = availabilitySlotRepository.save(existing);

        log.info("Availability slot updated: {}", slotId);
        return mapToResponseDTO(updated);
    }

    /**
     * Toggle availability status (block/unblock time)
     * Can be done even if slot is booked (to cancel)
     */
    @Transactional
    public AvailabilitySlotResponseDTO toggleAvailability(
            Integer slotId,
            Boolean isAvailable,
            Integer authenticatedUserId) {

        log.info("Toggling availability for slot: {} to {}", slotId, isAvailable);

        AvailabilitySlot slot = availabilitySlotRepository.findById(slotId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Availability slot not found with id: " + slotId));

        // Verify ownership
        if (!slot.getProvider().getId().equals(authenticatedUserId)) {
            throw new ForbiddenException("You can only modify your own availability slots");
        }

        slot.setIsAvailable(isAvailable);
        AvailabilitySlot updated = availabilitySlotRepository.save(slot);

        log.info("Availability toggled for slot: {}", slotId);
        return mapToResponseDTO(updated);
    }

    /**
     * Delete availability slot
     * Can only delete if not booked
     */
    @Transactional
    public void deleteSlot(Integer slotId, Integer authenticatedUserId) {
        log.info("Deleting availability slot: {} by provider: {}", slotId, authenticatedUserId);

        AvailabilitySlot slot = availabilitySlotRepository.findById(slotId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Availability slot not found with id: " + slotId));

        // Verify ownership
        if (!slot.getProvider().getId().equals(authenticatedUserId)) {
            throw new ForbiddenException("You can only delete your own availability slots");
        }

        // Prevent deletion if booked
        if (slot.getIsBooked()) {
            throw new ValidationException(
                    "Cannot delete a booked slot. Mark it as unavailable instead.");
        }

        availabilitySlotRepository.delete(slot);
        log.info("Availability slot deleted: {}", slotId);
    }

    /**
     * Get all slots for authenticated provider
     */
    @Transactional(readOnly = true)
    public List<AvailabilitySlotResponseDTO> getMySlots(Integer authenticatedUserId) {
        log.debug("Fetching availability slots for provider: {}", authenticatedUserId);

        ServiceProvider provider = getProviderOrThrow(authenticatedUserId);

        List<AvailabilitySlot> slots = availabilitySlotRepository
                .findByProviderOrderBySlotDateAscStartTimeAsc(provider);

        return slots.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get provider's slots for specific date
     */
    @Transactional(readOnly = true)
    public List<AvailabilitySlotResponseDTO> getMySlotsForDate(
            LocalDate date,
            Integer authenticatedUserId) {

        log.debug("Fetching availability slots for provider: {} on date: {}",
                authenticatedUserId, date);

        ServiceProvider provider = getProviderOrThrow(authenticatedUserId);

        List<AvailabilitySlot> slots = availabilitySlotRepository
                .findByProviderAndSlotDateOrderByStartTimeAsc(provider, date);

        return slots.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // ========== Public Operations (For Booking) ==========

    /**
     * Get bookable slots for a provider (public)
     * Used by customers to see when provider is available
     */
    @Transactional(readOnly = true)
    public List<AvailabilitySlotResponseDTO> getBookableSlotsForProvider(Integer providerId) {
        log.debug("Fetching bookable slots for provider: {}", providerId);

        ServiceProvider provider = serviceProviderRepository.findById(providerId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Provider not found with id: " + providerId));

        LocalDate today = LocalDate.now();
        List<AvailabilitySlot> slots = availabilitySlotRepository
                .findBookableSlotsForProvider(provider, today);

        return slots.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get bookable slots for provider on specific date (public)
     */
    @Transactional(readOnly = true)
    public List<AvailabilitySlotResponseDTO> getBookableSlotsForProviderOnDate(
            Integer providerId,
            LocalDate date) {

        log.debug("Fetching bookable slots for provider: {} on date: {}", providerId, date);

        ServiceProvider provider = serviceProviderRepository.findById(providerId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Provider not found with id: " + providerId));

        List<AvailabilitySlot> slots = availabilitySlotRepository
                .findBookableSlotsForProviderOnDate(provider, date);

        return slots.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // ========== Validation Methods ==========

    /**
     * Validate date is within 10-day window
     * Must be: today <= date <= today + 10 days
     */
    private void validateDateWithinWindow(LocalDate slotDate) {
        LocalDate today = LocalDate.now();
        LocalDate maxDate = today.plusDays(MAX_DAYS_AHEAD);

        if (slotDate.isBefore(today)) {
            throw new ValidationException("Cannot create slots for past dates");
        }

        if (slotDate.isAfter(maxDate)) {
            throw new ValidationException(
                    String.format("Cannot create slots more than %d days in advance. " +
                            "Maximum date: %s", MAX_DAYS_AHEAD, maxDate)
            );
        }
    }

    /**
     * Validate end time is after start time
     */
    private void validateTimeRange(LocalTime startTime, LocalTime endTime) {
        if (!endTime.isAfter(startTime)) {
            throw new ValidationException("End time must be after start time");
        }

        // Optional: Validate minimum slot duration (e.g., 30 minutes)
        long durationMinutes = java.time.Duration.between(startTime, endTime).toMinutes();
        if (durationMinutes < 15) {
            throw new ValidationException("Slot duration must be at least 15 minutes");
        }
    }

    // ========== Helper Methods ==========

    private ServiceProvider getProviderOrThrow(Integer userId) {
        return serviceProviderRepository.findById(userId)
                .orElseThrow(() -> new ForbiddenException(
                        "User is not registered as a service provider"));
    }

    // ========== Mapping Methods ==========

    private AvailabilitySlotResponseDTO mapToResponseDTO(AvailabilitySlot slot) {
        return AvailabilitySlotResponseDTO.builder()
                .id(slot.getId())
                .provider(mapProviderSummary(slot.getProvider()))
                .slotDate(slot.getSlotDate())
                .startTime(slot.getStartTime())
                .endTime(slot.getEndTime())
                .durationMinutes(slot.getDurationMinutes())
                .isAvailable(slot.getIsAvailable())
                .isBooked(slot.getIsBooked())
                .isBookable(slot.isBookable())
                .bookingId(slot.getBookingId())
                .createdAt(slot.getCreatedAt())
                .build();
    }

    private AvailabilitySlotResponseDTO.ProviderSummary mapProviderSummary(ServiceProvider provider) {
        return AvailabilitySlotResponseDTO.ProviderSummary.builder()
                .id(provider.getId())
                .businessName(provider.getBusinessName())
                .overallRating(provider.getOverallRating())
                .totalBookingsCompleted(provider.getTotalBookingsCompleted())
                .build();
    }
}
