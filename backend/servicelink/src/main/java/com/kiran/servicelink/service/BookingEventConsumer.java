package com.kiran.servicelink.service;

import com.kiran.servicelink.dto.event.BookingEvent;
import com.kiran.servicelink.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Service;

/**
 * Kafka consumer for booking lifecycle events
 *
 * Listens to: servicelink.booking.lifecycle
 * Group ID: notification-service-group
 *
 * Responsibilities:
 * - Consume booking events from Kafka
 * - Pass events to NotificationService for processing
 * - Manual acknowledgment for reliability
 * - Error handling with logging
 *
 * Flow:
 * 1. Receive event from Kafka
 * 2. Call NotificationService.createNotification()
 * 3. Acknowledge message (manual commit)
 * 4. On error: Log and acknowledge anyway (to avoid blocking)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BookingEventConsumer {

    private final NotificationService notificationService;

    /**
     * Consume booking lifecycle events
     *
     * Configuration:
     * - Topic: servicelink.booking.lifecycle
     * - Group ID: notification-service-group
     * - Manual acknowledgment: Commit only after successful processing
     *
     * @param record Kafka consumer record containing the event
     * @param acknowledgment Manual acknowledgment handle
     */
    @KafkaListener(
            topics = "servicelink.booking.lifecycle",
            groupId = "notification-service-group",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void consumeBookingEvent(
            ConsumerRecord<String, BookingEvent> record,
            Acknowledgment acknowledgment
    ) {
        BookingEvent event = record.value();

        try {
            log.info("Received {} event for booking {} from partition {} offset {}",
                    event.getEventType(),
                    event.getAggregateId(),
                    record.partition(),
                    record.offset());

            // Process event (creates notification with idempotency)
            notificationService.createNotification(event);

            // Manual commit only after successful processing
            acknowledgment.acknowledge();

            log.debug("Successfully processed event {} for booking {}",
                    event.getEventType(),
                    event.getAggregateId());

        } catch (Exception e) {
            log.error("Error processing event {} from partition {} offset {}: {}",
                    event.getEventType(),
                    record.partition(),
                    record.offset(),
                    e.getMessage(),
                    e);

            // For Day 8 scope: Log error and acknowledge anyway to avoid blocking
            // Production: Send to DLQ (Dead Letter Queue) or implement retry with backoff
            acknowledgment.acknowledge();

            // Could add metrics here for monitoring
            // metricsService.incrementFailedEventCount(event.getEventType());
        }
    }

    /**
     * Health check: Log consumer startup
     * This runs when the consumer is ready to receive messages
     */
    // Uncomment if you want startup logging:
    // @EventListener(ApplicationReadyEvent.class)
    // public void onStartup() {
    //     log.info("BookingEventConsumer started and ready to consume events");
    // }
}
