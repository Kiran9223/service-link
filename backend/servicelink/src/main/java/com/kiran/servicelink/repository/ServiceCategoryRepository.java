package com.kiran.servicelink.repository;


import com.kiran.servicelink.entity.ServiceCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceCategoryRepository extends JpaRepository<ServiceCategory, Long> {
    /**
     * Find all active categories, sorted by display order (highest first)
     * Used for: Dropdown menus, category browsing
     */
    List<ServiceCategory> findByIsActiveTrueOrderByDisplayOrderDesc();

    Optional<ServiceCategory> findByName(String name);

    boolean existsByName(String name);
}
