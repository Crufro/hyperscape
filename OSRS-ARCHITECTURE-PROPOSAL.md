# Advanced Architecture for OSRS-Accurate Combat & Movement

This document proposes advanced technical approaches to achieve **exact OSRS feel** - the same reliability, timing, and mechanical behavior that players experience in Old School RuneScape.

---

## Executive Summary

OSRS achieves its distinctive feel through a **deterministic tick-based simulation** with a specific **processing order** that creates asymmetric timing between NPCs and players. To match this exactly, we need to fundamentally restructure our combat and movement systems around these core principles:

1. **Deterministic Tick Simulation** - Exact 600ms processing cycles
2. **Priority Queue System** - OSRS's weak/normal/strong/soft script queues
3. **Fixed Processing Order** - NPCs before Players, creating intentional asymmetry
4. **PID System** - Deterministic ordering of simultaneous actions
5. **Finite State Machines** - Formal combat states that mirror OSRS exactly
6. **Event Sourcing** - Complete replay capability for debugging and anti-cheat

---

## 1. Deterministic Tick Simulation Engine

### The Problem with Current Approach

Our current system processes combat events as they arrive, leading to:
- Non-deterministic ordering of simultaneous events
- Timing variations based on network latency
- No guarantee of identical state across server/client
- Inability to replay or predict combat outcomes

### OSRS's Approach

