package com.kiran.servicelink.controller;

import com.kiran.servicelink.dto.response.FairnessMetricDTO;
import com.kiran.servicelink.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@Slf4j
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/fairness")
    public ResponseEntity<List<FairnessMetricDTO>> getFairnessMetrics() {
        log.debug("GET /api/analytics/fairness");
        List<FairnessMetricDTO> metrics = analyticsService.getFairnessMetrics();
        return ResponseEntity.ok(metrics);
    }
}
