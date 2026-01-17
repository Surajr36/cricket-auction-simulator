package com.cricket.auction.domain;

import jakarta.persistence.*;

/**
 * TeamAuctionState - A team's state within a specific auction.
 * 
 * WHY SEPARATE FROM Team?
 * 
 * Team is master data - Chennai Super Kings is always Chennai Super Kings.
 * TeamAuctionState is auction-specific - CSK's budget in THIS auction.
 * 
 * This allows:
 * - Multiple auctions (historical records)
 * - Reset without touching master data
 * - Tracking budget changes over time
 */
@Entity
@Table(name = "team_auction_states")
public class TeamAuctionState {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "auction_id", nullable = false)
    private Auction auction;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;
    
    /**
     * Remaining budget in lakhs.
     * Starts at team.initialBudget, decreases with each purchase.
     */
    @Column(nullable = false)
    private Integer remainingBudget;
    
    // Default constructor for JPA
    public TeamAuctionState() {}
    
    public TeamAuctionState(Team team, Integer remainingBudget) {
        this.team = team;
        this.remainingBudget = remainingBudget;
    }
    
    /**
     * Deduct amount from budget.
     * Returns false if insufficient funds.
     */
    public boolean deductBudget(int amount) {
        if (amount > remainingBudget) {
            return false;
        }
        remainingBudget -= amount;
        return true;
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
    
    public Team getTeam() {
        return team;
    }
    
    public void setTeam(Team team) {
        this.team = team;
    }
    
    public Integer getRemainingBudget() {
        return remainingBudget;
    }
    
    public void setRemainingBudget(Integer remainingBudget) {
        this.remainingBudget = remainingBudget;
    }
}
