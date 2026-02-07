package com.kiran.servicelink.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Immutable audit trail for all booking changes
 *
 * CRITICAL RULES:
 * - Never UPDATE audit records
 * - Never DELETE audit records (except cascade when booking deleted)
 * - Always create new record for each change
 *
 * Used for:
 * - Compliance and legal requirements
 * - Debugging and troubleshooting
 * - Dispute resolution
 * - Analytics on booking lifecycle
 */
@Entity
@Table(name = "booking_audit", indexes = {
        @Index(name = "idx_audit_booking", columnList = "booking_id"),
        @Index(name = "idx_audit_user", columnList = "performed_by_user_id"),
        @Index(name = "idx_audit_action", columnList = "action"),
        @Index(name = "idx_audit_time", columnList = "performed_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class BookingAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ========== What Booking Was Changed ==========

    /**
     * Reference to the booking that was modified
     * ON DELETE CASCADE - if booking deleted, audit goes too
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    @NotNull(message = "Booking reference is required")
    private Booking booking;

    // ========== What Happened ==========

    /**
     * Type of action performed
     * Matches CHECK constraint in database schema
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false, length = 50)
    @NotNull(message = "Action is required")
    private AuditAction action;

    /**
     * Previous value (if applicable)
     * Stored as TEXT for flexibility across different field types
     * NULL for creation events
     */
    @Column(name = "old_value", columnDefinition = "TEXT")
    private String oldValue;

    /**
     * New value (if applicable)
     * Stored as TEXT for flexibility across different field types
     */
    @Column(name = "new_value", columnDefinition = "TEXT")
    private String newValue;

    // ========== Who and When ==========

    /**
     * User who performed the action
     * NULL for system-initiated actions (auto-reminders, cleanup jobs)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "performed_by_user_id")
    private User performedByUser;

    /**
     * Role of the user at the time of action
     * Stored separately because user's role might change later
     * Values: "customer", "provider", "admin", "system"
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "performed_by_role", length = 20)
    private AuditRole performedByRole;

    /**
     * When the action was performed
     * Automatically set on insert
     */
    @CreationTimestamp
    @Column(name = "performed_at", nullable = false, updatable = false)
    private LocalDateTime performedAt;

    // ========== Additional Context ==========

    /**
     * Free-form comments or additional context
     * Examples:
     * - "Customer requested schedule change due to weather"
     * - "Provider no-show reported by customer"
     * - "Admin intervention - duplicate booking resolution"
     */
    @Column(name = "comments", columnDefinition = "TEXT")
    private String comments;

    // ========== Audit Action Enum ==========

    /**
     * Predefined set of actions that can be audited
     * Matches database CHECK constraint
     */
    public enum AuditAction {
        BOOKING_CREATED,
        BOOKING_CONFIRMED,
        BOOKING_STARTED,
        BOOKING_COMPLETED,
        BOOKING_CANCELLED,
        STATUS_CHANGED,
        PRICE_CHANGED,
        SCHEDULE_CHANGED,
        INSTRUCTIONS_UPDATED,
        NO_SHOW_RECORDED;

        /**
         * Get human-readable description
         */
        public String getDescription() {
            return switch (this) {
                case BOOKING_CREATED -> "Booking created by customer";
                case BOOKING_CONFIRMED -> "Provider confirmed booking";
                case BOOKING_STARTED -> "Service started";
                case BOOKING_COMPLETED -> "Service completed";
                case BOOKING_CANCELLED -> "Booking cancelled";
                case STATUS_CHANGED -> "Status updated";
                case PRICE_CHANGED -> "Price modified";
                case SCHEDULE_CHANGED -> "Schedule modified";
                case INSTRUCTIONS_UPDATED -> "Special instructions updated";
                case NO_SHOW_RECORDED -> "No-show reported";
            };
        }
    }

    /**
     * Role at the time of action
     * Matches database CHECK constraint
     */
    public enum AuditRole {
        CUSTOMER,
        PROVIDER,
        ADMIN,
        SYSTEM;

        /**
         * Convert from User Role enum
         */
        public static AuditRole fromUserRole(Role userRole) {
            return switch (userRole) {
                case USER -> CUSTOMER;
                case SERVICE_PROVIDER -> PROVIDER;
                case ADMIN -> ADMIN;
            };
        }
    }

    // ========== Factory Methods ==========

    /**
     * Create audit entry for booking creation
     */
    public static BookingAudit forCreation(Booking booking, User performedBy) {
        return BookingAudit.builder()
                .booking(booking)
                .action(AuditAction.BOOKING_CREATED)
                .newValue(booking.getStatus().name())
                .performedByUser(performedBy)
                .performedByRole(AuditRole.fromUserRole(performedBy.getRole()))
                .build();
    }

    /**
     * Create audit entry for status change
     */
    public static BookingAudit forStatusChange(
            Booking booking,
            String oldStatus,
            String newStatus,
            User performedBy) {

        AuditAction action = switch (newStatus) {
            case "CONFIRMED" -> AuditAction.BOOKING_CONFIRMED;
            case "IN_PROGRESS" -> AuditAction.BOOKING_STARTED;
            case "COMPLETED" -> AuditAction.BOOKING_COMPLETED;
            case "CANCELLED" -> AuditAction.BOOKING_CANCELLED;
            default -> AuditAction.STATUS_CHANGED;
        };

        return BookingAudit.builder()
                .booking(booking)
                .action(action)
                .oldValue(oldStatus)
                .newValue(newStatus)
                .performedByUser(performedBy)
                .performedByRole(AuditRole.fromUserRole(performedBy.getRole()))
                .build();
    }

    /**
     * Create audit entry for cancellation
     */
    public static BookingAudit forCancellation(
            Booking booking,
            User performedBy,
            String reason) {

        return BookingAudit.builder()
                .booking(booking)
                .action(AuditAction.BOOKING_CANCELLED)
                .oldValue(booking.getStatus().name())
                .newValue("CANCELLED")
                .performedByUser(performedBy)
                .performedByRole(AuditRole.fromUserRole(performedBy.getRole()))
                .comments(reason)
                .build();
    }

    /**
     * Create audit entry for price change
     */
    public static BookingAudit forPriceChange(
            Booking booking,
            String oldPrice,
            String newPrice,
            User performedBy,
            String reason) {

        return BookingAudit.builder()
                .booking(booking)
                .action(AuditAction.PRICE_CHANGED)
                .oldValue(oldPrice)
                .newValue(newPrice)
                .performedByUser(performedBy)
                .performedByRole(AuditRole.fromUserRole(performedBy.getRole()))
                .comments(reason)
                .build();
    }

    /**
     * Create audit entry for schedule change
     */
    public static BookingAudit forScheduleChange(
            Booking booking,
            String oldSchedule,
            String newSchedule,
            User performedBy) {

        return BookingAudit.builder()
                .booking(booking)
                .action(AuditAction.SCHEDULE_CHANGED)
                .oldValue(oldSchedule)
                .newValue(newSchedule)
                .performedByUser(performedBy)
                .performedByRole(AuditRole.fromUserRole(performedBy.getRole()))
                .build();
    }

    /**
     * Create audit entry for system action (no user)
     */
    public static BookingAudit forSystemAction(
            Booking booking,
            AuditAction action,
            String comments) {

        return BookingAudit.builder()
                .booking(booking)
                .action(action)
                .performedByUser(null)
                .performedByRole(AuditRole.SYSTEM)
                .comments(comments)
                .build();
    }

    // ========== Helper Methods ==========

    /**
     * Check if this was a system-initiated action
     */
    public boolean isSystemAction() {
        return performedByRole == AuditRole.SYSTEM;
    }

    /**
     * Check if this was performed by a customer
     */
    public boolean isCustomerAction() {
        return performedByRole == AuditRole.CUSTOMER;
    }

    /**
     * Check if this was performed by a provider
     */
    public boolean isProviderAction() {
        return performedByRole == AuditRole.PROVIDER;
    }

    /**
     * Get formatted summary for display
     */
    public String getSummary() {
        String performer = isSystemAction() ? "System" :
                (performedByUser != null ? performedByUser.getName() : "Unknown");
        return String.format("%s - %s by %s (%s)",
                performedAt,
                action.getDescription(),
                performer,
                performedByRole);
    }
}