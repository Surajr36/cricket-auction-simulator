package com.cricket.auction.service;

import com.cricket.auction.domain.*;
import com.cricket.auction.dto.*;
import com.cricket.auction.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for managing auction operations.
 * 
 * Interview Note: This service handles persistence only.
 * Business rules (bid validation, squad constraints) remain on the frontend.
 * The backend is a thin persistence layer, not a rules engine.
 */
@Service
@Transactional(readOnly = true)
public class AuctionService {

    private final AuctionRepository auctionRepository;
    private final TeamRepository teamRepository;
    private final PlayerRepository playerRepository;
    private final PlayerSaleRepository playerSaleRepository;
    private final TeamAuctionStateRepository teamAuctionStateRepository;

    public AuctionService(
            AuctionRepository auctionRepository,
            TeamRepository teamRepository,
            PlayerRepository playerRepository,
            PlayerSaleRepository playerSaleRepository,
            TeamAuctionStateRepository teamAuctionStateRepository) {
        this.auctionRepository = auctionRepository;
        this.teamRepository = teamRepository;
        this.playerRepository = playerRepository;
        this.playerSaleRepository = playerSaleRepository;
        this.teamAuctionStateRepository = teamAuctionStateRepository;
    }

    /**
     * Start a new auction with all teams participating.
     * Each team starts with their full budget and empty squad.
     */
    @Transactional
    public AuctionDto startAuction() {
        // Create new auction
        Auction auction = new Auction();
        auction.setStatus(AuctionStatus.IN_PROGRESS);
        auction.setStartedAt(LocalDateTime.now());
        auction = auctionRepository.save(auction);

        // Initialize team states for this auction
        List<Team> teams = teamRepository.findAll();
        List<TeamAuctionState> teamStates = new ArrayList<>();
        
        for (Team team : teams) {
            TeamAuctionState state = new TeamAuctionState();
            state.setAuction(auction);
            state.setTeam(team);
            state.setRemainingBudget(team.getInitialBudget());
            teamStates.add(state);
        }
        teamAuctionStateRepository.saveAll(teamStates);
        auction.setTeamStates(new HashSet<>(teamStates));

        return buildAuctionDto(auction);
    }

    /**
     * Get auction by ID with full state.
     */
    public AuctionDto getAuction(Long auctionId) {
        Auction auction = auctionRepository.findById(auctionId)
                .orElseThrow(() -> new IllegalArgumentException("Auction not found: " + auctionId));
        return buildAuctionDto(auction);
    }

    /**
     * Get the currently active auction, if any.
     */
    public Optional<AuctionDto> getActiveAuction() {
        return auctionRepository.findByStatus(AuctionStatus.IN_PROGRESS)
                .stream()
                .findFirst()
                .map(this::buildAuctionDto);
    }

    /**
     * Record a successful bid/sale.
     * 
     * Note: Validation (budget, squad size) should be done by the frontend.
     * This method assumes the bid is valid and just persists it.
     */
    @Transactional
    public BidResultDto recordBid(RecordBidRequest request) {
        Auction auction = auctionRepository.findById(request.auctionId())
                .orElseThrow(() -> new IllegalArgumentException("Auction not found: " + request.auctionId()));

        if (auction.getStatus() != AuctionStatus.IN_PROGRESS) {
            return new BidResultDto(false, "Auction is not in progress", null);
        }

        Team team = teamRepository.findById(request.teamId())
                .orElseThrow(() -> new IllegalArgumentException("Team not found: " + request.teamId()));

        Player player = playerRepository.findById(request.playerId())
                .orElseThrow(() -> new IllegalArgumentException("Player not found: " + request.playerId()));

        // Check if player already sold in this auction
        boolean alreadySold = playerSaleRepository.findByAuctionId(auction.getId())
                .stream()
                .anyMatch(sale -> sale.getPlayer().getId().equals(player.getId()));
        
        if (alreadySold) {
            return new BidResultDto(false, "Player already sold in this auction", null);
        }

        // Record the sale
        PlayerSale sale = new PlayerSale();
        sale.setAuction(auction);
        sale.setPlayer(player);
        sale.setTeam(team);
        sale.setSoldPrice(request.price());
        sale.setSoldAt(LocalDateTime.now());
        playerSaleRepository.save(sale);

        // Update team's remaining budget
        TeamAuctionState teamState = teamAuctionStateRepository
                .findByAuctionIdAndTeamId(auction.getId(), team.getId())
                .orElseThrow(() -> new IllegalStateException("Team state not found"));
        
        teamState.setRemainingBudget(teamState.getRemainingBudget().subtract(request.price()));
        teamAuctionStateRepository.save(teamState);

        // Build result with updated team state
        TeamAuctionStateDto updatedState = buildTeamStateDto(teamState, auction.getId());
        return new BidResultDto(true, "Bid recorded successfully", updatedState);
    }

