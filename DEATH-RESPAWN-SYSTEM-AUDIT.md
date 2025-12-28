# Death & Respawn System Technical Audit

**Date:** 2024-12-27
**Auditor:** Claude Code
**Scope:** Complete death/respawn system review for OSRS accuracy and production readiness

---

## Executive Summary

The Hyperscape death and respawn system is **architecturally solid** with proper server authority, database persistence, and zone-based handling. However, the **client-side death animation synchronization** is currently implemented with workarounds that fight against the server's event timing. This audit proposes a cleaner, fully server-authoritative approach.

### Overall Rating: 7/10 (Current) → 9/10 (After Proposed Fixes)

---

## 1. OSRS Death Mechanics Reference

### Official OSRS Behavior (Sources: [OSRS Wiki - Death](https://oldschool.runescape.wiki/w/Death), [OSRS Wiki - Game Tick](https://oldschool.runescape.wiki/w/Game_tick))

| Mechanic | OSRS Value | Our Value | Match |
|----------|------------|-----------|-------|
| Game Tick Duration | 600ms | 600ms | ✅ |
| Death Animation | ~3-5 ticks (~2-3s) | 8 ticks (4.8s) | ✅ Close |
| Gravestone Timer | 15 minutes (1500 ticks) | 1500 ticks | ✅ Exact |
| Ground Item Despawn (Wilderness) | 2 minutes | 300 ticks (3 min) | ⚠️ Longer |
| Loot Protection (Wilderness) | 1 minute | 100 ticks (1 min) | ✅ Exact |
| Items Kept on Death | 3 (or 0 if skulled) | Not implemented | ❌ Missing |
| Death's Office | Items sent after 15 min | Not implemented | ❌ Missing |

### OSRS Death Sequence
```
1. Health reaches 0
2. "Oh dear, you are dead!" message
3. Death animation plays AT DEATH LOCATION (all players see this)
4. After animation: Player teleports to respawn point
5. Gravestone spawns at death location (safe zones)
6. OR items drop immediately (wilderness/PvP)
```

**Critical OSRS Principle:** The server controls ALL timing. Clients never need to delay or guess - they render exactly what the server tells them, when the server tells them.

---

## 2. Current Architecture Analysis

### 2.1 File Locations

#### Server-Side Death Systems
| File | Purpose | Lines |
|------|---------|-------|
| `packages/shared/src/systems/shared/combat/PlayerDeathSystem.ts` | Main death orchestrator | ~900 |
| `packages/shared/src/systems/shared/death/SafeAreaDeathHandler.ts` | Gravestone spawning | ~280 |
| `packages/shared/src/systems/shared/death/WildernessDeathHandler.ts` | Ground item drops | ~115 |
| `packages/shared/src/systems/shared/death/ZoneDetectionSystem.ts` | Zone type detection | ~170 |
| `packages/shared/src/systems/shared/death/DeathStateManager.ts` | Death lock persistence | ~280 |
| `packages/server/src/database/repositories/DeathRepository.ts` | Database operations | ~190 |

#### Client-Side Death Handling
| File | Purpose | Lines |
|------|---------|-------|
| `packages/shared/src/systems/client/ClientNetwork.ts` | Network event handlers | ~2100 |
| `packages/shared/src/entities/player/PlayerLocal.ts` | Local player death state | ~2500 |
| `packages/shared/src/entities/player/PlayerRemote.ts` | Remote player rendering | ~900 |

### 2.2 Event Flow (Current)

