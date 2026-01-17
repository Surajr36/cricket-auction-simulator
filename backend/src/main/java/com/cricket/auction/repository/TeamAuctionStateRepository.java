package com.cricket.auction.repository;

import com.cricket.auction.domain.TeamAuctionState;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository for TeamAuctionState entities.
 */
@Repository
public interface TeamAuctionStateRepository extends JpaRepository<TeamAuctionState, Long> {
    
    /**
     * Find a team's state in a specific auction.
     */
    Optional<TeamAuctionState> findByAuctionIdAndTeamId(Long auctionId, Long teamId);
}
