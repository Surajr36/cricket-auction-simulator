package com.cricket.auction.service;

import com.cricket.auction.domain.Team;
import com.cricket.auction.dto.TeamDto;
import com.cricket.auction.repository.TeamRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service for managing team operations.
 */
@Service
@Transactional(readOnly = true)
public class TeamService {

    private final TeamRepository teamRepository;

    public TeamService(TeamRepository teamRepository) {
        this.teamRepository = teamRepository;
    }

    /**
     * Get all teams in the system.
     */
    public List<TeamDto> getAllTeams() {
        return teamRepository.findAll()
                .stream()
                .map(TeamDto::fromEntity)
                .toList();
    }

    /**
     * Get a single team by ID.
     * 
     * @throws IllegalArgumentException if team not found
     */
    public TeamDto getTeam(String id) {
        return teamRepository.findById(id)
                .map(TeamDto::fromEntity)
                .orElseThrow(() -> new IllegalArgumentException("Team not found: " + id));
    }

    /**
     * Seed teams into the database.
     */
    @Transactional
    public void seedTeams(List<Team> teams) {
        teamRepository.saveAll(teams);
    }

    /**
     * Check if any teams exist in the database.
     */
    public boolean hasTeams() {
        return teamRepository.count() > 0;
    }
}
