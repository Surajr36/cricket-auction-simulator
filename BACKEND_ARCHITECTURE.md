# Backend Architecture

This document explains the architectural decisions for the Spring Boot backend of the Cricket Auction Simulator.

## Overview

The backend is a **minimal, interview-defensible Spring Boot application** that provides:
- Data persistence with H2 (in-memory database)
- REST API endpoints for the frontend
- Data seeding from JSON files

**Key Principle**: The backend exists to **support the frontend**, not replace its logic. Business rules remain frontend-side.

---

## Technology Choices

### Why Spring Boot?

| Factor | Decision | Rationale |
|--------|----------|-----------|
| **Framework** | Spring Boot 3.2.1 | Industry standard, extensive tooling, job market relevance |
| **Java Version** | 17+ | LTS release, modern features (records, switch expressions) |
| **Build Tool** | Maven | Simpler configuration than Gradle for this scope |
| **Database** | H2 (in-memory) | Zero setup, perfect for demos, easy to upgrade to PostgreSQL |
| **ORM** | Spring Data JPA | Reduces boilerplate, derived queries |

### Alternatives Considered

```
REST + Spring Boot (chosen)
├── Pros: Widely understood, stateless, cacheable, simple tooling
├── Cons: Overfetching/underfetching possible
└── Verdict: Right choice for this scope

GraphQL
├── Pros: Flexible queries, typed schema
├── Cons: Overkill for 4 endpoints, learning curve for interviewers
└── Verdict: Adds complexity without benefit here

WebSockets
├── Pros: Real-time updates, bidirectional communication
├── Cons: State management complexity, not needed for single-user sim
└── Verdict: Would consider for multi-user auction
```

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                         Controller Layer                         │
│  - HTTP request/response handling                                │
│  - Input validation (basic)                                      │
│  - No business logic                                             │
│  - @RestController, @RequestMapping                              │
├─────────────────────────────────────────────────────────────────┤
│                          Service Layer                           │
│  - Transaction boundaries (@Transactional)                       │
│  - Orchestration of repository calls                             │
│  - MINIMAL business logic (just for persistence)                 │
│  - @Service                                                      │
├─────────────────────────────────────────────────────────────────┤
│                        Repository Layer                          │
│  - Data access (CRUD operations)                                 │
│  - Spring Data JPA derived queries                               │
│  - JpaRepository<Entity, ID>                                     │
├─────────────────────────────────────────────────────────────────┤
│                          Domain Layer                            │
│  - JPA Entities (@Entity)                                        │
│  - Enums (PlayerRole, Nationality, AuctionStatus)                │
│  - No business logic in entities                                 │
├─────────────────────────────────────────────────────────────────┤
│                           DTO Layer                              │
│  - Java Records (immutable)                                      │
│  - API request/response contracts                                │
│  - Decoupled from entities                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## REST API Endpoints

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| GET | `/api/players` | Get all players | `PlayerDto[]` |
| GET | `/api/teams` | Get all teams | `TeamDto[]` |
| POST | `/api/auction/start` | Start new auction | `AuctionDto` |
| GET | `/api/auction/{id}` | Get auction state | `AuctionDto` |
| GET | `/api/auction/active` | Get active auction | `AuctionDto` or 204 |
| POST | `/api/auction/bid` | Record a sale | `BidResultDto` |
| POST | `/api/auction/{id}/unsold/{playerId}` | Mark player unsold | 200 |
| POST | `/api/auction/{id}/complete` | Complete auction | `AuctionDto` |

### Example: Record Bid Request/Response

```json
// POST /api/auction/bid
// Request
{
  "auctionId": 1,
  "playerId": 5,
  "teamId": 2,
  "price": 150.0
}

// Response
{
  "success": true,
  "message": "Bid recorded successfully",
  "updatedTeamState": {
    "team": { "id": 2, "name": "Mumbai Indians", ... },
    "remainingBudget": 8850.0,
    "acquiredPlayers": [...]
  }
}
```

---

## Design Decisions

### 1. Stateless Backend

**Decision**: No auction state stored in-memory on the server.

**Why**:
- Each request contains all needed information
- Easy horizontal scaling (multiple server instances)
- Frontend handles real-time state; backend handles persistence
- Recovery is simple: just restart the server

**Interview Question**: "How would you scale this to multiple users?"

**Answer**: "The backend is already stateless. Each auction has an ID, and all state is in the database. Multiple frontends could point to the same backend. For true real-time multi-user, I'd add WebSocket support for bid notifications."

---

### 2. Frontend vs Backend Responsibilities

| Responsibility | Location | Rationale |
|----------------|----------|-----------|
| Bid validation (budget, rules) | **Frontend** | Immediate UX feedback |
| Squad constraints | **Frontend** | Business logic shouldn't require round trips |
| Timer management | **Frontend** | Real-time, no network latency |
| AI recommendations | **Frontend** | Heuristics are domain logic |
| Data persistence | **Backend** | Single source of truth |
| Data seeding | **Backend** | Server-side initialization |

