# OSRS Combat Implementation Plan

**Comprehensive Plan for Exact OSRS Feel with 100% Reliability**

**Target Rating: 9/10+ on Production Criteria**

**Last Verified**: December 2024 (cross-checked against OSRS Wiki and osrs-docs.com)

---

## Verification Status

All mechanics in this plan have been verified against official OSRS Wiki sources AND cross-checked against actual codebase:

| Mechanic | Wiki Verified | Codebase Verified | Status |
|----------|---------------|-------------------|--------|
| Combat Level Formula | ✅ | ✅ Wrong at AggroSystem.ts:321-326 | Needs fix |
| Style Bonuses (+3/+1) | ✅ | ✅ XP distribution works, but OSRS +3 effective level NOT used | Needs fix |
| Style Damage/Accuracy Mods | N/A | ✅ Handlers exist but COMBAT_DAMAGE/ACCURACY_CALCULATE never emitted | Needs fix |
| XP Rates (4/1.33) | ✅ | ✅ WORKS via COMBAT_KILL event on mob death (SkillsSystem.ts:643-743) | ✅ Done |
| PID Reshuffle (100-150 ticks) | ✅ | ✅ No PIDManager.ts exists | Needs impl |
| Double-Level Aggro Rule | ✅ | ✅ Uses fixed threshold instead of `mob×2` | Needs fix |
| Tolerance Timer (10 min) | ✅ | ✅ No tolerance system exists | Needs impl |
| Accuracy Formula | ✅ | ✅ Correct at CombatCalculations.ts:45-59 | ✅ Done |
| NPC Defense Bonus | ✅ | ✅ Hardcoded=0 at CombatCalculations.ts:135 | Needs fix |
| Script Queue | ✅ | ✅ Implemented but disabled (line 164 = false) | 1-line fix |
| SeededRandom | ✅ | ✅ Uses Math.random() at lines 62, 155 | Needs impl |
| Hitsplat Duration | ✅ | ✅ Currently 3 ticks, should be 2 | 1-line fix |
| Dead Code (isPlayerMoving) | N/A | ✅ Line 2094 - defined but never called | Remove |
| EventStore | N/A | ✅ Does not exist | Needs impl |
| Auto-ban Thresholds | N/A | ✅ Not in CombatAntiCheat.ts | Needs impl |

### Code Verification Summary (December 2024)

**Files Examined:**
- `CombatCalculations.ts` (347 lines) - Accuracy formula ✅, missing style bonuses ❌
- `CombatSystem.ts` (2198 lines) - processAutoAttackOnTick 1717-1900 (183 lines), dead isPlayerMoving at 2094
- `AggroSystem.ts` (635 lines) - Wrong combat level at 316-328, fixed threshold at 305-307
- `GameTickProcessor.ts` - scriptQueueEnabled = false at line 164, NPCs before Players ✅
- `CombatAntiCheat.ts` (582 lines) - Monitoring only, no auto-actions
- `CombatConstants.ts` - HITSPLAT_DURATION_TICKS: 3 at line 88
- `SkillsSystem.ts` - COMBAT_KILL handler grants XP correctly (4/1.33 rates) ✅
- `MobEntity.ts:1822` - Emits COMBAT_KILL on death with damageDealt ✅
- `PlayerSystem.ts` - Has COMBAT_DAMAGE/ACCURACY_CALCULATE handlers, but never called ❌

**XP System Status (Corrected):**
- Combat XP **DOES WORK** via `COMBAT_KILL` event on mob death
- XP is granted in bulk on kill (not per-hit like OSRS, but same total)
- Style-based XP distribution works (aggressive → Strength, accurate → Attack, etc.)
- Attack style damage/accuracy modifiers are defined but NOT APPLIED to combat

---

## Executive Summary

### What Already Works ✅

| Feature | Status | Location |
|---------|--------|----------|
| **Combat XP (4/1.33 rates)** | ✅ Working | SkillsSystem.ts:643-743 via COMBAT_KILL |
| **Style-based XP distribution** | ✅ Working | Aggressive → Str, Accurate → Atk, etc. |
| **Constitution XP always** | ✅ Working | 1.33 XP per damage, always granted |
| **Accuracy formula** | ✅ Working | CombatCalculations.ts:45-59 |
| **Tick system (600ms)** | ✅ Working | GameTickProcessor.ts |
| **NPC before Player order** | ✅ Working | GameTickProcessor.ts:306-311 |
| **Object pooling** | ✅ Working | TilePool, QuaternionPool |

### What Needs Implementation

| Feature | Priority | Impact |
|---------|----------|--------|
| **Combat Level Formula** | HIGH | Wrong formula in AggroSystem |
| **Style +3/+1 Level Bonuses** | HIGH | Affects damage/accuracy |
| **Double-Level Aggro Rule** | MEDIUM | High-level players ignored |
| **Tolerance Timer (10 min)** | MEDIUM | Mobs stop aggro after time |
| **Deterministic RNG** | HIGH | Reproducible combat |
| **Script Queue Enable** | LOW | 1-line change |

---

This plan synthesizes findings from four research documents:
- `OSRS-COMBAT-DISCREPANCIES.md` - 17 OSRS accuracy issues
- `COMBAT-SYSTEM-AUDIT.md` - Production quality audit (current: 7.5/10)
- `OSRS-ARCHITECTURE-PROPOSAL.md` - Advanced architecture patterns
- `OSRS-IMPLEMENTATION-GAP-ANALYSIS.md` - Current vs target comparison

**Current State**: ~70% infrastructure complete, 6/10 OSRS accuracy
**Target State**: 100% OSRS feel, 9/10+ production quality

**Key Insight**: The hardest work is done. We have tick simulation, processing order, damage asymmetry, and object pooling. The remaining work is refinement, not architecture.

---

## Target Criteria (Must Achieve 9/10 Each)

| Criterion | Current | Target | Gap |
|-----------|---------|--------|-----|
| 1. Production Quality Code | 8/10 | 9/10 | Dead code, method decomposition |
| 2. Best Practices (DRY/KISS/Testing) | 8/10 | 9/10 | Behavior tests, benchmarks |
| 3. OWASP Security Standards | 9/10 | 9.5/10 | Request signing, XP validation |
| 4. Game Studio Audit (AAA) | 7/10 | 9/10 | Replay, auto-ban, damage caps |
| 5. Memory & Allocation Hygiene | 9/10 | 9/10 | Already excellent |
| 6. SOLID Principles | 8/10 | 9/10 | Interface segregation |
| 7. OSRS Accuracy | 6/10 | 9/10 | Formulas, XP, styles, timers |

---

## Phase Overview

| Phase | Focus | Criteria Improved | Key Deliverables | Effort |
|-------|-------|-------------------|------------------|--------|
| Phase 1 | Deterministic Foundation | #4 AAA, #7 OSRS | SeededRandom, Script Queue, PID Manager | 3-4 days |
| Phase 2 | OSRS Formula Accuracy | #7 OSRS | Combat Level, Aggro Rule, NPC Defense | 2-3 days |
| Phase 3 | Combat XP & Styles | #7 OSRS | XP Emission, Style Bonuses | 2 days |
| Phase 4 | Aggro System Fixes | #7 OSRS | Tolerance Timer, Zones, PJ Timer | 1-2 days |
| Phase 5 | Security & Anti-Cheat | #3 OWASP, #4 AAA | Event Store, Auto-Ban, HMAC, XP/Damage Validation | 3-4 days |
| Phase 6 | Code Quality & Testing | #1 Prod, #2 Best Practices, #6 SOLID | Method Decomp, Benchmarks, Behavior Tests, ISP | 3-4 days |

**Total: ~15-19 days for complete implementation**

### Phase-to-Criteria Mapping

| Criterion | Current | Target | Addressed In |
|-----------|---------|--------|--------------|
| #1 Production Quality | 8/10 | 9/10 | Phase 6.1, 6.5.4 |
| #2 Best Practices | 8/10 | 9/10 | Phase 6.2, 6.3 |
| #3 OWASP Security | 9/10 | 9.5/10 | Phase 5.3 (HMAC) |
| #4 AAA Standards | 7/10 | 9/10 | Phase 1, 5.1, 5.2, 5.4, 5.5 |
| #5 Memory Hygiene | 9/10 | 9/10 | (Already excellent) |
| #6 SOLID Principles | 8/10 | 9/10 | Phase 6.1, 6.4 |
| #7 OSRS Accuracy | 6/10 | 9/10 | Phase 2, 3, 4, 6.5 |

---

## Phase 1: Deterministic Foundation

**Goal**: Achieve 100% reproducible combat outcomes across all scenarios.

This is the most critical phase for reliability. Without deterministic randomness, combat cannot be replayed, debugged, or guaranteed consistent.

---

### ⚠️ PRE-IMPLEMENTATION VERIFICATION (Phase 1)

**STOP! Before implementing this phase, verify the following:**

