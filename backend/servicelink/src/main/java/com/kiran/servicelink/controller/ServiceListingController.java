package com.kiran.servicelink.controller;

import com.kiran.servicelink.security.jwt.JwtTokenProvider;
import com.kiran.servicelink.dto.request.ServiceListingRequestDTO;
import com.kiran.servicelink.dto.response.ServiceListingResponseDTO;
import com.kiran.servicelink.enums.PricingType;
import com.kiran.servicelink.service.ServiceListingService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/services")
@RequiredArgsConstructor
@Slf4j
public class ServiceListingController {

    private final ServiceListingService serviceListingService;
    private final JwtTokenProvider jwtTokenProvider;

    // ========== Provider Operations (Authenticated) ==========

    @PostMapping
    @PreAuthorize("hasRole('SERVICE_PROVIDER')")
    public ResponseEntity<ServiceListingResponseDTO> createService(
            @Valid @RequestBody ServiceListingRequestDTO request,
            HttpServletRequest httpRequest) {

        log.info("POST /api/services - Creating service listing");

        Integer userId = getAuthenticatedUserId(httpRequest);
        ServiceListingResponseDTO created = serviceListingService.createService(request, userId);

        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SERVICE_PROVIDER')")
    public ResponseEntity<ServiceListingResponseDTO> updateService(
            @PathVariable Long id,
            @Valid @RequestBody ServiceListingRequestDTO request,
            HttpServletRequest httpRequest) {

        log.info("PUT /api/services/{} - Updating service listing", id);

        Integer userId = getAuthenticatedUserId(httpRequest);
        ServiceListingResponseDTO updated = serviceListingService.updateService(id, request, userId);

        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SERVICE_PROVIDER')")
    public ResponseEntity<Void> deleteService(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {

        log.info("DELETE /api/services/{} - Deactivating service listing", id);

        Integer userId = getAuthenticatedUserId(httpRequest);
        serviceListingService.deleteService(id, userId);

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/my-services")
    @PreAuthorize("hasRole('SERVICE_PROVIDER')")
    public ResponseEntity<List<ServiceListingResponseDTO>> getMyServices(
            HttpServletRequest httpRequest) {

        log.info("GET /api/services/my-services - Fetching provider's services");

        Integer userId = getAuthenticatedUserId(httpRequest);
        List<ServiceListingResponseDTO> services = serviceListingService.getMyServices(userId);

        return ResponseEntity.ok(services);
    }

    // ========== Public Operations ==========

    @GetMapping("/{id}")
    public ResponseEntity<ServiceListingResponseDTO> getServiceById(@PathVariable Long id) {
        log.info("GET /api/services/{} - Fetching service by ID", id);

        ServiceListingResponseDTO service = serviceListingService.getServiceById(id);

        return ResponseEntity.ok(service);
    }

    @GetMapping("/category/{categoryId}")
    public ResponseEntity<List<ServiceListingResponseDTO>> getServicesByCategory(
            @PathVariable Long categoryId) {

        log.info("GET /api/services/category/{} - Fetching services by category", categoryId);

        List<ServiceListingResponseDTO> services =
                serviceListingService.getServicesByCategory(categoryId);

        return ResponseEntity.ok(services);
    }

    @GetMapping("/provider/{providerId}")
    public ResponseEntity<List<ServiceListingResponseDTO>> getServicesByProvider(
            @PathVariable Long providerId) {

        log.info("GET /api/services/provider/{} - Fetching services by provider", providerId);

        List<ServiceListingResponseDTO> services =
                serviceListingService.getServicesByProviderId(providerId);

        return ResponseEntity.ok(services);
    }

    @GetMapping("/search")
    public ResponseEntity<List<ServiceListingResponseDTO>> searchServices(
            @RequestParam Long categoryId,
            @RequestParam(required = false) PricingType pricingType,
            @RequestParam(required = false) BigDecimal maxPrice) {

        log.info("GET /api/services/search - category: {}, pricingType: {}, maxPrice: {}",
                categoryId, pricingType, maxPrice);

        List<ServiceListingResponseDTO> services =
                serviceListingService.searchServices(categoryId, pricingType, maxPrice);

        return ResponseEntity.ok(services);
    }

    // ========== Helper Methods ==========

    /**
     * Extract authenticated user ID from JWT token in request header
     */
    private Integer getAuthenticatedUserId(HttpServletRequest request) {
        String jwt = getJwtFromRequest(request);

        if (jwt == null) {
            throw new RuntimeException("No JWT token found in request");
        }

        Integer userId = jwtTokenProvider.getUserIdFromToken(jwt);

        if (userId == null) {
            throw new RuntimeException("User ID not found in JWT token");
        }

        return userId; // Convert Integer to Long
    }

    /**
     * Extract JWT token from Authorization header
     */
    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");

        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }

        return null;
    }
}
