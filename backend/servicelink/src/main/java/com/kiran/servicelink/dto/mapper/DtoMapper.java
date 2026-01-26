package com.kiran.servicelink.dto.mapper;

import com.kiran.servicelink.dto.response.ServiceProviderDTO;
import com.kiran.servicelink.dto.response.UserDTO;
import com.kiran.servicelink.entity.ServiceProvider;
import com.kiran.servicelink.entity.User;
import org.springframework.stereotype.Component;

@Component
public class DtoMapper {

    /**
     * Convert User entity to UserDTO
     * NEVER include password in DTO!
     */
    public UserDTO toUserDTO(User user) {
        if (user == null) {
            return null;
        }

        return UserDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .city(user.getCity())
                .state(user.getState())
                .country(user.getCountry())
                .postalCode(user.getPostalCode())
                .latitude(user.getLatitude())
                .longitude(user.getLongitude())
                .role(user.getRole())
                .isActive(user.getIsActive())
                .emailVerified(user.getEmailVerified())
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .build();
    }

    /**
     * Convert ServiceProvider entity to ServiceProviderDTO
     * Includes embedded UserDTO
     */
    public ServiceProviderDTO toServiceProviderDTO(ServiceProvider provider) {
        if (provider == null) {
            return null;
        }

        ServiceProviderDTO dto = ServiceProviderDTO.builder()
                .id(provider.getId())
                .user(toUserDTO(provider.getUser()))  // Embed user info
                .businessName(provider.getBusinessName())
                .description(provider.getDescription())
                .yearsOfExperience(provider.getYearsOfExperience())
                .isCertified(provider.getIsCertified())
                .isInsured(provider.getIsInsured())
                .serviceRadiusMiles(provider.getServiceRadiusMiles())
                .overallRating(provider.getOverallRating())
                .totalBookingsCompleted(provider.getTotalBookingsCompleted())
                .profilePhotoUrl(provider.getProfilePhotoUrl())
                .businessPhotos(provider.getBusinessPhotos())
                .createdAt(provider.getCreatedAt())
                .build();

        // Compute derived fields
        dto.computeDerivedFields();

        return dto;
    }

    /**
     * Convert ServiceProvider to ServiceProviderDTO without user details
     * (if user info already available separately)
     */
    public ServiceProviderDTO toServiceProviderDTOWithoutUser(ServiceProvider provider) {
        if (provider == null) {
            return null;
        }

        ServiceProviderDTO dto = ServiceProviderDTO.builder()
                .id(provider.getId())
                .businessName(provider.getBusinessName())
                .description(provider.getDescription())
                .yearsOfExperience(provider.getYearsOfExperience())
                .isCertified(provider.getIsCertified())
                .isInsured(provider.getIsInsured())
                .serviceRadiusMiles(provider.getServiceRadiusMiles())
                .overallRating(provider.getOverallRating())
                .totalBookingsCompleted(provider.getTotalBookingsCompleted())
                .profilePhotoUrl(provider.getProfilePhotoUrl())
                .businessPhotos(provider.getBusinessPhotos())
                .createdAt(provider.getCreatedAt())
                .build();

        dto.computeDerivedFields();

        return dto;
    }
}