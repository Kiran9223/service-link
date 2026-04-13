package com.kiran.servicelink.repository;

import com.kiran.servicelink.entity.Rating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RatingRepository extends JpaRepository<Rating, Long> {

    /**
     * Find a rating for a specific booking (one-to-one relationship)
     * Used for: checking if a booking has been reviewed
     */
    Optional<Rating> findByBookingId(Long bookingId);

    /**
     * Get all visible ratings for a provider, newest first
     * Used for: provider profile reviews section
     */
    List<Rating> findByProviderIdAndIsVisibleTrueOrderByCreatedAtDesc(Integer providerId);

    /**
     * Check if a rating exists for a booking
     * Used for: preventing duplicate reviews, populating hasReview flag
     */
    boolean existsByBookingId(Long bookingId);
}
