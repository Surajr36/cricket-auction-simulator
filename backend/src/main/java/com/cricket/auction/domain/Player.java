package com.cricket.auction.domain;

import jakarta.persistence.*;

/**
 * Player Entity - Represents a cricket player available for auction.
 * 
 * ARCHITECTURE DECISION: Why a separate domain package?
 * 
 * 1. PERSISTENCE CONCERNS: JPA entities have annotations, lifecycle callbacks,
 *    and database-specific concerns that don't belong in DTOs.
 * 
 * 2. SINGLE RESPONSIBILITY: Entity = database shape, DTO = API shape.
 *    They can evolve independently.
 * 
 * 3. INTERVIEW DEFENSE: Shows understanding of layered architecture.
 * 
 * WHY NOT USE LOMBOK?
 * - Adds a dependency for simple boilerplate
 * - IDE support varies
 * - Explicit code is easier to debug
 * - For a small project, the verbosity is acceptable
 * 
 * In production, Lombok would be reasonable.
 */
@Entity
@Table(name = "players")
public class Player {
    
    @Id
    private String id;
    
    @Column(nullable = false)
    private String name;
    
    /**
     * WHY EnumType.STRING?
     * 
     * Default is ORDINAL (stores 0, 1, 2...).
     * If someone reorders the enum, data becomes corrupted.
     * STRING stores "BATTER", "BOWLER" - safe against reordering.
     * 
     * INTERVIEW TIP: This is a common source of production bugs.
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PlayerRole role;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Nationality nationality;
    
    /**
     * Base price in lakhs (₹100,000 units).
     * Using Integer, not int, to allow null in edge cases.
     */
    @Column(nullable = false)
    private Integer basePrice;
    
    // Stats - embedded for simplicity
    // In a larger app, might be a separate entity
    private Integer matches;
    private Double battingAverage;
    private Double bowlingAverage;
    private Double strikeRate;
    private Double economyRate;
    
    // Default constructor required by JPA
    protected Player() {}
    
    public Player(String id, String name, PlayerRole role, Nationality nationality, Integer basePrice) {
        this.id = id;
        this.name = name;
        this.role = role;
        this.nationality = nationality;
        this.basePrice = basePrice;
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
    
    public PlayerRole getRole() {
        return role;
    }
    
    public void setRole(PlayerRole role) {
        this.role = role;
    }
    
    public Nationality getNationality() {
        return nationality;
    }
    
    public void setNationality(Nationality nationality) {
        this.nationality = nationality;
    }
    
    public Integer getBasePrice() {
        return basePrice;
    }
    
    public void setBasePrice(Integer basePrice) {
        this.basePrice = basePrice;
    }
    
    public Integer getMatches() {
        return matches;
    }
    
    public void setMatches(Integer matches) {
        this.matches = matches;
    }
    
    public Double getBattingAverage() {
        return battingAverage;
    }
    
    public void setBattingAverage(Double battingAverage) {
        this.battingAverage = battingAverage;
    }
    
    public Double getBowlingAverage() {
        return bowlingAverage;
    }
    
    public void setBowlingAverage(Double bowlingAverage) {
        this.bowlingAverage = bowlingAverage;
    }
    
    public Double getStrikeRate() {
        return strikeRate;
    }
    
    public void setStrikeRate(Double strikeRate) {
        this.strikeRate = strikeRate;
    }
    
    public Double getEconomyRate() {
        return economyRate;
    }
    
    public void setEconomyRate(Double economyRate) {
        this.economyRate = economyRate;
    }
}
