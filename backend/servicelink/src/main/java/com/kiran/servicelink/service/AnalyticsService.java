package com.kiran.servicelink.service;

import com.kiran.servicelink.dto.response.FairnessMetricDTO;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
public class AnalyticsService {

    private static final double BOOST_THRESHOLD = 20.0;
    private static final double FAIRNESS_BOOST = 0.15;

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional(readOnly = true)
    public List<FairnessMetricDTO> getFairnessMetrics() {
        String sql = """
                SELECT sp.user_id,
                       u.name,
                       sp.overall_rating,
                       sp.total_bookings_completed,
                       COUNT(r.id) AS review_count
                FROM service_providers sp
                JOIN users u ON u.id = sp.user_id
                LEFT JOIN ratings r ON r.provider_id = sp.user_id AND r.is_visible = TRUE
                WHERE sp.total_bookings_completed > 0 OR sp.overall_rating > 0
                GROUP BY sp.user_id, u.name, sp.overall_rating, sp.total_bookings_completed
                ORDER BY sp.total_bookings_completed DESC
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery(sql).getResultList();

        List<FairnessMetricDTO> metrics = new ArrayList<>();
        for (Object[] row : rows) {
            Long providerId = ((Number) row[0]).longValue();
            String providerName = (String) row[1];
            Double overallRating = row[2] != null ? ((BigDecimal) row[2]).doubleValue() : 0.0;
            Integer totalBookings = row[3] != null ? ((Number) row[3]).intValue() : 0;
            Long reviewCount = row[4] != null ? ((Number) row[4]).longValue() : 0L;

            double ratingScore = (overallRating / 5.0) * 0.4;
            double popularityScore = (Math.min(totalBookings, BOOST_THRESHOLD) / BOOST_THRESHOLD) * 0.2;
            double availabilityScore = 0.2;
            double proximityScore = 0.2;
            double baseScore = ratingScore + popularityScore + availabilityScore + proximityScore;
            double fairnessBoost = totalBookings < BOOST_THRESHOLD ? FAIRNESS_BOOST : 0.0;
            double finalScore = Math.min(baseScore + fairnessBoost, 1.0);

            metrics.add(FairnessMetricDTO.builder()
                    .providerId(providerId)
                    .providerName(providerName)
                    .overallRating(overallRating)
                    .totalBookingsCompleted(totalBookings)
                    .reviewCount(reviewCount)
                    .ratingScore(round2(ratingScore))
                    .popularityScore(round2(popularityScore))
                    .availabilityScore(round2(availabilityScore))
                    .proximityScore(round2(proximityScore))
                    .baseScore(round2(baseScore))
                    .fairnessBoost(round2(fairnessBoost))
                    .finalScore(round2(finalScore))
                    .isNewProvider(totalBookings < BOOST_THRESHOLD)
                    .build());
        }
        return metrics;
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