```
SERVER SIDE:
┌─────────────────────────────────────────────────────────────────┐
│ Health <= 0 (HealthComponent or PlayerSystem)                   │
│     ↓                                                           │
│ ENTITY_DEATH event emitted                                      │
│     ↓                                                           │
│ PlayerDeathSystem.handlePlayerDeath()                           │
│     ├─ Creates database death lock (prevents item dupe)         │
│     ├─ Clears inventory/equipment immediately                   │
│     ├─ postDeathCleanup():                                      │
│     │   ├─ Broadcast: PLAYER_SET_DEAD (isDead: true)           │
│     │   ├─ Sets death emote on entity                           │
│     │   └─ Schedules respawn (4.8s via ANIMATION_TICKS)         │
│     │                                                           │
│     └─ After 4.8s: initiateRespawn() → respawnPlayer()          │
│         ├─ Teleports player to spawn                            │
│         ├─ Direct: playerTeleport packet to dying player        │
│         ├─ Broadcast: PLAYER_RESPAWNED (to ALL)        ← ISSUE  │
│         ├─ Broadcast: PLAYER_SET_DEAD (isDead: false)           │
│         └─ Spawns gravestone (if safe zone)                     │
└─────────────────────────────────────────────────────────────────┘

CLIENT SIDE (Killer's perspective - The Problem):
┌─────────────────────────────────────────────────────────────────┐
│ Receives: playerSetDead (isDead: true)                          │
│     ├─ Adds to deadPlayers Set                                  │
│     └─ Sets death emote on PlayerRemote                         │
│                                                                 │
│ [Animation should play for 4.8 seconds]                         │
│                                                                 │
│ Receives: playerRespawned (spawnPosition)           ← TOO EARLY │
│     ├─ Server sends this after 4.8s                             │
│     ├─ BUT network latency + event ordering issues              │
│     ├─ entityModified packets may arrive with spawn position    │
│     └─ Player appears at spawn before animation finishes        │
│                                                                 │
│ Current "Fix": Client-side setTimeout + deadPlayers blocking    │
│     └─ This is hacky and fights the architecture                │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 The Core Problem

**Server sends position updates DURING the death animation period.**

The server:
1. Sets death state at T=0
2. Continues sending entity position updates
3. At T=4.8s, sends spawn position via PLAYER_RESPAWNED

But between T=0 and T=4.8s:
- `entityModified` packets may include position data
- The dying player's position might be updated (e.g., to spawn location early)
- Network reordering can cause RESPAWNED to arrive before animation completes

**Current Workaround (Hacky):**
```typescript
// ClientNetwork.ts - We block updates for dead players
if (this.deadPlayers.has(data.id)) {
  return; // Skip position updates
}

// We use client-side setTimeout to delay position application
setTimeout(() => {
  // Apply spawn position after client thinks animation is done
}, DEATH_ANIMATION_VISUAL_DURATION);
```

This is fragile because:
- Client and server clocks may differ
- Network latency varies
- We're guessing when the animation should finish
- We're fighting against the server's natural update flow

---

## 3. Production Readiness Ratings

### 3.1 Production Quality Code (7/10)

| Aspect | Rating | Notes |
|--------|--------|-------|
| Readability | 8/10 | Well-organized, clear naming |
| Error Handling | 7/10 | Good try/catch, but some edge cases missed |
| Performance | 6/10 | Some hot-path allocations (see Memory section) |
| Documentation | 7/10 | Inline comments, but no architecture docs |
| Type Safety | 8/10 | Strong typing, minimal `any` usage |

### 3.2 Best Practices (7/10)

| Aspect | Rating | Notes |
|--------|--------|-------|
| DRY | 7/10 | Some duplication in position update code |
| KISS | 6/10 | Client workarounds add complexity |
| Testing | 4/10 | No dedicated death system tests found |
| Code Organization | 8/10 | Clear separation of concerns |

### 3.3 OWASP Security (9/10)

| Aspect | Rating | Notes |
|--------|--------|-------|
| Server Authority | 10/10 | All death logic is server-side |
| Input Validation | 8/10 | Player IDs validated |
| Access Control | 9/10 | Death locks prevent manipulation |
| Rate Limiting | 8/10 | 5-second death cooldown |

### 3.4 Game Studio Audit (7/10)

| Aspect | Rating | Notes |
|--------|--------|-------|
| Anti-Cheat | 8/10 | Server-authoritative |
| Scalability | 7/10 | Tick-based, but some memory concerns |
| Consistency | 6/10 | Client-side delays break determinism |
| OSRS Accuracy | 7/10 | Timing close, but sync issues |

### 3.5 Memory & Allocation Hygiene (6/10)

**Issues Found:**

```typescript
// ClientNetwork.ts - Allocations in event handlers (called frequently)
const posArray: [number, number, number] = [sp.x, sp.y, sp.z]; // New array
const currentEntity = this.world.entities.get(data.playerId); // OK

