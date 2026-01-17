package com.cricket.auction.repository;

import com.cricket.auction.domain.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository for Team entities.
 */
@Repository
public interface TeamRepository extends JpaRepository<Team, String> {
    // JpaRepository provides all we need for now
}
