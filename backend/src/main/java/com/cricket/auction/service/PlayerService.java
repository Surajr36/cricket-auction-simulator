package com.cricket.auction.service;

import com.cricket.auction.domain.Player;
import com.cricket.auction.dto.PlayerDto;
import com.cricket.auction.repository.PlayerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

/**
 * Service for managing player operations.
 * 
 * Interview Note: Services are stateless and handle business logic.
 * Each method is a single unit of work with clear input/output.
 */
@Service
@Transactional(readOnly = true)
public class PlayerService {

    private final PlayerRepository playerRepository;

    public PlayerService(PlayerRepository playerRepository) {
        this.playerRepository = playerRepository;
    }

    /**
     * Get all players in the system.
     */
    public List<PlayerDto> getAllPlayers() {
        return playerRepository.findAll()
                .stream()
                .map(PlayerDto::fromEntity)
                .toList();
    }

    /**
     * Get players available for auction (not already sold in any active auction).
     * 
     * @param soldPlayerIds IDs of players already sold in current auction
     */
    public List<PlayerDto> getAvailablePlayers(Set<Long> soldPlayerIds) {
        if (soldPlayerIds.isEmpty()) {
            return getAllPlayers();
        }
        return playerRepository.findByIdNotIn(soldPlayerIds)
                .stream()
                .map(PlayerDto::fromEntity)
                .toList();
    }

    /**
     * Get a single player by ID.
     * 
     * @throws IllegalArgumentException if player not found
     */
    public PlayerDto getPlayer(Long id) {
        return playerRepository.findById(id)
                .map(PlayerDto::fromEntity)
                .orElseThrow(() -> new IllegalArgumentException("Player not found: " + id));
    }

    /**
     * Seed players into the database.
     * Used at application startup to populate initial data.
     */
    @Transactional
    public void seedPlayers(List<Player> players) {
        playerRepository.saveAll(players);
    }

    /**
     * Check if any players exist in the database.
     */
    public boolean hasPlayers() {
        return playerRepository.count() > 0;
    }
}
