# Death System AAA Quality Refactor Plan

## Current Problems (Why It Still Feels Buggy)

### 1. Multiple Sources of Truth
```
SERVER:
├── deathLocations Map (PlayerDeathSystem)
├── respawnTimers Map (PlayerDeathSystem)
└── isPlayerDead() method checks deathLocations

CLIENT:
├── deadPlayers Set (ClientNetwork)
├── Position blocking in onEntityModified
└── Complex state tracking across multiple handlers
```

**Problem:** Death state is tracked in too many places. Race conditions happen when these get out of sync.

### 2. setTimeout-Based Timing (Not OSRS-Accurate)
```typescript
// Current (bad):
setTimeout(() => {
  this.initiateRespawn(playerId);
}, animDurationMs);
```

**Problem:** setTimeout is not deterministic. It doesn't align with game ticks. OSRS uses tick-based timing for everything.

### 3. Too Many Events
```
PLAYER_SET_DEAD (isDead: true)
  ↓
[4.8 seconds of chaos]
  ↓
PLAYER_RESPAWNED
  ↓
PLAYER_SET_DEAD (isDead: false)
  ↓
entityModified packets
```

**Problem:** Coordinating 4+ events is error-prone. Network reordering, timing issues, and race conditions.

### 4. Position Not Explicitly Frozen
```typescript
// Current: We check if player is dead, then skip position
// But entity.position is still being modified by other systems
```

**Problem:** The entity's actual position changes to spawn immediately. We're just hiding it from broadcasts.

---

## AAA Quality Solution: Single Source of Truth

### Core Principle: Entity Data IS the Truth

Add `deathState` directly to entity's synced data:

```typescript
interface PlayerEntityData {
  // ... existing fields

  // Death state - synced to all clients automatically
  deathState: 'alive' | 'dying' | 'dead' | 'respawning';
  deathPosition?: [number, number, number];  // Frozen position during death
  deathTick?: number;      // When death started (for animation timing)
  respawnTick?: number;    // When respawn should happen
}
```

### Benefits:
1. **Single source of truth** - Entity data is the only place death state exists
2. **Automatic sync** - entityModified handles state propagation
3. **No separate tracking** - No Maps, Sets, or complex handlers
4. **Deterministic timing** - Tick-based, not setTimeout
5. **Client simplicity** - Just read entity.data.deathState

---

## Implementation Plan

### Phase 1: Add Death State to Entity Data

**File: `packages/shared/src/entities/player/PlayerEntity.ts`**

```typescript
// Add to player data schema
deathState: 'alive' | 'dying' | 'dead';
deathPosition: [number, number, number] | null;
respawnTick: number | null;
```

**File: `packages/shared/src/entities/player/PlayerRemote.ts`**

```typescript
// In getNetworkData() - include death state
getNetworkData() {
  return {
    ...existing,
    deathState: this.data.deathState,
    deathPosition: this.data.deathPosition,
  };
}
```

### Phase 2: Server Uses Entity Data for Death State

**File: `packages/shared/src/systems/shared/combat/PlayerDeathSystem.ts`**

```typescript
// BEFORE (complex):
this.deathLocations.set(playerId, {...});
this.emitTypedEvent(EventType.PLAYER_SET_DEAD, { isDead: true });

// AFTER (simple):
player.data.deathState = 'dying';
player.data.deathPosition = [x, y, z];
player.data.respawnTick = currentTick + DEATH_ANIMATION_TICKS;
player.markNetworkDirty();
// No event needed - entity sync handles it!
```

### Phase 3: Tick-Based Respawn (Not setTimeout)

**File: `packages/shared/src/systems/shared/combat/PlayerDeathSystem.ts`**

```typescript
// Register with TickSystem
this.tickSystem.onTick((tick) => {
  this.processPendingRespawns(tick);
});

private processPendingRespawns(currentTick: number) {
  for (const player of this.world.players.values()) {
    if (player.data.deathState === 'dying' &&
        player.data.respawnTick &&
        currentTick >= player.data.respawnTick) {
      this.respawnPlayer(player);
    }
  }
}

private respawnPlayer(player: PlayerEntity) {
  player.data.deathState = 'alive';
  player.data.deathPosition = null;
  player.data.respawnTick = null;
  player.position.set(spawnX, spawnY, spawnZ);
  player.markNetworkDirty();
  // Single entity update handles everything!
}
```

### Phase 4: EntityManager Respects Death State

**File: `packages/shared/src/systems/shared/entities/EntityManager.ts`**

