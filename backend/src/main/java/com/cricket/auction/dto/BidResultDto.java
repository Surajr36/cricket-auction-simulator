package com.cricket.auction.dto;

/**
 * Response DTO for successful bid recording.
 */
public record BidResultDto(
    boolean success,
    String message,
    TeamAuctionStateDto updatedTeamState
) {}
