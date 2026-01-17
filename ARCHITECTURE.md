# Architecture Decision Records

This document explains the key architectural decisions made in this Cricket Auction Simulator project. Each decision includes the rationale, alternatives considered, and common mistakes to avoid.

---

## 🏗️ Overall Architecture

### Why Domain-Driven Folder Structure?

```
/src
  /domain      ← Business logic (no React!)
  /hooks       ← React hooks (stateful logic)
  /components  ← React components (UI)
  /pages       ← Page-level composition
  /data        ← Static data files
```

**Decision:** Separate domain logic from React code.

**Rationale:**
1. **Testability**: Domain functions are pure - they can be tested without React, without mocking, without a DOM
2. **Reusability**: The same validation logic can be used in reducers, components, and AI recommendations
3. **Framework Independence**: If we migrated from React to Vue, only `/hooks` and `/components` would change
4. **Interview Defense**: Shows understanding of separation of concerns

**Alternatives Considered:**
- **Co-located files** (validation.ts next to Component.tsx): Rejected because domain logic would be scattered
- **Single utils folder**: Rejected because it doesn't communicate intent - "utils" becomes a dumping ground

**Common Mistake:** Putting business logic in components. This makes testing hard and creates duplication.

---

## 📊 State Management

### Why `useReducer` over `useState`?

**Decision:** Use `useReducer` for auction state.

**Rationale:**
1. **Complex State**: Multiple pieces change together (phase, bid, timer, teams)
2. **Explicit Actions**: Every state change is named and traceable
3. **Testable**: `reducer(state, action) => newState` is a pure function
4. **Predictable**: No race conditions from multiple `setState` calls

**Code Example - The Problem with useState:**
```typescript
// ❌ BAD: Multiple setState calls can cause inconsistent state
const [phase, setPhase] = useState('idle');
const [currentBid, setCurrentBid] = useState(null);
const [timer, setTimer] = useState(60);

// If one update succeeds and another fails, state is invalid!
setPhase('bidding');
setCurrentBid({ amount: 100 }); // What if this throws?
```

```typescript
// ✅ GOOD: Single atomic update
dispatch({ type: 'PLACE_BID', payload: { amount: 100 } });
// All related state updates happen together
```

**Alternatives Considered:**
- **Redux**: Overkill for a single-page app, adds dependency
- **Zustand/Jotai**: Adds dependency for something `useReducer` handles well
- **Context + useState**: Would cause re-render storms (every state change re-renders all consumers)

---

### Why Discriminated Unions for State?

**Decision:** Model auction state as a discriminated union.

```typescript
type AuctionState = 
  | IdleAuctionState 
  | BiddingAuctionState 
  | SoldAuctionState;
```

**Rationale:**
1. **Makes Illegal States Unrepresentable**: You can't have a `currentBid` without a `currentPlayer`
2. **Type Narrowing**: Check `state.phase`, and TypeScript knows exactly what fields exist
3. **Exhaustive Switch**: TypeScript warns if you miss a case

**The Problem It Solves:**
```typescript
// ❌ BAD: This type allows invalid states
type AuctionState = {
  phase: 'idle' | 'bidding' | 'sold';
  currentPlayer?: Player;  // What if phase is 'bidding' but this is undefined?
  currentBid?: Bid;        // Can we have a bid without a player?
};

// ✅ GOOD: Invalid states are impossible
type BiddingState = {
  phase: 'bidding';
  currentPlayer: Player;   // REQUIRED when phase is 'bidding'
  currentBid: Bid | null;
};
```

---

## ⏱️ Timer Architecture

### Why a Separate Timer Hook?

**Decision:** Extract timer logic into `useAuctionTimer`.

**Rationale:**
1. **Complexity Isolation**: Timer logic has tricky edge cases (stale closures, cleanup)
2. **Testability**: Can test timer behavior independently
3. **Reusability**: Timer pattern could be used elsewhere

### How Stale Closures Are Avoided

**The Problem:**
```typescript
// ❌ BAD: This closure captures the initial `time` value
useEffect(() => {
  const id = setInterval(() => {
    setTime(time - 1); // `time` is always 60!
  }, 1000);
  return () => clearInterval(id);
}, []); // Empty deps = closure never updates
```

**The Solution:**
```typescript
// ✅ GOOD: Use refs to access latest values
const onTickRef = useRef(onTick);

useEffect(() => {
  onTickRef.current = onTick; // Keep ref updated
}, [onTick]);

useEffect(() => {
  const id = setInterval(() => {
    onTickRef.current(); // Always calls the latest function
  }, 1000);
  return () => clearInterval(id);
}, [isRunning]); // Only restart when running state changes
```

**Why This Works:**
- Refs are mutable and don't trigger re-renders
- The interval callback always reads the current ref value
- Interval only restarts when `isRunning` changes, not on every tick

---

## 🧪 Validation Architecture

