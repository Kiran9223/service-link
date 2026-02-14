package com.kiran.servicelink.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Jackson ObjectMapper configuration
 *
 * Provides ObjectMapper bean for:
 * - JSON serialization/deserialization
 * - Converting Kafka event payloads (LinkedHashMap -> DTOs)
 * - REST API JSON processing
 */
@Configuration
public class JacksonConfig {

    /**
     * Create and configure ObjectMapper bean
     *
     * Configuration:
     * - JavaTimeModule for LocalDateTime support
     * - Don't write dates as timestamps
     * - Don't fail on unknown properties
     */
    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();

        // Register JavaTimeModule for LocalDateTime, LocalDate, etc.
        mapper.registerModule(new JavaTimeModule());

        // Write dates as strings, not timestamps
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        // Don't fail on unknown JSON properties
        mapper.configure(
                com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES,
                false
        );

        return mapper;
    }
}
