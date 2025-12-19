# OSRS Combat System Discrepancy Report

This document details all identified discrepancies between Hyperscape's combat system and Old School RuneScape (OSRS) mechanics. Generated through comprehensive code review and OSRS Wiki research.

**Date**: December 2024
**Status**: Research Complete - Implementation Pending

---

## Critical Issues (Core Combat Feel)

### 1. Combat XP System - NOT IMPLEMENTED

**OSRS Mechanics**:
- 4 XP per damage dealt to Attack/Strength/Defence (based on combat style)
- 1.33 XP per damage dealt to Hitpoints (always awarded)
- Controlled style: 1.33 XP per damage to Attack, Strength, AND Defence each
- Shared weapons (whip): 1.33 XP per damage to Attack, Strength, and Defence

**Current Implementation**:
- Event `COMBAT_XP_CALCULATE` exists in `event-types.ts:184`
- Handler exists in `PlayerSystem.ts:1573` with XP distribution logic
- **Problem**: The event is NEVER emitted from `CombatSystem.ts` when damage is dealt
- No XP is awarded for combat

**Files**:
- `packages/shared/src/types/events/event-types.ts:184` - Event defined
- `packages/shared/src/systems/shared/character/PlayerSystem.ts:1573-1616` - Handler exists but unused
- `packages/shared/src/systems/shared/combat/CombatSystem.ts` - Missing emit

