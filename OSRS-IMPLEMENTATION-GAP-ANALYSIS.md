# OSRS Implementation Gap Analysis

**Current System vs OSRS-Accurate Architecture**

This document compares what we currently have implemented against what's needed for exact OSRS feel with 100% reliability.

---

## Executive Summary

**Good News**: We already have ~70% of the infrastructure needed for OSRS-accurate combat.

**Key Gaps**:
1. Non-deterministic random (Math.random vs seeded PRNG)
2. No event sourcing/replay capability
3. PID doesn't reshuffle (static connection order)
4. Combat uses Math.random() instead of deterministic RNG
5. No fixed-point arithmetic (using floats)
6. State machine is implicit (flags) not formal (XState)

---

## Component-by-Component Analysis

### 1. Tick Simulation Engine

| Aspect | Current Implementation | OSRS-Accurate Target | Status |
|--------|----------------------|---------------------|--------|
| **Tick Duration** | 600ms ✅ | 600ms | ✅ DONE |
| **Processing Order** | NPCs → Players ✅ | NPCs → Players | ✅ DONE |
| **Damage Asymmetry** | Implemented ✅ | NPC→Player same tick, Player→NPC next tick | ✅ DONE |
| **Hit Delay (Ranged)** | Formula defined ✅ | Ranged: 1+floor((3+d)/6), Magic: 1+floor((1+d)/3) | ✅ DONE |
| **Deterministic Tick Loop** | setInterval-based | Fixed accumulator with catch-up | ⚠️ PARTIAL |

**Current Code** (`GameTickProcessor.ts:295-325`):
```typescript
processTick(tickNumber: number): void {
  this.updateProcessingOrder();
  this.processInputs(tickNumber);      // Phase 1
  this.processNPCs(tickNumber);         // Phase 2 - NPCs FIRST
  this.processPlayers(tickNumber);      // Phase 3 - Players SECOND
  this.applyQueuedDamage(tickNumber);   // Phase 4 - Damage asymmetry
  this.processDeathAndLoot(tickNumber); // Phase 5
  this.processResources(tickNumber);    // Phase 6
  this.flushBroadcastQueue();           // Phase 7
}
```

**What's Missing**:
- Time accumulator for precise tick boundaries (currently relies on external setInterval)
- Deterministic catch-up logic when behind

**Changes Needed**:
```typescript
// Add to GameTickProcessor
private tickAccumulator: number = 0;

update(deltaMs: number): void {
  this.tickAccumulator += deltaMs;

  // Process multiple ticks if behind (deterministic catch-up)
  while (this.tickAccumulator >= TICK_DURATION_MS) {
    this.processTick(this.currentTick);
    this.tickAccumulator -= TICK_DURATION_MS;
    this.currentTick++;
  }
}
```

---

### 2. Script Queue System (OSRS Priority System)

| Aspect | Current Implementation | OSRS-Accurate Target | Status |
|--------|----------------------|---------------------|--------|
| **Queue Types** | Strong/Normal/Weak/Soft ✅ | Strong/Normal/Weak/Soft | ✅ DONE |
| **Strong clears Weak** | Implemented ✅ | Strong removes all Weak scripts | ✅ DONE |
| **Modal blocking** | Implemented ✅ | Normal skipped if modal open | ✅ DONE |
| **NPC single queue** | Implemented ✅ | NPCs have FIFO only (no priority) | ✅ DONE |
| **Next tick earliest** | Implemented ✅ | Scripts queued this tick execute next tick | ✅ DONE |
| **Feature flag** | `scriptQueueEnabled = false` | Should be enabled by default | ⚠️ DISABLED |

**Current Code** (`ScriptQueue.ts`): Fully implements OSRS priority system!

**What's Missing**:
- Feature flag is OFF by default
- Not all actions routed through queue yet

**Changes Needed**:
```typescript
// In GameTickProcessor constructor
this.scriptQueueEnabled = true; // Enable by default

// Route all player actions through queue
// Example: Attack request should queue as NORMAL, not execute immediately
```

---

### 3. PID (Player Identification Number) System

| Aspect | Current Implementation | OSRS-Accurate Target | Status |
|--------|----------------------|---------------------|--------|
| **Player ordering** | By connectionTime ✅ | By PID | ⚠️ PARTIAL |
| **Deterministic order** | Sort by connection time | Sort by PID | ⚠️ PARTIAL |
| **PID reshuffle** | ❌ NOT IMPLEMENTED | Every 100-150 ticks | ❌ MISSING |
| **Random PID assignment** | ❌ Static order | Random 0-2047 on login | ❌ MISSING |