// PlayerRemote.ts - Allocations in update loop (60fps!)
const tempQuat = new THREE.Quaternion(); // ❌ Should be pre-allocated
const worldMatrix = this._tempMatrix1; // ✅ Reused - good!

// createVRMFactory.ts - Allocations in animation update
const scenePos = vrm.scene.position; // Reference, OK
const sceneWorldPos = new THREE.Vector3(); // ❌ Should be pre-allocated
```

**Recommendations:**
- Pre-allocate temporary vectors/quaternions as class properties
- Use object pools for frequently created position arrays
- Cache entity lookups within the same frame

### 3.6 SOLID Principles (7/10)

| Principle | Rating | Notes |
|-----------|--------|-------|
| Single Responsibility | 8/10 | Good separation: DeathHandler, ZoneDetection, DeathState |
| Open/Closed | 7/10 | Zone handlers are extensible |
| Liskov Substitution | 8/10 | SafeArea/Wilderness handlers are interchangeable |
| Interface Segregation | 7/10 | Some bloated interfaces |
| Dependency Inversion | 6/10 | Direct system references, could use DI |

---

## 4. The Proper Fix: Server-Controlled Timing

### 4.1 Core Principle

**The server should NEVER send spawn position until AFTER the animation duration.**

All clients should stay perfectly synchronized because they all receive the same events at the same time.

### 4.2 Proposed Event Flow

```
NEW SERVER FLOW:
┌─────────────────────────────────────────────────────────────────┐
│ Health <= 0                                                     │
│     ↓                                                           │
│ T=0: Broadcast PLAYER_SET_DEAD (isDead: true)                   │
│      - Player position FROZEN at death location                 │
│      - Server stops sending position updates for this player    │
│      - All clients see death animation at same position         │
│     ↓                                                           │
│ [Server waits DEATH.ANIMATION_TICKS internally]                 │
│ [NO position updates sent during this time]                     │
│     ↓                                                           │
│ T=4.8s: Broadcast PLAYER_RESPAWNED                              │
│         - NOW includes spawn position                           │
│         - All clients teleport player simultaneously            │
│     ↓                                                           │
│ T=4.8s: Broadcast PLAYER_SET_DEAD (isDead: false)               │
│         - Resume normal position updates                        │
└─────────────────────────────────────────────────────────────────┘

NEW CLIENT FLOW (Much Simpler):
┌─────────────────────────────────────────────────────────────────┐
│ Receives: playerSetDead (isDead: true)                          │
│     └─ Set death emote, that's it                               │
│                                                                 │
│ [Animation plays naturally - no client-side timing needed]      │
│                                                                 │
│ Receives: playerRespawned (spawnPosition)                       │
│     └─ Teleport to spawn, set idle emote                        │
│                                                                 │
│ Receives: playerSetDead (isDead: false)                         │
│     └─ Resume normal updates                                    │
│                                                                 │
│ NO deadPlayers Set needed                                       │
│ NO client-side setTimeout needed                                │
│ NO position update blocking needed                              │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Implementation Changes

#### A. PlayerDeathSystem.ts - Stop position broadcasts during death