OSRS uses a **strict tick-based processing order** documented at [osrs-docs.com](https://osrs-docs.com/docs/mechanics/queues/):

```
For each tick:
  1. Process all client inputs (queued)
  2. For each NPC (in NPC ID order):
     - End stalls
     - Process timers
     - Process queue
     - Process object/item interactions
     - Process movement
     - Process player/NPC interactions
  3. For each Player (in PID order):
     - End stalls
     - Process queue
     - Process timers
     - Process area queue
     - Process object/item interactions
     - Process movement
     - Process player/NPC interactions
```

### Proposed Implementation

```typescript
// TickSimulationEngine.ts

/**
 * Deterministic tick simulation engine matching OSRS processing order.
 * All game logic flows through this single point of execution.
 */
export class TickSimulationEngine {
  private readonly TICK_DURATION_MS = 600;
  private currentTick: number = 0;
  private tickAccumulator: number = 0;

  // Separate queues for NPCs and Players
  private readonly npcProcessors: NPCProcessor[] = [];
  private readonly playerProcessors: PlayerProcessor[] = [];

  // Input buffer - all client inputs queued here
  private readonly inputBuffer: InputCommand[] = [];

  // Deterministic random using seeded PRNG
  private readonly rng: SeededRandom;

  constructor(seed: number) {
    this.rng = new SeededRandom(seed);
  }

  /**
   * Main update loop - called every frame
   * Accumulates time and processes ticks deterministically
   */
  update(deltaMs: number): void {
    this.tickAccumulator += deltaMs;

    while (this.tickAccumulator >= this.TICK_DURATION_MS) {
      this.processTick();
      this.tickAccumulator -= this.TICK_DURATION_MS;
      this.currentTick++;
    }
  }

  /**
   * Process a single tick in OSRS-exact order
   */
  private processTick(): void {
    // Phase 1: Process all queued client inputs
    this.processInputBuffer();

    // Phase 2: Process all NPCs (in NPC ID order for determinism)
    for (const npc of this.npcProcessors.sort((a, b) => a.npcId - b.npcId)) {
      npc.endStalls();
      npc.processTimers(this.currentTick);
      npc.processQueue(this.currentTick);
      npc.processObjectInteractions();
      npc.processMovement(this.currentTick);
      npc.processEntityInteractions(this.currentTick); // Damage applied HERE
    }

    // Phase 3: Process all Players (in PID order for determinism)
    for (const player of this.playerProcessors.sort((a, b) => a.pid - b.pid)) {
      player.endStalls();
      player.processQueue(this.currentTick);
      player.processTimers(this.currentTick);
      player.processAreaQueue();
      player.processObjectInteractions();
      player.processMovement(this.currentTick);
      player.processEntityInteractions(this.currentTick); // Damage applied HERE
    }

    // Phase 4: Emit tick completion event
    this.emitTickComplete(this.currentTick);
  }
}
```

### Key Insight: NPC vs Player Damage Timing

From [osrs-docs.com](https://osrs-docs.com/docs/mechanics/queues/):

> "NPCs deal damage to players on the same tick they attack, whereas players deal damage to NPCs on the tick after they attack."

This is because NPCs process BEFORE players each tick. When an NPC attacks:
1. NPC processes its attack action
2. Damage is queued to player
3. Player processes (later in same tick)
4. Player receives damage

When a player attacks:
1. Player processes attack action
2. Damage is queued to NPC
3. **Next tick**: NPC processes
4. NPC receives damage

**This asymmetry is intentional and creates the unique OSRS combat feel.**

---

## 2. Priority Queue System (OSRS Script Queues)

### OSRS Queue Types

OSRS uses four queue types with specific priority rules:

| Queue Type | Priority | Behavior |
|------------|----------|----------|
| **Weak** | Lowest | Cleared by strong scripts; interrupted by most actions |
| **Normal** | Medium | Skipped if modal interface open |
| **Strong** | High | Clears weak scripts; force-closes modals |
| **Soft** | Special | Cannot be interrupted; executes regardless of state |

### Proposed Implementation

```typescript
// ActionQueue.ts

export enum QueuePriority {
  WEAK = 0,
  NORMAL = 1,
  STRONG = 2,
  SOFT = 3,
}

interface QueuedAction {
  id: string;
  priority: QueuePriority;
  executeTick: number;  // Earliest tick this can execute
  script: () => void;
  canInterrupt: boolean;
}

export class ActionQueue {
  private queue: QueuedAction[] = [];
  private modalOpen: boolean = false;

  /**
   * Add action to queue - executes earliest NEXT tick (not current)
   */
  enqueue(action: Omit<QueuedAction, 'id'>, currentTick: number): void {
    const queuedAction: QueuedAction = {
      ...action,
      id: crypto.randomUUID(),
      // OSRS rule: "If a script queues another script,
      // the earliest that the queued script may execute is the following server tick"
      executeTick: Math.max(action.executeTick, currentTick + 1),
    };

    // Strong scripts clear weak scripts
    if (action.priority === QueuePriority.STRONG) {
      this.queue = this.queue.filter(a => a.priority !== QueuePriority.WEAK);
    }

    this.queue.push(queuedAction);
  }

  /**
   * Process queue for current tick - OSRS-accurate execution order
   */
  process(currentTick: number): void {
    // Check for strong scripts - close modals if present
    const hasStrong = this.queue.some(a => a.priority === QueuePriority.STRONG);
    if (hasStrong) {
      this.modalOpen = false;
      // Remove all weak scripts
      this.queue = this.queue.filter(a => a.priority !== QueuePriority.WEAK);
    }

    let processedAny = true;
    while (processedAny) {
      processedAny = false;

      for (let i = 0; i < this.queue.length; i++) {
        const action = this.queue[i];

        // Skip if not ready yet
        if (action.executeTick > currentTick) continue;

        // Skip normal scripts if modal open
        if (action.priority === QueuePriority.NORMAL && this.modalOpen) continue;

        // Force-close modal for strong/soft
        if (action.priority >= QueuePriority.STRONG) {
          this.modalOpen = false;
        }

        // Execute the script
        action.script();
        this.queue.splice(i, 1);
        processedAny = true;

        // If script set a delay, stop processing (except soft continues)
        if (action.canInterrupt && action.priority !== QueuePriority.SOFT) {
          return;
        }

        break; // Restart iteration after modification
      }
    }
  }
}
```

---

## 3. Player Identification Number (PID) System

### Why PID Matters

From [OSRS Wiki](https://oldschool.runescape.wiki/w/Player_identification_number):

> "Upon logging in, a PID is assigned which will randomise every 100 to 150 game ticks. The engine uses this to deal with two players doing something at the same time, the lower PID will have priority in processing."

This creates **deterministic ordering** when multiple players act simultaneously.

### Proposed Implementation

```typescript
// PIDManager.ts

export class PIDManager {
  private playerPIDs: Map<string, number> = new Map();
  private npcIDs: Map<string, number> = new Map();
  private nextNpcId: number = 0;

  // PID reshuffles every 100-150 ticks
  private readonly MIN_RESHUFFLE_TICKS = 100;
  private readonly MAX_RESHUFFLE_TICKS = 150;
  private nextReshuffleTick: number = 0;
  private readonly rng: SeededRandom;

  constructor(rng: SeededRandom) {
    this.rng = rng;
    this.scheduleNextReshuffle(0);
  }

  /**
   * Assign PID to player on login
   */
  assignPlayerPID(playerId: string): number {
    const existingPIDs = new Set(this.playerPIDs.values());
    let pid: number;

    do {
      pid = this.rng.nextInt(0, 2047); // OSRS uses 2048 PID slots
    } while (existingPIDs.has(pid));

    this.playerPIDs.set(playerId, pid);
    return pid;
  }

  /**
   * Get sorted player order for tick processing
   */
  getPlayerProcessingOrder(): string[] {
    return [...this.playerPIDs.entries()]
      .sort((a, b) => a[1] - b[1])
      .map(([playerId]) => playerId);
  }

  /**
   * Check if PID reshuffle needed and perform if so
   */
  maybeReshuffle(currentTick: number): void {
    if (currentTick >= this.nextReshuffleTick) {
      this.reshuffleAllPIDs();
      this.scheduleNextReshuffle(currentTick);
    }
  }

  private reshuffleAllPIDs(): void {
    const players = [...this.playerPIDs.keys()];
    this.playerPIDs.clear();

    for (const playerId of players) {
      this.assignPlayerPID(playerId);
    }
  }

  private scheduleNextReshuffle(currentTick: number): void {
    const delay = this.rng.nextInt(
      this.MIN_RESHUFFLE_TICKS,
      this.MAX_RESHUFFLE_TICKS
    );
    this.nextReshuffleTick = currentTick + delay;
  }
}
```

---

## 4. Finite State Machine for Combat States

### Why State Machines?

State machines provide:
- **Formal verification** of valid state transitions
- **Impossible states become impossible** at compile time
- **Visual debugging** with tools like [XState Visualizer](https://stately.ai/docs/machines)
- **Deterministic behavior** - same input always produces same output

### OSRS Combat States

```
                    ┌─────────────────────────────────────┐
                    │                                     │
                    ▼                                     │
              ┌──────────┐                                │
              │   IDLE   │◄───────────────────────────────┤
              └────┬─────┘                                │
                   │ attack_initiated                     │
                   ▼                                      │
              ┌──────────┐                                │
              │ ENGAGING │─────────────────┐              │
              └────┬─────┘                 │              │
                   │ in_range              │ out_of_range │
                   ▼                       ▼              │
              ┌──────────┐           ┌──────────┐         │
              │ ATTACKING│           │ FOLLOWING│         │
              └────┬─────┘           └────┬─────┘         │
                   │                      │               │
                   │ target_dead          │ in_range      │
                   │ disengage            │               │
                   │ timeout              │               │
                   │◄─────────────────────┘               │
                   │                                      │
                   ▼                                      │
              ┌──────────┐                                │
              │DISENGAGING│───────────────────────────────┘
              └──────────┘
                   │ 8 ticks no combat
                   ▼
              ┌──────────┐
              │   IDLE   │
              └──────────┘
```

### Proposed Implementation with XState

```typescript
// CombatStateMachine.ts
import { createMachine, assign } from 'xstate';

interface CombatContext {
  entityId: string;
  targetId: string | null;
  nextAttackTick: number;
  combatEndTick: number;
  retaliationTick: number;
}

type CombatEvent =
  | { type: 'ATTACK_INITIATED'; targetId: string; tick: number }
  | { type: 'IN_RANGE'; tick: number }
  | { type: 'OUT_OF_RANGE'; tick: number }
  | { type: 'ATTACK_LANDED'; damage: number; tick: number }
  | { type: 'TARGET_DEAD'; tick: number }
  | { type: 'DISENGAGE'; tick: number }
  | { type: 'TICK'; currentTick: number }
  | { type: 'HIT_RECEIVED'; attackerId: string; tick: number };

export const combatMachine = createMachine({
  id: 'combat',
  initial: 'idle',
  context: {
    entityId: '',
    targetId: null,
    nextAttackTick: 0,
    combatEndTick: 0,
    retaliationTick: 0,
  } as CombatContext,

  states: {
    idle: {
      on: {
        ATTACK_INITIATED: {
          target: 'engaging',
          actions: assign({
            targetId: (_, event) => event.targetId,
            combatEndTick: (_, event) => event.tick + 8, // 8 tick timeout
          }),
        },
        HIT_RECEIVED: {
          target: 'engaging',
          actions: assign({
            targetId: (_, event) => event.attackerId,
            // Retaliation delay: ceil(speed/2) + 1
            retaliationTick: (ctx, event) => event.tick + calculateRetaliationDelay(ctx),
          }),
          // Only if auto-retaliate enabled
          guard: 'autoRetaliateEnabled',
        },
      },
    },

    engaging: {
      always: [
        { target: 'attacking', guard: 'isInRange' },
        { target: 'following', guard: 'isOutOfRange' },
      ],
    },

    following: {
      entry: 'startFollowingTarget',
      on: {
        IN_RANGE: 'attacking',
        DISENGAGE: 'disengaging',
        TARGET_DEAD: 'disengaging',
        TICK: {
          target: 'disengaging',
          guard: 'combatTimedOut',
        },
      },
    },

    attacking: {
      entry: 'faceTarget',
      on: {
        TICK: [
          {
            target: 'attacking',
            guard: 'canAttackThisTick',
            actions: ['performAttack', 'updateNextAttackTick'],
          },
          {
            target: 'following',
            guard: 'isOutOfRange',
          },
        ],
        OUT_OF_RANGE: 'following',
        TARGET_DEAD: 'disengaging',
        DISENGAGE: 'disengaging',
      },
    },

    disengaging: {
      entry: 'clearTarget',
      after: {
        // 8 ticks (4.8 seconds) of no combat = return to idle
        COMBAT_TIMEOUT: 'idle',
      },
      on: {
        HIT_RECEIVED: {
          target: 'engaging',
          guard: 'autoRetaliateEnabled',
        },
      },
    },
  },
}, {
  guards: {
    isInRange: (ctx) => checkCombatRange(ctx.entityId, ctx.targetId),
    isOutOfRange: (ctx) => !checkCombatRange(ctx.entityId, ctx.targetId),
    canAttackThisTick: (ctx, event) => event.currentTick >= ctx.nextAttackTick,
    combatTimedOut: (ctx, event) => event.currentTick >= ctx.combatEndTick,
    autoRetaliateEnabled: (ctx) => getAutoRetaliateState(ctx.entityId),
  },
  actions: {
    performAttack: (ctx) => executeAttack(ctx.entityId, ctx.targetId),
    updateNextAttackTick: assign({
      nextAttackTick: (ctx, event) => event.currentTick + getAttackSpeed(ctx.entityId),
      combatEndTick: (ctx, event) => event.currentTick + 8,
    }),
    startFollowingTarget: (ctx) => startFollowing(ctx.entityId, ctx.targetId),
    faceTarget: (ctx) => faceEntity(ctx.entityId, ctx.targetId),
    clearTarget: assign({ targetId: null }),
  },
  delays: {
    COMBAT_TIMEOUT: 4800, // 8 ticks * 600ms
  },
});
```

---

## 5. Fixed-Point Arithmetic for Determinism

### The Problem with Floating Point

From [Gaffer on Games](https://gafferongames.com/post/floating_point_determinism/):

> "FP calculations are entirely deterministic, as per the IEEE Floating Point Standard, but that doesn't mean they're entirely reproducible across machines, compilers, OS's, etc."

For a multiplayer game, even tiny floating-point differences can cause **desyncs** that compound over time.

### Solution: Integer-Based Simulation

OSRS uses integer math for all game logic. We should too:

```typescript
// FixedPoint.ts

/**
 * Fixed-point number with 16 bits of fractional precision.
 * Represents numbers as integers: value = raw / 65536
 *
 * This ensures IDENTICAL calculations across all platforms.
 */
export class Fixed {
  private static readonly PRECISION = 16;
  private static readonly SCALE = 1 << Fixed.PRECISION; // 65536

  private constructor(private readonly raw: number) {}

  // Factory methods
  static fromInt(value: number): Fixed {
    return new Fixed(value << Fixed.PRECISION);
  }

  static fromFloat(value: number): Fixed {
    return new Fixed(Math.round(value * Fixed.SCALE));
  }

  // Arithmetic operations (all integer math)
  add(other: Fixed): Fixed {
    return new Fixed(this.raw + other.raw);
  }

  sub(other: Fixed): Fixed {
    return new Fixed(this.raw - other.raw);
  }

  mul(other: Fixed): Fixed {
    // Use BigInt to avoid overflow in intermediate calculation
    const result = (BigInt(this.raw) * BigInt(other.raw)) >> BigInt(Fixed.PRECISION);
    return new Fixed(Number(result));
  }

  div(other: Fixed): Fixed {
    const result = (BigInt(this.raw) << BigInt(Fixed.PRECISION)) / BigInt(other.raw);
    return new Fixed(Number(result));
  }

  // Comparison
  lt(other: Fixed): boolean { return this.raw < other.raw; }
  gt(other: Fixed): boolean { return this.raw > other.raw; }
  eq(other: Fixed): boolean { return this.raw === other.raw; }
  lte(other: Fixed): boolean { return this.raw <= other.raw; }
  gte(other: Fixed): boolean { return this.raw >= other.raw; }

  // Conversion
  toFloat(): number { return this.raw / Fixed.SCALE; }
  toInt(): number { return this.raw >> Fixed.PRECISION; }

  // Useful constants
  static readonly ZERO = Fixed.fromInt(0);
  static readonly ONE = Fixed.fromInt(1);
  static readonly HALF = new Fixed(Fixed.SCALE >> 1);
}

/**
 * Fixed-point 2D vector for tile positions
 */
export class FixedVec2 {
  constructor(
    public readonly x: Fixed,
    public readonly z: Fixed,
  ) {}

  static fromWorld(worldX: number, worldZ: number): FixedVec2 {
    return new FixedVec2(
      Fixed.fromFloat(worldX),
      Fixed.fromFloat(worldZ),
    );
  }

  distanceChebyshev(other: FixedVec2): Fixed {
    const dx = this.x.sub(other.x);
    const dz = this.z.sub(other.z);
    const absDx = dx.raw < 0 ? new Fixed(-dx.raw) : dx;
    const absDz = dz.raw < 0 ? new Fixed(-dz.raw) : dz;
    return absDx.gt(absDz) ? absDx : absDz;
  }

  toTile(): { x: number; z: number } {
    return {
      x: this.x.toInt(),
      z: this.z.toInt(),
    };
  }
}
```

### Seeded Random Number Generator

```typescript
// SeededRandom.ts

/**
 * Deterministic PRNG using xorshift128+
 * Same seed always produces same sequence on all platforms.
 */
export class SeededRandom {
  private state0: bigint;
  private state1: bigint;

  constructor(seed: number) {
    // Initialize state from seed using splitmix64
    this.state0 = this.splitmix64(BigInt(seed));
    this.state1 = this.splitmix64(this.state0);
  }

  private splitmix64(x: bigint): bigint {
    x = (x + 0x9e3779b97f4a7c15n) & 0xffffffffffffffffn;
    x = ((x ^ (x >> 30n)) * 0xbf58476d1ce4e5b9n) & 0xffffffffffffffffn;
    x = ((x ^ (x >> 27n)) * 0x94d049bb133111ebn) & 0xffffffffffffffffn;
    return (x ^ (x >> 31n)) & 0xffffffffffffffffn;
  }

  /**
   * Generate next random number in [0, 1)
   */
  next(): number {
    // xorshift128+
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

  /**
   * Generate integer in range [min, max] inclusive
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * OSRS-style accuracy roll
   * Returns true if attack hits
   */
  accuracyRoll(hitChance: number): boolean {
    return this.next() < hitChance;
  }

  /**
   * OSRS-style damage roll
   * Returns damage in range [0, maxHit]
   */
  damageRoll(maxHit: number): number {
    return this.nextInt(0, maxHit);
  }
}
```

---

## 6. Event Sourcing for Replay & Debugging

### Why Event Sourcing?

From [Microsoft Azure Architecture](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing):

> "By replaying events from the event log, you can reconstruct the system's state at any point in time."

This enables:
- **Perfect replays** for debugging and anti-cheat investigation
- **Spectator mode** by replaying events
- **Time travel debugging** - go back to any tick
- **Desync detection** by comparing event sequences

### Proposed Implementation

```typescript
// EventStore.ts

interface GameEvent {
  tick: number;
  timestamp: number;
  type: string;
  entityId: string;
  payload: unknown;
  // Checksum for desync detection
  stateChecksum: number;
}

export class EventStore {
  private events: GameEvent[] = [];
  private snapshots: Map<number, GameSnapshot> = new Map();
  private readonly SNAPSHOT_INTERVAL = 100; // Every 100 ticks

  /**
   * Record an event
   */
  record(event: Omit<GameEvent, 'timestamp' | 'stateChecksum'>, state: GameState): void {
    this.events.push({
      ...event,
      timestamp: Date.now(),
      stateChecksum: this.computeChecksum(state),
    });

    // Take periodic snapshots for fast seeking
    if (event.tick % this.SNAPSHOT_INTERVAL === 0) {
      this.snapshots.set(event.tick, this.createSnapshot(state));
    }
  }

  /**
   * Replay events to reconstruct state at specific tick
   */
  replayTo(targetTick: number, engine: TickSimulationEngine): GameState {
    // Find nearest snapshot before target
    let snapshotTick = 0;
    for (const tick of this.snapshots.keys()) {
      if (tick <= targetTick && tick > snapshotTick) {
        snapshotTick = tick;
      }
    }

    // Load snapshot
    const snapshot = this.snapshots.get(snapshotTick);
    if (snapshot) {
      engine.loadSnapshot(snapshot);
    } else {
      engine.reset();
    }

    // Replay events from snapshot to target
    const eventsToReplay = this.events.filter(
      e => e.tick > snapshotTick && e.tick <= targetTick
    );

    for (const event of eventsToReplay) {
      engine.applyEvent(event, { isReplay: true });
    }

    return engine.getState();
  }

  /**
   * Verify two clients have identical event history
   * Used for desync detection in multiplayer
   */
  verifySync(otherEvents: GameEvent[]): SyncVerificationResult {
    const mismatches: number[] = [];

    for (let i = 0; i < Math.min(this.events.length, otherEvents.length); i++) {
      if (this.events[i].stateChecksum !== otherEvents[i].stateChecksum) {
        mismatches.push(this.events[i].tick);
      }
    }

    return {
      inSync: mismatches.length === 0,
      firstDesyncTick: mismatches[0] ?? null,
      mismatchCount: mismatches.length,
    };
  }

  private computeChecksum(state: GameState): number {
    // Fast hash of critical state for comparison
    // Uses deterministic JSON serialization
    const stateString = JSON.stringify(state, Object.keys(state).sort());
    return this.hashString(stateString);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
}
```

---

## 7. Movement System Integration

### OSRS Movement Characteristics

Movement in OSRS is deeply tied to the tick system:
- Movement processes AFTER combat interactions in each tick
- Path is calculated once, then followed tile-by-tile
- Running = 2 tiles per tick, Walking = 1 tile per tick
- Diagonal movement is same speed as cardinal (Chebyshev distance)

### Proposed Tile-Based Movement

```typescript
// TileMovementSystem.ts

interface MovementState {
  currentTile: FixedVec2;
  path: FixedVec2[];
  isRunning: boolean;
  destination: FixedVec2 | null;
  // For combat following
  followTarget: string | null;
  followDistance: number;
}

export class TileMovementSystem {
  /**
   * Process movement for entity - called AFTER combat interactions
   */
  processMovement(
    entityId: string,
    state: MovementState,
    currentTick: number
  ): MovementResult {
    // If following a target, recalculate path each tick
    if (state.followTarget) {
      const targetPos = this.getEntityPosition(state.followTarget);
      if (targetPos) {
        state.path = this.calculatePath(state.currentTile, targetPos, state.followDistance);
      }
    }

    if (state.path.length === 0) {
      return { moved: false, newPosition: state.currentTile };
    }

    // Move 1 or 2 tiles based on run/walk
    const tilesToMove = state.isRunning ? 2 : 1;
    let newPosition = state.currentTile;

    for (let i = 0; i < tilesToMove && state.path.length > 0; i++) {
      newPosition = state.path.shift()!;
    }

    state.currentTile = newPosition;

    return {
      moved: true,
      newPosition,
      tilesRemaining: state.path.length,
    };
  }

  /**
   * A* pathfinding with OSRS-accurate tile costs
   */
  private calculatePath(
    from: FixedVec2,
    to: FixedVec2,
    stopDistance: number = 0
  ): FixedVec2[] {
    // Standard A* with:
    // - Chebyshev distance heuristic
    // - Collision checking against world
    // - Stop when within stopDistance of target
    // Implementation omitted for brevity
    return [];
  }
}
```

---

## 8. Complete Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    TICK SIMULATION ENGINE                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  accumulate(deltaMs) → processTick() every 600ms            ││
│  │                                                              ││
│  │  processTick():                                              ││
│  │    1. processInputBuffer()                                   ││
│  │    2. for NPC in sorted(NPCs, by=npcId):                    ││
│  │         processNPC(npc)                                      ││
│  │    3. for Player in sorted(Players, by=PID):                ││
│  │         processPlayer(player)                                ││
│  │    4. eventStore.record(tick, state)                        ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   NPC PROCESSOR │  │ PLAYER PROCESSOR│  │   EVENT STORE   │
│                 │  │                 │  │                 │
│ • endStalls()   │  │ • endStalls()   │  │ • record()      │
│ • timers()      │  │ • queue()       │  │ • replay()      │
│ • queue()       │  │ • timers()      │  │ • snapshot()    │
│ • objects()     │  │ • areaQueue()   │  │ • verify()      │
│ • movement()    │  │ • objects()     │  │                 │
│ • interactions()│  │ • movement()    │  │                 │
│                 │  │ • interactions()│  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │
         ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     COMBAT STATE MACHINE                         │
│                                                                  │
│   IDLE ──► ENGAGING ──► ATTACKING ──► DISENGAGING ──► IDLE     │
│              │              │                                    │
│              └───► FOLLOWING─┘                                   │
│                                                                  │
│   • Formal state transitions                                     │
│   • Guards validate transitions                                  │
│   • Actions execute deterministically                            │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DETERMINISTIC MATH                           │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Fixed-Point  │  │ Seeded PRNG  │  │ Integer Math │          │
│  │ Arithmetic   │  │ (xorshift)   │  │ (no floats)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  SAME INPUT + SAME SEED = IDENTICAL OUTPUT (always)             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Migration Path

### Phase 1: Core Infrastructure (Week 1-2)
1. Implement `TickSimulationEngine` with fixed 600ms processing
2. Implement `SeededRandom` for deterministic combat rolls
3. Add `EventStore` for replay capability
4. Create unit tests proving determinism

### Phase 2: Queue System (Week 3)
1. Implement `ActionQueue` with OSRS priority types
2. Migrate combat actions to queue-based execution
3. Ensure "next tick earliest" rule is enforced

### Phase 3: State Machines (Week 4)
1. Define combat states formally with XState
2. Replace imperative combat logic with state machine
3. Add visualization for debugging

### Phase 4: Processing Order (Week 5)
1. Implement `PIDManager` for player ordering
2. Ensure NPCs process before players each tick
3. Verify damage timing matches OSRS asymmetry

### Phase 5: Fixed-Point Math (Week 6)
1. Create `Fixed` and `FixedVec2` classes
2. Migrate distance calculations to fixed-point
3. Verify cross-platform determinism

### Phase 6: Integration Testing (Week 7)
1. Record real OSRS combat sequences
2. Replay in our engine
3. Compare tick-by-tick behavior
4. Fix any discrepancies

---

## 10. Expected Outcomes

After implementing this architecture:

| Aspect | Before | After |
|--------|--------|-------|
| **Tick timing** | Variable, network-dependent | Exact 600ms, deterministic |
| **Damage asymmetry** | Same timing for NPC/player | NPCs hit same-tick, players hit next-tick |
| **Simultaneous actions** | Non-deterministic ordering | PID-based deterministic ordering |
| **Replay capability** | None | Full tick-by-tick replay |
| **Desync detection** | Not possible | Checksum verification |
| **Combat states** | Implicit, bug-prone | Formal state machine |
| **Math determinism** | Float variance possible | Integer/fixed-point guaranteed |

---

## Sources

- [OSRS Wiki - Game Tick](https://oldschool.runescape.wiki/w/Game_tick)
- [OSRS Wiki - Player Identification Number](https://oldschool.runescape.wiki/w/Player_identification_number)
- [osrs-docs.com - Queues](https://osrs-docs.com/docs/mechanics/queues/)
- [osrs-docs.com - Timers](https://osrs-docs.com/docs/mechanics/timers/)
- [Gaffer on Games - Floating Point Determinism](https://gafferongames.com/post/floating_point_determinism/)
- [XState - State Machines](https://stately.ai/docs/machines)
- [Netcode Architectures - Lockstep](https://www.snapnet.dev/blog/netcode-architectures-part-1-lockstep/)
- [Microsoft - Event Sourcing Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing)
- [Preparing for Deterministic Netcode](https://yal.cc/preparing-your-game-for-deterministic-netcode/)
