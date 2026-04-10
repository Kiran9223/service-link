package com.kiran.servicelink.repository;

import com.kiran.servicelink.entity.ServiceListing;
import com.kiran.servicelink.entity.ServiceProvider;
import com.kiran.servicelink.enums.PricingType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface ServiceListingRepository extends JpaRepository<ServiceListing, Long> {

    /**
     * Find all services by a specific provider
     * Used for: Provider dashboard, "my services" page
     */
    List<ServiceListing> findByProvider(ServiceProvider provider);

    /**
     * Find all active services by a provider
     * Used for: Public provider profile
     */
    List<ServiceListing> findByProviderAndIsActiveTrue(ServiceProvider provider);

    /**
     * Find all active services in a category
     * Used for: Category browsing, "show all plumbers"
     */
    List<ServiceListing> findByCategoryIdAndIsActiveTrueOrderByCreatedAtDesc(Long categoryId);

    /**
     * Find services by category and pricing type
     * Used for: Filtered search
     */
    List<ServiceListing> findByCategoryIdAndPricingTypeAndIsActiveTrue(
            Long categoryId,
            PricingType pricingType
    );

    /**
     * Complex search query with price filtering
     * Used for: Main search functionality
     *
     * Note: COALESCE handles different pricing types
     * - For FIXED: uses fixed_price
     * - For RANGE: uses min_price
     * - For HOURLY: uses hourly_rate
     */
    @Query("SELECT s FROM ServiceListing s " +
            "WHERE s.category.id = :categoryId " +
            "AND s.isActive = true " +
            "AND COALESCE(s.fixedPrice, s.minPrice, s.hourlyRate) <= :maxPrice " +
            "ORDER BY COALESCE(s.fixedPrice, s.minPrice, s.hourlyRate) ASC")
    List<ServiceListing> searchByCategoryAndMaxPrice(
            @Param("categoryId") Long categoryId,
            @Param("maxPrice") BigDecimal maxPrice
    );

    /**
     * Count active services for a provider
     * Used for: Provider stats, "Offers 12 services"
     */
    long countByProviderAndIsActiveTrue(ServiceProvider provider);

    /**
     * Get distinct cities where active providers offer services.
     * Optionally filtered by category name.
     * Used for: chatbot "what areas do you cover?" queries
     */
    @Query(value =
        "SELECT DISTINCT u.city FROM users u " +
        "JOIN service_providers sp ON sp.user_id = u.id " +
        "JOIN services s ON s.provider_id = sp.user_id " +
        "JOIN service_categories sc ON s.category_id = sc.id " +
        "WHERE s.is_active = true " +
        "AND u.city IS NOT NULL " +
        "AND (:category IS NULL OR LOWER(sc.name) = LOWER(:category)) " +
        "ORDER BY u.city",
        nativeQuery = true)
    List<String> findDistinctCities(@Param("category") String category);
}