**Sources**:
- [Combat - OSRS Wiki](https://oldschool.runescape.wiki/w/Combat)

---

### 2. Combat Level Formula - INCORRECT

**OSRS Formula**:
```
Base = 0.25 × (Defence + Hitpoints + floor(Prayer / 2))
Melee = 0.325 × (Attack + Strength)
Ranged = 0.325 × floor(Ranged × 1.5)
Magic = 0.325 × floor(Magic × 1.5)

Combat Level = floor(Base + max(Melee, Ranged, Magic))
```
- Maximum combat level: 126
- Minimum combat level: 3

**Current Implementation** (`AggroSystem.ts:316-328`):
```typescript
const combatLevel = Math.floor(
  (playerSkills.attack + playerSkills.strength +
   playerSkills.defense + playerSkills.constitution) / 4
);
```
This is a simple average of 4 skills - completely wrong formula.

**Impact**:
- Mob aggression calculations are incorrect
- Player combat level display would be wrong
- Any level-based mechanics are broken

**Files**:
- `packages/shared/src/systems/shared/combat/AggroSystem.ts:316-328`

**Sources**:
- [Combat Level - OSRS Wiki](https://oldschool.runescape.wiki/w/Combat_level)
- [Combat Level Calculator - OldSchool.tools](https://oldschool.tools/calculators/combat-level)

---

## High Priority Issues (Gameplay Impact)

### 3. Style Bonuses for Damage/Accuracy - MISSING

**OSRS Mechanics**:
- **Aggressive style**: +3 to effective strength level (more damage)
- **Accurate style**: +3 to effective attack level (more accuracy)
- **Defensive style**: +3 to effective defence level
- **Controlled style**: +1 to attack, strength, AND defence

**Current Implementation** (`CombatCalculations.ts:46-47`):
```typescript
const effectiveAttack = attackerAttackLevel + 8; // +8 is base, +3 would be for style (not implemented yet)
```
- Comment acknowledges it's missing
- No style bonus system exists
- Base +8 is correct but style bonus is not added

**Files**:
- `packages/shared/src/utils/game/CombatCalculations.ts:46-47`
- `packages/shared/src/utils/game/CombatCalculations.ts:107` (strength calculation)

**Sources**:
- [Maximum Melee Hit - OSRS Wiki](https://oldschool.runescape.wiki/w/Maximum_melee_hit)

---

### 4. 10-Minute Aggression Tolerance Timer - NOT IMPLEMENTED

**OSRS Mechanics**:
- After spending 10 minutes in a monster's tolerance region, monsters become passive
- Tolerance regions are 21×21 tile zones (10 tiles in each direction from player)
- Leaving the region and returning resets the timer
- Some monsters (bosses, certain special mobs) ignore tolerance entirely

**Current Implementation**:
- No tolerance timer exists
- Mobs are either always aggressive or always passive based on config
- No region-based aggression tracking

**Files**:
- `packages/shared/src/systems/shared/combat/AggroSystem.ts` - No tolerance logic

**Sources**:
- [Tolerance - OSRS Wiki](https://oldschool.runescape.wiki/w/Tolerance)
- [Aggressiveness - OSRS Wiki](https://oldschool.runescape.wiki/w/Aggressiveness)

---

### 5. Combat Level Aggro Rule - INCORRECT

**OSRS Mechanics**:
- Monsters are NOT aggressive to players whose combat level is **more than double** the monster's level
- Formula: `playerLevel > (mobLevel × 2)` = mob ignores player
- Example: Level 28 hobgoblin ignores players level 57+

**Current Implementation** (`AggroSystem.ts:305-313`):
```typescript
if (playerCombatLevel > behaviorConfig.levelIgnoreThreshold &&
    behaviorConfig.levelIgnoreThreshold < 999) {
  return false;
}
```
- Uses a fixed per-mob-type threshold instead of dynamic calculation
- Doesn't use the "double combat level" rule

**Files**:
- `packages/shared/src/systems/shared/combat/AggroSystem.ts:305-313`

**Sources**:
- [Aggressiveness - OSRS Wiki](https://oldschool.runescape.wiki/w/Aggressiveness)

---

### 6. Single/Multi Combat Zones & PJ Timer - NOT IMPLEMENTED

**OSRS Mechanics**:
- **Single combat zones**: Can only fight one entity at a time
- **Multi-combat zones**: Multiple attackers allowed
- **PJ Timer**: 10-12 second grace period in singles before another player can attack you
- Zones are marked on the minimap with crossed swords icon

**Current Implementation**:
- No single/multi combat zone distinction
- Players can be attacked by multiple mobs simultaneously
- No PJ timer protection

**Impact**:
- Combat feels unfair when swarmed by mobs
- No tactical zone-based combat

**Files**:
- None - Feature doesn't exist

**Sources**:
- [Multicombat Area - OSRS Wiki](https://oldschool.runescape.wiki/w/Multicombat_area)
- [PJ Timer - OSRS Wiki](https://oldschool.runescape.wiki/w/PJ_timer)

---

### 7. Death Mechanics - DIFFERENT FROM OSRS

**OSRS Current Mechanics**:
1. Keep 3 most valuable items (unskulled) or 4 with Protect Item prayer
2. Other items go to **Gravestone** at death location
3. **15 minutes** (real-time, paused when logged out) to return to gravestone
4. After gravestone expires → Items go to **Death's Office**
5. Gravestone fees: Free (<100k), 1k (100k-1M), 10k (1M-10M), 100k (>10M)
6. Death's Office: 5% fee for items over 100k value
7. Items held indefinitely at Death's Office

**Current Implementation** (`PlayerDeathSystem.ts`):
- Safe area: Gravestone 5 minutes → ground items 2 minutes → despawn
- Wilderness: Immediate ground item drop, 2 minutes → despawn
- No item-value-based "keep 3 items" system
- No Death's Office mechanic
- No gravestone fee system
- No Protect Item prayer interaction

**Files**:
- `packages/shared/src/systems/shared/combat/PlayerDeathSystem.ts:882` - 5 minute timer
- `packages/shared/src/systems/shared/combat/PlayerDeathSystem.ts:967` - 2 minute ground items

**Sources**:
- [Death - OSRS Wiki](https://oldschool.runescape.wiki/w/Death)
- [Grave - OSRS Wiki](https://oldschool.runescape.wiki/w/Grave)

---

## Medium Priority Issues (Polish)

### 8. Logout Prevention During Combat - DEFINED BUT NOT ENFORCED

**OSRS Mechanics**:
- 10-second timer prevents logging out after being attacked
- Timer resets on each hit received
- X-logging (force closing client) still logs out after 60 seconds

**Current Implementation**:
```typescript
// CombatConstants.ts:29
LOGOUT_PREVENTION_TICKS: 16, // 9.6s - can't logout after taking damage
```
- Constant defined (close to 10s)
- **Not enforced anywhere** - no logout prevention check found

**Files**:
- `packages/shared/src/constants/CombatConstants.ts:29` - Constant defined
- No enforcement in logout handlers

**Sources**:
- [Logout Button - OSRS Wiki](https://oldschool.runescape.wiki/w/Logout_button)

---

### 9. Health Regeneration - IMPLEMENTED CORRECTLY ✓

**OSRS Mechanics**:
- Regenerate 1 HP every 60 seconds (100 ticks)
- No regen while in combat
- Cooldown after taking damage before regen starts

**Current Implementation** (`HealthRegenSystem.ts`):
```typescript
HEALTH_REGEN_INTERVAL_TICKS: 100, // 60s
HEALTH_REGEN_COOLDOWN_TICKS: 17,  // 10.2s after damage
```
- ✅ Correctly implemented
- ✅ Proper tick-based timing
- ✅ Combat state check
- ✅ Cooldown after damage

**Files**:
- `packages/shared/src/systems/shared/character/HealthRegenSystem.ts` - Full implementation

---

### 10. 20-Minute AFK Auto-Retaliate Disable - NOT IMPLEMENTED

**OSRS Mechanics**:
- After 20 minutes of inactivity, auto-retaliate stops working
- Player must click to re-engage
- Introduced to combat AFK splashing/training

**Current Implementation**:
- No 20-minute idle check
- Auto-retaliate works indefinitely without player input

**Impact**: Allows infinite AFK combat training

**Files**:
- `packages/shared/src/systems/shared/combat/CombatSystem.ts` - No idle timeout

**Sources**:
- [Idle - OSRS Wiki](https://oldschool.runescape.wiki/w/Idle)

---

### 11. NPC Defense Bonus - HARDCODED TO ZERO

**OSRS Mechanics**:
- NPCs have defense bonuses based on their equipment/type
- Many monsters have significant defense bonuses
- Affects accuracy calculations

**Current Implementation** (`CombatCalculations.ts:135`):
```typescript
const targetDefenseBonus = 0; // Most NPCs have 0 defense bonus
```
- Hardcoded to 0 for all NPCs
- Should come from mob data/config

**Files**:
- `packages/shared/src/utils/game/CombatCalculations.ts:135`

---

### 12. Weapon Switch Attack Speed Inheritance - NOT IMPLEMENTED

**OSRS Mechanics**:
- When switching weapons, the cooldown from the PREVIOUS weapon applies
- Example: Attack with 7-tick halberd, switch to 4-tick whip = wait 7 ticks total
- Critical for PvP weapon switching mechanics

**Current Implementation**:
- Attack cooldown uses current weapon's speed
- No tracking of "weapon at time of attack"

**Files**:
- `packages/shared/src/systems/shared/combat/CombatSystem.ts` - getAttackSpeedTicks()

**Sources**:
- [Attack Speed - OSRS Wiki](https://oldschool.runescape.wiki/w/Attack_speed)

---

### 13. Hitsplat Display Duration - SLIGHTLY LONG

**OSRS Mechanics**:
- Hitsplats display for 1-2 ticks (0.6-1.2 seconds)

**Current Implementation** (`CombatConstants.ts:88`):
```typescript
HITSPLAT_DURATION_TICKS: 3, // 1.8 seconds
```
- 3 ticks is slightly longer than OSRS (1-2 ticks)
- Minor visual difference

**Files**:
- `packages/shared/src/constants/CombatConstants.ts:88`

**Sources**:
- [Hitsplat - OSRS Wiki](https://oldschool.runescape.wiki/w/Hitsplat)

---

## Low Priority Issues (Future/Polish)

### 14. Rapid Attack Style (-1 Tick Speed) - NOT IMPLEMENTED

**OSRS Mechanics**:
- Rapid attack style decreases attack speed by 1 tick
- Available for ranged weapons

**Current Implementation**:
- No attack style system beyond basic types
- Rapid style not implemented

**Impact**: Minor until ranged combat is added

---

### 15. Hit Delay for Projectiles - DEFINED BUT UNUSED

**OSRS Mechanics**:
- Melee: 0 tick delay (instant)
- Ranged: `1 + floor((3 + distance) / 6)` ticks
- Magic: `1 + floor((1 + distance) / 3)` ticks

**Current Implementation** (`CombatConstants.ts:47-64`):
- Formulas are correctly defined
- Currently melee-only, so not actively used
- Ready for when ranged/magic is implemented

**Files**:
- `packages/shared/src/constants/CombatConstants.ts:47-64`

**Sources**:
- [Hit Delay - OSRS Wiki](https://oldschool.runescape.wiki/w/Hit_delay)

---

## Correctly Implemented Features ✓

1. **Tick System**: 600ms ticks correctly implemented
2. **Attack Speed Tiers**: Correct values (3-7 ticks)
3. **Accuracy Formula**: OSRS hit chance formula correct
4. **0 Damage Hits**: Can hit but deal 0 damage (blue splat)
5. **Melee Range**: Cardinal-only for range 1, includes diagonals for range 2+
6. **Retaliation Delay**: `ceil(speed/2) + 1` ticks correctly implemented
7. **Combat Timeout**: 8 ticks (4.8s) after last hit
8. **Health Regeneration**: 1 HP per 100 ticks with combat cooldown
9. **Auto-Retaliate Movement**: Correctly redirects player toward attacker

---

## Implementation Priority

### Phase 1 - Core Combat Feel
1. [ ] Combat XP system (emit events, award XP on damage)
2. [ ] Fix combat level formula
3. [ ] Implement style bonuses (+3 damage/accuracy)

### Phase 2 - Gameplay Balance
4. [ ] 10-minute aggression tolerance timer
5. [ ] Fix combat level aggro rule (double level)
6. [ ] Single/multi combat zones with PJ timer

### Phase 3 - Death System
7. [ ] Keep 3 most valuable items on death
8. [ ] Death's Office mechanic
9. [ ] Proper gravestone fees

### Phase 4 - Polish
10. [ ] Logout prevention enforcement
11. [ ] 20-minute AFK auto-retaliate disable
12. [ ] NPC defense bonuses from data
13. [ ] Weapon switch cooldown inheritance
14. [ ] Hitsplat duration adjustment (3 → 2 ticks)

---

---

## Manifest Data Usage Analysis

This section analyzes where manifest data (from `world/assets/manifests/*.json`) should be the source of truth vs where hardcoded values are incorrectly used.

### Manifest Files Overview

| Manifest | Location | Purpose |
|----------|----------|---------|
| `npcs.json` | `packages/server/world/assets/manifests/` | NPC/mob definitions, stats, combat config |
| `items.json` | `packages/server/world/assets/manifests/` | Item definitions, weapon bonuses, requirements |
| `stores.json` | `packages/server/world/assets/manifests/` | Shop inventories |
| `resources.json` | `packages/server/world/assets/manifests/` | Skilling resource nodes |

---

### CORRECTLY Using Manifest Data ✓

#### 1. Attack Speed - CORRECTLY MANIFEST-DRIVEN ✓

**Manifest Definition** (`npcs.json`):
```json
"combat": {
  "attackSpeedTicks": 4
}
```

**Code Usage** (`CombatSystem.ts:1972-1982`):
```typescript
const mobData = mobEntity.getMobData();
const mobAttackSpeedTicks = mobData.attackSpeedTicks;
if (mobAttackSpeedTicks) {
  return mobAttackSpeedTicks;
}
```

**Items Manifest** (`items.json`):
```json
"attackSpeed": 4
```

**Verdict**: ✅ Attack speed correctly reads from manifests for both mobs and player weapons.

---

#### 2. Combat Range - CORRECTLY MANIFEST-DRIVEN ✓

**Manifest Definition** (`npcs.json`):
```json
"combat": {
  "combatRange": 1
}
```

**Code Usage** (`CombatSystem.ts:1998-2002`):
```typescript
if (typeof mobEntity.getCombatRange === "function") {
  return mobEntity.getCombatRange();
}
```

**Verdict**: ✅ Combat range correctly reads from manifest via `MobEntity.getCombatRange()`.

---

#### 3. Aggro Range - CORRECTLY MANIFEST-DRIVEN ✓

**Manifest Definition** (`npcs.json`):
```json
"combat": {
  "aggroRange": 8
}
```

**Code Usage** (`DataManager.ts:310`):
```typescript
aggroRange: npc.combat?.aggroRange ?? 0,
```

**Verdict**: ✅ Aggro range correctly loaded from manifest.

---

#### 4. NPC Stats - CORRECTLY MANIFEST-DRIVEN ✓

**Manifest Definition** (`npcs.json`):
```json
"stats": {
  "level": 2,
  "health": 5,
  "attack": 1,
  "strength": 1,
  "defense": 1,
  "ranged": 1,
  "magic": 1
}
```

**Verdict**: ✅ All NPC stats loaded from manifest via DataManager.

---

#### 5. Weapon Bonuses - CORRECTLY MANIFEST-DRIVEN ✓

**Manifest Definition** (`items.json`):
```json
"bonuses": {
  "attack": 4,
  "strength": 3,
  "defense": 0,
  "ranged": 0
}
```

**Code Usage** (`CombatCalculations.ts:109-110`):
```typescript
const strengthBonus = equipmentStats?.strength || 0;
attackBonus = equipmentStats?.attack || 0;
```

**Verdict**: ✅ Weapon bonuses read from manifest via EquipmentSystem.

---

### INCORRECTLY HARDCODED - Should Use Manifest Data

#### 1. NPC Defense Bonus - HARDCODED TO 0 ❌

**Problem** (`CombatCalculations.ts:135`):
```typescript
const targetDefenseBonus = 0; // Most NPCs have 0 defense bonus
```

**Should Be**:
- NPCs should have defense bonuses in their manifest (like OSRS monsters have)
- Code should read from `npc.stats.defenseBonus` or similar field

**OSRS Reality**:
- Many monsters have significant defense bonuses
- Example: Rune dragon has +230 stab defense, +230 slash defense
- Affects accuracy calculations significantly

**Manifest Change Needed** (`npcs.json`):
```json
"stats": {
  "defenseBonus": {
    "stab": 0,
    "slash": 0,
    "crush": 0,
    "magic": 0,
    "ranged": 0
  }
}
```

**Files to Fix**:
- `packages/server/world/assets/manifests/npcs.json` - Add defense bonuses
- `packages/shared/src/utils/game/CombatCalculations.ts:135` - Read from entity data

---

#### 2. Mob Behavior/Aggro Config - PARTIALLY HARDCODED ❌

**Problem** (`CombatConstants.ts:147-154`):
```typescript
MOB_BEHAVIORS: {
  default: {
    behavior: "passive" as const,
    detectionRange: 5,
    leashRange: 10,
    levelIgnoreThreshold: 0,  // HARDCODED - should come from manifest
  },
} as const,
```

**Current Manifest** (`npcs.json`):
```json
"combat": {
  "aggressive": true  // Only has boolean, not full behavior config
}
```

**Should Be** - Add to manifest:
```json
"behavior": {
  "type": "aggressive",
  "levelIgnoreThreshold": 4,  // 2x mob level (mob level 2 * 2 = 4)
  "leashRange": 10,
  "toleranceImmune": false
}
```

**OSRS Reality**:
- `levelIgnoreThreshold` should be `mobLevel * 2` (dynamic, not fixed)
- Some mobs are tolerance-immune (dark beasts, bosses)
- Leash range varies by mob

**Files to Fix**:
- `packages/server/world/assets/manifests/npcs.json` - Add behavior config
- `packages/shared/src/systems/shared/combat/AggroSystem.ts` - Read from manifest

---

#### 3. Respawn Time - MANIFEST HAS IT BUT CONSTANTS OVERRIDE ⚠️

**Manifest Definition** (`npcs.json`):
```json
"combat": {
  "respawnTicks": 25
}
```

**But Also** (`npcs.ts:174-175`):
```typescript
export const NPC_SPAWN_CONSTANTS = {
  GLOBAL_RESPAWN_TIME: 900000, // 15 minutes per GDD - OVERRIDES MANIFEST
};
```

**Issue**: Constants override manifest values in some code paths.

**OSRS Reality**:
- Each mob type has its own respawn time
- Boss respawns differ from regular mobs
- Should ALWAYS use manifest value

---

#### 4. Combat Level Formula Weights - HARDCODED ❌

**Problem** (`CombatConstants.ts:168-172`):
```typescript
COMBAT_LEVEL_WEIGHTS: {
  DEFENSE_WEIGHT: 0.25,
  OFFENSE_WEIGHT: 0.325,
  RANGED_MULTIPLIER: 1.5,
},
```

**Reality**: These ARE the correct OSRS values and SHOULD be constants (not manifest). However, they're NOT USED - the actual formula in `AggroSystem.ts:321-326` uses a completely wrong calculation.

**Verdict**: Constants are correct, but the code doesn't use them.

---

#### 5. XP Reward - IN MANIFEST BUT NOT USED ❌

**Manifest Definition** (`DataManager.ts:314`):
```typescript
xpReward: npc.combat?.xpReward ?? 0,
```

**Problem**: The `xpReward` field exists in the manifest loading code but:
- Not defined in current `npcs.json`
- Never actually used to award XP on kill
- Combat XP system is not implemented

**Should Add to Manifest**:
```json
"combat": {
  "xpReward": {
    "hitpoints": 4,  // XP per damage
    "combatStyle": 4  // XP per damage to attack/str/def based on style
  }
}
```

---

### Missing Manifest Fields (OSRS-Accurate Data Needed)

These fields should be added to manifests to support OSRS-accurate mechanics:

#### NPCs (`npcs.json`)

```json
{
  "id": "goblin",
  "stats": {
    "level": 2,
    "health": 5,
    "attack": 1,
    "strength": 1,
    "defense": 1,
    "defenseBonus": {        // NEW - for accuracy calc
      "stab": 0,
      "slash": 0,
      "crush": 0,
      "magic": -10,
      "ranged": -10
    },
    "attackBonus": {         // NEW - for NPC accuracy
      "melee": 0,
      "ranged": 0,
      "magic": 0
    },
    "maxHit": 1              // NEW - OSRS mobs have fixed max hits
  },
  "combat": {
    "attackStyles": ["melee"],  // NEW - what attack types mob uses
    "poisonDamage": 0,          // Already exists
    "specialAttack": null       // NEW - for boss mechanics
  },
  "behavior": {
    "type": "aggressive",
    "levelIgnoreThreshold": 4,   // NEW - double mob level
    "toleranceImmune": false,    // NEW - ignores 10-min timer
    "leashRange": 10,
    "wanderReturnsToSpawn": true // NEW - OSRS leash behavior
  }
}
```

#### Items (`items.json`)

```json
{
  "id": "bronze_sword",
  "bonuses": {
    "attackStab": 4,      // NEW - separate attack types
    "attackSlash": 3,
    "attackCrush": 0,
    "attackMagic": 0,
    "attackRanged": 0,
    "defenseStab": 0,     // NEW - defense bonuses for armor
    "defenseSlash": 0,
    "defenseCrush": 0,
    "defenseMagic": 0,
    "defenseRanged": 0,
    "strength": 3,        // Existing - for max hit calc
    "rangedStrength": 0,  // NEW - for ranged max hit
    "magicDamage": 0,     // NEW - % magic damage bonus
    "prayer": 0           // NEW - prayer bonus
  },
  "combatStyles": [        // NEW - available attack styles
    {
      "name": "Chop",
      "type": "slash",
      "style": "accurate",
      "xpType": "attack"
    },
    {
      "name": "Slash",
      "type": "slash",
      "style": "aggressive",
      "xpType": "strength"
    },
    {
      "name": "Block",
      "type": "slash",
      "style": "defensive",
      "xpType": "defense"
    }
  ]
}
```

---

### Summary: Manifest Usage Priority

| Issue | Current State | Priority | Fix Complexity |
|-------|--------------|----------|----------------|
| NPC Defense Bonus | Hardcoded 0 | High | Low - add field, read it |
| Level Ignore Threshold | Hardcoded in constants | High | Medium - calculate dynamically |
| Combat XP Reward | Field exists, unused | Critical | Medium - implement XP system |
| Combat Styles (items) | Not in manifest | Medium | High - new system |
| Attack/Defense Types | Single value | Low | High - restructure bonuses |
| Tolerance Immune Flag | Not in manifest | Medium | Low - add field |
| NPC Max Hit | Not in manifest | Medium | Low - add field |

---

## References

- [OSRS Wiki - Combat](https://oldschool.runescape.wiki/w/Combat)
- [OSRS Wiki - Combat Level](https://oldschool.runescape.wiki/w/Combat_level)
- [OSRS Wiki - Attack Speed](https://oldschool.runescape.wiki/w/Attack_speed)
- [OSRS Wiki - Maximum Melee Hit](https://oldschool.runescape.wiki/w/Maximum_melee_hit)
- [OSRS Wiki - Hit Delay](https://oldschool.runescape.wiki/w/Hit_delay)
- [OSRS Wiki - Death](https://oldschool.runescape.wiki/w/Death)
- [OSRS Wiki - Aggressiveness](https://oldschool.runescape.wiki/w/Aggressiveness)
- [OSRS Wiki - Tolerance](https://oldschool.runescape.wiki/w/Tolerance)
- [OSRS Wiki - PJ Timer](https://oldschool.runescape.wiki/w/PJ_timer)
- [OSRS Wiki - Hitpoints](https://oldschool.runescape.wiki/w/Hitpoints)
- [OSRS Wiki - Idle](https://oldschool.runescape.wiki/w/Idle)
- [OSRS Wiki - Logout Button](https://oldschool.runescape.wiki/w/Logout_button)
- [OSRS Wiki - Hitsplat](https://oldschool.runescape.wiki/w/Hitsplat)
