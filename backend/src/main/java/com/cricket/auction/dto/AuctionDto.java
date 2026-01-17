package com.cricket.auction.dto;

import java.util.List;

/**
 * DTO for complete auction state.
 * Returned by GET /auction/{id}
 */
public record AuctionDto(
    String id,
    String status,
    List<TeamAuctionStateDto> teams,
    List<String> completedPlayerIds
) {}
