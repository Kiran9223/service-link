package com.kiran.servicelink.service;

import com.kiran.servicelink.dto.request.ServiceListingRequestDTO;
import com.kiran.servicelink.dto.response.ServiceListingResponseDTO;
import com.kiran.servicelink.entity.ServiceListing;
import com.kiran.servicelink.entity.ServiceProvider;
import com.kiran.servicelink.entity.ServiceCategory;
import com.kiran.servicelink.enums.PricingType;
import com.kiran.servicelink.exception.ForbiddenException;
import com.kiran.servicelink.exception.ResourceNotFoundException;
import com.kiran.servicelink.repository.ServiceListingRepository;
import com.kiran.servicelink.repository.ServiceProviderRepository;
import jakarta.validation.ValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for managing service listings
 * Handles CRUD operations, validation, and search
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ServiceListingService {

    private final ServiceListingRepository serviceListingRepository;
    private final ServiceProviderRepository serviceProviderRepository;
    private final CategoryService categoryService;

    // ========== Provider Operations ==========

    /**
     * Create a new service listing
     * Provider ID extracted from authenticated user
     */
    @Transactional
    public ServiceListingResponseDTO createService(
            ServiceListingRequestDTO request,
            Integer authenticatedUserId) {

        log.info("Creating service listing for provider: {}", authenticatedUserId);

        // 1. Verify user is a provider
        ServiceProvider provider = getProviderOrThrow(authenticatedUserId);

        // 2. Verify category exists and is active
        ServiceCategory category = categoryService.getCategoryEntityById(request.getCategoryId());
        if (!category.getIsActive()) {
            throw new ValidationException("Cannot create service in inactive category");
        }

        // 3. Validate pricing based on pricing type
        validatePricing(request);

        // 4. Create entity
        ServiceListing service = ServiceListing.builder()
                .provider(provider)
                .category(category)
                .serviceName(request.getServiceName())
                .description(request.getDescription())
                .pricingType(request.getPricingType())
                .hourlyRate(request.getHourlyRate())
                .fixedPrice(request.getFixedPrice())
                .minPrice(request.getMinPrice())
                .maxPrice(request.getMaxPrice())
                .estimatedDurationHours(request.getEstimatedDurationHours())
                .isActive(true)
                .build();

        // 5. Save
        ServiceListing saved = serviceListingRepository.save(service);

        log.info("Service listing created with id: {}", saved.getId());
        return mapToResponseDTO(saved);
    }

    /**
     * Update existing service listing
     * Only the owner can update
     */
    @Transactional
    public ServiceListingResponseDTO updateService(
            Long serviceId,
            ServiceListingRequestDTO request,
            Integer authenticatedUserId) {

        log.info("Updating service listing: {} by user: {}", serviceId, authenticatedUserId);

        // 1. Get existing service
        ServiceListing existing = serviceListingRepository.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Service not found with id: " + serviceId));

        // 2. Verify ownership
        if (!existing.getProvider().getId().equals(authenticatedUserId)) {
            throw new ForbiddenException("You can only update your own services");
        }

        // 3. Validate category if changed
        if (!existing.getCategory().getId().equals(request.getCategoryId())) {
            ServiceCategory newCategory = categoryService.getCategoryEntityById(request.getCategoryId());
            if (!newCategory.getIsActive()) {
                throw new ValidationException("Cannot move service to inactive category");
            }
            existing.setCategory(newCategory);
        }

        // 4. Validate pricing
        validatePricing(request);

        // 5. Update fields
        existing.setServiceName(request.getServiceName());
        existing.setDescription(request.getDescription());
        existing.setPricingType(request.getPricingType());
        existing.setHourlyRate(request.getHourlyRate());
        existing.setFixedPrice(request.getFixedPrice());
        existing.setMinPrice(request.getMinPrice());
        existing.setMaxPrice(request.getMaxPrice());
        existing.setEstimatedDurationHours(request.getEstimatedDurationHours());

        // 6. Save (updated_at automatically updated by @UpdateTimestamp)
        ServiceListing updated = serviceListingRepository.save(existing);

        log.info("Service listing updated: {}", serviceId);
        return mapToResponseDTO(updated);
    }

    /**
     * Deactivate service listing (soft delete)
     * Only the owner can delete
     */
    @Transactional
    public void deleteService(Long serviceId, Integer authenticatedUserId) {
        log.info("Deactivating service listing: {} by user: {}", serviceId, authenticatedUserId);

        ServiceListing service = serviceListingRepository.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Service not found with id: " + serviceId));

        if (!service.getProvider().getId().equals(authenticatedUserId)) {
            throw new ForbiddenException("You can only delete your own services");
        }

        service.setIsActive(false);
        serviceListingRepository.save(service);

        log.info("Service listing deactivated: {}", serviceId);
    }

    /**
     * Get all services for authenticated provider
     */
    @Transactional(readOnly = true)
    public List<ServiceListingResponseDTO> getMyServices(Integer authenticatedUserId) {
        log.debug("Fetching services for provider: {}", authenticatedUserId);

        ServiceProvider provider = getProviderOrThrow(authenticatedUserId);

        List<ServiceListing> services = serviceListingRepository.findByProvider(provider);

        return services.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // ========== Public Operations ==========

    /**
     * Get service by ID (public)
     */
    @Transactional(readOnly = true)
    public ServiceListingResponseDTO getServiceById(Long serviceId) {
        log.debug("Fetching service with id: {}", serviceId);

        ServiceListing service = serviceListingRepository.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Service not found with id: " + serviceId));

        return mapToResponseDTO(service);
    }

    /**
     * Get all active services in a category
     */
    @Transactional(readOnly = true)
    public List<ServiceListingResponseDTO> getServicesByCategory(Long categoryId) {
        log.debug("Fetching services for category: {}", categoryId);

        // Verify category exists
        categoryService.getCategoryById(categoryId);

        List<ServiceListing> services = serviceListingRepository
                .findByCategoryIdAndIsActiveTrueOrderByCreatedAtDesc(categoryId);

        return services.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get all active services by a provider (public profile)
     */
    @Transactional(readOnly = true)
    public List<ServiceListingResponseDTO> getServicesByProviderId(Long providerId) {
        log.debug("Fetching services for provider: {}", providerId);

        ServiceProvider provider = serviceProviderRepository.findById(Math.toIntExact(providerId))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Provider not found with id: " + providerId));

        List<ServiceListing> services = serviceListingRepository
                .findByProviderAndIsActiveTrue(provider);

        return services.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    /**
     * Search services by category with optional filters
     * (Geospatial filtering to be added later)
     */
    @Transactional(readOnly = true)
    public List<ServiceListingResponseDTO> searchServices(
            Long categoryId,
            PricingType pricingType,
            BigDecimal maxPrice) {

        log.debug("Searching services - category: {}, pricingType: {}, maxPrice: {}",
                categoryId, pricingType, maxPrice);

        List<ServiceListing> services;

        if (pricingType != null && maxPrice != null) {
            // Filter by both pricing type and max price
            services = serviceListingRepository
                    .findByCategoryIdAndPricingTypeAndIsActiveTrue(categoryId, pricingType);

            // Further filter by max price in memory
            services = services.stream()
                    .filter(s -> isPriceWithinBudget(s, maxPrice))
                    .collect(Collectors.toList());

        } else if (maxPrice != null) {
            // Filter by max price only
            services = serviceListingRepository
                    .searchByCategoryAndMaxPrice(categoryId, maxPrice);

        } else if (pricingType != null) {
            // Filter by pricing type only
            services = serviceListingRepository
                    .findByCategoryIdAndPricingTypeAndIsActiveTrue(categoryId, pricingType);

        } else {
            // No filters, just category
            services = serviceListingRepository
                    .findByCategoryIdAndIsActiveTrueOrderByCreatedAtDesc(categoryId);
        }

        return services.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // ========== Validation Methods ==========

    private void validatePricing(ServiceListingRequestDTO request) {
        PricingType type = request.getPricingType();

        switch (type) {
            case HOURLY:
                if (request.getHourlyRate() == null) {
                    throw new ValidationException("Hourly rate is required for HOURLY pricing");
                }
                if (request.getHourlyRate().compareTo(BigDecimal.ZERO) <= 0) {
                    throw new ValidationException("Hourly rate must be positive");
                }
                break;

            case FIXED:
                if (request.getFixedPrice() == null) {
                    throw new ValidationException("Fixed price is required for FIXED pricing");
                }
                if (request.getFixedPrice().compareTo(BigDecimal.ZERO) <= 0) {
                    throw new ValidationException("Fixed price must be positive");
                }
                break;

            case RANGE:
                if (request.getMinPrice() == null || request.getMaxPrice() == null) {
                    throw new ValidationException("Min and max prices are required for RANGE pricing");
                }
                if (request.getMinPrice().compareTo(BigDecimal.ZERO) <= 0) {
                    throw new ValidationException("Min price must be positive");
                }
                if (request.getMaxPrice().compareTo(BigDecimal.ZERO) <= 0) {
                    throw new ValidationException("Max price must be positive");
                }
                if (request.getMinPrice().compareTo(request.getMaxPrice()) >= 0) {
                    throw new ValidationException("Min price must be less than max price");
                }
                break;
        }
    }

    private boolean isPriceWithinBudget(ServiceListing service, BigDecimal maxBudget) {
        BigDecimal price;

        switch (service.getPricingType()) {
            case HOURLY:
                price = service.getHourlyRate();
                break;
            case FIXED:
                price = service.getFixedPrice();
                break;
            case RANGE:
                price = service.getMinPrice(); // Use min price for budget comparison
                break;
            default:
                return true;
        }

        return price != null && price.compareTo(maxBudget) <= 0;
    }

    // ========== Helper Methods ==========

    private ServiceProvider getProviderOrThrow(Integer userId) {
        return serviceProviderRepository.findById(userId)
                .orElseThrow(() -> new ForbiddenException(
                        "User is not registered as a service provider"));
    }

    // ========== Mapping Methods ==========

    private ServiceListingResponseDTO mapToResponseDTO(ServiceListing entity) {
        return ServiceListingResponseDTO.builder()
                .id(entity.getId())
                .provider(mapProviderSummary(entity.getProvider()))
                .category(mapCategorySummary(entity.getCategory()))
                .serviceName(entity.getServiceName())
                .description(entity.getDescription())
                .pricingType(entity.getPricingType())
                .hourlyRate(entity.getHourlyRate())
                .fixedPrice(entity.getFixedPrice())
                .minPrice(entity.getMinPrice())
                .maxPrice(entity.getMaxPrice())
                .estimatedDurationHours(entity.getEstimatedDurationHours())
                .isActive(entity.getIsActive())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private ServiceListingResponseDTO.ProviderSummary mapProviderSummary(ServiceProvider provider) {
        return ServiceListingResponseDTO.ProviderSummary.builder()
                .id(Long.valueOf(provider.getId()))
                .businessName(provider.getBusinessName())
                .overallRating(provider.getOverallRating())
                .totalBookingsCompleted(provider.getTotalBookingsCompleted())
                .yearsOfExperience(provider.getYearsOfExperience())
                .profilePhotoUrl(provider.getProfilePhotoUrl())
                .build();
    }

    private ServiceListingResponseDTO.CategorySummary mapCategorySummary(ServiceCategory category) {
        return ServiceListingResponseDTO.CategorySummary.builder()
                .id(category.getId())
                .name(category.getName())
                .build();
    }
}