**Current Code** (`GameTickProcessor.ts:353-375`):
```typescript
// Current: Static connection-time ordering
players.sort((a, b) => {
  const aTime = a.connectionTime ?? 0;
  const bTime = b.connectionTime ?? 0;
  if (aTime !== bTime) return aTime - bTime;
  return a.id.localeCompare(b.id);
});
```

**What's Missing**:
- True PID assignment on login
- PID reshuffling every 100-150 ticks
- Seeded random for deterministic PID assignment

**Changes Needed**:
```typescript
// New: PIDManager class
class PIDManager {
  private playerPIDs: Map<string, number> = new Map();
  private nextReshuffleTick: number = 0;
  private rng: SeededRandom;

  assignPID(playerId: string): number {
    const existingPIDs = new Set(this.playerPIDs.values());
    let pid: number;
    do {
      pid = this.rng.nextInt(0, 2047);
    } while (existingPIDs.has(pid));
    this.playerPIDs.set(playerId, pid);
    return pid;
  }

  maybeReshuffle(currentTick: number): void {
    if (currentTick >= this.nextReshuffleTick) {
      this.reshuffleAllPIDs();
      this.nextReshuffleTick = currentTick + this.rng.nextInt(100, 150);
    }
  }
}
```

---

### 4. Deterministic Random Number Generation

| Aspect | Current Implementation | OSRS-Accurate Target | Status |
|--------|----------------------|---------------------|--------|
| **Combat rolls** | Math.random() ❌ | Seeded PRNG | ❌ MISSING |
| **Damage rolls** | Math.random() ❌ | Seeded PRNG | ❌ MISSING |
| **Seeded terrain** | NoiseGenerator ✅ | N/A (terrain only) | ✅ DONE |
| **Cross-platform identical** | ❌ Not guaranteed | Bit-identical results | ❌ MISSING |

**Current Code** (`CombatCalculations.ts:62, 155`):
```typescript
// NON-DETERMINISTIC - different every time!
const roll = Math.random();
const damage = Math.floor(Math.random() * (maxHit + 1));
```

**What's Missing**:
- Seeded PRNG for all combat calculations
- Per-tick seed or global game seed
- Replay capability requires identical rolls

**Changes Needed**:
```typescript
// New: SeededRandom class (xorshift128+)
class SeededRandom {
  private state0: bigint;
  private state1: bigint;

  constructor(seed: number) {
    this.state0 = this.splitmix64(BigInt(seed));
    this.state1 = this.splitmix64(this.state0);
  }

  next(): number {
    // xorshift128+ algorithm - deterministic
    let s1 = this.state0;
    const s0 = this.state1;
    this.state0 = s0;
    s1 ^= s1 << 23n;
    s1 ^= s1 >> 18n;
    s1 ^= s0;
    s1 ^= s0 >> 5n;
    this.state1 = s1;
    const result = (this.state0 + this.state1) & 0xffffffffffffffffn;
    return Number(result) / Number(0xffffffffffffffffn);
  }
}

// Usage in CombatCalculations:
// const roll = world.rng.next();  // Instead of Math.random()
```

---

### 5. Event Sourcing / Replay System

| Aspect | Current Implementation | OSRS-Accurate Target | Status |
|--------|----------------------|---------------------|--------|
| **Event recording** | ❌ NOT IMPLEMENTED | All events logged | ❌ MISSING |
| **State snapshots** | ❌ NOT IMPLEMENTED | Periodic snapshots | ❌ MISSING |
| **Replay capability** | ❌ NOT IMPLEMENTED | Full tick replay | ❌ MISSING |
| **Desync detection** | ❌ NOT IMPLEMENTED | Checksum comparison | ❌ MISSING |

**Current Code**: No event sourcing exists.

**What's Missing**:
- EventStore class for recording
- Snapshot system for fast seeking
- Checksum for desync detection
- Replay processor

**Changes Needed**:
```typescript
// New: EventStore class
interface GameEvent {
  tick: number;
  type: string;
  entityId: string;
  payload: unknown;
  stateChecksum: number;
}

class EventStore {
  private events: GameEvent[] = [];
  private snapshots: Map<number, GameSnapshot> = new Map();

  record(event: Omit<GameEvent, 'stateChecksum'>, state: GameState): void {
    this.events.push({
      ...event,
      stateChecksum: this.computeChecksum(state),
    });

    // Snapshot every 100 ticks for fast replay
    if (event.tick % 100 === 0) {
      this.snapshots.set(event.tick, this.createSnapshot(state));
    }
  }

  replayTo(targetTick: number, engine: GameTickProcessor): GameState {
    // Find nearest snapshot, then replay events
  }
}
```

---

### 6. Combat State Machine

