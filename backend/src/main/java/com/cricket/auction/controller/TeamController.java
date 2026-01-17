package com.cricket.auction.controller;

import com.cricket.auction.dto.TeamDto;
import com.cricket.auction.service.TeamService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for team operations.
 */
@RestController
@RequestMapping("/api/teams")
@CrossOrigin(origins = "*")
public class TeamController {

    private final TeamService teamService;

    public TeamController(TeamService teamService) {
        this.teamService = teamService;
    }

    /**
     * GET /api/teams
     * Returns all teams participating in the auction.
     */
    @GetMapping
    public ResponseEntity<List<TeamDto>> getAllTeams() {
        return ResponseEntity.ok(teamService.getAllTeams());
    }

    /**
     * GET /api/teams/{id}
     * Returns a single team by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<TeamDto> getTeam(@PathVariable String id) {
        try {
            return ResponseEntity.ok(teamService.getTeam(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
