package com.cricket.auction.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Auction Entity - Represents an auction session.
 * 
 * WHAT TO PERSIST vs WHAT NOT TO PERSIST:
 * 
 * ✅ PERSIST:
 * - Auction metadata (id, status, timestamps)
 * - Team states (budgets, squads)
 * - Completed sales (who bought whom for how much)
 * 
 * ❌ DON'T PERSIST:
 * - Timer state (60-second countdown) - UI-only, ephemeral
 * - Current bid in progress - changes too fast, race conditions
 * - UI flags (expanded panels, selected team) - client state
 * 
 * WHY?
 * - Timers would be stale on page refresh
 * - In-progress bids create race conditions if persisted
 * - UI state belongs in the frontend
 * 
 * The backend stores OUTCOMES (who won), not PROCESS (who's bidding now).
 */
@Entity
@Table(name = "auctions")
public class Auction {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuctionStatus status;
    
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    
    /**
     * Team auction states - one per team in this auction.
     * 
     * CascadeType.ALL: When auction is saved, states are saved too.
     * orphanRemoval: If a state is removed from list, delete from DB.
     */
    @OneToMany(mappedBy = "auction", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TeamAuctionState> teamStates = new ArrayList<>();
    
    /**
     * Record of all player sales in this auction.
     */
    @OneToMany(mappedBy = "auction", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PlayerSale> playerSales = new ArrayList<>();
    
    // Default constructor for JPA
    public Auction() {}
    
    public Auction(AuctionStatus status) {
        this.status = status;
        this.startedAt = LocalDateTime.now();
    }
    
    // Helper methods
    
    public void addTeamState(TeamAuctionState state) {
        teamStates.add(state);
        state.setAuction(this);
    }
    
    public void addPlayerSale(PlayerSale sale) {
        playerSales.add(sale);
        sale.setAuction(this);
    }
    
    public void complete() {
        this.status = AuctionStatus.COMPLETED;
        this.completedAt = LocalDateTime.now();
    }
    
    // Getters and Setters
    
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public AuctionStatus getStatus() {
        return status;
    }
    
    public void setStatus(AuctionStatus status) {
        this.status = status;
    }
    
    public LocalDateTime getStartedAt() {
        return startedAt;
    }
    
    public void setStartedAt(LocalDateTime startedAt) {
        this.startedAt = startedAt;
    }
    
    public LocalDateTime getCompletedAt() {
        return completedAt;
    }
    
    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }
    
    public List<TeamAuctionState> getTeamStates() {
        return teamStates;
    }
    
    public void setTeamStates(List<TeamAuctionState> teamStates) {
        this.teamStates = teamStates;
    }
    
    public List<PlayerSale> getPlayerSales() {
        return playerSales;
    }
    
    public void setPlayerSales(List<PlayerSale> playerSales) {
        this.playerSales = playerSales;
    }
}
