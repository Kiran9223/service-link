package com.kiran.servicelink.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RatingResponseDTO {

    private Long id;
    private Long bookingId;
    private Integer stars;
    private String reviewText;
    private Integer customerId;
    private String customerName;
    private String providerResponse;
    private LocalDateTime providerRespondedAt;
    private LocalDateTime createdAt;
}