```typescript
// In sendNetworkUpdates():
if (entity.data?.deathState === 'dying' || entity.data?.deathState === 'dead') {
  // Use frozen death position, not current position
  const pos = entity.data.deathPosition || [0, 0, 0];
  network.send("entityModified", {
    id: entityId,
    changes: {
      p: pos,  // Frozen at death location
      ...networkData,
    },
  });
} else {
  // Normal position broadcast
}
```

### Phase 5: Simplify Client (Just Read Entity Data)

**File: `packages/shared/src/systems/client/ClientNetwork.ts`**

```typescript
// REMOVE: deadPlayers Set
// REMOVE: setTimeout delays
// REMOVE: Complex position blocking

// Client just reads entity.data.deathState
// PlayerRemote.update() handles animation based on entity state
```

**File: `packages/shared/src/entities/player/PlayerRemote.ts`**

```typescript
update(delta: number) {
  // Check death state from entity data (already synced)
  if (this.data.deathState === 'dying') {
    // Stay at death position
    if (this.data.deathPosition) {
      this.position.set(...this.data.deathPosition);
    }
    // Death animation plays
    this.avatar?.emote = 'death';
  } else {
    // Normal position interpolation
    this.position.copy(this.lerpPosition.current);
  }
}
```

---

## Event Simplification

### Before (4 Events):
```
PLAYER_SET_DEAD (isDead: true)
PLAYER_RESPAWNED
PLAYER_SET_DEAD (isDead: false)
entityModified (position)
```

### After (1 Mechanism):
```
entityModified (includes deathState, deathPosition)
```

All clients receive entity state changes through the normal entity sync mechanism. No special death events needed!

---

## State Machine

```
        ┌─────────────────────────────────────────────┐
        │                                             │
        ▼                                             │
    ┌───────┐     health=0      ┌────────┐           │
    │ ALIVE │ ────────────────► │ DYING  │           │
    └───────┘                   └────────┘           │
        ▲                           │                │
        │                           │ respawnTick    │
        │                           │ reached        │
        │                           ▼                │
        │                       ┌────────┐           │
        └────────────────────── │  DEAD  │ ──────────┘
              (instant)         └────────┘
              respawn           (brief state for
                                 gravestone spawn)
```

---

## Memory & Performance Benefits

### Before:
- `deathLocations` Map: O(n) memory for dead players
- `deadPlayers` Set (client): O(n) memory
- `respawnTimers` Map: O(n) setTimeout handles
- Multiple event handlers: CPU overhead

### After:
- Death state in entity data: Already allocated
- No separate Maps/Sets: Zero additional memory
- Tick-based checking: Single loop per tick
- One sync mechanism: Reduced CPU

---

## Testing Checklist

After implementing:

- [ ] Kill player → death animation plays at death location
- [ ] Killer sees death animation at death location
- [ ] After ANIMATION_TICKS → player teleports to spawn
- [ ] Multiple deaths in quick succession handled correctly
- [ ] Reconnect during death → correct state restored
- [ ] No race conditions between events
- [ ] Tick-perfect timing (deterministic)

---

## Files to Modify

1. **`packages/shared/src/types/entities/player.ts`** - Add deathState to type
2. **`packages/shared/src/entities/player/PlayerEntity.ts`** - Add deathState fields
3. **`packages/shared/src/systems/shared/combat/PlayerDeathSystem.ts`** - Use entity data, tick-based timing
4. **`packages/shared/src/systems/shared/entities/EntityManager.ts`** - Respect deathState for position
5. **`packages/shared/src/entities/player/PlayerRemote.ts`** - Read deathState, handle animation
6. **`packages/shared/src/systems/client/ClientNetwork.ts`** - Remove workarounds
7. **`packages/server/src/systems/ServerNetwork/event-bridge.ts`** - Simplify death event handling

---

## Estimated Effort

- Phase 1 (Entity Data): 30 min
- Phase 2 (Server Death State): 1 hour
- Phase 3 (Tick-Based Respawn): 30 min
- Phase 4 (EntityManager): 15 min
- Phase 5 (Client Simplification): 30 min
- Testing: 1 hour

**Total: ~4 hours for AAA quality death system**

---

## Summary

The current system works but is fragile because:
1. Multiple sources of truth create race conditions
2. setTimeout isn't deterministic
3. Too many events to coordinate
4. Client needs workarounds

The AAA solution:
1. **Single source of truth**: Entity data IS the death state
2. **Tick-based timing**: Deterministic like OSRS
3. **One sync mechanism**: Normal entity updates
4. **No workarounds**: Client just reads entity state