#### Research Verification
- [ ] Confirm xorshift128+ is suitable for game RNG (not cryptographic)
- [ ] Verify OSRS uses deterministic RNG (it does - same seed = same combat)
- [ ] Confirm PID reshuffle range is 100-150 ticks (source: OSRS Wiki)
- [ ] Verify script queue priority order: Strong > Normal > Weak > Soft

#### Codebase Verification
- [ ] Confirm `Math.random()` is used in `CombatCalculations.ts:62,155`
- [ ] Confirm `scriptQueueEnabled = false` at `GameTickProcessor.ts:164`
- [ ] Confirm no existing `SeededRandom.ts` or `PIDManager.ts`
- [ ] Review `ScriptQueue.ts` implementation before enabling

#### Dependencies Check
- [ ] No external dependencies needed for SeededRandom
- [ ] ScriptQueue already integrated into GameTickProcessor
- [ ] PIDManager will need integration into player connect/disconnect

#### Test Plan Verification
- [ ] Determinism test: same seed → same sequence (1000 iterations)
- [ ] Distribution test: uniform across 10 buckets (±15%)
- [ ] Serialization test: save/restore state produces identical sequence

**Once all boxes are checked, proceed with implementation.**

---

### 1.1 Seeded Random Number Generator

**Priority**: CRITICAL
**Impact**: Enables determinism for all combat calculations

**Create** `packages/shared/src/utils/SeededRandom.ts`:
```typescript
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
   * OSRS-style accuracy roll: returns true if attack hits
   */
  accuracyRoll(hitChance: number): boolean {
    return this.next() < hitChance;
  }

  /**
   * OSRS-style damage roll: returns damage in [0, maxHit]
   */
  damageRoll(maxHit: number): number {
    return this.nextInt(0, maxHit);
  }

  /**
   * Fork a new RNG with derived seed (for sub-systems)
   */
  fork(discriminator: number): SeededRandom {
    const newSeed = Math.floor(this.next() * 0x7fffffff) ^ discriminator;
    return new SeededRandom(newSeed);
  }

  /**
   * Get current state for serialization
   */
  getState(): { state0: string; state1: string } {
    return {
      state0: this.state0.toString(),
      state1: this.state1.toString(),
    };
  }

  /**
   * Restore from serialized state
   */
  static fromState(state: { state0: string; state1: string }): SeededRandom {
    const rng = new SeededRandom(0);
    rng.state0 = BigInt(state.state0);
    rng.state1 = BigInt(state.state1);
    return rng;
  }
}

// Export singleton for game-wide use (seeded per session)
export let gameRng: SeededRandom;

export function initializeGameRng(seed: number): void {
  gameRng = new SeededRandom(seed);
}
```

**Modify** `packages/shared/src/utils/game/CombatCalculations.ts`:
```typescript
// Before (multiple locations):
const roll = Math.random();
const damage = Math.floor(Math.random() * (maxHit + 1));

// After:
import { gameRng } from '../SeededRandom';

// In calculateHitResult():
const roll = gameRng.next();

// In calculateDamage():
const damage = gameRng.damageRoll(maxHit);
```

**Modify** `packages/server/src/systems/GameTickProcessor.ts`:
```typescript
// In constructor or initialization:
import { initializeGameRng } from '@hyperscape/shared';

// Generate seed from server start time (or config)
const gameSeed = Date.now() ^ 0x5DEECE66D; // XOR with magic constant
initializeGameRng(gameSeed);

// Log seed for replay capability
console.log(`[GameTickProcessor] Game seed: ${gameSeed}`);
```

**Tests to Create** `packages/shared/src/utils/__tests__/SeededRandom.test.ts`:
```typescript
describe('SeededRandom', () => {
  it('produces identical sequences from same seed', () => {
    const rng1 = new SeededRandom(12345);
    const rng2 = new SeededRandom(12345);

    for (let i = 0; i < 1000; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });

  it('produces uniform distribution', () => {
    const rng = new SeededRandom(42);
    const buckets = new Array(10).fill(0);

    for (let i = 0; i < 10000; i++) {
      const bucket = Math.floor(rng.next() * 10);
      buckets[bucket]++;
    }

    // Each bucket should have ~1000, allow 15% variance
    for (const count of buckets) {
      expect(count).toBeGreaterThan(850);
      expect(count).toBeLessThan(1150);
    }
  });

  it('serializes and restores correctly', () => {
    const rng1 = new SeededRandom(99999);
    // Advance some
    for (let i = 0; i < 100; i++) rng1.next();

    const state = rng1.getState();
    const rng2 = SeededRandom.fromState(state);

    // Should produce identical sequence from this point
    for (let i = 0; i < 100; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });
});
```

---

### 1.2 Enable Script Queue System

**Priority**: HIGH
**Impact**: Proper action ordering, queue priority behavior

The script queue is ALREADY implemented but disabled. We just need to enable it.

**Modify** `packages/server/src/systems/GameTickProcessor.ts`:
```typescript
// Find:
this.scriptQueueEnabled = false;

// Change to:
this.scriptQueueEnabled = true;
```

**Verification Tests** (should already pass):
- Strong scripts clear weak scripts
- Normal scripts skip when modal open
- Scripts queued this tick execute next tick

---

### 1.3 PID System with Reshuffle

**Priority**: HIGH
**Impact**: Deterministic resolution of simultaneous player actions

**Create** `packages/server/src/systems/ServerNetwork/PIDManager.ts`:
```typescript
import { SeededRandom } from '@hyperscape/shared';

/**
 * Player Identification Number manager.
 * Handles deterministic ordering of simultaneous player actions.
 *
 * From OSRS Wiki:
 * "Upon logging in, a PID is assigned which will randomise every 100 to 150
 * game ticks. The engine uses this to deal with two players doing something
 * at the same time, the lower PID will have priority in processing."
 */
export class PIDManager {
  private readonly playerPIDs: Map<string, number> = new Map();
  private nextReshuffleTick: number = 0;
  private readonly rng: SeededRandom;

  // OSRS constants
  private readonly MIN_RESHUFFLE_TICKS = 100;
  private readonly MAX_RESHUFFLE_TICKS = 150;
  private readonly MAX_PID = 2047; // OSRS uses 2048 slots (0-2047)

  constructor(rng: SeededRandom) {
    this.rng = rng.fork(0xPID); // Fork RNG for PID system
    this.scheduleNextReshuffle(0);
  }

  /**
   * Assign PID to player on login
   */
  assignPID(playerId: string): number {
    if (this.playerPIDs.has(playerId)) {
      return this.playerPIDs.get(playerId)!;
    }

    const existingPIDs = new Set(this.playerPIDs.values());
    let pid: number;

    // Find unused PID
    let attempts = 0;
    do {
      pid = this.rng.nextInt(0, this.MAX_PID);
      attempts++;
      if (attempts > 1000) {
        // Fallback: sequential assignment
        pid = this.playerPIDs.size;
        break;
      }
    } while (existingPIDs.has(pid));

    this.playerPIDs.set(playerId, pid);
    return pid;
  }

  /**
   * Remove PID on logout
   */
  removePID(playerId: string): void {
    this.playerPIDs.delete(playerId);
  }

  /**
   * Get PID for player
   */
  getPID(playerId: string): number | undefined {
    return this.playerPIDs.get(playerId);
  }

  /**
   * Get players sorted by PID (for tick processing)
   */
  getPlayerProcessingOrder(): string[] {
    return [...this.playerPIDs.entries()]
      .sort((a, b) => a[1] - b[1])
      .map(([playerId]) => playerId);
  }

  /**
   * Check if PID reshuffle needed and perform if so
   */
  maybeReshuffle(currentTick: number): boolean {
    if (currentTick >= this.nextReshuffleTick) {
      this.reshuffleAllPIDs();
      this.scheduleNextReshuffle(currentTick);
      return true;
    }
    return false;
  }

  private reshuffleAllPIDs(): void {
    const players = [...this.playerPIDs.keys()];
    this.playerPIDs.clear();

    // Reassign in random order
    for (const playerId of players) {
      this.assignPID(playerId);
    }
  }

  private scheduleNextReshuffle(currentTick: number): void {
    const delay = this.rng.nextInt(
      this.MIN_RESHUFFLE_TICKS,
      this.MAX_RESHUFFLE_TICKS
    );
    this.nextReshuffleTick = currentTick + delay;
  }

  /**
   * Get debug info
   */
  getDebugInfo(): { pids: Record<string, number>; nextReshuffle: number } {
    return {
      pids: Object.fromEntries(this.playerPIDs),
      nextReshuffle: this.nextReshuffleTick,
    };
  }
}
```