    /**
     * Mark a player as unsold (no bids received).
     */
    @Transactional
    public void markPlayerUnsold(Long auctionId, Long playerId) {
        Auction auction = auctionRepository.findById(auctionId)
                .orElseThrow(() -> new IllegalArgumentException("Auction not found: " + auctionId));

        Player player = playerRepository.findById(playerId)
                .orElseThrow(() -> new IllegalArgumentException("Player not found: " + playerId));

        // Record as unsold (no team, price = 0)
        PlayerSale unsold = new PlayerSale();
        unsold.setAuction(auction);
        unsold.setPlayer(player);
        unsold.setTeam(null);
        unsold.setSoldPrice(BigDecimal.ZERO);
        unsold.setSoldAt(LocalDateTime.now());
        playerSaleRepository.save(unsold);
    }

    /**
     * Complete an auction.
     */
    @Transactional
    public AuctionDto completeAuction(Long auctionId) {
        Auction auction = auctionRepository.findById(auctionId)
                .orElseThrow(() -> new IllegalArgumentException("Auction not found: " + auctionId));
        
        auction.setStatus(AuctionStatus.COMPLETED);
        auction.setCompletedAt(LocalDateTime.now());
        auctionRepository.save(auction);
        
        return buildAuctionDto(auction);
    }

    /**
     * Build full AuctionDto from entity.
     */
    private AuctionDto buildAuctionDto(Auction auction) {
        List<PlayerSale> sales = playerSaleRepository.findByAuctionId(auction.getId());
        
        Map<Long, List<AcquiredPlayerDto>> playersByTeam = sales.stream()
                .filter(sale -> sale.getTeam() != null) // Exclude unsold
                .collect(Collectors.groupingBy(
                        sale -> sale.getTeam().getId(),
                        Collectors.mapping(
                                sale -> new AcquiredPlayerDto(
                                        PlayerDto.fromEntity(sale.getPlayer()),
                                        sale.getSoldPrice()
                                ),
                                Collectors.toList()
                        )
                ));

        List<TeamAuctionStateDto> teamStates = auction.getTeamStates().stream()
                .map(state -> buildTeamStateDto(state, auction.getId()))
                .toList();

        Set<Long> soldPlayerIds = sales.stream()
                .map(sale -> sale.getPlayer().getId())
                .collect(Collectors.toSet());

        return new AuctionDto(
                auction.getId(),
                auction.getStatus(),
                auction.getStartedAt(),
                auction.getCompletedAt(),
                teamStates,
                soldPlayerIds
        );
    }

    /**
     * Build TeamAuctionStateDto with acquired players.
     */
    private TeamAuctionStateDto buildTeamStateDto(TeamAuctionState state, Long auctionId) {
        List<PlayerSale> teamSales = playerSaleRepository
                .findByAuctionIdAndTeamId(auctionId, state.getTeam().getId());

        List<AcquiredPlayerDto> acquiredPlayers = teamSales.stream()
                .map(sale -> new AcquiredPlayerDto(
                        PlayerDto.fromEntity(sale.getPlayer()),
                        sale.getSoldPrice()
                ))
                .toList();

        return new TeamAuctionStateDto(
                TeamDto.fromEntity(state.getTeam()),
                state.getRemainingBudget(),
                acquiredPlayers
        );
    }
}
