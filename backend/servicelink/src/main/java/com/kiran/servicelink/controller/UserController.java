package com.kiran.servicelink.controller;

import com.kiran.servicelink.dto.request.UpdateProviderProfileRequest;
import com.kiran.servicelink.dto.request.UpdateUserProfileRequest;
import com.kiran.servicelink.dto.response.UserProfileResponse;
import com.kiran.servicelink.entity.User;
import com.kiran.servicelink.exception.ResourceNotFoundException;
import com.kiran.servicelink.repository.UserRepository;
import com.kiran.servicelink.security.jwt.JwtTokenProvider;
import com.kiran.servicelink.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserService userService;
    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;

    /**
     * GET /api/users/me
     * Returns the full profile of the authenticated user.
     * Includes provider fields if the user is a SERVICE_PROVIDER.
     */
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserProfileResponse> getMyProfile(HttpServletRequest httpRequest) {
        log.debug("GET /api/users/me");
        User user = getAuthenticatedUser(httpRequest);
        return ResponseEntity.ok(userService.getProfile(user));
    }

    /**
     * PUT /api/users/me
     * Updates personal information (name, phone, city, state, postalCode).
     * Available to all authenticated users.
     */
    @PutMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserProfileResponse> updateMyProfile(
            @Valid @RequestBody UpdateUserProfileRequest request,
            HttpServletRequest httpRequest) {
        log.info("PUT /api/users/me");
        User user = getAuthenticatedUser(httpRequest);
        return ResponseEntity.ok(userService.updateUserProfile(user, request));
    }

    /**
     * PUT /api/users/me/provider
     * Updates provider-specific information (businessName, description, etc.).
     * Only accessible to SERVICE_PROVIDER users.
     */
    @PutMapping("/me/provider")
    @PreAuthorize("hasRole('SERVICE_PROVIDER')")
    public ResponseEntity<UserProfileResponse> updateMyProviderProfile(
            @Valid @RequestBody UpdateProviderProfileRequest request,
            HttpServletRequest httpRequest) {
        log.info("PUT /api/users/me/provider");
        User user = getAuthenticatedUser(httpRequest);
        return ResponseEntity.ok(userService.updateProviderProfile(user, request));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private User getAuthenticatedUser(HttpServletRequest request) {
        String jwt = getJwtFromRequest(request);
        Integer userId = jwtTokenProvider.getUserIdFromToken(jwt);
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        throw new RuntimeException("JWT token not found in request");
    }
}