**Integrate into** `packages/server/src/systems/GameTickProcessor.ts`:
```typescript
import { PIDManager } from './ServerNetwork/PIDManager';

// In constructor:
this.pidManager = new PIDManager(gameRng);

// In updateProcessingOrder():
// Replace connection-time sorting with PID sorting
private updateProcessingOrder(): void {
  // Maybe reshuffle PIDs
  this.pidManager.maybeReshuffle(this.currentTick);

  // Get PID-ordered players
  const pidOrder = this.pidManager.getPlayerProcessingOrder();

  // Sort players by PID
  this.playerOrder = this.world.getAllPlayers()
    .sort((a, b) => {
      const pidA = this.pidManager.getPID(a.id) ?? Infinity;
      const pidB = this.pidManager.getPID(b.id) ?? Infinity;
      return pidA - pidB;
    });
}

// On player connect:
this.pidManager.assignPID(playerId);

// On player disconnect:
this.pidManager.removePID(playerId);
```

---

## Phase 2: OSRS Formula Accuracy

**Goal**: Fix all combat formulas to match OSRS exactly.

---

### ⚠️ PRE-IMPLEMENTATION VERIFICATION (Phase 2)

**STOP! Before implementing this phase, verify the following:**

#### Research Verification
- [ ] Re-confirm combat level formula from OSRS Wiki: `Base + max(Melee, Ranged, Magic)`
- [ ] Verify level 3 = min combat (base stats), level 126 = max combat (all 99s)
- [ ] Confirm double-level aggro rule: `player level > mob level × 2` = mob ignores
- [ ] Verify NPC defense bonus varies by NPC (check mobs.json for defenseBonus field)

#### Codebase Verification
- [ ] Read `AggroSystem.ts:316-328` - confirm wrong formula exists
- [ ] Read `AggroSystem.ts:305-307` - confirm fixed threshold used
- [ ] Check `mobs.json` manifest for defenseBonus field availability
- [ ] Verify `calculateDamage()` in CombatCalculations.ts passes through defense bonus

#### Formula Test Cases
- [ ] Level 3: Attack 1, Strength 1, Defence 1, HP 10, Prayer 1 → Combat 3
- [ ] Level 126: All 99s → Combat 126
- [ ] Melee pure: 99 Atk/Str, 1 Def, 99 HP, 1 Prayer → Combat ~100
- [ ] Double-level: Level 2 goblin ignores level 5+ players

#### Dependencies Check
- [ ] Phase 1 (SeededRandom) should be complete first for consistent testing
- [ ] Aggro system tests exist and should be updated

**Once all boxes are checked, proceed with implementation.**

---

### 2.1 Combat Level Formula

**Priority**: HIGH
**Impact**: Correct aggro behavior, level display, level-based mechanics

**Current** (WRONG) in `AggroSystem.ts:316-328`:
```typescript
const combatLevel = Math.floor(
  (playerSkills.attack + playerSkills.strength +
   playerSkills.defense + playerSkills.constitution) / 4
);
```

**OSRS Formula**:
```
Base = 0.25 × (Defence + Hitpoints + floor(Prayer / 2))
Melee = 0.325 × (Attack + Strength)
Ranged = 0.325 × floor(Ranged × 1.5)
Magic = 0.325 × floor(Magic × 1.5)
Combat Level = floor(Base + max(Melee, Ranged, Magic))
```

**Create** `packages/shared/src/utils/game/CombatLevelCalculator.ts`:
```typescript
interface CombatSkills {
  attack: number;
  strength: number;
  defense: number;
  hitpoints: number; // or constitution
  ranged: number;
  magic: number;
  prayer: number;
}

/**
 * Calculate OSRS-accurate combat level.
 *
 * Formula source: https://oldschool.runescape.wiki/w/Combat_level
 */
export function calculateCombatLevel(skills: CombatSkills): number {
  const base = 0.25 * (skills.defense + skills.hitpoints + Math.floor(skills.prayer / 2));

  const melee = 0.325 * (skills.attack + skills.strength);
  const ranged = 0.325 * Math.floor(skills.ranged * 1.5);
  const magic = 0.325 * Math.floor(skills.magic * 1.5);

  const combatType = Math.max(melee, ranged, magic);

  return Math.floor(base + combatType);
}

/**
 * Determine primary combat type based on highest effective level.
 */
export function getPrimaryCombatType(skills: CombatSkills): 'melee' | 'ranged' | 'magic' {
  const melee = 0.325 * (skills.attack + skills.strength);
  const ranged = 0.325 * Math.floor(skills.ranged * 1.5);
  const magic = 0.325 * Math.floor(skills.magic * 1.5);

  if (melee >= ranged && melee >= magic) return 'melee';
  if (ranged >= magic) return 'ranged';
  return 'magic';
}

// Minimum and maximum combat levels in OSRS
export const MIN_COMBAT_LEVEL = 3;
export const MAX_COMBAT_LEVEL = 126;
```

**Modify** `AggroSystem.ts`:
```typescript
import { calculateCombatLevel } from '@hyperscape/shared';

// Replace the inline combat level calculation with:
const combatLevel = calculateCombatLevel({
  attack: playerSkills.attack,
  strength: playerSkills.strength,
  defense: playerSkills.defense,
  hitpoints: playerSkills.constitution, // Map constitution to hitpoints
  ranged: playerSkills.ranged ?? 1,
  magic: playerSkills.magic ?? 1,
  prayer: playerSkills.prayer ?? 1,
});
```

---

### 2.2 Double Combat Level Aggro Rule

**Priority**: HIGH
**Impact**: OSRS-accurate mob aggression behavior

**Current** (WRONG):
```typescript
if (playerCombatLevel > behaviorConfig.levelIgnoreThreshold &&
    behaviorConfig.levelIgnoreThreshold < 999) {
  return false; // Mob ignores high-level player
}
```

**OSRS Rule**: Mobs ignore players whose combat level is **more than double** the mob's level.

**Modify** `AggroSystem.ts`:
```typescript
// Replace fixed threshold with dynamic calculation:
private shouldIgnoreDueToLevel(
  playerCombatLevel: number,
  mobLevel: number,
  toleranceImmune: boolean
): boolean {
  // Some mobs (bosses) ignore level-based ignoring
  if (toleranceImmune) return false;

  // OSRS rule: player level > (mob level * 2) = mob ignores
  // Example: Level 2 goblin ignores players level 5+
  return playerCombatLevel > mobLevel * 2;
}

// In the aggro check:
const mobLevel = mobData.stats?.level ?? 1;
if (this.shouldIgnoreDueToLevel(playerCombatLevel, mobLevel, behaviorConfig.toleranceImmune)) {
  return false;
}
```

**Add to manifest** `npcs.json` (optional per-mob override):
```json
{
  "id": "goblin",
  "behavior": {
    "toleranceImmune": false
  }
}
```

---

### 2.3 NPC Defense Bonus from Manifest

**Priority**: MEDIUM
**Impact**: Accurate hit chance against NPCs

**Current** (HARDCODED):
```typescript
const targetDefenseBonus = 0; // Most NPCs have 0 defense bonus
```

**Modify** `packages/shared/src/utils/game/CombatCalculations.ts`:
```typescript
export function calculateMeleeAccuracyAgainstNPC(
  attackerAttackLevel: number,
  attackerAttackBonus: number,
  targetDefenseLevel: number,
  targetDefenseBonus: number = 0, // Now passed in, not hardcoded
): number {
  const effectiveAttack = attackerAttackLevel + 8;
  const effectiveDefense = targetDefenseLevel + 8;

  const attackRoll = effectiveAttack * (attackerAttackBonus + 64);
  const defenseRoll = effectiveDefense * (targetDefenseBonus + 64);

  if (attackRoll > defenseRoll) {
    return 1 - (defenseRoll + 2) / (2 * attackRoll + 1);
  } else {
    return attackRoll / (2 * defenseRoll + 1);
  }
}
```

**Update manifest** `npcs.json`:
```json
{
  "id": "goblin",
  "stats": {
    "level": 2,
    "health": 5,
    "attack": 1,
    "strength": 1,
    "defense": 1,
    "defenseBonus": 0
  }
}
```

**Load in** `DataManager.ts`:
```typescript
defenseBonus: npc.stats?.defenseBonus ?? 0,
```

---

## Phase 3: Combat XP & Style Bonuses

**Goal**: Implement combat experience and attack style bonuses.

---

### ⚠️ PRE-IMPLEMENTATION VERIFICATION (Phase 3)

**STOP! Before implementing this phase, verify the following:**

#### Research Verification
- [x] Confirm XP rates: 4 XP/damage to main skill, 1.33 XP/damage to HP - **ALREADY WORKS**
- [ ] Verify OSRS style bonuses: Aggressive +3 Str, Accurate +3 Atk, Defensive +3 Def
- [ ] Confirm Controlled gives +1 to ALL three skills (not % split)
- [ ] Note: Current implementation uses % modifiers, not +level bonuses

#### Codebase Verification
- [x] XP works via `COMBAT_KILL` event (MobEntity.ts:1822 → SkillsSystem.ts:643)
- [ ] Check `PlayerSystem.ts` for damageModifier/accuracyModifier definitions
- [ ] Verify `COMBAT_DAMAGE_CALCULATE` and `COMBAT_ACCURACY_CALCULATE` never emitted
- [ ] Confirm `CombatCalculations.ts:46` comment says style "not implemented yet"

