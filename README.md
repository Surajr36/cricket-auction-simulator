# 🏏 Cricket Auction Simulator

A professional-grade React + TypeScript T20 cricket auction simulator built for learning and interview preparation.

## 🎯 Project Goal

Simulate a T20 cricket auction with:
- Team budgets and squad constraints
- Real-time bidding with countdown timer
- Rule-based validations with clear UX feedback
- AI-assisted bidding recommendations (explainable heuristics)
- **Optional backend for data persistence**

## 🚀 Quick Start

### Frontend Only (Static Data)

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### With Backend (API Data + Persistence)

```bash
# Terminal 1: Start the backend
cd backend
mvn spring-boot:run
# Backend runs on http://localhost:8080

# Terminal 2: Start the frontend
npm run dev
# Frontend runs on http://localhost:5173
```

The frontend automatically detects if the backend is running:
- ✅ Backend running → Data fetched from API
- ⚠️ Backend unavailable → Falls back to static JSON files

## 📁 Project Structure

```
/src                   # Frontend (React + TypeScript)
  /api                 # API client for backend
    auctionApi.ts
  /domain              # Business logic (no React dependency)
    types.ts           # Domain types and discriminated unions
    auctionRules.ts    # Auction business logic
    squadValidator.ts  # Validation functions
    bidCalculator.ts   # AI recommendation heuristics
  /hooks               # Custom React hooks
    useAuction.ts      # Main auction state (useReducer)
    useAuctionTimer.ts # Timer management
    useAuctionData.ts  # API data fetching
    useAIRecommendation.ts # AI bid recommendations
  /components          # React components
  /pages               # Page-level components
  /data                # Static fallback data

/backend               # Backend (Spring Boot + Java)
  /src/main/java/com/cricket/auction
    /controller        # REST endpoints
    /service           # Business logic
    /repository        # Data access (Spring Data JPA)
    /domain            # JPA entities
    /dto               # API contracts
    /config            # Data seeding
```

## 🏗️ Architecture Highlights

### Domain-Driven Design
Business logic is separated from React, enabling:
- Pure function testing without DOM
- Reusability across components
- Framework independence

### Discriminated Unions for State
```typescript
type AuctionState = 
  | IdleAuctionState 
  | BiddingAuctionState 
  | SoldAuctionState;
```
Makes illegal states unrepresentable at the type level.

### useReducer for Complex State
Atomic state updates with explicit, traceable actions:
```typescript
dispatch({ type: 'PLACE_BID', payload: { teamId, amount } });
```

### Stale Closure Prevention
Timer uses ref pattern to avoid capturing stale callbacks.

## 📚 Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Frontend architecture decisions
- **[BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md)** - Backend architecture decisions
- **[INTERVIEW_NOTES.md](./INTERVIEW_NOTES.md)** - Interview Q&A and common mistakes

## 🛠️ Tech Stack

### Frontend
- React 18
- TypeScript (strict mode)
- Vite
- No external state management (useReducer only)
- No UI libraries (simple inline styles)

### Backend (Optional)
- Java 17+
- Spring Boot 3.2
- Spring Data JPA
- H2 (in-memory database)

## ⚡ Features

### Auction Mechanics
- 60-second countdown per player
- Timer resets on valid bids
- Quick-bid buttons with dynamic increments
- Custom bid input with validation

### Squad Management
- Budget tracking
- Role constraints (batters, bowlers, all-rounders, wicket-keepers)
- Overseas player limits
- Visual composition summary

### AI Recommendations
- Heuristic-based bid suggestions
- Transparent reasoning displayed to user
- Considers: player quality, role scarcity, budget constraints

### Validation
- Budget checks
- Squad size limits
- Role-specific maximums
- Clear error messages

## 🎓 Learning Focus

This project demonstrates:
1. When to use useReducer vs useState
2. How discriminated unions prevent bugs
3. Proper timer cleanup and stale closure handling
4. Selective memoization (where it helps, where it doesn't)
5. Domain logic separation for testability

## 📝 License

MIT - Use for learning and interviews!
