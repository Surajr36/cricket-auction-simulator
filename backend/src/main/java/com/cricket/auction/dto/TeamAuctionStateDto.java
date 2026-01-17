package com.cricket.auction.dto;

/**
 * DTO for team state within an auction.
 * Includes current budget and squad information.
 */
public record TeamAuctionStateDto(
    String teamId,
    Integer remainingBudget,
    java.util.List<AcquiredPlayerDto> squad
) {}
