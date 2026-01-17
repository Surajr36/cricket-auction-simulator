# Interview Notes

This document contains interview questions answered using this project, common mistakes this project avoids, and talking points for discussing the codebase.

---

## 🎯 How This Project Demonstrates Key Skills

### React Fundamentals
- **Component Composition**: `AuctionPage` composes `AuctionTable`, `BidControls`, `SquadSummary`, `ValidationBanner`
- **Props and State**: Clear data flow from parent to child via props
- **Event Handling**: Callbacks passed down (`onPlaceBid`, `onSelectPlayer`)
- **Conditional Rendering**: Different UI for each auction phase
- **Lists and Keys**: Proper key usage in `AuctionTable` (player.id, not index)

### State Management Maturity
- **useReducer for Complex State**: Auction state with multiple actions
- **Discriminated Unions**: Type-safe state transitions
- **Immutable Updates**: No mutations in reducer
- **Action Creators**: Wrapped dispatch for validation

### Architectural Thinking
- **Domain Separation**: Business logic independent of React
- **Custom Hooks**: Encapsulated timer and AI logic
- **Single Responsibility**: Each file has one job
- **Testability by Design**: Pure functions, minimal dependencies

### Trade-off Awareness
- **useState vs useReducer**: Chose reducer for complex state
- **Context vs Props**: Chose props for shallow tree
- **Memo vs No Memo**: Justified memoization decisions
- **Heuristics vs ML**: Chose transparency over complexity

---

## 📋 10 React Interview Questions Answered Using This Project

### 1. "Explain the difference between useState and useReducer. When would you use each?"

**Answer using this project:**
"In this auction simulator, I use `useReducer` because auction state is complex - it has multiple interdependent pieces (phase, current player, bid, timer, teams) that change together.

With `useState`, I'd need multiple state variables that could become inconsistent:
```typescript
// Risk: What if one update succeeds and another fails?
setPhase('bidding');
setCurrentPlayer(player);
setBid(null);
```

With `useReducer`, all changes happen atomically:
```typescript
dispatch({ type: 'START_BIDDING', payload: { player } });
```

I'd use `useState` for simple, independent state like a form input or a toggle. I'd use `useReducer` when state transitions are complex or when I need to trace state changes for debugging."

---

### 2. "What are discriminated unions and how do they prevent bugs?"

**Answer using this project:**
"Look at my `AuctionState` type in `types.ts`. It's a discriminated union:

```typescript
type AuctionState = 
  | IdleAuctionState 
  | BiddingAuctionState 
  | SoldAuctionState;
```

Each variant has a `phase` discriminator. The bug this prevents: with a single object type, you could accidentally access `currentPlayer` when the auction is idle:

```typescript
// ❌ Without discriminated unions:
if (state.currentPlayer) { } // Might be undefined unexpectedly

// ✅ With discriminated unions:
if (state.phase === 'bidding') {
  state.currentPlayer // TypeScript knows this exists!
}
```

This makes illegal states unrepresentable at the type level."

---

### 3. "How do you handle stale closures in React hooks?"

**Answer using this project:**
"In `useAuctionTimer`, I needed to avoid stale closures in the interval callback. The problem:

```typescript
// ❌ BAD: This captures the initial `onTick` forever
useEffect(() => {
  setInterval(() => onTick(), 1000);
}, []);
```

My solution uses refs:
```typescript
const onTickRef = useRef(onTick);

useEffect(() => {
  onTickRef.current = onTick; // Always update the ref
}, [onTick]);

useEffect(() => {
  const id = setInterval(() => onTickRef.current(), 1000);
  return () => clearInterval(id);
}, [isRunning]);
```

The interval callback reads from the ref, which always has the latest function. This avoids recreating the interval on every render while still using the current callback."

---

### 4. "When should you use React.memo, useMemo, and useCallback?"

**Answer using this project:**
"I use each where justified, but not everywhere:

**React.memo** - `PlayerCard` and `SquadSummary`:
- Multiple instances rendered in a list
- Props rarely change (player data is static)
- Component render is non-trivial

