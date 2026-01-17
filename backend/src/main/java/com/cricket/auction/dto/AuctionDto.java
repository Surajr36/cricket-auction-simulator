package com.cricket.auction.dto;

import com.cricket.auction.domain.AuctionStatus;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

/**
 * DTO for complete auction state.
 * Returned by GET /auction/{id}
 */
public record AuctionDto(
    String id,
    AuctionStatus status,
    LocalDateTime startedAt,
    LocalDateTime completedAt,
    List<TeamAuctionStateDto> teams,
    Set<String> completedPlayerIds
) {}
