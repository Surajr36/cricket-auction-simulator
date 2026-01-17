package com.cricket.auction.dto;

/**
 * DTO for Player statistics.
 * 
 * WHY DTOs EXIST (even for small projects)?
 * 
 * 1. API STABILITY: Entity changes (new column, renamed field) don't break clients
 * 2. SECURITY: Don't accidentally expose internal fields (like audit timestamps)
 * 3. FLEXIBILITY: API shape can differ from DB shape (flatten nested objects, etc.)
 * 4. DOCUMENTATION: DTOs clearly show "this is what the API returns"
 * 
 * COMMON INTERVIEW TRAP:
 * "Can't you just return the entity?"
 * Answer: You CAN, but you lose control over:
 * - What gets serialized (lazy-loaded collections, circular refs)
 * - API versioning (entity change = breaking change)
 * - Security (exposing internal IDs, timestamps)
 * 
 * DTOs are cheap insurance against these problems.
 */
public record PlayerStatsDto(
    Integer matches,
    Double battingAverage,
    Double bowlingAverage,
    Double strikeRate,
    Double economyRate
) {
    /**
     * WHY RECORDS?
     * 
     * Java 16+ records are perfect for DTOs:
     * - Immutable by default
     * - Auto-generated equals, hashCode, toString
     * - Concise syntax
     * - Clear intent: "this is data, not behavior"
     */
}
