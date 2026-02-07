package com.kiran.servicelink.service;

import com.kiran.servicelink.dto.response.CategoryResponseDTO;
import com.kiran.servicelink.entity.ServiceCategory;
import com.kiran.servicelink.repository.ServiceCategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.kiran.servicelink.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for managing service categories
 * Currently read-only; admin operations to be added later
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CategoryService {

    private final ServiceCategoryRepository categoryRepository;

    /**
     * Get all active categories, sorted by display order
     * Used for: Dropdowns, category browsing
     */
    public List<CategoryResponseDTO> getAllActiveCategories() {
        log.debug("Fetching all active categories");

        List<ServiceCategory> categories = categoryRepository
                .findByIsActiveTrueOrderByDisplayOrderDesc();

        return categories.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get category by ID
     * Used for: Validation, category detail pages
     *
     * throws ResourceNotFoundException if category not found
     */
    public CategoryResponseDTO getCategoryById(Long id) {
        log.debug("Fetching category with id: {}", id);

        ServiceCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Category not found with id: " + id));

        return mapToResponseDTO(category);
    }

    /**
     * Check if category exists and is active
     * Used for: Service listing validation
     */
    public boolean isCategoryActiveById(Long id) {
        return categoryRepository.findById(id)
                .map(ServiceCategory::getIsActive)
                .orElse(false);
    }

    /**
     * Get category entity by ID (for internal use)
     * Package-private - only used by other services
     */
    ServiceCategory getCategoryEntityById(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Category not found with id: " + id));
    }

    // ========== Mapping Methods ==========

    private CategoryResponseDTO mapToResponseDTO(ServiceCategory entity) {
        return CategoryResponseDTO.builder()
                .id(entity.getId())
                .name(entity.getName())
                .description(entity.getDescription())
                .isActive(entity.getIsActive())
                .displayOrder(entity.getDisplayOrder())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
