package com.kiran.servicelink.service;

import com.kiran.servicelink.dto.mapper.DtoMapper;
import com.kiran.servicelink.dto.request.LoginRequest;
import com.kiran.servicelink.dto.request.RegisterProviderRequest;
import com.kiran.servicelink.dto.request.RegisterRequest;
import com.kiran.servicelink.dto.response.AuthResponse;
import com.kiran.servicelink.dto.response.ServiceProviderDTO;
import com.kiran.servicelink.dto.response.UserDTO;
import com.kiran.servicelink.entity.Role;
import com.kiran.servicelink.entity.ServiceProvider;
import com.kiran.servicelink.entity.User;
import com.kiran.servicelink.exception.EmailAlreadyExistsException;
import com.kiran.servicelink.exception.InvalidCredentialsException;
import com.kiran.servicelink.exception.ResourceNotFoundException;
import com.kiran.servicelink.repository.ServiceProviderRepository;
import com.kiran.servicelink.repository.UserRepository;
import com.kiran.servicelink.security.jwt.JwtTokenProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final ServiceProviderRepository serviceProviderRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;
    private final DtoMapper dtoMapper;

    public AuthService(
            UserRepository userRepository,
            ServiceProviderRepository serviceProviderRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider,
            AuthenticationManager authenticationManager,
            DtoMapper dtoMapper) {
        this.userRepository = userRepository;
        this.serviceProviderRepository = serviceProviderRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.authenticationManager = authenticationManager;
        this.dtoMapper = dtoMapper;
    }

    /**
     * Register a new regular user
     */
    @Transactional
    public AuthResponse registerUser(RegisterRequest request) {
        logger.info("Registering new user with email: {}", request.getEmail());

        // Check if email already exists
        if (userRepository.existsByEmailIgnoreCase(request.getEmail())) {
            throw new EmailAlreadyExistsException(request.getEmail());
        }

        // Create user entity
        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail().toLowerCase())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .city(request.getCity())
                .state(request.getState())
                .postalCode(request.getPostalCode())
                .role(request.getRole())
                .isActive(true)
                .emailVerified(false)
                .build();

        // Save user
        user = userRepository.save(user);
        logger.info("User registered successfully with ID: {}", user.getId());

        // Generate JWT token
        String token = jwtTokenProvider.generateToken(
                user.getEmail(),
                user.getId(),
                user.getRole()
        );

        // Convert to DTO
        UserDTO userDTO = dtoMapper.toUserDTO(user);

        // Build response
        return AuthResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .user(userDTO)
                .expiresIn(jwtTokenProvider.getExpirationSeconds())
                .message("User registered successfully")
                .build();
    }

    /**
     * Register a new service provider
     */
    @Transactional
    public AuthResponse registerProvider(RegisterProviderRequest request) {
        logger.info("Registering new provider with email: {}", request.getEmail());

        // Check if email already exists
        if (userRepository.existsByEmailIgnoreCase(request.getEmail())) {
            throw new EmailAlreadyExistsException(request.getEmail());
        }

        // Create user entity with SERVICE_PROVIDER role
        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail().toLowerCase())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .city(request.getCity())
                .state(request.getState())
                .postalCode(request.getPostalCode())
                .role(Role.SERVICE_PROVIDER)
                .isActive(true)
                .emailVerified(false)
                .build();

        // Save user first
        user = userRepository.save(user);

        // Create service provider profile
        ServiceProvider provider = ServiceProvider.builder()
                .user(user)
                .businessName(request.getBusinessName())
                .description(request.getDescription())
                .yearsOfExperience(request.getYearsOfExperience())
                .isCertified(request.getIsCertified() != null ? request.getIsCertified() : false)
                .isInsured(request.getIsInsured() != null ? request.getIsInsured() : false)
                .serviceRadiusMiles(request.getServiceRadiusMiles())
                .profilePhotoUrl(request.getProfilePhotoUrl())
                .overallRating(null)  // No rating initially
                .totalBookingsCompleted(0)
                .build();

        // Save provider
        provider = serviceProviderRepository.save(provider);
        logger.info("Provider registered successfully with ID: {}", provider.getId());

        // Generate JWT token
        String token = jwtTokenProvider.generateToken(
                user.getEmail(),
                user.getId(),
                user.getRole()
        );

        // Convert to DTOs
        UserDTO userDTO = dtoMapper.toUserDTO(user);
        ServiceProviderDTO providerDTO = dtoMapper.toServiceProviderDTOWithoutUser(provider);

        // Build response
        return AuthResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .user(userDTO)
                .provider(providerDTO)
                .expiresIn(jwtTokenProvider.getExpirationSeconds())
                .message("Provider registered successfully")
                .build();
    }

    /**
     * Authenticate user and generate JWT token
     */
    @Transactional
    public AuthResponse login(LoginRequest request) {
        logger.info("Login attempt for email: {}", request.getEmail());

        try {
            // Authenticate user
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getEmail().toLowerCase(),
                            request.getPassword()
                    )
            );

            // Set authentication in security context
            SecurityContextHolder.getContext().setAuthentication(authentication);

            // Load user from database
            User user = userRepository.findByEmailIgnoreCaseAndIsActiveTrue(request.getEmail())
                    .orElseThrow(() -> new InvalidCredentialsException("Invalid email or password"));

            // Update last login timestamp
            user.updateLastLogin();
            userRepository.save(user);

            // Generate JWT token
            String token = jwtTokenProvider.generateToken(
                    user.getEmail(),
                    user.getId(),
                    user.getRole()
            );

            // Convert to DTO
            UserDTO userDTO = dtoMapper.toUserDTO(user);

            // If user is a provider, include provider info
            ServiceProviderDTO providerDTO = null;
            if (user.getRole() == Role.SERVICE_PROVIDER) {
                ServiceProvider provider = serviceProviderRepository.findByUserId(user.getId())
                        .orElse(null);
                if (provider != null) {
                    providerDTO = dtoMapper.toServiceProviderDTOWithoutUser(provider);
                }
            }

            logger.info("Login successful for user ID: {}", user.getId());

            // Build response
            return AuthResponse.builder()
                    .accessToken(token)
                    .tokenType("Bearer")
                    .user(userDTO)
                    .provider(providerDTO)
                    .expiresIn(jwtTokenProvider.getExpirationSeconds())
                    .message("Login successful")
                    .build();

        } catch (Exception e) {
            logger.error("Login failed for email: {}", request.getEmail(), e);
            throw new InvalidCredentialsException("Invalid email or password");
        }
    }

    /**
     * Get current authenticated user
     */
    @Transactional(readOnly = true)
    public UserDTO getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));

        return dtoMapper.toUserDTO(user);
    }

    /**
     * Get current authenticated user with provider info (if applicable)
     */
    @Transactional(readOnly = true)
    public AuthResponse getCurrentUserWithProvider() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));

        UserDTO userDTO = dtoMapper.toUserDTO(user);

        // If provider, include provider info
        ServiceProviderDTO providerDTO = null;
        if (user.getRole() == Role.SERVICE_PROVIDER) {
            ServiceProvider provider = serviceProviderRepository.findByUserId(user.getId())
                    .orElse(null);
            if (provider != null) {
                providerDTO = dtoMapper.toServiceProviderDTOWithoutUser(provider);
            }
        }

        return AuthResponse.builder()
                .user(userDTO)
                .provider(providerDTO)
                .build();
    }
}