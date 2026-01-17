package com.cricket.auction.config;

import com.cricket.auction.domain.*;
import com.cricket.auction.service.PlayerService;
import com.cricket.auction.service.TeamService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Seeds initial data into the H2 database at application startup.
 * 
 * Interview Note: Using CommandLineRunner ensures data is loaded after
 * Spring context is fully initialized but before the application starts
 * accepting requests. This is a common pattern for dev/test data seeding.
 */
@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final PlayerService playerService;
    private final TeamService teamService;
    private final ObjectMapper objectMapper;

    public DataSeeder(PlayerService playerService, TeamService teamService, ObjectMapper objectMapper) {
        this.playerService = playerService;
        this.teamService = teamService;
        this.objectMapper = objectMapper;
    }

    @Override
    public void run(String... args) throws Exception {
        seedTeams();
        seedPlayers();
    }

    private void seedTeams() throws Exception {
        if (teamService.hasTeams()) {
            log.info("Teams already seeded, skipping...");
            return;
        }

        InputStream is = new ClassPathResource("data/teams.json").getInputStream();
        JsonNode teamsNode = objectMapper.readTree(is);

        List<Team> teams = new ArrayList<>();
        for (JsonNode node : teamsNode) {
            Team team = new Team();
            team.setId(node.get("id").asText());
            team.setName(node.get("name").asText());
            team.setShortName(node.get("shortName").asText());
            team.setInitialBudget(node.get("budget").asInt());
            team.setPrimaryColor(node.get("primaryColor").asText());
            teams.add(team);
        }

        teamService.seedTeams(teams);
        log.info("Seeded {} teams", teams.size());
    }

    private void seedPlayers() throws Exception {
        if (playerService.hasPlayers()) {
            log.info("Players already seeded, skipping...");
            return;
        }

        InputStream is = new ClassPathResource("data/players.json").getInputStream();
        JsonNode playersNode = objectMapper.readTree(is);

        List<Player> players = new ArrayList<>();
        for (JsonNode node : playersNode) {
            Player player = new Player();
            player.setId(node.get("id").asText());
            player.setName(node.get("name").asText());
            player.setRole(parseRole(node.get("role").asText()));
            player.setNationality(parseNationality(node.get("nationality").asText()));
            player.setBasePrice(node.get("basePrice").asInt());

            // Parse stats
            JsonNode stats = node.get("stats");
            if (stats != null) {
                player.setMatches(getIntOrNull(stats, "matches"));
                player.setBattingAverage(getDoubleOrNull(stats, "battingAverage"));
                player.setBowlingAverage(getDoubleOrNull(stats, "bowlingAverage"));
                player.setStrikeRate(getDoubleOrNull(stats, "strikeRate"));
                player.setEconomyRate(getDoubleOrNull(stats, "economyRate"));
            }

            players.add(player);
        }

        playerService.seedPlayers(players);
        log.info("Seeded {} players", players.size());
    }

    private PlayerRole parseRole(String role) {
        return switch (role.toLowerCase()) {
            case "batter" -> PlayerRole.BATTER;
            case "bowler" -> PlayerRole.BOWLER;
            case "all-rounder" -> PlayerRole.ALL_ROUNDER;
            case "wicket-keeper" -> PlayerRole.WICKET_KEEPER;
            default -> throw new IllegalArgumentException("Unknown role: " + role);
        };
    }

    private Nationality parseNationality(String nationality) {
        return switch (nationality.toLowerCase()) {
            case "domestic" -> Nationality.DOMESTIC;
            case "overseas" -> Nationality.OVERSEAS;
            default -> throw new IllegalArgumentException("Unknown nationality: " + nationality);
        };
    }

    private Integer getIntOrNull(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return (value != null && !value.isNull()) ? value.asInt() : null;
    }

    private Double getDoubleOrNull(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return (value != null && !value.isNull()) ? value.asDouble() : null;
    }
}
