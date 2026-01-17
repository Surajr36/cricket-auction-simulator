package com.cricket.auction.repository;

import com.cricket.auction.domain.PlayerSale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for PlayerSale entities.
 */
@Repository
public interface PlayerSaleRepository extends JpaRepository<PlayerSale, Long> {
    
    /**
     * Find all sales for a specific auction.
     */
    List<PlayerSale> findByAuctionId(String auctionId);
    
    /**
     * Find all sales for a specific team in an auction.
     */
    List<PlayerSale> findByAuctionIdAndTeamId(String auctionId, String teamId);
}