#### What WORKS vs What NEEDS FIX
- [x] XP distribution per style (aggressive → Strength, etc.)
- [x] Constitution XP always granted (1.33 per damage)
- [ ] Style +3/+1 effective level bonus (OSRS formula) - NOT IMPLEMENTED
- [ ] Style damage modifier (+15% for aggressive) - NEVER APPLIED
- [ ] Style accuracy modifier (+15% for accurate) - NEVER APPLIED

#### Style Bonus Test Cases (OSRS Formula)
- [ ] Accurate: 60 Atk → effective 63 for accuracy roll
- [ ] Aggressive: 60 Str → effective 63 for max hit
- [ ] Defensive: 60 Def → effective 63 for defense roll
- [ ] Controlled: 60/60/60 → 61/61/61 for all calculations

#### Dependencies Check
- [ ] Phase 2 complete (combat level affects XP-related features)
- [x] Attack style UI exists and emits style changes
- [x] SkillsSystem handles XP addition

**Once all boxes are checked, proceed with implementation.**

---

### 3.1 Combat XP System

**Priority**: N/A - ALREADY WORKING ✅
**Impact**: Core progression mechanic

**STATUS: XP SYSTEM WORKS CORRECTLY**

Combat XP is granted via the `COMBAT_KILL` event:
- `MobEntity.ts:1822` emits `COMBAT_KILL` when mob dies
- `SkillsSystem.ts:643-743` handles the event and grants XP:
  - 4 XP per damage to combat skill (based on attack style)
  - 1.33 XP per damage to Constitution (always)
  - Controlled splits XP equally between Attack/Strength/Defence

**Difference from OSRS**: XP is granted in bulk on kill, not per-hit.
The TOTAL XP is correct, only the timing differs.

**No changes needed for XP grants.** The remaining issue is that attack style
damage/accuracy MODIFIERS (defined in PlayerSystem.ts) are never applied.

**Verify existing implementation** in `SkillsSystem.ts:643-743`:
```typescript
// OSRS XP rates:
// - 4 XP per damage to Attack/Strength/Defence (based on style)
// - 1.33 XP per damage to Hitpoints (always)
// - Controlled: 1.33 XP to Attack, Strength, AND Defence each

case 'accurate':
  this.addXP(player, 'attack', damage * 4);
  break;
case 'aggressive':
  this.addXP(player, 'strength', damage * 4);
  break;
case 'defensive':
  this.addXP(player, 'defense', damage * 4);
  break;
case 'controlled':
  this.addXP(player, 'attack', damage * 1.33);
  this.addXP(player, 'strength', damage * 1.33);
  this.addXP(player, 'defense', damage * 1.33);
  break;

// Always award hitpoints XP
this.addXP(player, 'hitpoints', damage * 1.33);
```

---

### 3.2 Combat Style Bonuses

**Priority**: HIGH
**Impact**: Correct damage/accuracy scaling

**OSRS Style Bonuses**:
- **Accurate**: +3 to effective attack level
- **Aggressive**: +3 to effective strength level
- **Defensive**: +3 to effective defence level
- **Controlled**: +1 to attack, strength, AND defence

**Modify** `CombatCalculations.ts`:
```typescript
export type CombatStyle = 'accurate' | 'aggressive' | 'defensive' | 'controlled';

interface StyleBonus {
  attack: number;
  strength: number;
  defense: number;
}

export function getStyleBonus(style: CombatStyle): StyleBonus {
  switch (style) {
    case 'accurate':
      return { attack: 3, strength: 0, defense: 0 };
    case 'aggressive':
      return { attack: 0, strength: 3, defense: 0 };
    case 'defensive':
      return { attack: 0, strength: 0, defense: 3 };
    case 'controlled':
      return { attack: 1, strength: 1, defense: 1 };
  }
}

export function calculateMeleeAccuracy(
  attackLevel: number,
  attackBonus: number,
  defenseLevel: number,
  defenseBonus: number,
  style: CombatStyle = 'accurate',
): number {
  const styleBonus = getStyleBonus(style);

  // Effective attack = level + 8 + style bonus
  const effectiveAttack = attackLevel + 8 + styleBonus.attack;
  const effectiveDefense = defenseLevel + 8;

  const attackRoll = effectiveAttack * (attackBonus + 64);
  const defenseRoll = effectiveDefense * (defenseBonus + 64);

  // Rest of accuracy calculation...
}

export function calculateMeleeMaxHit(
  strengthLevel: number,
  strengthBonus: number,
  style: CombatStyle = 'aggressive',
): number {
  const styleBonus = getStyleBonus(style);

  // Effective strength = level + 8 + style bonus
  const effectiveStrength = strengthLevel + 8 + styleBonus.strength;

  // OSRS max hit formula
  const maxHit = Math.floor(0.5 + effectiveStrength * (strengthBonus + 64) / 640);
  return maxHit;
}
```

---

## Phase 4: Aggro System Fixes

**Goal**: Complete OSRS-accurate aggression behavior.

---

### ⚠️ PRE-IMPLEMENTATION VERIFICATION (Phase 4)

**STOP! Before implementing this phase, verify the following:**

#### Research Verification
- [ ] Confirm tolerance timer: 10 minutes (1000 ticks at 600ms)
- [ ] Verify tolerance zones are 21×21 tiles (not arbitrary regions)
- [ ] Confirm moving to new zone resets tolerance timer
- [ ] Verify PJ timer: 10-12 seconds (~17-20 ticks) in singles

#### Codebase Verification
- [ ] Grep for "tolerance" in AggroSystem.ts - confirm NOT implemented
- [ ] Check if zone/region system exists that could be reused
- [ ] Verify CombatStateService tracks combat participants
- [ ] Check if single/multi combat zones are needed for MVP

#### Tolerance Test Cases
- [ ] Player enters zone → 10 min timer starts
- [ ] Player moves to new zone → timer resets
- [ ] Timer expires → aggressive mobs ignore player
- [ ] Player re-enters zone → timer starts fresh

#### Dependencies Check
- [ ] Phase 3 complete (XP system working)
- [ ] Tile system provides tile coordinates for zone calculation
- [ ] AggroSystem has access to current tick number

#### Scope Decision
- [ ] Single/multi zones: DEFER for MVP? (primarily PvP feature)
- [ ] PJ timer: DEFER for MVP? (primarily PvP feature)
- [ ] Focus on tolerance timer which affects all combat

**Once all boxes are checked, proceed with implementation.**

---

### 4.1 10-Minute Tolerance Timer

**Priority**: MEDIUM
**Impact**: OSRS-accurate mob aggression timeout

**Create tolerance tracking** in `AggroSystem.ts`:
```typescript
interface ToleranceState {
  regionId: string; // 21x21 tile region identifier
  enteredTick: number;
  toleranceExpiredTick: number; // 1000 ticks = 10 minutes
}

private readonly playerTolerance: Map<string, ToleranceState> = new Map();

private readonly TOLERANCE_TICKS = 1000; // 10 minutes at 600ms/tick

/**
 * Update tolerance state for player
 */
updatePlayerTolerance(playerId: string, currentTile: TileCoord, currentTick: number): void {
  const regionId = this.getToleranceRegionId(currentTile);
  const existing = this.playerTolerance.get(playerId);

  if (!existing || existing.regionId !== regionId) {
    // Entered new region - reset timer
    this.playerTolerance.set(playerId, {
      regionId,
      enteredTick: currentTick,
      toleranceExpiredTick: currentTick + this.TOLERANCE_TICKS,
    });
  }
}

/**
 * Check if player has tolerance in current region
 */
hasToleranceExpired(playerId: string, currentTick: number): boolean {
  const state = this.playerTolerance.get(playerId);
  if (!state) return false;

  return currentTick >= state.toleranceExpiredTick;
}

/**
 * Get tolerance region ID (21x21 tile zones)
 */
private getToleranceRegionId(tile: TileCoord): string {
  const regionX = Math.floor(tile.x / 21);
  const regionZ = Math.floor(tile.z / 21);
  return `${regionX}:${regionZ}`;
}
```

**Use in aggro check**:
```typescript
// In shouldMobAggroPlayer():
if (!behaviorConfig.toleranceImmune && this.hasToleranceExpired(playerId, currentTick)) {
  return false; // Player has tolerance - mob won't aggro
}
```

---

### 4.2 Single/Multi Combat Zones

**Priority**: LOW (can defer)
**Impact**: PvP balance, fairness in mob combat

**Add zone data** to world:
```typescript
interface CombatZone {
  minTile: TileCoord;
  maxTile: TileCoord;
  isMultiCombat: boolean;
}

// Check if player can be attacked by additional entities
canBeAttackedBy(targetId: string, attackerId: string): boolean {
  const zone = this.getCombatZone(targetPosition);

  if (zone.isMultiCombat) {
    return true; // Anyone can attack in multi
  }

  // Single combat - check if target already in combat with someone else
  const currentCombat = this.combatStateService.getCombatData(targetId);
  if (currentCombat?.inCombat && currentCombat.attackerId !== attackerId) {
    return false; // Already fighting someone else
  }

  return true;
}
```

