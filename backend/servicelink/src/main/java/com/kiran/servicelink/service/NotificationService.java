package com.kiran.servicelink.service;

import com.kiran.servicelink.dto.event.BookingEvent;
import com.kiran.servicelink.dto.event.*;
import com.kiran.servicelink.dto.response.NotificationResponseDTO;
import com.kiran.servicelink.entity.Notification;
import com.kiran.servicelink.enums.NotificationChannel;
import com.kiran.servicelink.enums.NotificationStatus;
import com.kiran.servicelink.enums.NotificationType;
import com.kiran.servicelink.exception.ResourceNotFoundException;
import com.kiran.servicelink.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for managing notifications
 * 
 * Responsibilities:
 * - Create notifications from Kafka events (with idempotency)
 * - Build notification content based on event type
 * - Broadcast notifications via WebSocket
 * - Provide REST API support (get, mark as read, delete)
 * 
 * Idempotency Strategy:
 * - Uses event_id (UUID) to prevent duplicate notifications
 * - Database unique constraint on event_id
 * - Catches DataIntegrityViolationException for duplicates
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    // Date/time formatters for notification messages
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("MMM dd, yyyy");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("h:mm a");
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("MMM dd, yyyy 'at' h:mm a");

    // ========== KAFKA EVENT PROCESSING (Main Entry Point) ==========

    /**
     * Create notification from Kafka booking event
     * 
     * This is the main entry point called by BookingEventConsumer
     * Handles idempotency via event_id unique constraint
     * 
     * @param event Booking lifecycle event from Kafka
     */
    @Transactional
    public void createNotification(BookingEvent event) {
        try {
            log.debug("Processing event {} for booking {}", 
                    event.getEventType(), event.getAggregateId());

            // Determine notification details based on event type
            NotificationDetails details = buildNotificationDetails(event);

            if (details == null) {
                log.warn("No notification generated for event type: {}", event.getEventType());
                return;
            }

            // Create notification entity
            Notification notification = Notification.builder()
                    .recipientUserId(details.recipientUserId)
                    .bookingId(event.getAggregateId())
                    .notificationType(details.notificationType)
                    .subject(details.subject)
                    .message(details.message)
                    .channel(NotificationChannel.IN_APP)
                    .status(NotificationStatus.SENT)  // In-app = immediately "sent"
                    .eventId(event.getEventId())      // For idempotency
                    .isRead(false)
                    .sentAt(LocalDateTime.now())
                    .build();

            // Save notification (unique constraint on event_id prevents duplicates)
            Notification saved = notificationRepository.save(notification);
            
            log.info("Created notification {} for user {} (event: {})", 
                    saved.getId(), saved.getRecipientUserId(), event.getEventType());

            // Broadcast via WebSocket for real-time delivery
            broadcastToUser(saved.getRecipientUserId(), saved);

        } catch (DataIntegrityViolationException e) {
            // Duplicate event_id - already processed, skip silently
            log.debug("Duplicate event {} already processed, skipping", event.getEventId());
        } catch (Exception e) {
            log.error("Failed to create notification for event {}", event.getEventId(), e);
            throw e;  // Re-throw for Kafka consumer to handle
        }
    }

    // ========== NOTIFICATION CONTENT BUILDING ==========

    /**
     * Build notification content based on event type and payload
     * 
     * @param event Booking event
     * @return NotificationDetails or null if no notification needed
     */
    private NotificationDetails buildNotificationDetails(BookingEvent event) {
        return switch (event.getEventType()) {
            case BookingEvent.BOOKING_CREATED -> buildBookingCreatedNotification(event);
            case BookingEvent.BOOKING_CONFIRMED -> buildBookingConfirmedNotification(event);
            case BookingEvent.BOOKING_STARTED -> buildBookingStartedNotification(event);
            case BookingEvent.BOOKING_COMPLETED -> buildBookingCompletedNotification(event);
            case BookingEvent.BOOKING_CANCELLED -> buildBookingCancelledNotification(event);
            default -> {
                log.warn("Unknown event type: {}", event.getEventType());
                yield null;
            }
        };
    }

    /**
     * BOOKING_CREATED: Customer creates booking → Notify Provider
     */
    private NotificationDetails buildBookingCreatedNotification(BookingEvent event) {
        // Use Jackson to convert LinkedHashMap to proper type
        BookingCreatedPayload payload = objectMapper.convertValue(
                event.getPayload(),
                BookingCreatedPayload.class
        );

        String subject = "New Booking Request";
        String message = String.format(
                "%s requested %s on %s at %s. Price: $%.2f%s",
                payload.getCustomerName(),
                payload.getServiceName(),
                formatDate(payload.getScheduledStartTime()),
                formatTime(payload.getScheduledStartTime()),
                payload.getTotalPrice(),
                payload.getSpecialInstructions() != null && !payload.getSpecialInstructions().isEmpty()
                        ? "\nNote: " + payload.getSpecialInstructions()
                        : ""
        );

        return new NotificationDetails(
                payload.getProviderId(),
                NotificationType.BOOKING_CREATED,
                subject,
                message
        );
    }

    /**
     * BOOKING_CONFIRMED: Provider confirms → Notify Customer
     */
    private NotificationDetails buildBookingConfirmedNotification(BookingEvent event) {
        BookingConfirmedPayload payload = objectMapper.convertValue(
                event.getPayload(),
                BookingConfirmedPayload.class
        );

        String subject = "Booking Confirmed! ✅";
        String message = String.format(
                "%s confirmed your %s for %s at %s. Price: $%.2f\nProvider contact: %s%s",
                payload.getProviderName(),
                payload.getServiceName(),
                formatDate(payload.getScheduledStartTime()),
                formatTime(payload.getScheduledStartTime()),
                payload.getTotalPrice(),
                payload.getProviderPhone() != null ? payload.getProviderPhone() : payload.getProviderEmail(),
                payload.getProviderNotes() != null && !payload.getProviderNotes().isEmpty()
                        ? "\nProvider note: " + payload.getProviderNotes()
                        : ""
        );

        return new NotificationDetails(
                payload.getCustomerId(),
                NotificationType.BOOKING_CONFIRMATION,
                subject,
                message
        );
    }

    /**
     * BOOKING_STARTED: Provider starts service → Notify Customer
     */
    private NotificationDetails buildBookingStartedNotification(BookingEvent event) {
        BookingStartedPayload payload = objectMapper.convertValue(
                event.getPayload(),
                BookingStartedPayload.class
        );

        String statusInfo = "";
        if ("LATE".equals(payload.getStartStatus()) && payload.getDelayMinutes() != null) {
            statusInfo = String.format(" (started %d minutes late)", payload.getDelayMinutes());
        } else if ("EARLY".equals(payload.getStartStatus())) {
            statusInfo = " (started early)";
        }

        String subject = "Service Started 🔧";
        String message = String.format(
                "%s has started your %s%s. Expected completion: %s\nContact: %s%s",
                payload.getProviderName(),
                payload.getServiceName(),
                statusInfo,
                formatTime(payload.getEstimatedCompletionTime()),
                payload.getProviderPhone(),
                payload.getStartNotes() != null && !payload.getStartNotes().isEmpty()
                        ? "\nNote: " + payload.getStartNotes()
                        : ""
        );

        return new NotificationDetails(
                payload.getCustomerId(),
                NotificationType.BOOKING_STARTED,
                subject,
                message
        );
    }

    /**
     * BOOKING_COMPLETED: Service done → Notify Both Parties
     */
    private NotificationDetails buildBookingCompletedNotification(BookingEvent event) {
        BookingCompletedPayload payload = objectMapper.convertValue(
                event.getPayload(),
                BookingCompletedPayload.class
        );

        String subject = "Service Completed ✅";
        String message = String.format(
                "%s completed your %s. Duration: %d minutes. Final price: $%.2f%s\n\nHow was your experience? Please rate the service!",
                payload.getProviderName(),
                payload.getServiceName(),
                payload.getActualDurationMinutes() != null ? payload.getActualDurationMinutes() : 0,
                payload.getTotalPrice(),
                payload.getCompletionNotes() != null && !payload.getCompletionNotes().isEmpty()
                        ? "\n\nWork performed: " + payload.getCompletionNotes()
                        : ""
        );

        return new NotificationDetails(
                payload.getCustomerId(),
                NotificationType.BOOKING_COMPLETION,
                subject,
                message
        );
    }

    /**
     * BOOKING_CANCELLED: Cancellation → Notify Other Party
     */
    private NotificationDetails buildBookingCancelledNotification(BookingEvent event) {
        BookingCancelledPayload payload = objectMapper.convertValue(
                event.getPayload(),
                BookingCancelledPayload.class
        );

        // Determine who gets notified (the OTHER party)
        Integer recipientUserId;
        String cancellerName;

        if ("CUSTOMER".equals(payload.getCancelledBy())) {
            recipientUserId = payload.getProviderId();
            cancellerName = payload.getCustomerName();
        } else if ("PROVIDER".equals(payload.getCancelledBy())) {
            recipientUserId = payload.getCustomerId();
            cancellerName = payload.getProviderName();
        } else {
            // Admin or system cancellation - notify customer
            recipientUserId = payload.getCustomerId();
            cancellerName = "System";
        }

        String refundInfo = "";
        if ("FULL_REFUND".equals(payload.getRefundStatus())) {
            refundInfo = String.format("\n\nRefund: $%.2f (Full refund)", payload.getRefundAmount());
        } else if ("PARTIAL_REFUND".equals(payload.getRefundStatus())) {
            refundInfo = String.format("\n\nRefund: $%.2f (Partial refund)", payload.getRefundAmount());
        } else if ("NO_REFUND".equals(payload.getRefundStatus())) {
            refundInfo = "\n\nNo refund applicable.";
        }

        String subject = "Booking Cancelled";
        String message = String.format(
                "%s cancelled the %s scheduled for %s at %s.%s%s%s",
                cancellerName,
                payload.getServiceName(),
                formatDate(payload.getScheduledStartTime()),
                formatTime(payload.getScheduledStartTime()),
                payload.getCancellationReason() != null && !payload.getCancellationReason().isEmpty()
                        ? "\n\nReason: " + payload.getCancellationReason()
                        : "",
                refundInfo,
                payload.getCanRebook() ? "\n\nYou can book again if needed." : ""
        );

        return new NotificationDetails(
                recipientUserId,
                NotificationType.BOOKING_CANCELLED,
                subject,
                message
        );
    }

    // ========== WEBSOCKET BROADCASTING ==========

    /**
     * Broadcast notification to user via WebSocket
     * 
     * Sends to: /user/{userId}/queue/notifications
     * Client subscribes to this destination for real-time updates
     * 
     * @param userId User to notify
     * @param notification Notification to send
     */
    private void broadcastToUser(Integer userId, Notification notification) {
        try {
            NotificationResponseDTO dto = mapToResponseDTO(notification);

            messagingTemplate.convertAndSendToUser(
                    userId.toString(),
                    "/queue/notifications",
                    dto
            );

            log.debug("Broadcasted notification {} to user {} via WebSocket", 
                    notification.getId(), userId);
        } catch (Exception e) {
            log.error("Failed to broadcast notification {} via WebSocket", 
                    notification.getId(), e);
            // Don't throw - notification already saved to DB
        }
    }

    // ========== REST API SUPPORT METHODS ==========

    /**
     * Get paginated notifications for a user
     * 
     * @param userId User ID
     * @param page Page number (0-indexed)
     * @param size Page size
     * @return Page of notification DTOs
     */
    @Transactional(readOnly = true)
    public Page<NotificationResponseDTO> getUserNotifications(Integer userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Notification> notifications = notificationRepository
                .findByRecipientUserIdAndChannelOrderByCreatedAtDesc(
                        userId,
                        NotificationChannel.IN_APP,
                        pageable
                );

        return notifications.map(this::mapToResponseDTO);
    }

    /**
     * Get unread notification count for a user
     * 
     * @param userId User ID
     * @return Number of unread notifications
     */
    @Transactional(readOnly = true)
    public Long getUnreadCount(Integer userId) {
        return notificationRepository.countByRecipientUserIdAndChannelAndIsReadFalse(
                userId,
                NotificationChannel.IN_APP
        );
    }

    /**
     * Mark a notification as read
     * 
     * @param notificationId Notification ID
     * @param userId User ID (for authorization check)
     */
    @Transactional
    public void markAsRead(Long notificationId, Integer userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Notification not found with id: " + notificationId));

        // Authorization check
        if (!notification.getRecipientUserId().equals(userId)) {
            throw new ResourceNotFoundException("Notification not found");
        }

        if (!notification.getIsRead()) {
            notification.markAsRead();
            notificationRepository.save(notification);
            log.debug("Marked notification {} as read", notificationId);
        }
    }

    /**
     * Mark all notifications as read for a user
     * 
     * @param userId User ID
     * @return Number of notifications marked as read
     */
    @Transactional
    public int markAllAsRead(Integer userId) {
        int count = notificationRepository.markAllAsRead(userId, NotificationChannel.IN_APP);
        log.info("Marked {} notifications as read for user {}", count, userId);
        return count;
    }

    /**
     * Delete a notification
     * 
     * @param notificationId Notification ID
     * @param userId User ID (for authorization check)
     */
    @Transactional
    public void deleteNotification(Long notificationId, Integer userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Notification not found with id: " + notificationId));

        // Authorization check
        if (!notification.getRecipientUserId().equals(userId)) {
            throw new ResourceNotFoundException("Notification not found");
        }

        notificationRepository.delete(notification);
        log.debug("Deleted notification {}", notificationId);
    }

    /**
     * Get notifications for a specific booking
     * 
     * @param bookingId Booking ID
     * @param userId User ID (for filtering)
     * @return List of notification DTOs
     */
    @Transactional(readOnly = true)
    public List<NotificationResponseDTO> getBookingNotifications(Long bookingId, Integer userId) {
        List<Notification> notifications = notificationRepository
                .findByBookingIdAndRecipientUserIdOrderByCreatedAtDesc(bookingId, userId);

        return notifications.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // ========== DTO MAPPING ==========

    /**
     * Map Notification entity to response DTO
     */
    private NotificationResponseDTO mapToResponseDTO(Notification notification) {
        return NotificationResponseDTO.builder()
                .id(notification.getId())
                .bookingId(notification.getBookingId())
                .notificationType(notification.getNotificationType().name())
                .subject(notification.getSubject())
                .message(notification.getMessage())
                .isRead(notification.getIsRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }

    // ========== HELPER METHODS ==========

    /**
     * Format LocalDateTime to date string
     */
    private String formatDate(LocalDateTime dateTime) {
        return dateTime != null ? dateTime.format(DATE_FORMATTER) : "";
    }

    /**
     * Format LocalDateTime to time string
     */
    private String formatTime(LocalDateTime dateTime) {
        return dateTime != null ? dateTime.format(TIME_FORMATTER) : "";
    }

    /**
     * Format LocalDateTime to full datetime string
     */
    private String formatDateTime(LocalDateTime dateTime) {
        return dateTime != null ? dateTime.format(DATETIME_FORMATTER) : "";
    }

    // ========== INNER CLASS: Notification Details ==========

    /**
     * Internal class to hold notification content details
     */
    private static class NotificationDetails {
        private final Integer recipientUserId;
        private final NotificationType notificationType;
        private final String subject;
        private final String message;

        public NotificationDetails(Integer recipientUserId, NotificationType notificationType,
                                   String subject, String message) {
            this.recipientUserId = recipientUserId;
            this.notificationType = notificationType;
            this.subject = subject;
            this.message = message;
        }
    }
}