package com.kiran.servicelink.service;

import com.kiran.servicelink.dto.request.RatingRequestDTO;
import com.kiran.servicelink.dto.response.RatingResponseDTO;
import com.kiran.servicelink.entity.Rating;
import com.kiran.servicelink.enums.BookingStatus;
import com.kiran.servicelink.exception.ForbiddenException;
import com.kiran.servicelink.exception.ResourceNotFoundException;
import com.kiran.servicelink.exception.ValidationException;
import com.kiran.servicelink.repository.BookingRepository;
import com.kiran.servicelink.repository.RatingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RatingService {

    private final RatingRepository ratingRepository;
    private final BookingRepository bookingRepository;
    private final NotificationService notificationService;

    /**
     * Submit a rating for a completed booking.
     *
     * Rules:
     * - Booking must exist and be COMPLETED
     * - Caller must be the customer who made the booking
     * - One review per booking (booking_id is UNIQUE in DB)
     */
    @Transactional
    public RatingResponseDTO submitRating(RatingRequestDTO request, Integer userId) {

        var booking = bookingRepository.findByIdWithRelationships(request.getBookingId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Booking not found with id: " + request.getBookingId()));

        if (booking.getStatus() != BookingStatus.COMPLETED) {
            throw new ValidationException("Reviews can only be submitted for completed bookings");
        }

        if (!booking.getCustomer().getId().equals(userId)) {
            throw new ForbiddenException("Only the customer who made this booking can submit a review");
        }

        if (ratingRepository.existsByBookingId(request.getBookingId())) {
            throw new ValidationException("A review has already been submitted for this booking");
        }

        Rating rating = Rating.builder()
                .booking(booking)
                .customer(booking.getCustomer())
                .provider(booking.getProvider())
                .stars(request.getStars())
                .reviewText(request.getReviewText())
                .build();

        rating = ratingRepository.save(rating);
        log.info("Rating {} submitted for booking {} by customer {}",
                rating.getId(), request.getBookingId(), userId);

        // Notify provider that a review was received
        notificationService.notifyReviewReceived(
                booking.getProvider().getUser().getId(),
                booking.getId(),
                booking.getCustomer().getName(),
                request.getStars()
        );

        return mapToDTO(rating);
    }

    /**
     * Get the rating for a specific booking.
     * Returns empty if no review has been submitted yet.
     */
    @Transactional(readOnly = true)
    public Optional<RatingResponseDTO> getRatingByBookingId(Long bookingId) {
        return ratingRepository.findByBookingId(bookingId).map(this::mapToDTO);
    }

    /**
     * Get all visible ratings for a provider, newest first.
     */
    @Transactional(readOnly = true)
    public List<RatingResponseDTO> getProviderRatings(Integer providerId) {
        return ratingRepository
                .findByProviderIdAndIsVisibleTrueOrderByCreatedAtDesc(providerId)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    private RatingResponseDTO mapToDTO(Rating rating) {
        return RatingResponseDTO.builder()
                .id(rating.getId())
                .bookingId(rating.getBooking().getId())
                .stars(rating.getStars())
                .reviewText(rating.getReviewText())
                .customerId(rating.getCustomer().getId())
                .customerName(rating.getCustomer().getName())
                .providerResponse(rating.getProviderResponse())
                .providerRespondedAt(rating.getProviderRespondedAt())
                .createdAt(rating.getCreatedAt())
                .build();
    }
}