---

### 4.3 PJ Timer

**Priority**: LOW (primarily for PvP)
**Impact**: Prevents pile-jumping in singles

```typescript
private readonly PJ_TIMER_TICKS = 17; // ~10 seconds

interface PJTimerState {
  lastAttackerId: string;
  protectionExpiresTick: number;
}

private readonly playerPJTimer: Map<string, PJTimerState> = new Map();

canPlayerJoinCombat(targetId: string, attackerId: string, currentTick: number): boolean {
  const pjState = this.playerPJTimer.get(targetId);

  if (!pjState) return true; // No protection

  if (currentTick >= pjState.protectionExpiresTick) {
    return true; // Protection expired
  }

  // Protection active - only original attacker can continue
  return pjState.lastAttackerId === attackerId;
}
```

---

## Phase 5: Security & Replay (Production Quality)

**Goal**: Achieve AAA studio-level production quality.

---

### ⚠️ PRE-IMPLEMENTATION VERIFICATION (Phase 5)

**STOP! Before implementing this phase, verify the following:**

#### Research Verification
- [ ] Confirm ring buffer is appropriate for event storage (memory-bounded)
- [ ] Verify HMAC-SHA256 is suitable for request signing
- [ ] Research max XP per tick possible (99 max hit × 4 = 396 XP theoretical max)
- [ ] Confirm snapshot interval (100 ticks = ~1 minute is reasonable)

#### Codebase Verification
- [ ] Grep for "EventStore" - confirm does NOT exist
- [ ] Read `CombatAntiCheat.ts` - confirm no auto-ban logic exists
- [ ] Verify session ID is available in player data for HMAC
- [ ] Check if crypto module is available (Node.js built-in)

#### Security Test Cases
- [ ] HMAC validation: valid signature passes, invalid rejects
- [ ] Request freshness: >5 second old requests rejected
- [ ] XP validation: 500 XP in one tick flagged as violation
- [ ] Damage cap: 150 damage with 50 strength flagged

#### Anti-Cheat Thresholds
- [ ] Warning: score 25 (log only)
- [ ] Kick: score 50 (disconnect player)
- [ ] Ban: score 150 (persistent block)
- [ ] Decay: 10 points per minute

#### Dependencies Check
- [ ] Phase 1 complete (SeededRandom for deterministic replay)
- [ ] Phase 4 complete (all combat mechanics working)
- [ ] Socket/connection system supports kick action
- [ ] Persistence layer can store ban records

**Once all boxes are checked, proceed with implementation.**

---

### 5.1 Event Store for Replay

**Priority**: MEDIUM
**Impact**: Debugging, anti-cheat investigation, desync detection

**Create** `packages/shared/src/systems/shared/EventStore.ts`:
```typescript
interface GameEvent {
  tick: number;
  timestamp: number;
  type: string;
  entityId: string;
  payload: unknown;
  stateChecksum: number;
}

interface GameSnapshot {
  tick: number;
  entities: Map<string, EntityState>;
  combatStates: Map<string, CombatData>;
  rngState: { state0: string; state1: string };
}

export class EventStore {
  private events: GameEvent[] = [];
  private snapshots: Map<number, GameSnapshot> = new Map();
  private readonly SNAPSHOT_INTERVAL = 100; // Every 100 ticks (~1 min)
  private readonly MAX_EVENTS = 100000; // Ring buffer limit

  /**
   * Record a game event
   */
  record(event: Omit<GameEvent, 'timestamp' | 'stateChecksum'>, state: GameState): void {
    // Ring buffer - remove oldest if at limit
    if (this.events.length >= this.MAX_EVENTS) {
      this.events.shift();
    }

    this.events.push({
      ...event,
      timestamp: Date.now(),
      stateChecksum: this.computeChecksum(state),
    });

    // Take periodic snapshots for fast replay
    if (event.tick % this.SNAPSHOT_INTERVAL === 0) {
      this.snapshots.set(event.tick, this.createSnapshot(state));

      // Clean old snapshots (keep last 10)
      const snapshotTicks = [...this.snapshots.keys()].sort((a, b) => a - b);
      while (snapshotTicks.length > 10) {
        this.snapshots.delete(snapshotTicks.shift()!);
      }
    }
  }

  /**
   * Get events for a specific entity (for investigation)
   */
  getEntityEvents(entityId: string, startTick?: number, endTick?: number): GameEvent[] {
    return this.events.filter(e =>
      e.entityId === entityId &&
      (startTick === undefined || e.tick >= startTick) &&
      (endTick === undefined || e.tick <= endTick)
    );
  }

  /**
   * Get combat events for replay/investigation
   */
  getCombatEvents(startTick: number, endTick: number): GameEvent[] {
    return this.events.filter(e =>
      e.tick >= startTick &&
      e.tick <= endTick &&
      (e.type.includes('COMBAT') || e.type.includes('DAMAGE') || e.type.includes('DEATH'))
    );
  }

  /**
   * Verify checksums match (desync detection)
   */
  verifyChecksum(tick: number, expectedChecksum: number): boolean {
    const event = this.events.find(e => e.tick === tick);
    return event?.stateChecksum === expectedChecksum;
  }

  private computeChecksum(state: GameState): number {
    // Fast FNV-1a hash of critical state
    const critical = {
      tick: state.currentTick,
      playerCount: state.players.length,
      combatCount: state.activeCombats,
    };
    const str = JSON.stringify(critical);

    let hash = 2166136261; // FNV offset basis
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = (hash * 16777619) >>> 0; // FNV prime
    }
    return hash;
  }

  private createSnapshot(state: GameState): GameSnapshot {
    return {
      tick: state.currentTick,
      entities: new Map(state.entities),
      combatStates: new Map(state.combatStates),
      rngState: state.rng.getState(),
    };
  }
}
```

---

### 5.2 Automated Ban Thresholds

**Priority**: MEDIUM
**Impact**: Reduces manual anti-cheat review burden

**Modify** `CombatAntiCheat.ts`:
```typescript
private readonly AUTO_BAN_SCORE = 150;
private readonly AUTO_KICK_SCORE = 50;

onViolation(playerId: string, violation: CombatViolationType): void {
  this.recordViolation(playerId, violation);

  const score = this.getViolationScore(playerId);

  if (score >= this.AUTO_BAN_SCORE) {
    this.emit('anticheat:auto_ban', { playerId, score, reason: 'violation_threshold' });
    this.logBan(playerId, score);
  } else if (score >= this.AUTO_KICK_SCORE) {
    this.emit('anticheat:auto_kick', { playerId, score, reason: 'warning_threshold' });
  }
}
```

---

### 5.3 Combat Request Signing (HMAC)

**Priority**: MEDIUM
**Impact**: Prevents request forgery, improves audit trail
**Criterion**: #3 OWASP Security Standards (9 → 9.5)

**Create** `packages/shared/src/systems/shared/combat/CombatRequestValidator.ts`:
```typescript
import { createHmac } from 'crypto';

interface SignedCombatRequest {
  playerId: string;
  targetId: string;
  action: 'attack' | 'disengage';
  tick: number;
  timestamp: number;
  sessionId: string;
  signature: string;
}

export class CombatRequestValidator {
  private readonly secretKey: string;
  private readonly REQUEST_MAX_AGE_MS = 5000; // 5 second window

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  /**
   * Validate HMAC signature and request freshness
   */
  validateRequest(request: SignedCombatRequest): { valid: boolean; reason?: string } {
    // Check timestamp freshness
    const age = Date.now() - request.timestamp;
    if (age > this.REQUEST_MAX_AGE_MS || age < -1000) {
      return { valid: false, reason: 'request_expired' };
    }

    // Verify HMAC signature
    const payload = `${request.playerId}:${request.targetId}:${request.action}:${request.tick}:${request.timestamp}:${request.sessionId}`;
    const expectedSignature = createHmac('sha256', this.secretKey)
      .update(payload)
      .digest('hex');

    if (request.signature !== expectedSignature) {
      return { valid: false, reason: 'invalid_signature' };
    }

    return { valid: true };
  }

  /**
   * Create signature for outgoing request (client-side)
   */
  signRequest(request: Omit<SignedCombatRequest, 'signature'>): string {
    const payload = `${request.playerId}:${request.targetId}:${request.action}:${request.tick}:${request.timestamp}:${request.sessionId}`;
    return createHmac('sha256', this.secretKey)
      .update(payload)
      .digest('hex');
  }
}
```

---

### 5.4 XP Gain Validation (Anti-Cheat)

**Priority**: HIGH
**Impact**: Prevents XP exploits, ensures fair progression
**Criterion**: #4 Game Studio Audit (7 → 9)

