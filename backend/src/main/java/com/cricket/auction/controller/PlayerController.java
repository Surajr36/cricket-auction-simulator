package com.cricket.auction.controller;

import com.cricket.auction.dto.PlayerDto;
import com.cricket.auction.service.PlayerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for player operations.
 * 
 * Interview Note: Controllers are thin - they only handle HTTP concerns
 * and delegate to services. No business logic here.
 */
@RestController
@RequestMapping("/api/players")
@CrossOrigin(origins = "*") // For development - restrict in production
public class PlayerController {

    private final PlayerService playerService;

    public PlayerController(PlayerService playerService) {
        this.playerService = playerService;
    }

    /**
     * GET /api/players
     * Returns all players available for auction.
     */
    @GetMapping
    public ResponseEntity<List<PlayerDto>> getAllPlayers() {
        return ResponseEntity.ok(playerService.getAllPlayers());
    }

    /**
     * GET /api/players/{id}
     * Returns a single player by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<PlayerDto> getPlayer(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(playerService.getPlayer(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
