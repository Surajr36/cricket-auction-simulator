package com.cricket.auction.dto;

/**
 * DTO for a player acquired by a team.
 * Minimal info - just what's needed to track the purchase.
 */
public record AcquiredPlayerDto(
    String playerId,
    Integer purchasePrice
) {}