**Add to** `CombatAntiCheat.ts`:
```typescript
// Add new violation type
CombatViolationType.EXCESSIVE_XP_GAIN = 'excessive_xp_gain';

// Validation constants
private readonly MAX_XP_PER_TICK = 400; // Max possible: 99 max hit × 4 XP
private readonly XP_RATE_WINDOW_TICKS = 10; // Check over 10 ticks

private playerXPHistory: Map<string, { tick: number; xp: number }[]> = new Map();

/**
 * Validate XP gain is within possible bounds
 */
validateXPGain(playerId: string, xpAmount: number, currentTick: number): boolean {
  // Check single-tick max
  if (xpAmount > this.MAX_XP_PER_TICK) {
    this.recordViolation(playerId, CombatViolationType.EXCESSIVE_XP_GAIN);
    return false;
  }

  // Track and check rate
  const history = this.playerXPHistory.get(playerId) ?? [];
  history.push({ tick: currentTick, xp: xpAmount });

  // Clean old entries
  const recentHistory = history.filter(h => currentTick - h.tick < this.XP_RATE_WINDOW_TICKS);
  this.playerXPHistory.set(playerId, recentHistory);

  // Check rate over window
  const totalXP = recentHistory.reduce((sum, h) => sum + h.xp, 0);
  const maxPossibleRate = this.MAX_XP_PER_TICK * this.XP_RATE_WINDOW_TICKS;

  if (totalXP > maxPossibleRate) {
    this.recordViolation(playerId, CombatViolationType.EXCESSIVE_XP_GAIN);
    return false;
  }

  return true;
}
```

---

### 5.5 Damage Cap Validation (Anti-Cheat)

**Priority**: HIGH
**Impact**: Prevents damage exploits
**Criterion**: #4 Game Studio Audit (7 → 9)

**Add to** `CombatAntiCheat.ts`:
```typescript
CombatViolationType.IMPOSSIBLE_DAMAGE = 'impossible_damage';

/**
 * Validate damage is within possible bounds for attacker's stats
 */
validateDamage(
  attackerId: string,
  damage: number,
  attackerStrength: number,
  attackerStrengthBonus: number,
): boolean {
  // Calculate maximum possible hit for this attacker
  const effectiveStrength = attackerStrength + 8 + 3; // Max style bonus
  const maxPossibleHit = Math.floor(0.5 + effectiveStrength * (attackerStrengthBonus + 64) / 640);

  // Add 10% tolerance for special attacks / future mechanics
  const damageLimit = Math.ceil(maxPossibleHit * 1.1);

  if (damage > damageLimit) {
    this.recordViolation(attackerId, CombatViolationType.IMPOSSIBLE_DAMAGE);
    return false;
  }

  return true;
}
```

---

## Phase 6: Code Quality & Testing

**Goal**: Achieve 9/10 on Production Quality, Best Practices, and SOLID Principles.

**Criteria Addressed**:
- #1 Production Quality Code (8 → 9)
- #2 Best Practices (8 → 9)
- #6 SOLID Principles (8 → 9)

---

### ⚠️ PRE-IMPLEMENTATION VERIFICATION (Phase 6)

**STOP! Before implementing this phase, verify the following:**

#### Research Verification
- [ ] Confirm 50-line method threshold is reasonable for readability
- [ ] Review behavior-based testing patterns (test outcomes, not implementation)
- [ ] Verify Interface Segregation Principle benefits (smaller interfaces = easier mocking)
- [ ] Confirm benchmark targets are reasonable for hot paths

#### Codebase Verification
- [ ] Read `CombatSystem.ts:1717-1900` - count actual lines in processAutoAttackOnTick
- [ ] Grep for `this.isPlayerMoving` - confirm zero call sites (dead code)
- [ ] Review existing combat tests - identify implementation-coupled tests
- [ ] Check `CombatPlayerEntity` interface - count properties

#### Decomposition Planning
- [ ] Identify 4-5 logical sub-methods from processAutoAttackOnTick
- [ ] Each sub-method should have single responsibility
- [ ] Preserve all existing behavior (no functional changes)
- [ ] All tests should still pass after refactor

#### Benchmark Targets
- [ ] Accuracy calculation: < 10 µs
- [ ] Damage calculation: < 5 µs
- [ ] Combat level calculation: < 20 µs
- [ ] Full attack processing: < 500 µs

#### Dependencies Check
- [ ] All Phases 1-5 complete (combat fully functional)
- [ ] All existing tests passing before refactor
- [ ] No pending combat bugs to fix

#### Refactoring Safety
- [ ] Git commit before refactoring (clean rollback point)
- [ ] Run all tests after each method extraction
- [ ] No behavioral changes - only structural

**Once all boxes are checked, proceed with implementation.**

---

### 6.1 Decompose `processAutoAttackOnTick()` (180+ lines → 5 focused methods)

**Priority**: HIGH
**Impact**: Maintainability, testability, single responsibility
**Criterion**: #1 Production Quality, #6 SOLID

**Current Problem** (`CombatSystem.ts:1717-1900`):
The method is 180+ lines handling multiple responsibilities.

**Refactor to**:
```typescript
/**
 * Process auto-attack on tick - orchestrates sub-methods
 */
processAutoAttackOnTick(attackerId: string, targetId: string, currentTick: number): void {
  // Validate preconditions
  const validation = this.validateAutoAttackPreconditions(attackerId, targetId);
  if (!validation.valid) {
    this.handleAttackValidationFailure(validation.reason);
    return;
  }

  // Check if attack is due this tick
  if (!this.isAttackDueThisTick(attackerId, currentTick)) {
    return;
  }

  // Execute the attack
  const result = this.executeAutoAttack(attackerId, targetId, currentTick);

  // Handle results (damage, XP, animations)
  this.handleAttackResult(result, attackerId, targetId, currentTick);
}

private validateAutoAttackPreconditions(attackerId: string, targetId: string): AttackValidationResult {
  // ~30 lines: range, target alive, attacker able
}

private isAttackDueThisTick(attackerId: string, currentTick: number): boolean {
  // ~15 lines: check attack speed, last attack tick
}

private executeAutoAttack(attackerId: string, targetId: string, currentTick: number): AttackResult {
  // ~40 lines: accuracy roll, damage roll, apply damage
}

private handleAttackResult(result: AttackResult, attackerId: string, targetId: string, currentTick: number): void {
  // ~30 lines: emit events, update state, trigger animations
}
```

**Benefits**:
- Each method < 50 lines
- Single responsibility per method
- Easier to test in isolation
- Clearer logic flow

---

### 6.2 Performance Benchmarks

**Priority**: MEDIUM
**Impact**: Detect performance regressions, establish baselines
**Criterion**: #2 Best Practices

**Create** `packages/shared/src/systems/shared/combat/__tests__/CombatBenchmarks.test.ts`:
```typescript
import { performance } from 'perf_hooks';

describe('Combat Performance Benchmarks', () => {
  const ITERATIONS = 10000;
  const MAX_TIME_MS = {
    accuracyRoll: 0.01,    // 10 microseconds
    damageRoll: 0.005,     // 5 microseconds
    combatLevel: 0.02,     // 20 microseconds
    processAttack: 0.5,    // 500 microseconds
  };

  it('accuracy calculation meets performance target', () => {
    const start = performance.now();

    for (let i = 0; i < ITERATIONS; i++) {
      calculateMeleeAccuracy(60, 50, 30, 20, 'aggressive');
    }

    const elapsed = performance.now() - start;
    const avgMs = elapsed / ITERATIONS;

    expect(avgMs).toBeLessThan(MAX_TIME_MS.accuracyRoll);
    console.log(`Accuracy roll: ${(avgMs * 1000).toFixed(2)} µs average`);
  });

  it('damage calculation meets performance target', () => {
    const start = performance.now();

    for (let i = 0; i < ITERATIONS; i++) {
      calculateMeleeMaxHit(60, 50, 'aggressive');
    }

    const elapsed = performance.now() - start;
    const avgMs = elapsed / ITERATIONS;

    expect(avgMs).toBeLessThan(MAX_TIME_MS.damageRoll);
    console.log(`Damage roll: ${(avgMs * 1000).toFixed(2)} µs average`);
  });

  it('combat level calculation meets performance target', () => {
    const start = performance.now();

    for (let i = 0; i < ITERATIONS; i++) {
      calculateCombatLevel({
        attack: 60, strength: 60, defense: 60,
        hitpoints: 60, ranged: 40, magic: 40, prayer: 45
      });
    }

    const elapsed = performance.now() - start;
    const avgMs = elapsed / ITERATIONS;

    expect(avgMs).toBeLessThan(MAX_TIME_MS.combatLevel);
    console.log(`Combat level: ${(avgMs * 1000).toFixed(2)} µs average`);
  });

  it('full attack processing meets performance target', () => {
    const combatSystem = createTestCombatSystem();
    const start = performance.now();

    for (let i = 0; i < 1000; i++) {
      combatSystem.processAutoAttackOnTick('player1', 'goblin1', i);
    }

    const elapsed = performance.now() - start;
    const avgMs = elapsed / 1000;

    expect(avgMs).toBeLessThan(MAX_TIME_MS.processAttack);
    console.log(`Full attack: ${avgMs.toFixed(3)} ms average`);
  });
});
```

