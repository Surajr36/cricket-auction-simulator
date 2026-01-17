package com.cricket.auction.repository;

import com.cricket.auction.domain.Auction;
import com.cricket.auction.domain.AuctionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository for Auction entities.
 */
@Repository
public interface AuctionRepository extends JpaRepository<Auction, String> {
    
    /**
     * Find an active (in-progress) auction.
     * There should only be one at a time.
     */
    Optional<Auction> findByStatus(AuctionStatus status);
}
