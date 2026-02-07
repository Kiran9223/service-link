package com.kiran.servicelink.enums;

import java.util.EnumSet;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * Booking status lifecycle management
 *
 * State transitions:
 * PENDING → CONFIRMED | CANCELLED
 * CONFIRMED → IN_PROGRESS | CANCELLED
 * IN_PROGRESS → COMPLETED | CANCELLED
 * COMPLETED → (terminal state)
 * CANCELLED → (terminal state)
 */
public enum BookingStatus {
    PENDING,
    CONFIRMED,
    IN_PROGRESS,
    COMPLETED,
    CANCELLED;

    // Valid state transitions map
    private static final Map<BookingStatus, Set<BookingStatus>> VALID_TRANSITIONS = new HashMap<>();

    static {
        // PENDING can transition to CONFIRMED or CANCELLED
        VALID_TRANSITIONS.put(PENDING, EnumSet.of(CONFIRMED, CANCELLED));

        // CONFIRMED can transition to IN_PROGRESS or CANCELLED
        VALID_TRANSITIONS.put(CONFIRMED, EnumSet.of(IN_PROGRESS, CANCELLED));

        // IN_PROGRESS can transition to COMPLETED or CANCELLED
        VALID_TRANSITIONS.put(IN_PROGRESS, EnumSet.of(COMPLETED, CANCELLED));

        // COMPLETED is terminal (no transitions)
        VALID_TRANSITIONS.put(COMPLETED, EnumSet.noneOf(BookingStatus.class));

        // CANCELLED is terminal (no transitions)
        VALID_TRANSITIONS.put(CANCELLED, EnumSet.noneOf(BookingStatus.class));
    }

    /**
     * Check if transition from current status to new status is valid
     *
     * @param newStatus Target status
     * @return true if transition is allowed
     */
    public boolean canTransitionTo(BookingStatus newStatus) {
        Set<BookingStatus> allowedTransitions = VALID_TRANSITIONS.get(this);
        return allowedTransitions != null && allowedTransitions.contains(newStatus);
    }

    /**
     * Get all valid next states from current status
     *
     * @return Set of allowed next states
     */
    public Set<BookingStatus> getValidNextStates() {
        return VALID_TRANSITIONS.getOrDefault(this, EnumSet.noneOf(BookingStatus.class));
    }

    /**
     * Check if this is a terminal state (no further transitions possible)
     *
     * @return true if terminal (COMPLETED or CANCELLED)
     */
    public boolean isTerminal() {
        return this == COMPLETED || this == CANCELLED;
    }

    /**
     * Check if this booking can be cancelled from current state
     *
     * @return true if cancellation is allowed
     */
    public boolean isCancellable() {
        return this == PENDING || this == CONFIRMED || this == IN_PROGRESS;
    }

    /**
     * Check if provider can confirm/decline from current state
     * Only PENDING bookings can be confirmed/declined
     *
     * @return true if awaiting provider action
     */
    public boolean isAwaitingProviderAction() {
        return this == PENDING;
    }

    /**
     * Check if service is currently active
     *
     * @return true if IN_PROGRESS
     */
    public boolean isActive() {
        return this == IN_PROGRESS;
    }

    /**
     * Check if booking is complete (successfully or cancelled)
     *
     * @return true if COMPLETED or CANCELLED
     */
    public boolean isFinalized() {
        return isTerminal();
    }
}