**useMemo** - `filteredPlayers` in `AuctionTable`:
- Expensive filter operation on large array
- Result used in render output
- Dependencies change infrequently

**useCallback** - Action creators in `useAuction`:
- Passed as props to memoized children
- Without it, new function references break child memoization

**Where I DON'T use them:**
- `BidControls` - Timer changes every second, would re-render anyway
- Simple event handlers - Not passed to children
- `AuctionTable` itself - Children are memoized, that's enough"

---

### 5. "How do you test a component that uses useReducer?"

**Answer using this project:**
"I designed for testability by separating the reducer from the hook:

```typescript
// The reducer is exported and can be tested directly
export function auctionReducer(state, action) { ... }

// Test without React:
test('PLACE_BID updates current bid', () => {
  const initialState = createInitialState(mockTeams);
  const state = auctionReducer(startedState, {
    type: 'PLACE_BID',
    payload: { teamId: 'team-1', amount: 100 }
  });
  expect(state.currentBid?.amount).toBe(100);
});
```

The domain logic in `/domain` is also pure and testable without React. The component tests then focus on integration - does clicking the button dispatch the right action?"

---

### 6. "Explain the useEffect cleanup function and why it's important."

**Answer using this project:**
"In `useAuctionTimer`:

```typescript
useEffect(() => {
  if (!isRunning) return;
  
  const intervalId = setInterval(() => {
    onTickRef.current();
  }, 1000);

  // CLEANUP: Runs when isRunning changes or component unmounts
  return () => {
    clearInterval(intervalId);
  };
}, [isRunning]);
```

Without cleanup:
1. **Memory leak**: Interval keeps running after component unmounts
2. **Multiple intervals**: New interval created without clearing old one
3. **Stale operations**: Calling functions on unmounted component

The cleanup function prevents all of these. It runs before the effect runs again and when the component unmounts."

---

### 7. "How do you decide between prop drilling and Context?"

**Answer using this project:**
"I use prop drilling in this project because:

1. **Tree is shallow**: Only 2-3 levels deep
2. **Props are explicit**: Can trace data flow by reading code
3. **No re-render storms**: Context changes re-render all consumers

I'd use Context for:
- **Deep trees** (5+ levels of drilling)
- **Global data** (theme, authenticated user)
- **Data that changes infrequently**

The auction state changes frequently (timer ticks every second). If I put it in Context, every component would re-render every second. Props let me be selective about what each component receives."

---

### 8. "What's the difference between controlled and uncontrolled components?"

**Answer using this project:**
"In `BidControls`, the custom bid input is **controlled**:

```typescript
const [customBidAmount, setCustomBidAmount] = useState('100');

<input
  value={customBidAmount}           // React controls the value
  onChange={e => setCustomBidAmount(e.target.value)}  // We handle every change
/>
```

**Controlled** means React state is the source of truth. Benefits:
- Can validate on every keystroke
- Can transform input (e.g., format as currency)
- Input value is always known

**Uncontrolled** would use a ref to read the value only when needed:
```typescript
const inputRef = useRef();
// Read inputRef.current.value on submit
```

I prefer controlled for forms with validation. I'd use uncontrolled for simple cases where I only need the final value."

---

### 9. "How do you handle errors in a React application?"

**Answer using this project:**
"I handle errors at multiple levels:

**Domain validation** (pure functions):
```typescript
function validateBid(...): ValidationResult {
  return { isValid: false, errors: [...] };
}
```
Returns structured errors, doesn't throw.

**Reducer guards**:
```typescript
case 'PLACE_BID':
  if (state.phase !== 'bidding') {
    console.warn('Cannot place bid: not in bidding state');
    return state; // Don't crash, just ignore
  }
```

**UI feedback** (`ValidationBanner`):
```typescript
<ValidationBanner
  message={state.message}
  type={state.phase === 'sold' ? 'success' : 'info'}
/>
```

For unexpected errors (network, etc.), I'd add an Error Boundary at the app root. But validation failures aren't exceptions - they're expected user feedback."

---