```typescript
// Add to postDeathCleanup():
private postDeathCleanup(playerId: string, deathPosition: Vector3) {
  // Mark player as "position frozen" - server won't broadcast updates
  this.positionFrozenPlayers.add(playerId);

  // Broadcast death state
  this.world.emit(EventType.PLAYER_SET_DEAD, {
    playerId,
    isDead: true,
    deathPosition: [deathPosition.x, deathPosition.y, deathPosition.z],
  });

  // Schedule respawn AFTER animation duration
  const respawnTick = this.world.tick + COMBAT_CONSTANTS.DEATH.ANIMATION_TICKS;
  this.pendingRespawns.set(playerId, respawnTick);
}

// In tick update:
public update() {
  for (const [playerId, respawnTick] of this.pendingRespawns) {
    if (this.world.tick >= respawnTick) {
      this.pendingRespawns.delete(playerId);
      this.initiateRespawn(playerId);
    }
  }
}

// In respawnPlayer():
private respawnPlayer(playerId: string, spawnPosition: Vector3) {
  // Unfreeze position updates
  this.positionFrozenPlayers.delete(playerId);

  // NOW broadcast spawn position - all clients receive simultaneously
  this.world.emit(EventType.PLAYER_RESPAWNED, {
    playerId,
    spawnPosition,
  });

  this.world.emit(EventType.PLAYER_SET_DEAD, {
    playerId,
    isDead: false,
  });
}
```

#### B. ServerNetwork/event-bridge.ts - Respect position freeze

```typescript
// In entity position broadcast logic:
if (this.playerDeathSystem.isPositionFrozen(entityId)) {
  return; // Don't broadcast position for dead players
}
```

#### C. ClientNetwork.ts - Simplified (remove workarounds)

```typescript
onPlayerSetDead = (data: { playerId: string; isDead: boolean }) => {
  const entity = this.world.entities.get(data.playerId);
  if (!entity) return;

  if (data.isDead) {
    // Just set death emote - position is frozen server-side
    entity.modify({ e: "death" });
  } else {
    // Resume normal state
    entity.modify({ e: "idle" });
  }
};

onPlayerRespawned = (data: { playerId: string; spawnPosition: number[] }) => {
  const entity = this.world.entities.get(data.playerId);
  if (!entity) return;

  // Simple teleport - no delays, no blocking, no Sets
  entity.modify({
    p: data.spawnPosition,
    e: "idle",
  });
};

// Remove: deadPlayers Set
// Remove: setTimeout delays
// Remove: position update blocking
```

---

## 5. Additional OSRS Features to Implement

### 5.1 Items Kept on Death (Priority: High)

OSRS keeps 3 most valuable items (0 if skulled, +1 with Protect Item prayer).

```typescript
interface ItemRetentionConfig {
  baseItemsKept: 3,
  skulledItemsKept: 0,
  protectItemBonus: 1,
}

function calculateItemsKept(player: Player): InventoryItem[] {
  const allItems = [...player.inventory, ...player.equipment];
  const sorted = allItems.sort((a, b) => b.value - a.value);

  let keepCount = player.isSkulled ? 0 : 3;
  if (player.isPrayerActive('protectItem')) keepCount += 1;

  return sorted.slice(0, keepCount);
}
```

### 5.2 Death's Office (Priority: Medium)

After 15 minutes, unclaimed items go to Death's Office with reclaim fee.

```typescript
// On gravestone expiration (instead of dropping to ground):
if (itemValue >= 100000) {
  sendToDeathOffice(playerId, item, fee: itemValue * 0.05);
} else {
  sendToDeathOffice(playerId, item, fee: 0);
}
```

### 5.3 Skull System (Priority: High for PvP)

Players who attack first in non-PvP zones get "skulled" and lose all items on death.

```typescript
interface SkullState {
  isSkulled: boolean;
  skullExpiresTick: number; // 20 minutes after last attack
}
```

---

## 6. Recommended Action Plan

### Phase 1: Fix Core Sync Issue (Immediate)

1. **Server: Add position freeze during death**
   - Track `positionFrozenPlayers: Set<string>`
   - Stop broadcasting position updates for frozen players
   - Unfreeze on respawn

2. **Server: Use tick-based respawn scheduling**
   - Replace setTimeout with tick-based pending respawns
   - Ensures deterministic timing across all clients

3. **Client: Remove workarounds**
   - Remove `deadPlayers` Set
   - Remove `setTimeout` delays
   - Remove position update blocking
   - Simplify to pure event reaction

### Phase 2: OSRS Accuracy (Short-term)

1. Implement Items Kept on Death (3 items rule)
2. Implement skull system for PvP
3. Add Death's Office for expired gravestones

