# Follow Player Feature - 9/10 Production Readiness Plan

## Current State: 6.5/10
## Target State: 9/10+

This plan addresses all issues identified in the deep technical audit to bring the follow player feature to AAA production quality.

---

## Phase 1: Critical Bug Fixes (P0)

### 1.1 Enforce 1-Tick Delay in FollowManager

**Problem:** `startTick` is stored but never checked - followers move on the same tick they click.

**File:** `packages/server/src/systems/ServerNetwork/FollowManager.ts`

**Changes:**
```typescript
// In processTick(), add check after getting state:
processTick(tickNumber?: number): void {
  if (tickNumber !== undefined) {
    currentTickNumber = tickNumber;
  }

  for (const [followerId, state] of this.following) {
    // OSRS-ACCURATE: Skip if follow was registered THIS tick
    // Movement starts on NEXT tick (1-tick delay)
    if (state.startTick === currentTickNumber) {
      continue;
    }

    // ... rest of existing logic
  }
}
```

**Verification:** Write test that confirms follower doesn't move until tick after clicking "Follow"

---

### 1.2 Route Follow Requests Through Action Queue

**Problem:** Follow bypasses ActionQueue, causing inconsistent timing with other actions.

**File:** `packages/server/src/systems/ServerNetwork/index.ts`

**Option A (Recommended):** Add follow to ActionQueue
```typescript
// In action-queue.ts, add:
export enum ActionType {
  MOVEMENT = "movement",
  COMBAT = "combat",
  INTERACTION = "interaction",
  FOLLOW = "follow",  // NEW
  CANCEL = "cancel",
}

// Add queueFollow method and handler registration
```

**Option B (Simpler):** Document that follow is intentionally synchronous and ensure 1-tick delay via startTick check (1.1 above)

**Decision:** Option B is acceptable if 1.1 is properly implemented, since the 1-tick delay is the key OSRS mechanic.

---

### 1.3 Unify Entity Lookup API

**Problem:** Two different APIs used for player lookup.

**Files:**
- `packages/server/src/systems/ServerNetwork/handlers/player.ts`
- `packages/server/src/systems/ServerNetwork/FollowManager.ts`

**Changes:**
```typescript
// In handlers/player.ts:111, change:
// FROM:
const targetPlayer = world.entities?.players?.get(targetPlayerId);

// TO:
const targetPlayer = world.entities.get(targetPlayerId);
```

**Rationale:** `entities.get()` is the canonical API used everywhere else. The `entities.players` collection may not exist or may have different semantics.

---

## Phase 2: Code Quality Improvements (P1)

### 2.1 Remove Dead Code: processPlayerTick()

**Problem:** 55-line method that's never called.

**File:** `packages/server/src/systems/ServerNetwork/FollowManager.ts`

**Action:** Delete lines 187-251 (`processPlayerTick` method entirely)

**Verification:**
```bash
grep -r "processPlayerTick" packages/server/src/
# Should only find the definition, no callers
```

---

### 2.2 Move Module-Level State to Instance

**Problem:** `currentTickNumber` is module-level, breaking encapsulation.

**File:** `packages/server/src/systems/ServerNetwork/FollowManager.ts`

**Changes:**
```typescript
// REMOVE module-level:
// let currentTickNumber = 0;

export class FollowManager {
  private following = new Map<string, FollowState>();
  private currentTickNumber = 0;  // ADD as instance member

  // Update processTick to use this.currentTickNumber
  processTick(tickNumber?: number): void {
    if (tickNumber !== undefined) {
      this.currentTickNumber = tickNumber;
    }
    // ...
  }

  // Update startFollowing to use this.currentTickNumber
  startFollowing(followerId: string, targetId: string): void {
    // ...
    this.following.set(followerId, {
      // ...
      startTick: this.currentTickNumber,
    });
  }
}
```

---

### 2.3 Add Follow Rate Limiter to Cleanup

**Problem:** Follow rate limiter not destroyed on server shutdown.

**File:** `packages/server/src/systems/ServerNetwork/services/SlidingWindowRateLimiter.ts`

**Changes:**
```typescript
// Add at module level:
let followLimiter: RateLimiter | null = null;

// Add getter:
export function getFollowRateLimiter(): RateLimiter {
  if (!followLimiter) {
    followLimiter = createRateLimiter({
      maxPerSecond: 5,
      name: "follow",
    });
  }
  return followLimiter;
}

// Update destroyAllRateLimiters:
export function destroyAllRateLimiters(): void {
  // ... existing destroys ...
  followLimiter?.destroy();
  followLimiter = null;
}
```

