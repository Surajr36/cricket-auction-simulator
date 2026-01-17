package com.cricket.auction.domain;

import jakarta.persistence.*;

/**
 * Team Entity - Represents a franchise in the auction.
 * 
 * WHY SEPARATE Team and TeamAuctionState?
 * 
 * Team = Static data (name, colors) - doesn't change between auctions
 * TeamAuctionState = Auction-specific (budget, squad) - changes per auction
 * 
 * This separation allows:
 * - Running multiple auctions with same teams
 * - Keeping team master data clean
 * - Easier to reset for a new auction
 */
@Entity
@Table(name = "teams")
public class Team {
    
    @Id
    private String id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(nullable = false)
    private String shortName;
    
    /**
     * Initial budget in lakhs.
     * This is the starting budget, not the current budget during auction.
     */
    @Column(nullable = false)
    private Integer initialBudget;
    
    private String primaryColor;
    
    // Default constructor for JPA
    public Team() {}
    
    public Team(String id, String name, String shortName, Integer initialBudget, String primaryColor) {
        this.id = id;
        this.name = name;
        this.shortName = shortName;
        this.initialBudget = initialBudget;
        this.primaryColor = primaryColor;
    }
    
    // Getters and Setters
    
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getShortName() {
        return shortName;
    }
    
    public void setShortName(String shortName) {
        this.shortName = shortName;
    }
    
    public Integer getInitialBudget() {
        return initialBudget;
    }
    
    public void setInitialBudget(Integer initialBudget) {
        this.initialBudget = initialBudget;
    }
    
    public String getPrimaryColor() {
        return primaryColor;
    }
    
    public void setPrimaryColor(String primaryColor) {
        this.primaryColor = primaryColor;
    }
}
