package com.kiran.servicelink.controller;

import com.kiran.servicelink.dto.response.CategoryResponseDTO;
import com.kiran.servicelink.service.CategoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for service categories
 * Public endpoints - no authentication required
 */
@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
@Slf4j
public class CategoryController {

    private final CategoryService categoryService;

    /**
     * GET /api/categories
     * Get all active categories, sorted by display order
     */
    @GetMapping
    public ResponseEntity<List<CategoryResponseDTO>> getAllCategories() {
        log.info("GET /api/categories - Fetching all active categories");

        List<CategoryResponseDTO> categories = categoryService.getAllActiveCategories();

        return ResponseEntity.ok(categories);
    }

    /**
     * GET /api/categories/{id}
     * Get category by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<CategoryResponseDTO> getCategoryById(@PathVariable Long id) {
        log.info("GET /api/categories/{} - Fetching category by ID", id);

        CategoryResponseDTO category = categoryService.getCategoryById(id);

        return ResponseEntity.ok(category);
    }
}