package com.cricket.auction.dto;

import com.cricket.auction.domain.Player;

/**
 * DTO for Player API responses.
 * 
 * Maps the internal Player entity to the API contract.
 * Frontend expects this exact shape.
 */
public record PlayerDto(
    String id,
    String name,
    String role,         // Lowercase to match frontend: "batter", not "BATTER"
    String nationality,  // Lowercase: "domestic", "overseas"
    Integer basePrice,
    PlayerStatsDto stats
) {
    /**
     * Factory method to convert Entity to DTO.
     * 
     * WHY A STATIC FACTORY?
     * - Keeps conversion logic in one place
     * - Entity doesn't need to know about DTO
     * - Easy to add transformation logic
     */
    public static PlayerDto fromEntity(Player player) {
        return new PlayerDto(
            player.getId(),
            player.getName(),
            mapRole(player.getRole().name()),
            player.getNationality().name().toLowerCase(),
            player.getBasePrice(),
            new PlayerStatsDto(
                player.getMatches(),
                player.getBattingAverage(),
                player.getBowlingAverage(),
                player.getStrikeRate(),
                player.getEconomyRate()
            )
        );
    }
    
    /**
     * Convert enum name to frontend format.
     * Backend: ALL_ROUNDER, WICKET_KEEPER
     * Frontend: all-rounder, wicket-keeper
     */
    private static String mapRole(String role) {
        return role.toLowerCase().replace("_", "-");
    }
}