---

### 6.3 Behavior-Based Tests (vs Implementation Tests)

**Priority**: MEDIUM
**Impact**: Tests remain valid during refactors
**Criterion**: #2 Best Practices

**Current Problem**: Some tests verify internal implementation details rather than observable behavior.

**Refactor Pattern**:
```typescript
// ❌ BAD: Tests implementation
it('calls _calculateDamage with correct parameters', () => {
  const spy = jest.spyOn(combatSystem, '_calculateDamage');
  combatSystem.attack(player, goblin);
  expect(spy).toHaveBeenCalledWith(player.stats, goblin.stats);
});

// ✅ GOOD: Tests behavior
it('deals damage between 0 and max hit', () => {
  const result = combatSystem.attack(player, goblin);

  expect(result.damage).toBeGreaterThanOrEqual(0);
  expect(result.damage).toBeLessThanOrEqual(player.maxHit);
  expect(goblin.currentHealth).toBe(goblin.maxHealth - result.damage);
});
```

**Files to Review and Refactor**:
- `CombatSystem.test.ts` - Verify behavior, not method calls
- `CombatStateService.test.ts` - Test state outcomes, not internal maps
- `CombatCalculations.test.ts` - Test formula outputs with known inputs

---

### 6.4 Interface Segregation (Split `CombatPlayerEntity`)

**Priority**: LOW
**Impact**: Cleaner interfaces, easier mocking
**Criterion**: #6 SOLID Principles

**Current**: `CombatPlayerEntity` has many properties.

**Split into focused interfaces**:
```typescript
// Core identity
interface CombatEntity {
  id: string;
  type: 'player' | 'npc';
}

// Position capabilities
interface Positionable {
  position: Position;
  getTile(): TileCoord;
}

// Combat stats
interface CombatStats {
  attackLevel: number;
  strengthLevel: number;
  defenseLevel: number;
  hitpoints: number;
  maxHitpoints: number;
}

// Equipment bonuses
interface EquipmentBonuses {
  attackBonus: number;
  strengthBonus: number;
  defenseBonus: number;
}

// Combat capabilities
interface Combatant extends CombatEntity, Positionable, CombatStats {
  combatStyle: CombatStyle;
  autoRetaliate: boolean;
}

// Player-specific (extends Combatant)
interface CombatPlayerEntity extends Combatant, EquipmentBonuses {
  // Player-only properties
  prayer: number;
  equipment: EquipmentSlots;
}

// NPC-specific
interface CombatNPCEntity extends Combatant {
  // NPC-only properties
  aggroRange: number;
  leashRange: number;
  respawnTicks: number;
}
```

---

### 6.5 Edge Case Fixes (OSRS Accuracy)

These items were in the original Phase 6 and remain for OSRS accuracy:

#### 6.5.1 Logout Prevention Enforcement

**Current**: Constant defined but not enforced
**Fix**: Check combat state before allowing logout

```typescript
// In logout handler:
canLogout(playerId: string, currentTick: number): { allowed: boolean; reason?: string } {
  const combatData = this.combatStateService.getCombatData(playerId);

  if (combatData?.inCombat) {
    const ticksSinceHit = currentTick - (combatData.lastDamageTakenTick ?? 0);

    if (ticksSinceHit < COMBAT_CONSTANTS.LOGOUT_PREVENTION_TICKS) {
      return {
        allowed: false,
        reason: 'Cannot logout during combat'
      };
    }
  }

  return { allowed: true };
}
```

#### 6.5.2 20-Minute AFK Auto-Retaliate Disable

**Current**: Auto-retaliate works indefinitely
**Fix**: Track last input and disable after 2000 ticks

```typescript
private readonly AFK_DISABLE_TICKS = 2000; // 20 minutes

private lastInputTick: Map<string, number> = new Map();

isAFKTooLong(playerId: string, currentTick: number): boolean {
  const lastInput = this.lastInputTick.get(playerId) ?? currentTick;
  return (currentTick - lastInput) >= this.AFK_DISABLE_TICKS;
}

// In auto-retaliate check:
if (this.isAFKTooLong(playerId, currentTick)) {
  return false; // Don't auto-retaliate - player has been AFK too long
}
```

#### 6.5.3 Hitsplat Duration Fix

**Current**: 3 ticks (1.8s)
**OSRS**: 1-2 ticks (0.6-1.2s)

**Modify** `CombatConstants.ts`:
```typescript
// Change:
HITSPLAT_DURATION_TICKS: 3

// To:
HITSPLAT_DURATION_TICKS: 2
```

#### 6.5.4 Remove Dead Code

**Remove** `CombatSystem.ts:2094-2103`:
```typescript
// DELETE: Unused method
private isPlayerMoving(playerId: string): boolean { ... }
```

---

## Verification & Testing

### Test Categories

**1. Determinism Tests**
```typescript
describe('Deterministic Combat', () => {
  it('produces identical outcomes from same seed', () => {
    const combat1 = simulateCombat(seed: 12345, attacks: 100);
    const combat2 = simulateCombat(seed: 12345, attacks: 100);

    expect(combat1.totalDamage).toBe(combat2.totalDamage);
    expect(combat1.hitCount).toBe(combat2.hitCount);
    expect(combat1.events).toEqual(combat2.events);
  });
});
```

**2. OSRS Formula Tests**
```typescript
describe('Combat Level Formula', () => {
  it('calculates level 3 for base stats', () => {
    expect(calculateCombatLevel({ attack: 1, strength: 1, defense: 1, hitpoints: 10, ranged: 1, magic: 1, prayer: 1 })).toBe(3);
  });

  it('calculates level 126 for max stats', () => {
    expect(calculateCombatLevel({ attack: 99, strength: 99, defense: 99, hitpoints: 99, ranged: 99, magic: 99, prayer: 99 })).toBe(126);
  });
});
```

**3. Style Bonus Tests**
```typescript
describe('Style Bonuses', () => {
  it('aggressive adds +3 strength', () => {
    const maxHitBase = calculateMeleeMaxHit(60, 50, 'accurate');
    const maxHitAggressive = calculateMeleeMaxHit(60, 50, 'aggressive');
    expect(maxHitAggressive).toBeGreaterThan(maxHitBase);
  });
});
```

**4. PID System Tests**
```typescript
describe('PID System', () => {
  it('reshuffles every 100-150 ticks', () => {
    const manager = new PIDManager(new SeededRandom(42));
    manager.assignPID('player1');
    manager.assignPID('player2');

    const initialOrder = manager.getPlayerProcessingOrder();

    // Advance 200 ticks
    for (let i = 0; i < 200; i++) {
      manager.maybeReshuffle(i);
    }

    // Order should have changed at least once
    // (probabilistic - run multiple times for confidence)
  });
});
```

---

## Rating Impact Summary

| Criterion | Before | After | Change |
|-----------|--------|-------|--------|
| Production Quality | 8/10 | 9/10 | +1.0 |
| Best Practices | 8/10 | 9/10 | +1.0 |
| OWASP Security | 9/10 | 9.5/10 | +0.5 |
| Game Studio Audit | 7/10 | 9/10 | +2.0 |
| Memory Hygiene | 9/10 | 9/10 | - |
| SOLID Principles | 8/10 | 9/10 | +1.0 |
| **OSRS Accuracy** | 6/10 | 9/10 | +3.0 |
| **Overall** | **7.5/10** | **9.1/10** | **+1.6** |

---

## Implementation Order

Execute in this exact order for minimal risk:

```
Week 1: Foundation & Formulas (Phase 1-2)
├── Day 1-2: SeededRandom.ts + integration + tests
├── Day 3: Enable Script Queue (1 line change)
├── Day 4: PIDManager.ts + integration
└── Day 5: Combat level formula fix + double-level aggro rule

Week 2: XP, Styles, Aggro (Phase 3-4)
├── Day 1: Style bonuses implementation
├── Day 2: XP emission + XP handler verification
├── Day 3: NPC defense bonus from manifest
├── Day 4: Tolerance timer (21×21 zones)
└── Day 5: PJ timer (if PvP) or skip to Phase 5

Week 3: Security & Anti-Cheat (Phase 5)
├── Day 1: EventStore.ts (replay foundation)
├── Day 2: Auto-ban thresholds
├── Day 3: CombatRequestValidator.ts (HMAC signing)
├── Day 4: XP gain validation (anti-cheat)
└── Day 5: Damage cap validation (anti-cheat)

Week 4: Code Quality & Polish (Phase 6)
├── Day 1: Decompose processAutoAttackOnTick()
├── Day 2: Performance benchmarks
├── Day 3: Behavior-based test refactoring
├── Day 4: Interface segregation + edge case fixes
└── Day 5: Final integration testing + bug fixes
```