| Aspect | Current Implementation | OSRS-Accurate Target | Status |
|--------|----------------------|---------------------|--------|
| **State tracking** | CombatData flags ⚠️ | Formal state machine | ⚠️ IMPLICIT |
| **State transitions** | Implicit in code | Explicit transitions | ⚠️ IMPLICIT |
| **Invalid states** | Runtime checks | Compile-time impossible | ⚠️ RUNTIME |
| **Visualization** | None | XState Visualizer | ❌ MISSING |

**Current Code** (`CombatStateService.ts:17-30`):
```typescript
// Implicit state via flags - error prone
interface CombatData {
  inCombat: boolean;
  attackerId: EntityID;
  targetId: EntityID;
  // ... timing fields
}
```

**What's Missing**:
- Formal state machine (XState or custom)
- Compile-time state validity
- Visual debugging

**Changes Needed**:
```typescript
// Option 1: XState (full-featured)
import { createMachine } from 'xstate';

const combatMachine = createMachine({
  id: 'combat',
  initial: 'idle',
  states: {
    idle: { on: { ATTACK: 'engaging', HIT_RECEIVED: 'engaging' } },
    engaging: { always: [
      { target: 'attacking', guard: 'inRange' },
      { target: 'following', guard: 'outOfRange' }
    ]},
    attacking: { on: { TICK: { actions: 'attack', guard: 'canAttack' } } },
    following: { on: { IN_RANGE: 'attacking', TIMEOUT: 'disengaging' } },
    disengaging: { after: { 4800: 'idle' } },
  }
});

// Option 2: Lightweight TypeScript union types
type CombatState =
  | { type: 'idle' }
  | { type: 'engaging'; targetId: string }
  | { type: 'attacking'; targetId: string; nextAttackTick: number }
  | { type: 'following'; targetId: string }
  | { type: 'disengaging'; combatEndTick: number };

// Compile error if you try invalid transition
```

---

### 7. Fixed-Point Arithmetic

| Aspect | Current Implementation | OSRS-Accurate Target | Status |
|--------|----------------------|---------------------|--------|
| **Position math** | JavaScript floats | Integer/Fixed-point | ⚠️ FLOATS |
| **Distance calc** | Floats with floor | Integer tile math | ⚠️ MOSTLY OK |
| **Cross-platform** | Float variance possible | Bit-identical | ⚠️ NOT GUARANTEED |

**Current Code** (`TileSystem.ts:68-73`):
```typescript
// Uses floor() which is safe for integers
export function worldToTile(worldX: number, worldZ: number): TileCoord {
  return {
    x: Math.floor(worldX / TILE_SIZE),
    z: Math.floor(worldZ / TILE_SIZE),
  };
}
```

**Analysis**:
- Tile coordinates are integers (good)
- World positions are floats (potential variance)
- Floor operations make most calculations safe
- **Lower priority** since OSRS itself uses integer tiles

**Recommendation**:
- Keep current approach for MVP
- Monitor for desync issues
- Implement Fixed class if cross-platform issues arise

---

### 8. Movement System Integration

| Aspect | Current Implementation | OSRS-Accurate Target | Status |
|--------|----------------------|---------------------|--------|
| **Tile-based** | Yes ✅ | Discrete tile movement | ✅ DONE |
| **Walk/Run speed** | 2/4 tiles/tick | 1/2 tiles/tick (OSRS) or 2/4 (snappy) | ✅ CONFIGURABLE |
| **BFS pathfinding** | Implemented ✅ | BFS with collision | ✅ DONE |
| **Combat follow** | COMBAT_FOLLOW_TARGET ✅ | Recalculate path each tick | ✅ DONE |
| **Movement after combat** | Processed in order ✅ | Movement AFTER combat in tick | ✅ DONE |

**Current Code** (`TileMovementManager` + `GameTickProcessor`): Well implemented!

**Verdict**: ✅ Movement system is OSRS-accurate.

---

### 9. Damage Calculation

| Aspect | Current Implementation | OSRS-Accurate Target | Status |
|--------|----------------------|---------------------|--------|
| **Accuracy formula** | OSRS formula ✅ | (attack roll vs defense roll) | ✅ DONE |
| **Max hit formula** | OSRS formula ✅ | Effective strength × equipment | ✅ DONE |
| **Style bonuses** | ❌ NOT IMPLEMENTED | +3 aggressive, +1 controlled | ❌ MISSING |
| **0 damage hits** | Implemented ✅ | Can hit but deal 0 | ✅ DONE |
| **Damage cap** | Implemented ✅ | Min(damage, targetHealth) | ✅ DONE |
| **RNG source** | Math.random() ❌ | Seeded PRNG | ❌ MISSING |

**What's Missing**:
- Style bonuses (+3/+1 to effective level)
- Seeded RNG instead of Math.random()

---

### 10. Security Infrastructure

