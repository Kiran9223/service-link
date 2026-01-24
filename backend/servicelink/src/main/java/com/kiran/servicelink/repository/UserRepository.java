package com.kiran.servicelink.repository;


import com.kiran.servicelink.entity.Role;
import com.kiran.servicelink.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Integer> {


    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    Optional<User> findByEmailIgnoreCaseAndIsActiveTrue(String email);

    List<User> findByRole(Role role);

    long countByRole(Role role);

    List<User> findByRoleAndIsActiveTrue(Role role);

    List<User> findByIsActiveTrue();

    List<User> findByEmailVerified(Boolean emailVerified);

    @Modifying
    @Query("UPDATE User u SET u.lastLoginAt = :loginTime WHERE u.id = :userId")
    void updateLastLogin(@Param("userId") Integer userId, @Param("loginTime") LocalDateTime loginTime);

    @Modifying
    @Query("UPDATE User u SET u.isActive = :status WHERE u.id = :userId")
    void updateAccountStatus(@Param("userId") Integer userId, @Param("status") Boolean status);

    @Modifying
    @Query("UPDATE User u SET u.emailVerified = true WHERE u.id = :userId")
    void markEmailVerified(@Param("userId") Integer userId);

    List<User> findByCity(String city);

    List<User> findByState(String state);

    @Query("SELECT u FROM User u WHERE LOWER(u.name) LIKE LOWER(CONCAT('%', :searchTerm, '%'))")
    List<User> searchByName(@Param("searchTerm") String searchTerm);
}