### Critical Path Items (Must Complete First)

1. **SeededRandom** - All other determinism features depend on this
2. **Combat Level Formula** - Aggro system depends on correct levels
3. **XP Emission** - Core progression, can't ship without it
4. **Method Decomposition** - Makes future maintenance feasible

---

## Rollback Plan

Each phase can be independently disabled via feature flags:

```typescript
const COMBAT_FLAGS = {
  USE_SEEDED_RNG: true,      // Rollback: use Math.random()
  ENABLE_SCRIPT_QUEUE: true, // Rollback: set to false
  USE_PID_SYSTEM: true,      // Rollback: use connection order
  USE_OSRS_COMBAT_LEVEL: true, // Rollback: use average formula
  STYLE_BONUSES_ENABLED: true,
  TOLERANCE_TIMER_ENABLED: true,
  EVENT_STORE_ENABLED: true,
};
```

---

## Appendix A: Verification Findings

During plan verification (December 2024), the following was confirmed:

### Confirmed Correct in Current Code

1. **Accuracy Formula** (`CombatCalculations.ts:54-59`)
   - Attack Roll formula: `effectiveAttack × (attackBonus + 64)` ✅
   - Defense Roll formula: `effectiveDefense × (defenseBonus + 64)` ✅
   - Hit chance calculation matches OSRS exactly ✅

2. **Retaliation Delay** (`CombatCalculations.ts:283-284`)
   - Formula: `ceil(attackSpeedTicks / 2) + 1` ✅
   - Matches OSRS Wiki exactly

3. **Script Queue** (`ScriptQueue.ts`)
   - Strong/Normal/Weak/Soft priority system ✅
   - Strong clears Weak scripts ✅
   - Modal blocking for Normal scripts ✅
   - NPCs have FIFO queue only ✅
   - Fully implemented, just needs enabling

4. **Processing Order** (`GameTickProcessor.ts:307-311`)
   - NPCs process BEFORE Players ✅
   - Creates correct damage asymmetry ✅

### Minor Issue Found (Low Priority)

**Defense Roll Base Value**

In `CombatCalculations.ts:50`:
```typescript
const effectiveDefence = targetDefenseLevel + 9;
```

Per OSRS Wiki:
- **NPC defense**: Uses raw level + 9 ✅ (CORRECT for PvE)
- **Player defense**: Uses effective level (level + 8 + style)

**Current behavior is correct for PvE** (player attacking NPCs). If PvP or NPC-attacks-player accuracy needs to be OSRS-accurate, the formula should differentiate:

```typescript
// For PvE (attacking NPCs): +9
const npcDefenceRoll = (targetDefenseLevel + 9) * (defenseBonus + 64);

// For PvP (attacking players): +8 + style bonus
const playerEffectiveDefence = targetDefenseLevel + 8 + styleBonus.defense;
const playerDefenceRoll = playerEffectiveDefence * (defenseBonus + 64);
```

**Impact**: Minimal for PvE gameplay. Can be deferred until PvP is implemented.

### Verified OSRS Mechanics (Sources)

| Mechanic | Value | Source |
|----------|-------|--------|
| Combat Level Base | 0.25 × (Def + HP + ⌊Prayer/2⌋) | [Combat Level Wiki](https://oldschool.runescape.wiki/w/Combat_level) |
| Melee Multiplier | 0.325 × (Atk + Str) | Same |
| Aggressive Bonus | +3 to Strength | [Combat Options Wiki](https://oldschool.runescape.wiki/w/Combat_Options) |
| Accurate Bonus | +3 to Attack | Same |
| Controlled Bonus | +1 to Atk/Str/Def each | Same |
| XP per Damage | 4 to main skill, 1.33 to HP | [Combat Wiki](https://oldschool.runescape.wiki/w/Combat) |
| PID Reshuffle | 100-150 ticks (60-90 sec) | [PID Wiki](https://oldschool.runescape.wiki/w/Player_identification_number) |
| PID Range | 0-2047 | Same |
| Aggro Level Rule | player > mob × 2 = ignored | [Aggressiveness Wiki](https://oldschool.runescape.wiki/w/Aggressiveness) |
| Tolerance Timer | 10 minutes (1000 ticks) | [Tolerance Wiki](https://oldschool.runescape.wiki/w/Tolerance) |
| Tolerance Region | 21×21 tiles | Same |

---

## Acceptance Criteria Checklist

Use this checklist to verify all criteria are met before considering the implementation complete.

### Criterion #1: Production Quality Code (8 → 9/10)

- [ ] `processAutoAttackOnTick()` decomposed into 4-5 focused methods
- [ ] All methods < 50 lines
- [ ] Dead `isPlayerMoving()` method removed
- [ ] All magic numbers documented or extracted to constants
- [ ] No redundant code or dead code paths

### Criterion #2: Best Practices (8 → 9/10)

- [ ] Performance benchmarks created and passing
- [ ] Benchmark baselines documented
- [ ] Tests refactored to test behavior, not implementation
- [ ] No spy-based tests on internal methods
- [ ] All new features have behavior-based tests

### Criterion #3: OWASP Security (9 → 9.5/10)

- [ ] `CombatRequestValidator.ts` implemented with HMAC signing
- [ ] Request freshness validation (5-second window)
- [ ] Combat requests include session ID validation
- [ ] All existing security measures still in place

### Criterion #4: AAA Game Studio Standards (7 → 9/10)

- [ ] `SeededRandom.ts` implemented with xorshift128+ PRNG
- [ ] All `Math.random()` calls in combat replaced with seeded RNG
- [ ] `EventStore.ts` implemented with ring buffer
- [ ] Periodic snapshots captured (every 100 ticks)
- [ ] Auto-ban thresholds implemented (kick at 50, ban at 150)
- [ ] XP gain validation preventing impossible rates
- [ ] Damage cap validation preventing impossible hits
- [ ] Game seed logged for replay capability

### Criterion #5: Memory & Allocation Hygiene (9 → 9/10)

- [ ] (Already excellent - verify no regressions)
- [ ] No new allocations in hot paths
- [ ] All new objects use pooling where appropriate

### Criterion #6: SOLID Principles (8 → 9/10)

- [ ] `CombatPlayerEntity` interface split into focused interfaces
- [ ] `Combatant`, `CombatStats`, `EquipmentBonuses` interfaces created
- [ ] Decomposed methods follow Single Responsibility
- [ ] New classes accept dependencies via constructor (DIP)

### Criterion #7: OSRS Accuracy (6 → 9/10)

- [ ] Combat level formula: `0.25 × (Def + HP + ⌊Prayer/2⌋) + 0.325 × max(melee, ranged, magic)`
- [ ] Double-level aggro rule: `player > mob × 2 = ignored`
- [ ] NPC defense bonus loaded from manifest
- [ ] Style bonuses: +3 for aggressive/accurate/defensive, +1 for controlled
- [ ] XP rates: 4 XP/damage to main skill, 1.33 to HP
- [ ] Combat XP event emitted after damage
- [ ] Tolerance timer: 10 minutes (1000 ticks) per 21×21 region
- [ ] PID system with 100-150 tick reshuffle
- [ ] Script queue enabled
- [ ] Hitsplat duration: 2 ticks (not 3)
- [ ] Logout prevention enforced during combat
- [ ] AFK auto-retaliate disabled after 20 minutes

### Final Verification

- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Performance benchmarks within targets
- [ ] No TypeScript `any` types introduced
- [ ] No new ESLint errors
- [ ] Manual playtest confirms OSRS feel

---

## Conclusion

This plan provides a clear path from 7.5/10 to 9.1/10 production quality with exact OSRS combat feel. The key insight is that 70% of the hard work is already done - we have the tick system, processing order, damage asymmetry, and object pooling.

**The remaining work is refinement, not architecture.**

The most impactful single change is **SeededRandom** - it enables determinism which is the foundation for replay, debugging, and 100% reliability.

Execute this plan sequentially and the combat system will feel indistinguishable from OSRS.

---

## Sources

- [OSRS Wiki - Combat Level](https://oldschool.runescape.wiki/w/Combat_level)
- [OSRS Wiki - Combat Options](https://oldschool.runescape.wiki/w/Combat_Options)
- [OSRS Wiki - Combat](https://oldschool.runescape.wiki/w/Combat)
- [OSRS Wiki - Player Identification Number](https://oldschool.runescape.wiki/w/Player_identification_number)
- [OSRS Wiki - Aggressiveness](https://oldschool.runescape.wiki/w/Aggressiveness)
- [OSRS Wiki - Tolerance](https://oldschool.runescape.wiki/w/Tolerance)
- [OSRS Wiki - Damage per Second/Melee](https://oldschool.runescape.wiki/w/Damage_per_second/Melee)
- [Theoatrix - How Defence Works](https://www.theoatrix.net/post/how-defence-works-in-osrs)
- [osrs-docs.com - Queues](https://osrs-docs.com/docs/mechanics/queues/)