| Aspect | Current Implementation | OSRS-Accurate Target | Status |
|--------|----------------------|---------------------|--------|
| **Input validation** | EntityIdValidator ✅ | Validate all inputs | ✅ DONE |
| **Rate limiting** | CombatRateLimiter ✅ | Per-tick limits | ✅ DONE |
| **Anti-cheat** | CombatAntiCheat ✅ | Violation tracking | ✅ DONE |
| **Server authority** | All damage server-side ✅ | Server authoritative | ✅ DONE |

**Verdict**: ✅ Security infrastructure is solid.

---

## Priority Implementation Order

### Phase 1: Deterministic Foundation (Critical for 100% Reliability)

**1.1 Seeded Random Number Generator**
```
Files to create:
- packages/shared/src/utils/SeededRandom.ts

Files to modify:
- packages/shared/src/utils/game/CombatCalculations.ts
- packages/shared/src/core/World.ts (add rng instance)
```

**1.2 Enable Script Queue by Default**
```
Files to modify:
- packages/server/src/systems/GameTickProcessor.ts
  - Change: this.scriptQueueEnabled = true
```

**1.3 PID System with Reshuffle**
```
Files to create:
- packages/server/src/systems/ServerNetwork/PIDManager.ts

Files to modify:
- packages/server/src/systems/GameTickProcessor.ts
```

### Phase 2: Event Sourcing (Enables Replay & Debug)

**2.1 Event Store**
```
Files to create:
- packages/shared/src/systems/shared/EventStore.ts
- packages/shared/src/types/events/game-events.ts

Files to modify:
- packages/server/src/systems/GameTickProcessor.ts
```

**2.2 State Snapshots**
```
Files to create:
- packages/shared/src/systems/shared/SnapshotManager.ts
```

### Phase 3: Formal State Machine (Reliability)

**3.1 Combat State Machine**
```
Options:
A) XState (full-featured, visual debugging)
B) TypeScript union types (lightweight)

Files to modify:
- packages/shared/src/systems/shared/combat/CombatStateService.ts
- packages/shared/src/systems/shared/combat/CombatSystem.ts
```

### Phase 4: OSRS Formula Fixes (Accuracy)

**4.1 Combat Style Bonuses**
```
Files to modify:
- packages/shared/src/utils/game/CombatCalculations.ts
- packages/shared/src/systems/shared/combat/CombatSystem.ts
```

**4.2 Combat Level Formula**
```
Files to modify:
- packages/shared/src/systems/shared/combat/AggroSystem.ts
```

---

## What We Already Have (No Changes Needed)

1. ✅ **600ms tick system** - Correct duration
2. ✅ **NPC → Player processing order** - Creates damage asymmetry
3. ✅ **Damage queue with asymmetry** - Player→NPC next tick, NPC→Player same tick
4. ✅ **Hit delay formulas** - Ranged/Magic delay implemented
5. ✅ **Script queue priority system** - Strong/Normal/Weak/Soft (just needs enabling)
6. ✅ **Tile-based movement** - Walk/run, BFS pathfinding
7. ✅ **Combat follow system** - COMBAT_FOLLOW_TARGET events
8. ✅ **Security infrastructure** - Validation, rate limiting, anti-cheat
9. ✅ **Object pooling** - TilePool, QuaternionPool for zero GC
10. ✅ **OSRS damage formulas** - Accuracy roll, max hit calculation

---

## Estimated Effort

| Phase | Components | Effort | Impact |
|-------|-----------|--------|--------|
| 1.1 | Seeded RNG | 1-2 days | Critical - enables determinism |
| 1.2 | Enable queue | 1 hour | Quick win |
| 1.3 | PID system | 1-2 days | Accurate simultaneous resolution |
| 2.1 | Event store | 2-3 days | Enables replay/debug |
| 2.2 | Snapshots | 1-2 days | Fast replay seeking |
| 3.1 | State machine | 3-5 days | Formal guarantees |
| 4.1 | Style bonuses | 1 day | Formula accuracy |
| 4.2 | Combat level | 1 day | Aggro accuracy |

**Total: ~2-3 weeks for full OSRS accuracy**

---

## Conclusion

The codebase has **strong foundations** that mirror OSRS architecture:
- Tick-based simulation ✅
- Processing order (NPCs before Players) ✅
- Damage asymmetry ✅
- Script queue system ✅ (disabled)
- Tile-based movement ✅
- Object pooling ✅

**Critical gaps for 100% reliability**:
1. **Seeded RNG** - Most important for determinism
2. **PID reshuffle** - For accurate simultaneous action resolution
3. **Event sourcing** - For replay and debugging
4. **Formal state machine** - For compile-time guarantees

With these changes, the system would achieve the **exact OSRS feel** with **100% reliability** across all scenarios.
