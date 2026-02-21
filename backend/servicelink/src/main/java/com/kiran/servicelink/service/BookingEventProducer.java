package com.kiran.servicelink.service;

import com.kiran.servicelink.dto.event.*;
import com.kiran.servicelink.entity.Booking;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

/**
 * Producer service for booking lifecycle events
 *
 * Responsibilities:
 * - Convert Booking entities to BookingEvent DTOs
 * - Publish events to Kafka topic
 * - Handle publishing errors gracefully
 * - Use providerId as partition key for ordering
 *
 * Topic: servicelink.booking.lifecycle
 * Partition Strategy: By providerId (ensures order per provider)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BookingEventProducer {

    private final KafkaTemplate<String, BookingEvent> kafkaTemplate;

    private static final String TOPIC_NAME = "servicelink.booking.lifecycle";

    // ========== PUBLIC API: Event Publishing Methods ==========

    /**
     * Publish BOOKING_CREATED event
     *
     * Triggered when: Customer creates a new booking
     * Notifies: Provider about new booking request
     *
     * @param booking The newly created booking
     */
    public void publishBookingCreated(Booking booking) {
        try {
            log.info("Publishing BOOKING_CREATED event for booking {}", booking.getId());

            LocalDateTime scheduledStart = combineDateTime(booking.getScheduledDate(), booking.getScheduledStartTime());
            LocalDateTime scheduledEnd = combineDateTime(booking.getScheduledDate(), booking.getScheduledEndTime());

            BookingCreatedPayload payload = BookingCreatedPayload.builder()
                    .bookingId(booking.getId())
                    // Customer info
                    .customerId(booking.getCustomer().getId())
                    .customerName(booking.getCustomer().getName())
                    .customerEmail(booking.getCustomer().getEmail())
                    .customerPhone(booking.getCustomer().getPhone())
                    // Provider info
                    .providerId(booking.getProvider().getId())
                    .providerName(booking.getProvider().getBusinessName())
                    .providerEmail(booking.getProvider().getUser().getEmail())
                    .providerPhone(booking.getProvider().getUser().getPhone())
                    // Service info
                    .serviceListingId(booking.getService().getId())
                    .serviceName(booking.getService().getServiceName())
                    .serviceCategory(booking.getService().getCategory().getName())
                    // Schedule
                    .scheduledStartTime(scheduledStart)
                    .scheduledEndTime(scheduledEnd)
                    .durationMinutes(calculateDuration(scheduledStart, scheduledEnd))
                    // Pricing
                    .totalPrice(booking.getTotalPrice())
                    .currency("USD")
                    // Details
                    .specialInstructions(booking.getSpecialInstructions())
                    .serviceAddress(formatAddress(booking))
                    .serviceLatitude(booking.getServiceLatitude())
                    .serviceLongitude(booking.getServiceLongitude())
                    // Timestamps
                    .requestedAt(booking.getRequestedAt())
                    .build();

            BookingEvent event = buildEvent(
                    BookingEvent.BOOKING_CREATED,
                    payload,
                    booking
            );

            publishEvent(event, booking.getProvider().getId());

        } catch (Exception e) {
            log.error("Failed to publish BOOKING_CREATED event for booking {}", booking.getId(), e);
            // Don't throw - we don't want to fail the booking transaction
        }
    }

    /**
     * Publish BOOKING_CONFIRMED event
     *
     * Triggered when: Provider confirms/accepts a booking
     * Notifies: Customer that booking is confirmed
     *
     * @param booking The confirmed booking
     */
    public void publishBookingConfirmed(Booking booking) {
        try {
            log.info("Publishing BOOKING_CONFIRMED event for booking {}", booking.getId());

            LocalDateTime scheduledStart = combineDateTime(booking.getScheduledDate(), booking.getScheduledStartTime());
            LocalDateTime scheduledEnd = combineDateTime(booking.getScheduledDate(), booking.getScheduledEndTime());

            BookingConfirmedPayload payload = BookingConfirmedPayload.builder()
                    .bookingId(booking.getId())
                    // Confirmation details
                    .confirmedAt(booking.getConfirmedAt())
                    .confirmedBy(booking.getProvider().getId())
                    .confirmedByName(booking.getProvider().getBusinessName())
                    // Customer info
                    .customerId(booking.getCustomer().getId())
                    .customerName(booking.getCustomer().getName())
                    .customerEmail(booking.getCustomer().getEmail())
                    .customerPhone(booking.getCustomer().getPhone())
                    // Provider info
                    .providerId(booking.getProvider().getId())
                    .providerName(booking.getProvider().getBusinessName())
                    .providerEmail(booking.getProvider().getUser().getEmail())
                    .providerPhone(booking.getProvider().getUser().getPhone())
                    // Service info
                    .serviceName(booking.getService().getServiceName())
                    .serviceCategory(booking.getService().getCategory().getName())
                    // Schedule
                    .scheduledStartTime(scheduledStart)
                    .scheduledEndTime(scheduledEnd)
                    .estimatedDuration(calculateDuration(scheduledStart, scheduledEnd))
                    // Pricing
                    .totalPrice(booking.getTotalPrice())
                    .currency("USD")
                    // Location
                    .serviceAddress(formatAddress(booking))
                    .serviceLatitude(booking.getServiceLatitude())
                    .serviceLongitude(booking.getServiceLongitude())
                    // Instructions
                    .customerInstructions(booking.getSpecialInstructions())
                    .providerNotes(null) // Can be extended later
                    .build();

            BookingEvent event = buildEvent(
                    BookingEvent.BOOKING_CONFIRMED,
                    payload,
                    booking
            );

            publishEvent(event, booking.getProvider().getId());

        } catch (Exception e) {
            log.error("Failed to publish BOOKING_CONFIRMED event for booking {}", booking.getId(), e);
        }
    }

    /**
     * Publish BOOKING_STARTED event
     *
     * Triggered when: Provider marks service as started
     * Notifies: Customer that service has begun
     *
     * @param booking The booking being started
     */
    public void publishBookingStarted(Booking booking) {
        try {
            log.info("Publishing BOOKING_STARTED event for booking {}", booking.getId());

            LocalDateTime scheduled = combineDateTime(booking.getScheduledDate(), booking.getScheduledStartTime());
            LocalDateTime actual = booking.getActualStartTime();

            // Calculate if on time, early, or late
            long minutesDiff = ChronoUnit.MINUTES.between(scheduled, actual);
            String startStatus;
            Integer delayMinutes = null;

            if (minutesDiff > 10) {
                startStatus = "LATE";
                delayMinutes = (int) minutesDiff;
            } else if (minutesDiff < -10) {
                startStatus = "EARLY";
            } else {
                startStatus = "ON_TIME";
            }

            LocalDateTime scheduledEnd = combineDateTime(booking.getScheduledDate(), booking.getScheduledEndTime());

            BookingStartedPayload payload = BookingStartedPayload.builder()
                    .bookingId(booking.getId())
                    // Start details
                    .actualStartTime(booking.getActualStartTime())
                    .scheduledStartTime(scheduled)
                    .startStatus(startStatus)
                    .delayMinutes(delayMinutes)
                    // Provider info
                    .providerId(booking.getProvider().getId())
                    .providerName(booking.getProvider().getBusinessName())
                    .providerPhone(booking.getProvider().getUser().getPhone())
                    // Customer info
                    .customerId(booking.getCustomer().getId())
                    .customerName(booking.getCustomer().getName())
                    .customerEmail(booking.getCustomer().getEmail())
                    // Service info
                    .serviceName(booking.getService().getServiceName())
                    .serviceCategory(booking.getService().getCategory().getName())
                    // Estimates
                    .estimatedCompletionTime(scheduledEnd)
                    .estimatedDurationMinutes(calculateDuration(scheduled, scheduledEnd))
                    // Pricing
                    .totalPrice(booking.getTotalPrice())
                    .currency("USD")
                    // Location
                    .serviceAddress(formatAddress(booking))
                    .build();

            BookingEvent event = buildEvent(
                    BookingEvent.BOOKING_STARTED,
                    payload,
                    booking
            );

            publishEvent(event, booking.getProvider().getId());

        } catch (Exception e) {
            log.error("Failed to publish BOOKING_STARTED event for booking {}", booking.getId(), e);
        }
    }

    /**
     * Publish BOOKING_COMPLETED event
     *
     * Triggered when: Provider marks service as completed
     * Notifies: Both customer and provider about completion
     *
     * @param booking The completed booking
     */
    public void publishBookingCompleted(Booking booking) {
        try {
            log.info("Publishing BOOKING_COMPLETED event for booking {}", booking.getId());

            Integer actualDuration = calculateDuration(
                    booking.getActualStartTime(),
                    booking.getCompletedAt()
            );

            // Determine completion status
            LocalDateTime scheduledEnd = combineDateTime(booking.getScheduledDate(), booking.getScheduledEndTime());
            LocalDateTime actualEnd = booking.getCompletedAt();
            long minutesDiff = ChronoUnit.MINUTES.between(scheduledEnd, actualEnd);

            String completionStatus;
            if (minutesDiff > 15) {
                completionStatus = "LATE";
            } else if (minutesDiff < -15) {
                completionStatus = "EARLY";
            } else {
                completionStatus = "ON_TIME";
            }

            BookingCompletedPayload payload = BookingCompletedPayload.builder()
                    .bookingId(booking.getId())
                    // Completion details
                    .completedAt(booking.getCompletedAt())
                    .actualStartTime(booking.getActualStartTime())
                    .actualEndTime(booking.getCompletedAt())
                    .actualDurationMinutes(actualDuration)
                    .scheduledEndTime(scheduledEnd)
                    .completionStatus(completionStatus)
                    // Provider info
                    .providerId(booking.getProvider().getId())
                    .providerName(booking.getProvider().getBusinessName())
                    .providerEmail(booking.getProvider().getUser().getEmail())
                    .providerPhone(booking.getProvider().getUser().getPhone())
                    // Customer info
                    .customerId(booking.getCustomer().getId())
                    .customerName(booking.getCustomer().getName())
                    .customerEmail(booking.getCustomer().getEmail())
                    // Service info
                    .serviceName(booking.getService().getServiceName())
                    .serviceCategory(booking.getService().getCategory().getName())
                    // Pricing
                    .totalPrice(booking.getTotalPrice())
                    .originalPrice(booking.getTotalPrice()) // Can be extended for price adjustments
                    .currency("USD")
                    // Service summary (can be extended later with completion notes)
                    .completionNotes(null)
                    .workPerformed(null)
                    // Review request
                    .requestReview(true)
                    .reviewRequestDelayHours(24)
                    .build();

            BookingEvent event = buildEvent(
                    BookingEvent.BOOKING_COMPLETED,
                    payload,
                    booking
            );

            publishEvent(event, booking.getProvider().getId());

        } catch (Exception e) {
            log.error("Failed to publish BOOKING_COMPLETED event for booking {}", booking.getId(), e);
        }
    }

    /**
     * Publish BOOKING_CANCELLED event
     *
     * Triggered when: Customer or provider cancels booking
     * Notifies: Other party about cancellation
     *
     * @param booking The cancelled booking
     * @param cancelledBy Who cancelled (CUSTOMER, PROVIDER, ADMIN, SYSTEM)
     * @param reason Cancellation reason
     */
    public void publishBookingCancelled(Booking booking, String cancelledBy, String reason) {
        try {
            log.info("Publishing BOOKING_CANCELLED event for booking {}", booking.getId());

            Integer cancelledByUserId = null;
            String cancelledByName = null;

            if ("CUSTOMER".equalsIgnoreCase(cancelledBy)) {
                cancelledByUserId = booking.getCustomer().getId();
                cancelledByName = booking.getCustomer().getName();
            } else if ("PROVIDER".equalsIgnoreCase(cancelledBy)) {
                cancelledByUserId = booking.getProvider().getId();
                cancelledByName = booking.getProvider().getBusinessName();
            }

            LocalDateTime scheduledStart = combineDateTime(booking.getScheduledDate(), booking.getScheduledStartTime());
            LocalDateTime scheduledEnd = combineDateTime(booking.getScheduledDate(), booking.getScheduledEndTime());

            // Calculate notice given (hours between now and scheduled start)
            long hoursNotice = ChronoUnit.HOURS.between(
                    LocalDateTime.now(),
                    scheduledStart
            );

            BookingCancelledPayload payload = BookingCancelledPayload.builder()
                    .bookingId(booking.getId())
                    // Cancellation details
                    .cancelledAt(booking.getCancelledAt())
                    .cancelledBy(cancelledBy)
                    .cancelledByUserId(cancelledByUserId)
                    .cancelledByName(cancelledByName)
                    .cancellationReason(reason != null ? reason : booking.getCancellationReason())
                    .previousStatus(booking.getStatus().name())
                    .hoursNoticeGiven((int) Math.max(0, hoursNotice))
                    // Customer info
                    .customerId(booking.getCustomer().getId())
                    .customerName(booking.getCustomer().getName())
                    .customerEmail(booking.getCustomer().getEmail())
                    // Provider info
                    .providerId(booking.getProvider().getId())
                    .providerName(booking.getProvider().getBusinessName())
                    .providerEmail(booking.getProvider().getUser().getEmail())
                    .providerPhone(booking.getProvider().getUser().getPhone())
                    // Service info
                    .serviceName(booking.getService().getServiceName())
                    .serviceCategory(booking.getService().getCategory().getName())
                    // Schedule
                    .scheduledStartTime(scheduledStart)
                    .scheduledEndTime(scheduledEnd)
                    // Financial (can be extended with refund logic)
                    .originalPrice(booking.getTotalPrice())
                    .refundAmount(booking.getTotalPrice()) // Default: full refund (extend with policy)
                    .refundStatus("PENDING")
                    .currency("USD")
                    // Timing
                    .hoursUntilScheduledStart(hoursNotice)
                    .canRebook(true)
                    .build();

            BookingEvent event = buildEvent(
                    BookingEvent.BOOKING_CANCELLED,
                    payload,
                    booking
            );

            publishEvent(event, booking.getProvider().getId());

        } catch (Exception e) {
            log.error("Failed to publish BOOKING_CANCELLED event for booking {}", booking.getId(), e);
        }
    }

    // ========== HELPER METHODS ==========

    /**
     * Build event envelope with metadata
     */
    private BookingEvent buildEvent(String eventType, Object payload, Booking booking) {

        BookingEventMetadata metadata = BookingEventMetadata.builder()
                .userId(booking.getCustomer().getId()) // Can be overridden based on event type
                .providerId(booking.getProvider().getId())
                .customerId(booking.getCustomer().getId())
                .source("booking-service")
                .build();

        return BookingEvent.builder()
                .eventId(BookingEvent.generateEventId())
                .eventType(eventType)
                .eventVersion("1.0")
                .timestamp(BookingEvent.getCurrentTimestamp())
                .aggregateId(booking.getId())
                .aggregateType("BOOKING")
                .correlationId(BookingEvent.generateCorrelationId())
                .payload(payload)
                .metadata(metadata)
                .build();
    }

    /**
     * Publish event to Kafka topic
     *
     * @param event Event to publish
     * @param providerId Provider ID (used as partition key)
     */
    private void publishEvent(BookingEvent event, Integer providerId) {
        try {
            // Use providerId as partition key for ordering guarantee
            String partitionKey = String.valueOf(providerId);

            CompletableFuture<SendResult<String, BookingEvent>> future =
                    kafkaTemplate.send(TOPIC_NAME, partitionKey, event);

            future.whenComplete((result, ex) -> {
                if (ex == null) {
                    log.info("Successfully published {} event for booking {} to partition {}",
                            event.getEventType(),
                            event.getAggregateId(),
                            result.getRecordMetadata().partition());
                } else {
                    log.error("Failed to publish {} event for booking {}",
                            event.getEventType(),
                            event.getAggregateId(),
                            ex);
                }
            });

        } catch (Exception e) {
            log.error("Error publishing event {} for booking {}",
                    event.getEventType(),
                    event.getAggregateId(),
                    e);
            throw e;
        }
    }

    /**
     * Combine scheduled date + time into LocalDateTime
     *
     * @param date Scheduled date
     * @param time Scheduled time
     * @return Combined LocalDateTime, or null if either input is null
     */
    private LocalDateTime combineDateTime(LocalDate date, LocalTime time) {
        if (date == null || time == null) {
            return null;
        }
        return date.atTime(time);
    }

    /**
     * Calculate duration between two timestamps in minutes
     */
    private Integer calculateDuration(LocalDateTime start, LocalDateTime end) {
        if (start == null || end == null) {
            return null;
        }
        return (int) ChronoUnit.MINUTES.between(start, end);
    }

    /**
     * Format address from booking location
     */
    private String formatAddress(Booking booking) {
        // Build address from booking fields
        StringBuilder address = new StringBuilder();

        if (booking.getServiceAddress() != null) {
            address.append(booking.getServiceAddress());
        }
        if (booking.getServiceCity() != null) {
            if (address.length() > 0) address.append(", ");
            address.append(booking.getServiceCity());
        }
        if (booking.getServiceState() != null) {
            if (address.length() > 0) address.append(", ");
            address.append(booking.getServiceState());
        }
        if (booking.getServicePostalCode() != null) {
            if (address.length() > 0) address.append(" ");
            address.append(booking.getServicePostalCode());
        }

        return address.length() > 0 ? address.toString() : "Service location";
    }
}