package com.kiran.servicelink.service;

import com.kiran.servicelink.dto.request.UpdateProviderProfileRequest;
import com.kiran.servicelink.dto.request.UpdateUserProfileRequest;
import com.kiran.servicelink.dto.response.UserProfileResponse;
import com.kiran.servicelink.entity.Role;
import com.kiran.servicelink.entity.ServiceProvider;
import com.kiran.servicelink.entity.User;
import com.kiran.servicelink.exception.ResourceNotFoundException;
import com.kiran.servicelink.repository.ServiceProviderRepository;
import com.kiran.servicelink.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final ServiceProviderRepository serviceProviderRepository;

    /**
     * Get the full profile for the authenticated user.
     * Includes provider fields if the user is a SERVICE_PROVIDER.
     */
    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(User user) {
        log.debug("Fetching profile for user {}", user.getId());

        UserProfileResponse.UserProfileResponseBuilder builder = UserProfileResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .city(user.getCity())
                .state(user.getState())
                .postalCode(user.getPostalCode())
                .role(user.getRole())
                .isActive(user.getIsActive())
                .emailVerified(user.getEmailVerified())
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt());

        if (user.getRole() == Role.SERVICE_PROVIDER) {
            serviceProviderRepository.findById(user.getId()).ifPresent(sp -> {
                builder.businessName(sp.getBusinessName())
                        .description(sp.getDescription())
                        .yearsOfExperience(sp.getYearsOfExperience())
                        .isCertified(sp.getIsCertified())
                        .isInsured(sp.getIsInsured())
                        .serviceRadiusMiles(sp.getServiceRadiusMiles())
                        .overallRating(sp.getOverallRating())
                        .totalBookingsCompleted(sp.getTotalBookingsCompleted());
            });
        }

        return builder.build();
    }

    /**
     * Update personal information (name, phone, location) for any user.
     */
    @Transactional
    public UserProfileResponse updateUserProfile(User user, UpdateUserProfileRequest request) {
        log.info("Updating personal profile for user {}", user.getId());

        User managed = userRepository.findById(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (request.getName() != null && !request.getName().isBlank()) {
            managed.setName(request.getName());
        }
        if (request.getPhone() != null) {
            managed.setPhone(request.getPhone().isBlank() ? null : request.getPhone());
        }
        if (request.getCity() != null) {
            managed.setCity(request.getCity().isBlank() ? null : request.getCity());
        }
        if (request.getState() != null) {
            managed.setState(request.getState().isBlank() ? null : request.getState());
        }
        if (request.getPostalCode() != null) {
            managed.setPostalCode(request.getPostalCode().isBlank() ? null : request.getPostalCode());
        }

        userRepository.save(managed);
        log.debug("User {} profile saved", managed.getId());

        return getProfile(managed);
    }

    /**
     * Update provider-specific information.
     * Only callable when the user is a SERVICE_PROVIDER.
     */
    @Transactional
    public UserProfileResponse updateProviderProfile(User user, UpdateProviderProfileRequest request) {
        log.info("Updating provider profile for user {}", user.getId());

        ServiceProvider sp = serviceProviderRepository.findById(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Provider profile not found"));

        if (request.getBusinessName() != null && !request.getBusinessName().isBlank()) {
            sp.setBusinessName(request.getBusinessName());
        }
        if (request.getDescription() != null) {
            sp.setDescription(request.getDescription().isBlank() ? null : request.getDescription());
        }
        if (request.getYearsOfExperience() != null) {
            sp.setYearsOfExperience(request.getYearsOfExperience());
        }
        if (request.getIsCertified() != null) {
            sp.setIsCertified(request.getIsCertified());
        }
        if (request.getIsInsured() != null) {
            sp.setIsInsured(request.getIsInsured());
        }
        if (request.getServiceRadiusMiles() != null) {
            sp.setServiceRadiusMiles(request.getServiceRadiusMiles());
        }

        serviceProviderRepository.save(sp);
        log.debug("Provider {} profile saved", sp.getId());

        return getProfile(user);
    }
}
