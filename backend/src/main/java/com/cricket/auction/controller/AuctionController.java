package com.cricket.auction.controller;

import com.cricket.auction.dto.AuctionDto;
import com.cricket.auction.dto.BidResultDto;
import com.cricket.auction.dto.RecordBidRequest;
import com.cricket.auction.service.AuctionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for auction operations.
 * 
 * Interview Note: The auction endpoints follow REST conventions:
 * - POST /auction/start - Create a new resource (auction)
 * - GET /auction/{id} - Read resource state
 * - POST /auction/bid - Create a new sub-resource (bid/sale)
 * - POST /auction/{id}/complete - Action on resource (could also be PATCH)
 */
@RestController
@RequestMapping("/api/auction")
@CrossOrigin(origins = "*")
public class AuctionController {

    private final AuctionService auctionService;

    public AuctionController(AuctionService auctionService) {
        this.auctionService = auctionService;
    }

    /**
     * POST /api/auction/start
     * Start a new auction with all teams.
     */
    @PostMapping("/start")
    public ResponseEntity<AuctionDto> startAuction() {
        AuctionDto auction = auctionService.startAuction();
        return ResponseEntity.ok(auction);
    }

    /**
     * GET /api/auction/{id}
     * Get auction state by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<AuctionDto> getAuction(@PathVariable String id) {
        try {
            return ResponseEntity.ok(auctionService.getAuction(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * GET /api/auction/active
     * Get the currently active auction, if any.
     */
    @GetMapping("/active")
    public ResponseEntity<AuctionDto> getActiveAuction() {
        return auctionService.getActiveAuction()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    /**
     * POST /api/auction/bid
     * Record a successful bid/sale.
     * 
     * Note: The frontend validates the bid before calling this.
     * This endpoint just persists the validated result.
     */
    @PostMapping("/bid")
    public ResponseEntity<BidResultDto> recordBid(@RequestBody RecordBidRequest request) {
        BidResultDto result = auctionService.recordBid(request);
        if (result.success()) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }

    /**
     * POST /api/auction/{id}/unsold
     * Mark a player as unsold (no bids received).
     */
    @PostMapping("/{auctionId}/unsold/{playerId}")
    public ResponseEntity<Void> markPlayerUnsold(
            @PathVariable String auctionId,
            @PathVariable String playerId) {
        try {
            auctionService.markPlayerUnsold(auctionId, playerId);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * POST /api/auction/{id}/complete
     * Mark the auction as complete.
     */
    @PostMapping("/{id}/complete")
    public ResponseEntity<AuctionDto> completeAuction(@PathVariable String id) {
        try {
            return ResponseEntity.ok(auctionService.completeAuction(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
