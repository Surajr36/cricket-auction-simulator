package com.cricket.auction.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * PlayerSale - Record of a completed player purchase.
 * 
 * WHY A SEPARATE ENTITY (not just a player field on TeamAuctionState)?
 * 
 * 1. HISTORICAL RECORD: Know who bought whom, when, for how much
 * 2. QUERY FLEXIBILITY: "Find all players sold for > 1000L"
 * 3. AUDIT TRAIL: Can't be accidentally modified
 * 
 * This is the OUTCOME we persist, not the bidding process.
 */
@Entity
@Table(name = "player_sales")
public class PlayerSale {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "auction_id", nullable = false)
    private Auction auction;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "player_id", nullable = false)
    private Player player;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "team_id", nullable = true)
    private Team team;
    
    /**
     * Final sale price in lakhs.
     * May differ from base price.
     */
    @Column(nullable = false)
    private Integer salePrice;
    
    @Column(nullable = false)
    private LocalDateTime soldAt;
    
    // Default constructor for JPA
    public PlayerSale() {}
    
    public PlayerSale(Player player, Team team, Integer salePrice) {
        this.player = player;
        this.team = team;
        this.salePrice = salePrice;
        this.soldAt = LocalDateTime.now();
    }
    
    // Getters and Setters
    
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public Auction getAuction() {
        return auction;
    }
    
    public void setAuction(Auction auction) {
        this.auction = auction;
    }
    
    public Player getPlayer() {
        return player;
    }
    
    public void setPlayer(Player player) {
        this.player = player;
    }
    
    public Team getTeam() {
        return team;
    }
    
    public void setTeam(Team team) {
        this.team = team;
    }
    
    public Integer getSalePrice() {
        return salePrice;
    }
    
    public void setSalePrice(Integer salePrice) {
        this.salePrice = salePrice;
    }
    
    public LocalDateTime getSoldAt() {
        return soldAt;
    }
    
    public void setSoldAt(LocalDateTime soldAt) {
        this.soldAt = soldAt;
    }
}