### 10. "How would you optimize a list of 1000+ items?"

**Answer using this project:**
"My `AuctionTable` renders 40 players. For 1000+:

**Current optimizations:**
- `PlayerCard` wrapped in `React.memo` (don't re-render unchanged cards)
- Proper `key` usage (`player.id`, not index)
- `useMemo` for filtered list

**Additional optimizations for 1000+:**
1. **Virtualization**: Only render visible items (`react-window` or `react-virtual`)
2. **Pagination**: Show 50 at a time with page controls
3. **Debounced filtering**: Don't filter on every keystroke
4. **Web Workers**: Filter large lists off the main thread

I'd measure first with React DevTools Profiler before adding complexity."

---

## 🚫 5 Common React Mistakes This Project Avoids

### 1. Mutating State Directly

**Mistake:**
```typescript
// ❌ BAD
state.teams[0].budget -= 100;
return state;
```

**This Project:**
```typescript
// ✅ GOOD - New objects at every level
return {
  ...state,
  teams: state.teams.map(t => 
    t.teamId === winningTeamId
      ? { ...t, remainingBudget: t.remainingBudget - amount }
      : t
  )
};
```

---

### 2. Using Index as Key

**Mistake:**
```typescript
// ❌ BAD - Causes bugs when list is filtered/sorted
{players.map((player, index) => (
  <PlayerCard key={index} player={player} />
))}
```

**This Project:**
```typescript
// ✅ GOOD - Stable identity
{players.map(player => (
  <PlayerCard key={player.id} player={player} />
))}
```

---

### 3. Missing useEffect Dependencies

**Mistake:**
```typescript
// ❌ BAD - Stale closure, exhaustive-deps warning
useEffect(() => {
  const id = setInterval(() => tick(), 1000);
  return () => clearInterval(id);
}, []); // `tick` should be in deps!
```

**This Project:**
```typescript
// ✅ GOOD - Ref pattern avoids needing tick in deps
const onTickRef = useRef(onTick);
useEffect(() => {
  onTickRef.current = onTick;
}, [onTick]);

useEffect(() => {
  const id = setInterval(() => onTickRef.current(), 1000);
  return () => clearInterval(id);
}, [isRunning]); // No tick dependency needed
```

---

### 4. Creating Objects in Render

**Mistake:**
```typescript
// ❌ BAD - New object every render breaks memoization
<Child style={{ color: 'red' }} />
```

**This Project:**
```typescript
// For simple cases, inline is fine (no memoized children)
// For memoized children, I either:
// 1. Define styles outside component
// 2. Use useMemo if dynamic

const containerStyle: React.CSSProperties = {
  padding: '16px',
  // ...
};
```

---

### 5. Using `any` Type

**Mistake:**
```typescript
// ❌ BAD - Throws away all type safety
function handleEvent(event: any) { ... }
```

**This Project:**
```typescript
// ✅ GOOD - Explicit types everywhere
function handleBid(amount: number): void { ... }

type AuctionAction = 
  | StartBiddingAction
  | PlaceBidAction
  | InvalidBidAction
  // ... no any!
```

---

## 💬 Interview Talking Points

### Opening Statement
"This is a cricket auction simulator I built to demonstrate React architecture decisions. The interesting parts are: how I structured state with discriminated unions, why I separated domain logic from React, and how I handled the timer without stale closure bugs."

### If Asked About Performance
"I used memoization selectively - `React.memo` on `PlayerCard` because there are many of them and they rarely change, but not on `BidControls` because the timer causes re-renders anyway. I can walk you through each decision."

### If Asked About Testing
"The architecture makes testing easy: domain functions like `validateBid` are pure and testable without React. The reducer is exported and testable separately. Components receive props, so I can test them by passing mock data."

### If Asked About Scaling
"If this needed to handle real auctions with websockets, I'd: add React Query for server state, use websocket events as actions to the reducer, and add optimistic updates. The domain layer wouldn't change much."

### Closing Statement
"Every decision here has a reason I can explain. The code isn't perfect, but it's intentional - I know why each trade-off was made."
