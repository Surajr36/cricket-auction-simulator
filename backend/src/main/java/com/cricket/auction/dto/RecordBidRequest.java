package com.cricket.auction.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Request DTO for recording a bid/sale.
 * 
 * WHY SEPARATE REQUEST AND RESPONSE DTOs?
 * 
 * Request: What the client SENDS (may have validation annotations)
 * Response: What the server RETURNS (may have computed fields)
 * 
 * They often look similar but evolve differently.
 * 
 * VALIDATION ANNOTATIONS:
 * - @NotBlank: Can't be null or empty string
 * - @NotNull: Can't be null (for non-strings)
 * - @Min: Minimum value for numbers
 * 
 * These are checked automatically by Spring when @Valid is used.
 */
public record RecordBidRequest(
    @NotBlank(message = "Auction ID is required")
    String auctionId,
    
    @NotBlank(message = "Player ID is required")
    String playerId,
    
    @NotBlank(message = "Team ID is required")
    String teamId,
    
    @NotNull(message = "Amount is required")
    @Min(value = 1, message = "Amount must be positive")
    Integer amount
) {}
