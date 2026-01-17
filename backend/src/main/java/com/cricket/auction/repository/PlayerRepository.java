package com.cricket.auction.repository;

import com.cricket.auction.domain.Player;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for Player entities.
 * 
 * WHY EXTEND JpaRepository?
 * 
 * Spring Data JPA provides:
 * - CRUD operations for free (save, findById, findAll, delete)
 * - Query derivation from method names
 * - Pagination and sorting
 * - Custom queries via @Query
 * 
 * LAYER RESPONSIBILITY:
 * - Repository: Data access ONLY
 * - No business logic here
 * - Just fetch/store data
 * 
 * INTERVIEW TIP: Know the difference between:
 * - CrudRepository: Basic CRUD
 * - JpaRepository: CRUD + JPA-specific (flush, batch)
 * - PagingAndSortingRepository: CRUD + pagination
 */
@Repository
public interface PlayerRepository extends JpaRepository<Player, String> {
    
    /**
     * Find all players not in the given list of IDs.
     * Useful for getting available (unsold) players.
     * 
     * Spring Data derives the query from the method name:
     * findBy + IdNotIn = WHERE id NOT IN (...)
     */
    List<Player> findByIdNotIn(List<String> soldPlayerIds);
}
