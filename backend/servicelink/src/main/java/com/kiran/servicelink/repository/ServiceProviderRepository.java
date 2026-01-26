package com.kiran.servicelink.repository;

import com.kiran.servicelink.entity.ServiceProvider;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceProviderRepository extends JpaRepository<ServiceProvider, Integer> {


    Optional<ServiceProvider> findByUserId(Integer userId);

    boolean existsByUserId(Integer userId);

    // ==================== Rating-Based Queries ====================

    /**
     * Find providers with rating above threshold
     * Used for quality filtering
     */
    @Query("SELECT sp FROM ServiceProvider sp WHERE sp.overallRating >= :minRating ORDER BY sp.overallRating DESC")
    List<ServiceProvider> findByMinimumRating(@Param("minRating") BigDecimal minRating);

    /**
     * Find top-rated providers (limit results)
     * Used for "featured providers" section
     */
    @Query(value = "SELECT * FROM service_providers WHERE overall_rating IS NOT NULL ORDER BY overall_rating DESC LIMIT :limit",
            nativeQuery = true)
    List<ServiceProvider> findTopRatedProviders(@Param("limit") int limit);

    /**
     * Find providers with no rating yet
     * Important for fairness algorithm - boost unrated providers
     */
    List<ServiceProvider> findByOverallRatingIsNull();

    // ==================== Experience-Based Queries ====================

    /**
     * Find providers by minimum years of experience
     */
    @Query("SELECT sp FROM ServiceProvider sp WHERE sp.yearsOfExperience >= :minYears")
    List<ServiceProvider> findByMinimumExperience(@Param("minYears") Integer minYears);

    /**
     * Find certified providers
     */
    List<ServiceProvider> findByIsCertifiedTrue();

    /**
     * Find insured providers
     */
    List<ServiceProvider> findByIsInsuredTrue();

    /**
     * Find certified AND insured providers
     */
    List<ServiceProvider> findByIsCertifiedTrueAndIsInsuredTrue();

    // ==================== Fairness Algorithm Queries ====================

    /**
     * Find new providers (joined within last N days)
     * Critical for fairness algorithm - boost new providers
     */
    @Query("SELECT sp FROM ServiceProvider sp WHERE sp.createdAt >= :sinceDate ORDER BY sp.createdAt DESC")
    List<ServiceProvider> findNewProviders(@Param("sinceDate") LocalDateTime sinceDate);

    /**
     * Find underutilized providers (fewer than N bookings)
     * Critical for fairness algorithm - boost low-booking providers
     */
    @Query("SELECT sp FROM ServiceProvider sp WHERE sp.totalBookingsCompleted < :maxBookings ORDER BY sp.totalBookingsCompleted ASC")
    List<ServiceProvider> findUnderutilizedProviders(@Param("maxBookings") Integer maxBookings);

    /**
     * Find providers eligible for fairness boost
     * Combines new provider AND underutilized criteria
     */
    @Query("SELECT sp FROM ServiceProvider sp WHERE " +
            "(sp.createdAt >= :sinceDate OR sp.totalBookingsCompleted < :maxBookings) " +
            "ORDER BY sp.createdAt DESC, sp.totalBookingsCompleted ASC")
    List<ServiceProvider> findProvidersEligibleForBoost(
            @Param("sinceDate") LocalDateTime sinceDate,
            @Param("maxBookings") Integer maxBookings
    );

    // ==================== Performance Metrics Queries ====================

    /**
     * Find providers by booking count range
     * Used for analytics and fairness distribution analysis
     */
    @Query("SELECT sp FROM ServiceProvider sp WHERE " +
            "sp.totalBookingsCompleted >= :minBookings AND sp.totalBookingsCompleted <= :maxBookings " +
            "ORDER BY sp.totalBookingsCompleted DESC")
    List<ServiceProvider> findByBookingRange(
            @Param("minBookings") Integer minBookings,
            @Param("maxBookings") Integer maxBookings
    );

    /**
     * Count providers by booking threshold
     * Analytics: how many providers have < X bookings?
     */
    long countByTotalBookingsCompletedLessThan(Integer threshold);

    /**
     * Get average rating across all providers
     * Platform-wide metric
     */
    @Query("SELECT AVG(sp.overallRating) FROM ServiceProvider sp WHERE sp.overallRating IS NOT NULL")
    BigDecimal getAverageRating();

    // ==================== Update Queries ====================

    /**
     * Update provider rating
     * Called after new review is submitted
     */
    @Modifying
    @Query("UPDATE ServiceProvider sp SET sp.overallRating = :rating WHERE sp.id = :providerId")
    void updateRating(@Param("providerId") Integer providerId, @Param("rating") BigDecimal rating);

    /**
     * Increment booking count
     * Called when booking is completed
     */
    @Modifying
    @Query("UPDATE ServiceProvider sp SET sp.totalBookingsCompleted = sp.totalBookingsCompleted + 1 WHERE sp.id = :providerId")
    void incrementBookingCount(@Param("providerId") Integer providerId);

    // ==================== Location-Based Queries (Placeholder for Phase 3) ====================

    /**
     * Find providers within service radius of a location
     * NOTE: This is a simplified version. Will be replaced with Redis geospatial in Phase 3
     *
     * Haversine formula for distance calculation:
     * Distance in miles = 3959 * acos(cos(radians(lat1)) * cos(radians(lat2)) *
     *                     cos(radians(lng2) - radians(lng1)) + sin(radians(lat1)) *
     *                     sin(radians(lat2)))
     */
    @Query(value =
            "SELECT sp.* FROM service_providers sp " +
                    "INNER JOIN users u ON sp.user_id = u.id " +
                    "WHERE u.latitude IS NOT NULL AND u.longitude IS NOT NULL " +
                    "AND (3959 * acos(cos(radians(:userLat)) * cos(radians(u.latitude)) * " +
                    "     cos(radians(u.longitude) - radians(:userLng)) + " +
                    "     sin(radians(:userLat)) * sin(radians(u.latitude)))) <= sp.service_radius_miles " +
                    "ORDER BY (3959 * acos(cos(radians(:userLat)) * cos(radians(u.latitude)) * " +
                    "         cos(radians(u.longitude) - radians(:userLng)) + " +
                    "         sin(radians(:userLat)) * sin(radians(u.latitude))))",
            nativeQuery = true)
    List<ServiceProvider> findProvidersNearLocation(
            @Param("userLat") BigDecimal userLatitude,
            @Param("userLng") BigDecimal userLongitude
    );

    // ==================== Business Name Search ====================

    /**
     * Search providers by business name (partial match, case-insensitive)
     */
    @Query("SELECT sp FROM ServiceProvider sp WHERE LOWER(sp.businessName) LIKE LOWER(CONCAT('%', :searchTerm, '%'))")
    List<ServiceProvider> searchByBusinessName(@Param("searchTerm") String searchTerm);
}