### Why Return Objects Instead of Throwing?

**Decision:** Validation functions return `ValidationResult`, not exceptions.

```typescript
type ValidationResult = 
  | { isValid: true }
  | { isValid: false; errors: ValidationError[] };
```

**Rationale:**
1. **Multiple Errors**: Can collect all errors, not just the first
2. **User-Friendly**: Errors have codes and messages for UI
3. **Composable**: Results can be combined easily
4. **Non-Exceptional**: Validation failures are expected, not exceptional

**The Problem with Exceptions:**
```typescript
// ❌ BAD: Exceptions are for unexpected errors, not validation
function validate(bid) {
  if (bid < minBid) {
    throw new Error("Bid too low"); // Caller must try/catch
  }
}

// ✅ GOOD: Return a result object
function validate(bid): ValidationResult {
  if (bid < minBid) {
    return { isValid: false, errors: [{ code: 'BID_TOO_LOW', message: '...' }] };
  }
  return { isValid: true };
}
```

---

## 🤖 AI Recommendations

### Why Heuristics, Not ML?

**Decision:** Use rule-based heuristics, not machine learning.

**Rationale:**
1. **No Training Data**: We don't have historical auction data
2. **Transparency**: Users see exactly why a recommendation was made
3. **Simplicity**: ML adds infrastructure complexity (models, inference APIs)
4. **Good Enough**: Heuristics handle common cases well

**What We Call "AI":**
- Budget-aware recommendations
- Role scarcity calculations
- Explainable reasoning

**What We Don't Call AI:**
- Black-box predictions
- Neural networks
- Features we can't explain

**Interview Talking Point:**
"I chose heuristics over ML because there's no training data, users benefit from seeing the reasoning, and simple rules handle the core use cases. If we had historical data and the heuristics weren't capturing patterns users wanted, I'd consider ML."

---

## ⚡ Performance Decisions

### When Memoization IS Used

| Where | Why |
|-------|-----|
| `PlayerCard` with `React.memo` | Many cards rendered, props rarely change |
| `SquadSummary` with `React.memo` | Multiple summaries, team state rarely changes |
| `filteredPlayers` with `useMemo` | Expensive filter on large array |
| Action creators with `useCallback` | Passed to memoized children |

### When Memoization Is NOT Used

| Where | Why Not |
|-------|---------|
| `BidControls` | Time changes every second, would re-render anyway |
| `AuctionTable` | Receives large arrays that change, memo comparison is expensive |
| Simple event handlers | Not passed to children, no benefit |
| Inline styles objects | Component is simple, optimization not needed |

**Interview Talking Point:**
"I only memoize when there's a measurable benefit. Premature memoization adds complexity and can even hurt performance due to comparison overhead."

---

## 📁 File Organization

### Why Separate `types.ts`?

**Decision:** All domain types in one file.

**Rationale:**
1. **Single Source of Truth**: One place to understand the domain model
2. **No Circular Dependencies**: Types don't import from other domain files
3. **Documentation**: Reading this file explains the entire domain

### Why `pages/` Folder?

**Decision:** Separate page-level components from reusable components.

**Rationale:**
1. **Clear Entry Points**: Pages are where routes point (if routing is added)
2. **Composition vs Reuse**: Pages compose; components are reused
3. **Testing Strategy**: Pages need integration tests; components need unit tests

---

## 🔒 Type Safety Strategies

### No `any` Policy

**Every** type is explicit:
- Player roles: `'batter' | 'bowler' | 'all-rounder' | 'wicket-keeper'`
- Actions: Discriminated union with typed payloads
- State: Discriminated union by phase

### Readonly by Default

**Decision:** Use `readonly` and `ReadonlyArray` everywhere.

```typescript
type TeamState = {
  readonly teamId: string;
  readonly remainingBudget: number;
  readonly squad: ReadonlyArray<AcquiredPlayer>;
};
```

**Rationale:**
1. **Prevents Mutations**: TypeScript errors if you try to mutate
2. **React Compatibility**: React expects immutable updates
3. **Clear Intent**: Readonly signals "don't change this"

---

## 🚫 What We Explicitly Avoided

1. **External State Libraries**: useReducer is sufficient
2. **CSS-in-JS Libraries**: Inline styles keep things simple
3. **Form Libraries**: One input doesn't need Formik
4. **Backend Persistence**: Out of scope
5. **Over-Abstraction**: No abstract factories, no dependency injection

---

## 📝 Summary

This architecture prioritizes:
1. **Testability**: Pure functions, isolated hooks
2. **Type Safety**: Discriminated unions, no `any`
3. **Simplicity**: Minimal dependencies, clear data flow
4. **Interview Defensibility**: Every decision has a reason

The codebase should allow a candidate to:
- Explain any decision confidently
- Point to specific code that demonstrates understanding
- Discuss trade-offs intelligently
