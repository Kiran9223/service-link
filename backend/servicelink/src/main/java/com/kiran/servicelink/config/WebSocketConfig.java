package com.kiran.servicelink.config;

import com.kiran.servicelink.security.jwt.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.List;

/**
 * WebSocket configuration for real-time notifications
 * 
 * Configuration:
 * - STOMP over WebSocket protocol
 * - Endpoint: /ws/notifications
 * - Message broker: Simple in-memory broker
 * - User destinations: /user/queue/notifications
 * - JWT authentication in handshake
 * 
 * Client connection flow:
 * 1. Client connects to: ws://localhost:8081/ws/notifications
 * 2. Client sends CONNECT with Authorization header: Bearer <JWT_TOKEN>
 * 3. Server validates JWT and establishes connection
 * 4. Client subscribes to: /user/queue/notifications
 * 5. Server broadcasts notifications to this destination
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
@Slf4j
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtTokenProvider jwtTokenProvider;

    /**
     * Configure message broker
     * 
     * - Simple broker for /queue and /topic destinations
     * - Application destination prefix: /app
     * - User destination prefix: /user
     */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Enable simple in-memory message broker
        // Messages to /queue or /topic are handled by this broker
        registry.enableSimpleBroker("/queue", "/topic");

        // Application destination prefix
        // Messages sent to /app/* are routed to @MessageMapping methods
        registry.setApplicationDestinationPrefixes("/app");

        // User destination prefix
        // Messages to /user/{userId}/queue/notifications are user-specific
        registry.setUserDestinationPrefix("/user");
    }

    /**
     * Register STOMP endpoints
     * 
     * Endpoint: /ws/notifications
     * - WebSocket handshake occurs here
     * - SockJS fallback enabled for broader browser support
     * - CORS allowed from React dev server (localhost:3000)
     */
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws/notifications")
                .setAllowedOrigins("http://localhost:3000","http://localhost:5173") // React dev server
                .withSockJS(); // Fallback for browsers without WebSocket support
    }

    /**
     * Configure client inbound channel
     * 
     * Add JWT authentication interceptor
     * Validates token on CONNECT command
     */
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(
                        message,
                        StompHeaderAccessor.class
                );

                if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
                    // Extract JWT token from Authorization header
                    String authHeader = accessor.getFirstNativeHeader("Authorization");

                    if (authHeader != null && authHeader.startsWith("Bearer ")) {
                        String token = authHeader.substring(7);

                        try {
                            // Validate JWT token
                            if (jwtTokenProvider.validateToken(token)) {
                                // Extract user ID from token
                                String userId = String.valueOf(jwtTokenProvider.getUserIdFromToken(token));

                                // Create authentication object
                                Authentication auth = new UsernamePasswordAuthenticationToken(
                                        userId,
                                        null,
                                        List.of(new SimpleGrantedAuthority("ROLE_USER"))
                                );

                                // Set authentication in accessor
                                accessor.setUser(auth);

                                log.debug("WebSocket connection authenticated for user: {}", userId);
                            } else {
                                log.warn("Invalid JWT token in WebSocket handshake");
                            }
                        } catch (Exception e) {
                            log.error("Error validating JWT token in WebSocket handshake", e);
                        }
                    } else {
                        log.warn("No Authorization header in WebSocket handshake");
                    }
                }

                return message;
            }
        });
    }
}