**Interview Question**: "Why not validate bids on the backend?"

**Answer**: "For a single-user simulation, frontend validation gives instant feedback. In a multi-user auction, I'd add server-side validation as defense-in-depth. But even then, frontend validation improves UX by preventing round trips for obvious errors."

---

### 3. DTOs vs Entities

**Decision**: Separate DTOs from JPA entities.

**Why**:
- API contract is stable even if DB schema changes
- Entities have JPA annotations; DTOs are clean
- Can shape DTOs for specific use cases
- Records provide immutability for DTOs

```java
// Entity (mutable, JPA-annotated)
@Entity
public class Player {
    @Id @GeneratedValue
    private Long id;
    private String name;
    // getters/setters
}

// DTO (immutable, clean)
public record PlayerDto(
    Long id,
    String name,
    ...
) {
    public static PlayerDto fromEntity(Player entity) { ... }
}
```

---

### 4. Enum Persistence

**Decision**: Use `@Enumerated(EnumType.STRING)` for all enums.

```java
@Enumerated(EnumType.STRING)
private PlayerRole role;  // Stores "BATTER", not 0
```

**Why**:
- Readable in database
- Safe from enum reordering bugs
- Slightly more storage, but negligible

**Alternative** (avoided): `EnumType.ORDINAL` saves space but breaks if enum order changes.

---

### 5. Data Seeding Strategy

**Decision**: Use `CommandLineRunner` to seed from JSON on startup.

```java
@Component
public class DataSeeder implements CommandLineRunner {
    @Override
    public void run(String... args) throws Exception {
        if (playerService.hasPlayers()) return; // Idempotent
        // Seed from JSON...
    }
}
```

**Why**:
- Runs after Spring context is ready
- Before first HTTP request
- Idempotent (checks if data exists)
- Data files are versioned with code

---

## Error Handling

### Current (Minimal)
- Controllers return 404 for not found
- Services throw `IllegalArgumentException` for invalid operations
- No global exception handler (acceptable for demo)

### Production Improvement
```java
@ControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorDto> handleBadRequest(IllegalArgumentException e) {
        return ResponseEntity.badRequest()
            .body(new ErrorDto(e.getMessage()));
    }
}
```

---

## Testing Strategy

### What Would Be Tested (if time allowed)

| Layer | Test Type | Tool |
|-------|-----------|------|
| Repository | Integration | `@DataJpaTest` |
| Service | Unit | Mockito |
| Controller | Integration | `@WebMvcTest` |
| Full Stack | E2E | `@SpringBootTest` |

### Example Service Test

```java
@ExtendWith(MockitoExtension.class)
class AuctionServiceTest {
    @Mock private AuctionRepository auctionRepo;
    @InjectMocks private AuctionService service;
    
    @Test
    void startAuction_createsNewAuction() {
        when(teamRepo.findAll()).thenReturn(List.of(testTeam));
        when(auctionRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        
        AuctionDto result = service.startAuction();
        
        assertThat(result.status()).isEqualTo(AuctionStatus.IN_PROGRESS);
    }
}
```

---

## Running the Backend

### Prerequisites
- Java 17+
- Maven 3.6+

### Commands

```bash
cd backend

# Build
mvn clean package

# Run
mvn spring-boot:run

# Or run the JAR
java -jar target/auction-0.0.1-SNAPSHOT.jar
```

### Verify It's Running

```bash
# Get all players
curl http://localhost:8080/api/players

# Get all teams  
curl http://localhost:8080/api/teams

# H2 Console (for debugging)
# http://localhost:8080/h2-console
# JDBC URL: jdbc:h2:mem:auctiondb
```

---

## Future Enhancements

If this were extended for production:

1. **Multi-user Support**
   - Add User entity and authentication
   - WebSocket for real-time bid updates
   - Optimistic locking for concurrent bids

2. **Persistence**
   - Replace H2 with PostgreSQL
   - Add Flyway migrations

3. **Observability**
   - Spring Actuator endpoints
   - Metrics with Micrometer
   - Structured logging

4. **API Improvements**
   - OpenAPI/Swagger documentation
   - Rate limiting
   - API versioning

---

## Interview Talking Points

### "Why didn't you use a more 'modern' stack?"

"Spring Boot is battle-tested, widely understood, and has excellent tooling. For an auction simulator that needs reliable persistence and REST APIs, it's the right tool. I'd use different technology for different problems—but I wouldn't add complexity without clear benefit."

### "How would you handle concurrent bids?"

"Currently, this is single-user, so concurrency isn't an issue. For multi-user, I'd:
1. Add optimistic locking with `@Version`
2. Use database-level constraints
3. Consider event sourcing for audit trail
4. Add WebSocket for real-time updates"

### "Why is your backend so thin?"

"Intentionally. The frontend owns the business logic because:
1. Better UX (instant validation)
2. Simpler backend (easier to test, deploy, scale)
3. Clear separation of concerns
The backend is a persistence layer, not a business logic engine."
