package com.cricket.auction.domain;

/**
 * Player roles in T20 cricket.
 * 
 * WHY AN ENUM?
 * - Type-safe: Can't accidentally use invalid string like "Batter" or "BATTER"
 * - Persistence-friendly: JPA handles enum mapping automatically
 * - IDE support: Autocomplete and refactoring work
 * 
 * INTERVIEW TIP: Enums in Java persist as ORDINAL (0,1,2) by default.
 * Use @Enumerated(EnumType.STRING) in entities to store the name instead.
 * This prevents bugs when enum order changes.
 */
public enum PlayerRole {
    BATTER,
    BOWLER,
    ALL_ROUNDER,
    WICKET_KEEPER
}
