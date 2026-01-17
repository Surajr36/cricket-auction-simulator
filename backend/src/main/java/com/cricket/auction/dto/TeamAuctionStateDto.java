package com.cricket.auction.dto;

/**
 * DTO for team state within an auction.
 * Includes current budget and squad information.
 */
public record TeamAuctionStateDto(
    TeamDto team,
    Integer remainingBudget,
    java.util.List<AcquiredPlayerDto> squad
) {}