### Phase 3: Polish (Medium-term)

1. Add death system unit tests
2. Pre-allocate hot-path memory
3. Add death animation variants
4. Add gravestone customization

---

## 7. Test Plan

### Unit Tests Needed

```typescript
describe('PlayerDeathSystem', () => {
  it('should freeze position updates during death animation');
  it('should broadcast PLAYER_SET_DEAD before any position updates');
  it('should wait ANIMATION_TICKS before sending PLAYER_RESPAWNED');
  it('should unfreeze position updates after respawn');
  it('should handle reconnect during death animation');
  it('should prevent double death within COOLDOWN_TICKS');
});

describe('ClientNetwork Death Handling', () => {
  it('should set death emote on PLAYER_SET_DEAD (isDead: true)');
  it('should teleport on PLAYER_RESPAWNED');
  it('should set idle emote on PLAYER_SET_DEAD (isDead: false)');
  it('should sync death animation across all clients');
});
```

### Integration Tests Needed

```typescript
describe('Death Sync Across Clients', () => {
  it('killer should see death animation at death location');
  it('killed player should see death animation at death location');
  it('both players should see respawn at same moment');
  it('animation should last exactly ANIMATION_TICKS duration');
});
```

---

## 8. Bug Found During Audit

### Critical Bug: `onPlayerSetDead (isDead: false)` Removes from `deadPlayers` Too Early

**Location:** `ClientNetwork.ts` lines 1844-1848

**The Bug:**
```typescript
if (data.isDead) {
  this.deadPlayers.add(data.playerId);
} else {
  this.deadPlayers.delete(data.playerId);  // ← BUG: Removes too early!
}
```

**Event Timeline:**
```
T=0.0s: onPlayerSetDead (isDead: true)  → adds to deadPlayers ✓
T=0.1s: onPlayerRespawned              → delays position, keeps in deadPlayers ✓
T=4.8s: onPlayerSetDead (isDead: false) → REMOVES from deadPlayers ✗
T=4.9s: entityModified with position   → NOT blocked, updates position!
T=6.1s: setTimeout fires               → tries to teleport, but already at spawn
```

The `onPlayerSetDead (isDead: false)` event arrives from server ~4.8s after death and immediately removes the player from `deadPlayers`. This undoes the position blocking we set up in `onPlayerRespawned`.

**The Fix:**
Don't remove from `deadPlayers` in `onPlayerSetDead`. Let the 2-second timeout in `onPlayerRespawned` handle removal.

```typescript
if (data.isDead) {
  this.deadPlayers.add(data.playerId);
}
// NOTE: Do NOT remove from deadPlayers when isDead=false!
// The 2-second timeout in onPlayerRespawned handles removal.
```

**Status:** Fixed in latest build.

---

## 9. Conclusion

The Hyperscape death system has a **solid foundation** with proper server authority, database persistence, and zone-based handling. The main issue is **event timing** - the server sends position updates during the death animation, forcing the client to use workarounds.

**The fix is straightforward:** Make the server freeze position broadcasts during death animation. This eliminates all client-side workarounds and ensures perfect synchronization across all players.

### Final Ratings

| Category | Current | After Fix |
|----------|---------|-----------|
| Production Quality | 7/10 | 8/10 |
| Best Practices | 7/10 | 9/10 |
| OWASP Security | 9/10 | 9/10 |
| Game Studio Audit | 7/10 | 9/10 |
| Memory Hygiene | 6/10 | 8/10 |
| SOLID Principles | 7/10 | 8/10 |
| **OSRS Accuracy** | **7/10** | **9/10** |
| **Overall** | **7/10** | **9/10** |

---

## References

- [OSRS Wiki - Death](https://oldschool.runescape.wiki/w/Death)
- [OSRS Wiki - Grave](https://oldschool.runescape.wiki/w/Grave)
- [OSRS Wiki - Game Tick](https://oldschool.runescape.wiki/w/Game_tick)
- [OSRS Death Changes Announcement](https://secure.runescape.com/m=news/death-changes?oldschool=1)
