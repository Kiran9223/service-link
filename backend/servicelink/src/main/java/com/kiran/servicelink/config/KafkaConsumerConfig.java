package com.kiran.servicelink.config;

import com.kiran.servicelink.dto.event.BookingEvent;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.listener.ContainerProperties;
import org.springframework.kafka.support.serializer.ErrorHandlingDeserializer;
import org.springframework.kafka.support.serializer.JsonDeserializer;

import java.util.HashMap;
import java.util.Map;

/**
 * Kafka consumer configuration for Spring Boot 4.x
 *
 * Uses new JsonDeserializer approach (non-deprecated)
 *
 * Configures:
 * - Consumer factory with JSON deserialization
 * - Manual acknowledgment for reliability
 * - Error handling deserializer wrapper
 */
@Configuration
public class KafkaConsumerConfig {

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Value("${spring.kafka.consumer.group-id}")
    private String groupId;

    /**
     * Consumer factory configuration
     * Uses Spring Boot 4.x compatible approach
     */
    @Bean
    public ConsumerFactory<String, BookingEvent> consumerFactory() {
        Map<String, Object> config = new HashMap<>();

        // Kafka broker configuration
        config.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        config.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);

        // Key deserializer
        config.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);

        // Value deserializer - wrapped with error handler
        config.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, ErrorHandlingDeserializer.class);
        config.put(ErrorHandlingDeserializer.VALUE_DESERIALIZER_CLASS, JsonDeserializer.class.getName());

        // JSON deserializer configuration (Spring Boot 4.x style)
        config.put(JsonDeserializer.TRUSTED_PACKAGES, "*");
        config.put(JsonDeserializer.USE_TYPE_INFO_HEADERS, false);
        config.put(JsonDeserializer.VALUE_DEFAULT_TYPE, BookingEvent.class.getName());

        // Consumer behavior
        config.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        config.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false); // Manual commit

        // Performance tuning
        config.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 50);
        config.put(ConsumerConfig.ISOLATION_LEVEL_CONFIG, "read_committed");

        return new DefaultKafkaConsumerFactory<>(config);
    }

    /**
     * Kafka listener container factory
     *
     * Configures:
     * - Manual acknowledgment mode
     * - Single message processing (not batch)
     * - 3 concurrent consumers (matches topic partitions)
     */
    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, BookingEvent> kafkaListenerContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, BookingEvent> factory =
                new ConcurrentKafkaListenerContainerFactory<>();

        factory.setConsumerFactory(consumerFactory());

        // Manual acknowledgment - commit only after successful processing
        factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL);

        // Process messages one at a time (not in batch)
        factory.setBatchListener(false);

        // Concurrency - number of consumer threads (should match partition count)
        factory.setConcurrency(3);

        return factory;
    }
}