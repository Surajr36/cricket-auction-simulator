package com.cricket.auction.dto;

import com.cricket.auction.domain.Team;

/**
 * DTO for Team API responses.
 */
public record TeamDto(
    String id,
    String name,
    String shortName,
    Integer budget,
    String primaryColor
) {
    public static TeamDto fromEntity(Team team) {
        return new TeamDto(
            team.getId(),
            team.getName(),
            team.getShortName(),
            team.getInitialBudget(),
            team.getPrimaryColor()
        );
    }
}