**File:** `packages/server/src/systems/ServerNetwork/handlers/player.ts`

**Changes:**
```typescript
// REMOVE local rate limiter definition
// Import from SlidingWindowRateLimiter instead:
import { getFollowRateLimiter } from "../services/SlidingWindowRateLimiter";
```

---

### 2.4 Remove Unused `startTick` Field (After 1.1)

**Note:** Only do this AFTER implementing 1.1. If we properly use `startTick`, keep it!

If using Option B from 1.2, `startTick` IS used and should remain.

---

## Phase 3: Memory & Performance (P2)

### 3.1 Pre-Allocate Tile Objects for Hot Path

**Problem:** 5+ object allocations per player per tick in movement loop.

**File:** `packages/server/src/systems/ServerNetwork/tile-movement.ts`

**Changes:**
```typescript
export class TileMovementManager {
  // ADD pre-allocated reusables:
  private readonly _tempTile1: TileCoord = { x: 0, z: 0 };
  private readonly _tempTile2: TileCoord = { x: 0, z: 0 };

  // In onTick(), use assignment instead of spread:
  // FROM:
  const prevTile = { ...state.currentTile };

  // TO:
  this._tempTile1.x = state.currentTile.x;
  this._tempTile1.z = state.currentTile.z;
  const prevTile = this._tempTile1;
```

**Note:** Be careful with reference semantics - ensure temp objects aren't stored in state.

**Alternative:** For state updates that MUST be stored, keep the spread but document why:
```typescript
// Must allocate - stored in state, not temp calculation
state.previousTile = { ...state.currentTile };
```

---

### 3.2 Add Zero-Allocation tileToWorldInto()

**File:** `packages/shared/src/systems/shared/movement/TileSystem.ts`

**Changes:**
```typescript
/**
 * Convert tile to world coordinates (zero-allocation)
 * Writes to existing object to avoid GC pressure.
 */
export function tileToWorldInto(
  tile: TileCoord,
  out: { x: number; y: number; z: number }
): void {
  out.x = (tile.x + 0.5) * TILE_SIZE;
  out.y = 0;
  out.z = (tile.z + 0.5) * TILE_SIZE;
}
```

**Usage in FollowManager:**
```typescript
private readonly _tempWorldPos = { x: 0, y: 0, z: 0 };

// In processTick:
tileToWorldInto(previousTile, this._tempWorldPos);
this.tileMovementManager.movePlayerToward(
  followerId,
  { x: this._tempWorldPos.x, y: targetPos.y, z: this._tempWorldPos.z },
  true,
  0,
);
```

---

## Phase 4: Testing (P2 but Critical for 9/10)

### 4.1 Add Unit Tests for FollowManager

**File:** `packages/server/tests/unit/follow/FollowManager.test.ts` (NEW)

**Test Cases:**
```typescript
describe('FollowManager', () => {
  describe('startFollowing', () => {
    it('should not allow self-follow', () => {});
    it('should cancel existing follow when starting new one', () => {});
    it('should verify target exists', () => {});
    it('should store follow state with current tick', () => {});
  });

  describe('processTick - 1-tick delay', () => {
    it('should NOT move follower on same tick as startFollowing', () => {});
    it('should move follower on tick AFTER startFollowing', () => {});
  });

  describe('processTick - trailing behavior', () => {
    it('should path to target previousTile (1 tile behind)', () => {});
    it('should stop when at target previousTile', () => {});
    it('should re-path when target moves', () => {});
    it('should NOT re-path when target is stationary', () => {});
  });

  describe('stopFollowing', () => {
    it('should remove follow state', () => {});
    it('should be called when player clicks ground', () => {});
  });

  describe('onPlayerDisconnect', () => {
    it('should stop player from following', () => {});
    it('should stop anyone following disconnected player', () => {});
  });

  describe('mutual following (dancing)', () => {
    it('should create oscillating pattern when two players follow each other', () => {});
  });
});
```

---

### 4.2 Add Integration Test with Real Server

**File:** `packages/server/tests/integration/follow.test.ts` (NEW)

**Per CLAUDE.md:** Tests must use real Hyperscape instances, NO MOCKS.

