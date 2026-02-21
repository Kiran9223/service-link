package com.kiran.servicelink.controller;

import com.kiran.servicelink.dto.response.NotificationResponseDTO;
import com.kiran.servicelink.security.jwt.JwtTokenProvider;
import com.kiran.servicelink.service.NotificationService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * REST API for notification management
 *
 * Base path: /api/notifications
 *
 * ENDPOINTS:
 * - GET    /                      Get user's notifications (paginated)
 * - GET    /unread-count          Get unread notification count
 * - PUT    /{id}/read             Mark notification as read
 * - PUT    /read-all              Mark all notifications as read
 * - DELETE /{id}                  Delete notification
 *
 * AUTHENTICATION:
 * - All endpoints require authentication
 * - JWT token in Authorization header
 *
 * AUTHORIZATION:
 * - Users can only access their own notifications
 * - Service layer validates ownership
 */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Slf4j
public class NotificationController {

    private final NotificationService notificationService;
    private final JwtTokenProvider jwtTokenProvider;

    // ========== GET NOTIFICATIONS ==========

    /**
     * Get paginated notifications for authenticated user
     *
     * GET /api/notifications?page=0&size=20
     *
     * Query Parameters:
     * - page: Page number (default: 0)
     * - size: Page size (default: 20, max: 100)
     *
     * Returns: Page of notifications ordered by newest first
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<NotificationResponseDTO>> getUserNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            HttpServletRequest httpRequest) {

        log.info("GET /api/notifications - page: {}, size: {}", page, size);

        // Validate pagination parameters
        if (page < 0) {
            page = 0;
        }
        if (size < 1 || size > 100) {
            size = 20;
        }

        Integer userId = getAuthenticatedUserId(httpRequest);
        Page<NotificationResponseDTO> notifications = notificationService.getUserNotifications(userId, page, size);

        log.info("Found {} notifications for user {} (page {}/{})",
                notifications.getNumberOfElements(),
                userId,
                page,
                notifications.getTotalPages());

        return ResponseEntity.ok(notifications);
    }

    // ========== GET UNREAD COUNT ==========

    /**
     * Get unread notification count for authenticated user
     *
     * GET /api/notifications/unread-count
     *
     * Returns: Count of unread notifications
     * Used for badge display in UI
     */
    @GetMapping("/unread-count")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Long>> getUnreadCount(HttpServletRequest httpRequest) {

        log.info("GET /api/notifications/unread-count");

        Integer userId = getAuthenticatedUserId(httpRequest);
        Long count = notificationService.getUnreadCount(userId);

        log.debug("User {} has {} unread notifications", userId, count);

        Map<String, Long> response = new HashMap<>();
        response.put("unreadCount", count);

        return ResponseEntity.ok(response);
    }

    // ========== MARK AS READ ==========

    /**
     * Mark a notification as read
     *
     * PUT /api/notifications/{id}/read
     *
     * Authorization: User must own the notification
     *
     * Returns: 204 No Content on success
     */
    @PutMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> markAsRead(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {

        log.info("PUT /api/notifications/{}/read", id);

        Integer userId = getAuthenticatedUserId(httpRequest);
        notificationService.markAsRead(id, userId);

        log.debug("Marked notification {} as read for user {}", id, userId);

        return ResponseEntity.noContent().build();
    }

    // ========== MARK ALL AS READ ==========

    /**
     * Mark all notifications as read for authenticated user
     *
     * PUT /api/notifications/read-all
     *
     * Returns: Number of notifications marked as read
     */
    @PutMapping("/read-all")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Integer>> markAllAsRead(HttpServletRequest httpRequest) {

        log.info("PUT /api/notifications/read-all");

        Integer userId = getAuthenticatedUserId(httpRequest);
        int count = notificationService.markAllAsRead(userId);

        log.info("Marked {} notifications as read for user {}", count, userId);

        Map<String, Integer> response = new HashMap<>();
        response.put("markedCount", count);

        return ResponseEntity.ok(response);
    }

    // ========== DELETE NOTIFICATION ==========

    /**
     * Delete a notification
     *
     * DELETE /api/notifications/{id}
     *
     * Authorization: User must own the notification
     *
     * Returns: 204 No Content on success
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteNotification(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {

        log.info("DELETE /api/notifications/{}", id);

        Integer userId = getAuthenticatedUserId(httpRequest);
        notificationService.deleteNotification(id, userId);

        log.debug("Deleted notification {} for user {}", id, userId);

        return ResponseEntity.noContent().build();
    }

    // ========== JWT HELPER METHODS ==========

    /**
     * Extract authenticated user ID from JWT token
     *
     * Pattern: Consistent with existing controllers
     *
     * @param request HTTP request with Authorization header
     * @return User ID from JWT token
     * @throws RuntimeException if token invalid or missing
     */
    private Integer getAuthenticatedUserId(HttpServletRequest request) {
        String jwt = getJwtFromRequest(request);
        return jwtTokenProvider.getUserIdFromToken(jwt);
    }

    /**
     * Extract JWT token from Authorization header
     *
     * Expected format: "Bearer <token>"
     *
     * @param request HTTP request
     * @return JWT token string (without "Bearer " prefix)
     */
    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        throw new RuntimeException("JWT token not found in request");
    }
}