```typescript
describe('Follow Player Integration', () => {
  it('player B follows player A with 1-tick delay', async () => {
    // 1. Start server
    // 2. Connect two players
    // 3. Player B clicks follow on Player A
    // 4. Advance 1 tick - verify B hasn't moved yet
    // 5. Advance 1 tick - verify B starts moving
    // 6. Player A stops - verify B stops 1 tile behind
  });

  it('follow is cancelled when clicking ground', async () => {});

  it('follow is cancelled when target disconnects', async () => {});
});
```

---

## Phase 5: Documentation & Code Quality (Polish)

### 5.1 Add Error Logging to Follow Path

**File:** `packages/server/src/systems/ServerNetwork/FollowManager.ts`

**Changes:**
```typescript
startFollowing(followerId: string, targetId: string): void {
  if (followerId === targetId) {
    console.debug(`[FollowManager] Player ${followerId} attempted self-follow`);
    return;
  }

  const targetEntity = this.world.entities.get(targetId);
  if (!targetEntity) {
    console.warn(`[FollowManager] Target ${targetId} not found for follower ${followerId}`);
    return;
  }

  // ... existing logic ...

  console.debug(`[FollowManager] ${followerId} now following ${targetId}`);
}
```

---

### 5.2 Extract Shared Logic (DRY)

If keeping both `processTick()` and `processPlayerTick()` (for future GameTickProcessor integration):

```typescript
private processFollowForPlayer(
  playerId: string,
  state: FollowState
): 'continue' | 'delete' | 'processed' {
  // Shared validation and movement logic
  // Returns action for caller to take
}

processTick(tickNumber?: number): void {
  // ... tick number handling ...
  for (const [followerId, state] of this.following) {
    const result = this.processFollowForPlayer(followerId, state);
    if (result === 'delete') {
      this.following.delete(followerId);
    }
  }
}

processPlayerTick(playerId: string): void {
  const state = this.following.get(playerId);
  if (!state) return;
  const result = this.processFollowForPlayer(playerId, state);
  if (result === 'delete') {
    this.following.delete(playerId);
  }
}
```

---

## Checklist for 9/10

### Critical (Must Have)
- [ ] 1.1 - 1-tick delay enforced via `startTick` check
- [ ] 1.3 - Unified entity lookup API
- [ ] 4.1 - Unit tests for FollowManager (at least 10 test cases)

### Important (Should Have)
- [ ] 2.1 - Dead code removed OR properly integrated
- [ ] 2.2 - Module-level state moved to instance
- [ ] 2.3 - Rate limiter cleanup added
- [ ] 4.2 - Integration test with real server

### Nice to Have (Bonus Points)
- [ ] 3.1 - Hot-path allocations reduced
- [ ] 3.2 - Zero-allocation tileToWorldInto added
- [ ] 5.1 - Debug logging added
- [ ] 5.2 - DRY refactor of tick methods

---

## Expected Final Scores

| Category | Current | After Plan | Notes |
|----------|---------|------------|-------|
| Production Quality | 6/10 | 9/10 | Dead code removed, logging added |
| Best Practices | 5/10 | 9/10 | Tests, DRY, no dead code |
| OWASP Security | 9/10 | 9/10 | Already strong |
| Game Studio Audit | 5/10 | 9/10 | OSRS accurate, tests exist |
| Memory Hygiene | 6/10 | 9/10 | Pre-allocated objects |
| SOLID Principles | 5/10 | 9/10 | Instance state, DIP |
| OSRS Accuracy | 5/10 | 10/10 | 1-tick delay enforced |
| **OVERALL** | **6.5/10** | **9.1/10** | **+2.6** |

---

## Implementation Order

1. **Phase 1.1** - Fix 1-tick delay (30 min)
2. **Phase 1.3** - Unify entity API (5 min)
3. **Phase 2.2** - Instance state (15 min)
4. **Phase 2.1** - Remove dead code (5 min)
5. **Phase 2.3** - Rate limiter cleanup (10 min)
6. **Phase 4.1** - Unit tests (2 hours)
7. **Phase 3.1-3.2** - Memory optimizations (1 hour)
8. **Phase 4.2** - Integration test (1 hour)
9. **Phase 5** - Polish (30 min)

**Total Estimated Time:** ~6 hours

---

## Verification Commands

```bash
# Run follow-specific tests
bun test packages/server/tests/unit/follow/

# Check for dead code
grep -r "processPlayerTick" packages/server/src/

# Check for module-level state
grep -n "^let " packages/server/src/systems/ServerNetwork/FollowManager.ts

# Build to verify no type errors
bun run build:server
```
