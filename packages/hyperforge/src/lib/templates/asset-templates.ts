/**
 * Asset Templates System
 *
 * Pre-defined templates for creating common asset types and sets.
 * Templates define base stats, scaling, relationships, and generation hints.
 */

import { logger } from "@/lib/utils";
import type { Rarity, EquipSlot, WeaponType, AttackType, ItemType, CombatBonuses, Requirements } from "@/types/core";

const log = logger.child("AssetTemplates");

// =============================================================================
// MATERIAL TIER DEFINITIONS
// =============================================================================

/**
 * Material tier configuration with stat multipliers
 */
export interface MaterialTier {
  id: string;
  name: string;
  level: number;
  statMultiplier: number;
  valueMultiplier: number;
  rarity: Rarity;
  color: string;
  description: string;
}

/**
 * Material tiers with standardized progression
 * Standard MMORPG material hierarchy with balanced scaling
 */
export const MATERIAL_TIERS: Record<string, MaterialTier> = {
  bronze: {
    id: "bronze",
    name: "Bronze",
    level: 1,
    statMultiplier: 1.0,
    valueMultiplier: 1.0,
    rarity: "common",
    color: "#CD7F32",
    description: "Basic bronze alloy, affordable and accessible",
  },
  iron: {
    id: "iron",
    name: "Iron",
    level: 10,
    statMultiplier: 1.5,
    valueMultiplier: 2.0,
    rarity: "common",
    color: "#A19D94",
    description: "Sturdy iron, an improvement over bronze",
  },
  steel: {
    id: "steel",
    name: "Steel",
    level: 20,
    statMultiplier: 2.0,
    valueMultiplier: 4.0,
    rarity: "common",
    color: "#C0C0C0",
    description: "Refined steel, strong and reliable",
  },
  mithril: {
    id: "mithril",
    name: "Mithril",
    level: 30,
    statMultiplier: 3.0,
    valueMultiplier: 10.0,
    rarity: "rare",
    color: "#87CEEB",
    description: "Magical silvery-blue metal, lightweight yet strong",
  },
  adamant: {
    id: "adamant",
    name: "Adamant",
    level: 40,
    statMultiplier: 4.0,
    valueMultiplier: 20.0,
    rarity: "rare",
    color: "#2E8B57",
    description: "Dark green adamantite, exceptionally durable",
  },
  rune: {
    id: "rune",
    name: "Rune",
    level: 50,
    statMultiplier: 5.0,
    valueMultiplier: 50.0,
    rarity: "epic",
    color: "#4169E1",
    description: "Enchanted runite, imbued with magical properties",
  },
  dragon: {
    id: "dragon",
    name: "Dragon",
    level: 60,
    statMultiplier: 7.0,
    valueMultiplier: 100.0,
    rarity: "legendary",
    color: "#DC143C",
    description: "Forged from dragon scales and enchanted ore",
  },
};

export type MaterialTierId = keyof typeof MATERIAL_TIERS;

// =============================================================================
// ITEM TEMPLATES
// =============================================================================

/**
 * Base weapon definition for templates
 */
export interface WeaponTemplate {
  baseId: string;
  baseName: string;
  type: "weapon";
  weaponType: WeaponType;
  attackType: AttackType;
  equipSlot: EquipSlot;
  attackSpeed: number;
  attackRange: number;
  is2h: boolean;
  weight: number;
  description: string;
  baseStats: {
    attack: number;
    strength: number;
    defense: number;
    ranged: number;
  };
}

/**
 * Base armor definition for templates
 */
export interface ArmorTemplate {
  baseId: string;
  baseName: string;
  type: "armor";
  equipSlot: EquipSlot;
  weight: number;
  description: string;
  baseStats: {
    attack: number;
    strength: number;
    defense: number;
    ranged: number;
  };
}

/**
 * Base tool definition for templates
 */
export interface ToolTemplate {
  baseId: string;
  baseName: string;
  type: "tool";
  skill: string;
  equipSlot?: EquipSlot;
  weight: number;
  description: string;
  baseStats: {
    attack: number;
    strength: number;
  };
}

export type ItemTemplate = WeaponTemplate | ArmorTemplate | ToolTemplate;

// =============================================================================
// WEAPON TEMPLATES
// =============================================================================

export const WEAPON_TEMPLATES: Record<string, WeaponTemplate> = {
  sword: {
    baseId: "sword",
    baseName: "Sword",
    type: "weapon",
    weaponType: "sword",
    attackType: "melee",
    equipSlot: "mainhand",
    attackSpeed: 4,
    attackRange: 1,
    is2h: false,
    weight: 2,
    description: "A versatile one-handed sword",
    baseStats: { attack: 4, strength: 3, defense: 0, ranged: 0 },
  },
  longsword: {
    baseId: "longsword",
    baseName: "Longsword",
    type: "weapon",
    weaponType: "sword",
    attackType: "melee",
    equipSlot: "mainhand",
    attackSpeed: 5,
    attackRange: 1,
    is2h: true,
    weight: 3,
    description: "A powerful two-handed sword",
    baseStats: { attack: 6, strength: 5, defense: 0, ranged: 0 },
  },
  axe: {
    baseId: "axe",
    baseName: "Battle Axe",
    type: "weapon",
    weaponType: "axe",
    attackType: "melee",
    equipSlot: "mainhand",
    attackSpeed: 5,
    attackRange: 1,
    is2h: true,
    weight: 4,
    description: "A heavy battle axe",
    baseStats: { attack: 5, strength: 6, defense: 0, ranged: 0 },
  },
  dagger: {
    baseId: "dagger",
    baseName: "Dagger",
    type: "weapon",
    weaponType: "dagger",
    attackType: "melee",
    equipSlot: "mainhand",
    attackSpeed: 3,
    attackRange: 1,
    is2h: false,
    weight: 1,
    description: "A quick and lightweight dagger",
    baseStats: { attack: 2, strength: 2, defense: 0, ranged: 0 },
  },
  mace: {
    baseId: "mace",
    baseName: "Mace",
    type: "weapon",
    weaponType: "mace",
    attackType: "melee",
    equipSlot: "mainhand",
    attackSpeed: 5,
    attackRange: 1,
    is2h: false,
    weight: 3,
    description: "A heavy crushing mace",
    baseStats: { attack: 3, strength: 5, defense: 0, ranged: 0 },
  },
};

// =============================================================================
// ARMOR TEMPLATES
// =============================================================================

export const ARMOR_TEMPLATES: Record<string, ArmorTemplate> = {
  helmet: {
    baseId: "helmet",
    baseName: "Full Helm",
    type: "armor",
    equipSlot: "head",
    weight: 2,
    description: "A protective full helmet",
    baseStats: { attack: 0, strength: 0, defense: 4, ranged: -2 },
  },
  chainbody: {
    baseId: "chainbody",
    baseName: "Chainbody",
    type: "armor",
    equipSlot: "chest",
    weight: 4,
    description: "Chain mail body armor",
    baseStats: { attack: 0, strength: 0, defense: 8, ranged: -5 },
  },
  platebody: {
    baseId: "platebody",
    baseName: "Platebody",
    type: "armor",
    equipSlot: "chest",
    weight: 6,
    description: "Heavy plate body armor",
    baseStats: { attack: 0, strength: 0, defense: 12, ranged: -10 },
  },
  platelegs: {
    baseId: "platelegs",
    baseName: "Platelegs",
    type: "armor",
    equipSlot: "legs",
    weight: 4,
    description: "Heavy plate leg armor",
    baseStats: { attack: 0, strength: 0, defense: 10, ranged: -8 },
  },
  shield: {
    baseId: "shield",
    baseName: "Kiteshield",
    type: "armor",
    equipSlot: "offhand",
    weight: 3,
    description: "A sturdy defensive shield",
    baseStats: { attack: 0, strength: 0, defense: 6, ranged: -3 },
  },
  boots: {
    baseId: "boots",
    baseName: "Boots",
    type: "armor",
    equipSlot: "feet",
    weight: 1,
    description: "Protective metal boots",
    baseStats: { attack: 0, strength: 0, defense: 2, ranged: 0 },
  },
  gloves: {
    baseId: "gloves",
    baseName: "Gauntlets",
    type: "armor",
    equipSlot: "hands",
    weight: 1,
    description: "Protective metal gauntlets",
    baseStats: { attack: 0, strength: 0, defense: 2, ranged: 0 },
  },
};

// =============================================================================
// TOOL TEMPLATES
// =============================================================================

export const TOOL_TEMPLATES: Record<string, ToolTemplate> = {
  pickaxe: {
    baseId: "pickaxe",
    baseName: "Pickaxe",
    type: "tool",
    skill: "mining",
    equipSlot: "mainhand",
    weight: 2,
    description: "A pickaxe for mining ore",
    baseStats: { attack: 4, strength: 2 },
  },
  hatchet: {
    baseId: "hatchet",
    baseName: "Hatchet",
    type: "tool",
    skill: "woodcutting",
    equipSlot: "mainhand",
    weight: 1,
    description: "A hatchet for chopping trees",
    baseStats: { attack: 4, strength: 3 },
  },
};

// =============================================================================
// TIER SET TEMPLATES
// =============================================================================

/**
 * Definition for a complete tier set (sword + shield + armor)
 */
export interface TierSetTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  items: {
    category: "weapon" | "armor" | "tool";
    templateId: string;
  }[];
}

/**
 * Pre-defined tier set templates
 */
export const TIER_SET_TEMPLATES: Record<string, TierSetTemplate> = {
  melee_starter: {
    id: "melee_starter",
    name: "Melee Starter Set",
    description: "Basic melee equipment: sword, shield, and armor",
    icon: "⚔️",
    items: [
      { category: "weapon", templateId: "sword" },
      { category: "armor", templateId: "shield" },
      { category: "armor", templateId: "chainbody" },
    ],
  },
  full_armor: {
    id: "full_armor",
    name: "Full Armor Set",
    description: "Complete armor set: helmet, body, legs, shield, boots, gloves",
    icon: "🛡️",
    items: [
      { category: "armor", templateId: "helmet" },
      { category: "armor", templateId: "platebody" },
      { category: "armor", templateId: "platelegs" },
      { category: "armor", templateId: "shield" },
      { category: "armor", templateId: "boots" },
      { category: "armor", templateId: "gloves" },
    ],
  },
  warrior_kit: {
    id: "warrior_kit",
    name: "Warrior Kit",
    description: "Full warrior set: weapons and complete armor",
    icon: "⚔️🛡️",
    items: [
      { category: "weapon", templateId: "sword" },
      { category: "weapon", templateId: "longsword" },
      { category: "armor", templateId: "helmet" },
      { category: "armor", templateId: "platebody" },
      { category: "armor", templateId: "platelegs" },
      { category: "armor", templateId: "shield" },
      { category: "armor", templateId: "boots" },
      { category: "armor", templateId: "gloves" },
    ],
  },
  mining_tools: {
    id: "mining_tools",
    name: "Mining Tool Set",
    description: "Pickaxes of all tiers for mining",
    icon: "⛏️",
    items: [{ category: "tool", templateId: "pickaxe" }],
  },
  woodcutting_tools: {
    id: "woodcutting_tools",
    name: "Woodcutting Tool Set",
    description: "Hatchets of all tiers for woodcutting",
    icon: "🪓",
    items: [{ category: "tool", templateId: "hatchet" }],
  },
};

// =============================================================================
// MOB TEMPLATES
// =============================================================================

/**
 * Mob template definition
 */
export interface MobTemplate {
  baseId: string;
  baseName: string;
  description: string;
  faction: string;
  aggressive: boolean;
  spawnBiomes: string[];
  baseStats: {
    level: number;
    health: number;
    attack: number;
    strength: number;
    defense: number;
  };
  combat: {
    attackSpeedTicks: number;
    combatRange: number;
    aggroRange: number;
    respawnTicks: number;
  };
}

/**
 * Mob tier for scaling mobs
 */
export interface MobTier {
  suffix: string;
  name: string;
  levelMultiplier: number;
  statMultiplier: number;
}

export const MOB_TIERS: Record<string, MobTier> = {
  weak: {
    suffix: "",
    name: "Normal",
    levelMultiplier: 1.0,
    statMultiplier: 1.0,
  },
  medium: {
    suffix: "_warrior",
    name: "Warrior",
    levelMultiplier: 2.0,
    statMultiplier: 2.5,
  },
  boss: {
    suffix: "_chieftain",
    name: "Chieftain",
    levelMultiplier: 5.0,
    statMultiplier: 10.0,
  },
};

export type MobTierId = keyof typeof MOB_TIERS;

/**
 * Pre-defined mob templates
 */
export const MOB_TEMPLATES: Record<string, MobTemplate> = {
  goblin: {
    baseId: "goblin",
    baseName: "Goblin",
    description: "A small, green-skinned creature with a mischievous nature",
    faction: "monster",
    aggressive: false,
    spawnBiomes: ["forest", "plains", "hills"],
    baseStats: {
      level: 2,
      health: 5,
      attack: 1,
      strength: 1,
      defense: 1,
    },
    combat: {
      attackSpeedTicks: 4,
      combatRange: 1,
      aggroRange: 8,
      respawnTicks: 25,
    },
  },
  skeleton: {
    baseId: "skeleton",
    baseName: "Skeleton",
    description: "An animated skeleton warrior from the undead army",
    faction: "undead",
    aggressive: true,
    spawnBiomes: ["graveyard", "dungeon", "ruins"],
    baseStats: {
      level: 10,
      health: 20,
      attack: 8,
      strength: 6,
      defense: 5,
    },
    combat: {
      attackSpeedTicks: 4,
      combatRange: 1,
      aggroRange: 10,
      respawnTicks: 30,
    },
  },
  orc: {
    baseId: "orc",
    baseName: "Orc",
    description: "A brutish green-skinned warrior with a taste for battle",
    faction: "monster",
    aggressive: true,
    spawnBiomes: ["mountains", "wilderness", "cave"],
    baseStats: {
      level: 15,
      health: 35,
      attack: 12,
      strength: 14,
      defense: 10,
    },
    combat: {
      attackSpeedTicks: 5,
      combatRange: 1,
      aggroRange: 12,
      respawnTicks: 45,
    },
  },
  demon: {
    baseId: "demon",
    baseName: "Demon",
    description: "A fiery creature from the depths of the underworld",
    faction: "demon",
    aggressive: true,
    spawnBiomes: ["volcano", "dungeon", "hell"],
    baseStats: {
      level: 30,
      health: 80,
      attack: 25,
      strength: 28,
      defense: 20,
    },
    combat: {
      attackSpeedTicks: 4,
      combatRange: 2,
      aggroRange: 15,
      respawnTicks: 60,
    },
  },
};

// =============================================================================
// ADDITIONAL MOB TEMPLATES
// =============================================================================

// Add wolf and spider to MOB_TEMPLATES
MOB_TEMPLATES.wolf = {
  baseId: "wolf",
  baseName: "Wolf",
  description: "A fierce predator of the forest with sharp fangs and claws",
  faction: "beast",
  aggressive: true,
  spawnBiomes: ["forest", "plains", "tundra"],
  baseStats: {
    level: 5,
    health: 12,
    attack: 4,
    strength: 3,
    defense: 2,
  },
  combat: {
    attackSpeedTicks: 3,
    combatRange: 1,
    aggroRange: 12,
    respawnTicks: 20,
  },
};

MOB_TEMPLATES.spider = {
  baseId: "spider",
  baseName: "Spider",
  description: "A venomous arachnid lurking in dark corners of the forest",
  faction: "beast",
  aggressive: false,
  spawnBiomes: ["forest", "cave", "dungeon"],
  baseStats: {
    level: 3,
    health: 8,
    attack: 2,
    strength: 2,
    defense: 1,
  },
  combat: {
    attackSpeedTicks: 3,
    combatRange: 1,
    aggroRange: 6,
    respawnTicks: 18,
  },
};

// =============================================================================
// NPC TEMPLATES (Neutral NPCs)
// =============================================================================

/**
 * NPC template definition for neutral NPCs (shopkeepers, bankers, quest givers)
 */
export interface NPCTemplate {
  baseId: string;
  baseName: string;
  description: string;
  category: "neutral";
  faction: string;
  services: string[];
  dialogueType: "shop" | "bank" | "quest" | "generic";
}

/**
 * Pre-defined NPC templates for neutral NPCs
 */
export const NPC_TEMPLATES: Record<string, NPCTemplate> = {
  shopkeeper: {
    baseId: "shopkeeper",
    baseName: "Shopkeeper",
    description: "A friendly merchant who buys and sells goods",
    category: "neutral",
    faction: "town",
    services: ["shop"],
    dialogueType: "shop",
  },
  bank_clerk: {
    baseId: "bank_clerk",
    baseName: "Bank Clerk",
    description: "A helpful bank clerk who manages deposits and withdrawals",
    category: "neutral",
    faction: "town",
    services: ["bank"],
    dialogueType: "bank",
  },
  quest_giver: {
    baseId: "quest_giver",
    baseName: "Quest Giver",
    description: "An adventurer looking for heroes to help with various tasks",
    category: "neutral",
    faction: "town",
    services: ["quest"],
    dialogueType: "quest",
  },
  blacksmith: {
    baseId: "blacksmith",
    baseName: "Blacksmith",
    description: "A skilled craftsman who forges and repairs equipment",
    category: "neutral",
    faction: "town",
    services: ["shop", "repair"],
    dialogueType: "shop",
  },
  guard: {
    baseId: "guard",
    baseName: "Town Guard",
    description: "A vigilant protector of the town and its citizens",
    category: "neutral",
    faction: "town",
    services: [],
    dialogueType: "generic",
  },
};

// =============================================================================
// GENERATED NPC TYPE
// =============================================================================

/**
 * Generated NPC data ready for manifest export
 */
export interface GeneratedNPC {
  id: string;
  name: string;
  description: string;
  category: "neutral";
  faction: string;
  combat: {
    attackable: boolean;
  };
  movement: {
    type: "stationary";
    speed: 0;
    wanderRadius: 0;
  };
  services: {
    enabled: boolean;
    types: string[];
  };
  dialogue: {
    entryNodeId: string;
    nodes: Array<{
      id: string;
      text: string;
      responses?: Array<{
        text: string;
        nextNodeId: string;
        effect?: string;
      }>;
    }>;
  };
  appearance: {
    modelPath: string;
    iconPath: string;
    scale: number;
  };
}

// =============================================================================
// MOB PACK TEMPLATES
// =============================================================================

/**
 * Mob pack definition for creating groups of related mobs
 */
export interface MobPackTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  mobTemplateId: string;
  tiers: MobTierId[];
}

export const MOB_PACK_TEMPLATES: Record<string, MobPackTemplate> = {
  goblin_pack: {
    id: "goblin_pack",
    name: "Goblin Pack",
    description: "Goblin, Goblin Warrior, and Goblin Chieftain",
    icon: "👺",
    mobTemplateId: "goblin",
    tiers: ["weak", "medium", "boss"],
  },
  skeleton_pack: {
    id: "skeleton_pack",
    name: "Skeleton Pack",
    description: "Skeleton, Skeleton Warrior, and Skeleton Chieftain",
    icon: "💀",
    mobTemplateId: "skeleton",
    tiers: ["weak", "medium", "boss"],
  },
  orc_pack: {
    id: "orc_pack",
    name: "Orc Pack",
    description: "Orc, Orc Warrior, and Orc Chieftain",
    icon: "👹",
    mobTemplateId: "orc",
    tiers: ["weak", "medium", "boss"],
  },
  demon_pack: {
    id: "demon_pack",
    name: "Demon Pack",
    description: "Demon, Greater Demon, and Demon Lord",
    icon: "😈",
    mobTemplateId: "demon",
    tiers: ["weak", "medium", "boss"],
  },
  forest_mobs: {
    id: "forest_mobs",
    name: "Forest Mobs",
    description: "Goblin, Wolf, and Spider - common forest creatures",
    icon: "🌲",
    mobTemplateId: "goblin", // Base, but we override with multiple mobs
    tiers: ["weak"],
  },
};

// =============================================================================
// ASSET BUNDLE TEMPLATES (One-Click Creation)
// =============================================================================

/**
 * Asset bundle definition for one-click creation of related assets
 */
export interface AssetBundleTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "weapons" | "armor" | "npcs" | "mobs" | "resources" | "mixed";
  assets: AssetBundleItem[];
}

/**
 * Individual asset within a bundle
 */
export interface AssetBundleItem {
  type: "item" | "npc" | "mob";
  templateType: "weapon" | "armor" | "tool" | "npc" | "mob";
  templateId: string;
  material?: MaterialTierId;
  mobTier?: MobTierId;
  overrides?: Record<string, unknown>;
}

/**
 * Pre-defined asset bundle templates for one-click creation
 */
export const ASSET_BUNDLE_TEMPLATES: Record<string, AssetBundleTemplate> = {
  // Bronze Tier Equipment Set
  bronze_tier: {
    id: "bronze_tier",
    name: "Bronze Tier",
    description: "Complete bronze equipment set: sword, shield, helmet, chainbody",
    icon: "🥉",
    category: "mixed",
    assets: [
      { type: "item", templateType: "weapon", templateId: "sword", material: "bronze" },
      { type: "item", templateType: "armor", templateId: "shield", material: "bronze" },
      { type: "item", templateType: "armor", templateId: "helmet", material: "bronze" },
      { type: "item", templateType: "armor", templateId: "chainbody", material: "bronze" },
    ],
  },

  // Steel Tier Equipment Set
  steel_tier: {
    id: "steel_tier",
    name: "Steel Tier",
    description: "Complete steel equipment set: sword, shield, helmet, chainbody",
    icon: "🥈",
    category: "mixed",
    assets: [
      { type: "item", templateType: "weapon", templateId: "sword", material: "steel" },
      { type: "item", templateType: "armor", templateId: "shield", material: "steel" },
      { type: "item", templateType: "armor", templateId: "helmet", material: "steel" },
      { type: "item", templateType: "armor", templateId: "chainbody", material: "steel" },
    ],
  },

  // Mithril Tier Equipment Set
  mithril_tier: {
    id: "mithril_tier",
    name: "Mithril Tier",
    description: "Complete mithril equipment set: sword, shield, helmet, chainbody",
    icon: "🥇",
    category: "mixed",
    assets: [
      { type: "item", templateType: "weapon", templateId: "sword", material: "mithril" },
      { type: "item", templateType: "armor", templateId: "shield", material: "mithril" },
      { type: "item", templateType: "armor", templateId: "helmet", material: "mithril" },
      { type: "item", templateType: "armor", templateId: "chainbody", material: "mithril" },
    ],
  },

  // Dragon Tier Equipment Set
  dragon_tier: {
    id: "dragon_tier",
    name: "Dragon Tier",
    description: "Complete dragon equipment set: sword, shield, helmet, chainbody",
    icon: "🐉",
    category: "mixed",
    assets: [
      { type: "item", templateType: "weapon", templateId: "sword", material: "dragon" },
      { type: "item", templateType: "armor", templateId: "shield", material: "dragon" },
      { type: "item", templateType: "armor", templateId: "helmet", material: "dragon" },
      { type: "item", templateType: "armor", templateId: "chainbody", material: "dragon" },
    ],
  },

  // Starter NPC Pack
  starter_npc_pack: {
    id: "starter_npc_pack",
    name: "Starter NPC Pack",
    description: "Essential town NPCs: shopkeeper, bank clerk, quest giver",
    icon: "👥",
    category: "npcs",
    assets: [
      { type: "npc", templateType: "npc", templateId: "shopkeeper" },
      { type: "npc", templateType: "npc", templateId: "bank_clerk" },
      { type: "npc", templateType: "npc", templateId: "quest_giver" },
    ],
  },

  // Forest Mobs Pack
  forest_mobs_pack: {
    id: "forest_mobs_pack",
    name: "Forest Mobs",
    description: "Common forest creatures: goblin, wolf, spider",
    icon: "🌲",
    category: "mobs",
    assets: [
      { type: "mob", templateType: "mob", templateId: "goblin", mobTier: "weak" },
      { type: "mob", templateType: "mob", templateId: "wolf", mobTier: "weak" },
      { type: "mob", templateType: "mob", templateId: "spider", mobTier: "weak" },
    ],
  },

  // Undead Horde Pack
  undead_horde_pack: {
    id: "undead_horde_pack",
    name: "Undead Horde",
    description: "Skeletal warriors of all tiers for dungeon encounters",
    icon: "💀",
    category: "mobs",
    assets: [
      { type: "mob", templateType: "mob", templateId: "skeleton", mobTier: "weak" },
      { type: "mob", templateType: "mob", templateId: "skeleton", mobTier: "medium" },
      { type: "mob", templateType: "mob", templateId: "skeleton", mobTier: "boss" },
    ],
  },

  // Town Services Pack
  town_services_pack: {
    id: "town_services_pack",
    name: "Town Services",
    description: "Full town setup: shopkeeper, bank clerk, quest giver, blacksmith, guard",
    icon: "🏘️",
    category: "npcs",
    assets: [
      { type: "npc", templateType: "npc", templateId: "shopkeeper" },
      { type: "npc", templateType: "npc", templateId: "bank_clerk" },
      { type: "npc", templateType: "npc", templateId: "quest_giver" },
      { type: "npc", templateType: "npc", templateId: "blacksmith" },
      { type: "npc", templateType: "npc", templateId: "guard" },
    ],
  },

  // Mining Tools Pack
  mining_tools_pack: {
    id: "mining_tools_pack",
    name: "Mining Tools",
    description: "Complete set of pickaxes: bronze, steel, mithril, dragon",
    icon: "⛏️",
    category: "resources",
    assets: [
      { type: "item", templateType: "tool", templateId: "pickaxe", material: "bronze" },
      { type: "item", templateType: "tool", templateId: "pickaxe", material: "steel" },
      { type: "item", templateType: "tool", templateId: "pickaxe", material: "mithril" },
      { type: "item", templateType: "tool", templateId: "pickaxe", material: "dragon" },
    ],
  },

  // Woodcutting Tools Pack
  woodcutting_tools_pack: {
    id: "woodcutting_tools_pack",
    name: "Woodcutting Tools",
    description: "Complete set of hatchets: bronze, steel, mithril, dragon",
    icon: "🪓",
    category: "resources",
    assets: [
      { type: "item", templateType: "tool", templateId: "hatchet", material: "bronze" },
      { type: "item", templateType: "tool", templateId: "hatchet", material: "steel" },
      { type: "item", templateType: "tool", templateId: "hatchet", material: "mithril" },
      { type: "item", templateType: "tool", templateId: "hatchet", material: "dragon" },
    ],
  },
};

// =============================================================================
// GENERATED ASSET TYPES
// =============================================================================

/**
 * Generated item data ready for manifest export
 */
export interface GeneratedItem {
  id: string;
  name: string;
  type: ItemType;
  description: string;
  examine: string;
  value: number;
  weight: number;
  rarity: Rarity;
  tradeable: boolean;
  equipSlot?: string;
  weaponType?: string;
  attackType?: string;
  attackSpeed?: number;
  attackRange?: number;
  is2h?: boolean;
  bonuses: CombatBonuses;
  requirements: Requirements;
  modelPath: string;
  iconPath: string;
  equippedModelPath?: string;
}

/**
 * Generated mob data ready for manifest export
 */
export interface GeneratedMob {
  id: string;
  name: string;
  description: string;
  category: "mob";
  faction: string;
  stats: {
    level: number;
    health: number;
    attack: number;
    strength: number;
    defense: number;
    ranged: number;
    magic: number;
  };
  combat: {
    attackable: boolean;
    aggressive: boolean;
    retaliates: boolean;
    aggroRange: number;
    combatRange: number;
    attackSpeedTicks: number;
    respawnTicks: number;
  };
  movement: {
    type: "wander" | "stationary";
    speed: number;
    wanderRadius: number;
  };
  drops: {
    always: unknown[];
    common: unknown[];
    uncommon: unknown[];
    rare: unknown[];
    veryRare: unknown[];
  };
  appearance: {
    modelPath: string;
    iconPath: string;
    scale: number;
  };
  spawnBiomes: string[];
}

// =============================================================================
// TEMPLATE RESULT TYPES
// =============================================================================

/**
 * Result of applying a template
 */
export interface TemplateResult {
  items: GeneratedItem[];
  mobs: GeneratedMob[];
  npcs: GeneratedNPC[];
  summary: {
    itemCount: number;
    mobCount: number;
    npcCount: number;
    materials: string[];
  };
}

// =============================================================================
// TEMPLATE FUNCTIONS
// =============================================================================

/**
 * Generate item ID in snake_case format
 */
export function generateItemId(material: string, baseId: string): string {
  return `${material}_${baseId}`.toLowerCase();
}

/**
 * Generate file path in kebab-case format
 */
export function generateFilePath(material: string, baseId: string, extension: string): string {
  const slug = `${baseId}-${material}`.toLowerCase();
  return `asset://models/${slug}/${slug}.${extension}`;
}

/**
 * Create a single item from a template with material tier
 */
export function createItemFromTemplate(
  template: ItemTemplate,
  material: MaterialTierId
): GeneratedItem {
  const tier = MATERIAL_TIERS[material];
  const id = generateItemId(material, template.baseId);
  const name = `${tier.name} ${template.baseName}`;

  const baseValue = template.type === "weapon" ? 100 : template.type === "armor" ? 150 : 50;

  const item: GeneratedItem = {
    id,
    name,
    type: template.type,
    description: `${tier.description}. ${template.description}`,
    examine: `A ${tier.name.toLowerCase()} ${template.baseName.toLowerCase()}`,
    value: Math.round(baseValue * tier.valueMultiplier),
    weight: template.weight,
    rarity: tier.rarity,
    tradeable: true,
    bonuses: {
      attack: Math.round((template.baseStats.attack || 0) * tier.statMultiplier),
      strength: Math.round((template.baseStats.strength || 0) * tier.statMultiplier),
      defense: Math.round(((template.baseStats as { defense?: number }).defense || 0) * tier.statMultiplier),
      ranged: (template.baseStats as { ranged?: number }).ranged || 0,
    },
    requirements: {
      level: tier.level,
      skills: {},
    },
    modelPath: generateFilePath(material, template.baseId, "glb"),
    iconPath: generateFilePath(material, template.baseId, "png").replace(".png", "/concept-art.png"),
  };

  // Add weapon-specific fields
  if (template.type === "weapon") {
    const weaponTemplate = template as WeaponTemplate;
    item.equipSlot = weaponTemplate.equipSlot;
    item.weaponType = weaponTemplate.weaponType.toUpperCase();
    item.attackType = weaponTemplate.attackType.toUpperCase();
    item.attackSpeed = weaponTemplate.attackSpeed;
    item.attackRange = weaponTemplate.attackRange;
    item.is2h = weaponTemplate.is2h;
    item.equippedModelPath = generateFilePath(material, template.baseId, "glb").replace(".glb", "-aligned.glb");
    item.requirements.skills = { attack: tier.level };
  }

  // Add armor-specific fields
  if (template.type === "armor") {
    const armorTemplate = template as ArmorTemplate;
    item.equipSlot = armorTemplate.equipSlot;
    item.requirements.skills = { defense: tier.level };
  }

  // Add tool-specific fields
  if (template.type === "tool") {
    const toolTemplate = template as ToolTemplate;
    item.equipSlot = toolTemplate.equipSlot;
    item.requirements.skills = { [toolTemplate.skill]: tier.level };
  }

  return item;
}

/**
 * Create a mob from a template with tier
 */
export function createMobFromTemplate(
  template: MobTemplate,
  tierId: MobTierId
): GeneratedMob {
  const tier = MOB_TIERS[tierId];
  const id = `${template.baseId}${tier.suffix}`;
  const name = tierId === "weak"
    ? template.baseName
    : `${template.baseName} ${tier.name}`;

  return {
    id,
    name,
    description: template.description,
    category: "mob",
    faction: template.faction,
    stats: {
      level: Math.round(template.baseStats.level * tier.levelMultiplier),
      health: Math.round(template.baseStats.health * tier.statMultiplier),
      attack: Math.round(template.baseStats.attack * tier.statMultiplier),
      strength: Math.round(template.baseStats.strength * tier.statMultiplier),
      defense: Math.round(template.baseStats.defense * tier.statMultiplier),
      ranged: 1,
      magic: 1,
    },
    combat: {
      attackable: true,
      aggressive: template.aggressive,
      retaliates: true,
      aggroRange: template.combat.aggroRange,
      combatRange: template.combat.combatRange,
      attackSpeedTicks: template.combat.attackSpeedTicks,
      respawnTicks: Math.round(template.combat.respawnTicks * tier.levelMultiplier),
    },
    movement: {
      type: "wander",
      speed: 3.33,
      wanderRadius: 10,
    },
    drops: {
      always: [],
      common: [],
      uncommon: [],
      rare: [],
      veryRare: [],
    },
    appearance: {
      modelPath: `asset://models/${id}/${id}.vrm`,
      iconPath: `asset://icons/npcs/${id}.png`,
      scale: tierId === "boss" ? 1.5 : tierId === "medium" ? 1.2 : 1.0,
    },
    spawnBiomes: template.spawnBiomes,
  };
}

/**
 * Apply a tier set template to create items for all specified materials
 */
export function applyTierSetTemplate(
  templateId: string,
  materials: MaterialTierId[]
): TemplateResult {
  const template = TIER_SET_TEMPLATES[templateId];
  if (!template) {
    log.warn("Unknown tier set template", { templateId });
    return { items: [], mobs: [], npcs: [], summary: { itemCount: 0, mobCount: 0, npcCount: 0, materials: [] } };
  }

  const items: GeneratedItem[] = [];

  for (const itemDef of template.items) {
    let itemTemplate: ItemTemplate | undefined;

    if (itemDef.category === "weapon") {
      itemTemplate = WEAPON_TEMPLATES[itemDef.templateId];
    } else if (itemDef.category === "armor") {
      itemTemplate = ARMOR_TEMPLATES[itemDef.templateId];
    } else if (itemDef.category === "tool") {
      itemTemplate = TOOL_TEMPLATES[itemDef.templateId];
    }

    if (!itemTemplate) {
      log.warn("Unknown item template", { templateId: itemDef.templateId, category: itemDef.category });
      continue;
    }

    for (const material of materials) {
      items.push(createItemFromTemplate(itemTemplate, material));
    }
  }

  log.info("Applied tier set template", {
    templateId,
    itemCount: items.length,
    materials,
  });

  return {
    items,
    mobs: [],
    npcs: [],
    summary: {
      itemCount: items.length,
      mobCount: 0,
      npcCount: 0,
      materials,
    },
  };
}

/**
 * Apply a mob pack template to create mobs for all tiers
 */
export function applyMobPackTemplate(templateId: string): TemplateResult {
  const packTemplate = MOB_PACK_TEMPLATES[templateId];
  if (!packTemplate) {
    log.warn("Unknown mob pack template", { templateId });
    return { items: [], mobs: [], npcs: [], summary: { itemCount: 0, mobCount: 0, npcCount: 0, materials: [] } };
  }

  const mobTemplate = MOB_TEMPLATES[packTemplate.mobTemplateId];
  if (!mobTemplate) {
    log.warn("Unknown mob template", { mobTemplateId: packTemplate.mobTemplateId });
    return { items: [], mobs: [], npcs: [], summary: { itemCount: 0, mobCount: 0, npcCount: 0, materials: [] } };
  }

  const mobs: GeneratedMob[] = [];

  for (const tierId of packTemplate.tiers) {
    mobs.push(createMobFromTemplate(mobTemplate, tierId));
  }

  log.info("Applied mob pack template", {
    templateId,
    mobCount: mobs.length,
    tiers: packTemplate.tiers,
  });

  return {
    items: [],
    mobs,
    npcs: [],
    summary: {
      itemCount: 0,
      mobCount: mobs.length,
      npcCount: 0,
      materials: [],
    },
  };
}

/**
 * Create a neutral NPC from a template
 */
export function createNPCFromTemplate(template: NPCTemplate): GeneratedNPC {
  const id = template.baseId;
  
  // Generate appropriate dialogue based on NPC type
  const dialogue = generateNPCDialogue(template.dialogueType, template.baseName);

  return {
    id,
    name: template.baseName,
    description: template.description,
    category: "neutral",
    faction: template.faction,
    combat: {
      attackable: false,
    },
    movement: {
      type: "stationary",
      speed: 0,
      wanderRadius: 0,
    },
    services: {
      enabled: template.services.length > 0,
      types: template.services,
    },
    dialogue,
    appearance: {
      modelPath: `asset://models/${id}/${id}.vrm`,
      iconPath: `asset://icons/npcs/${id}.png`,
      scale: 1.0,
    },
  };
}

/**
 * Generate dialogue tree for an NPC based on their type
 */
function generateNPCDialogue(
  dialogueType: NPCTemplate["dialogueType"],
  npcName: string
): GeneratedNPC["dialogue"] {
  switch (dialogueType) {
    case "shop":
      return {
        entryNodeId: "greeting",
        nodes: [
          {
            id: "greeting",
            text: "Welcome! Can I help you with anything?",
            responses: [
              { text: "Yes, show me what you have.", nextNodeId: "trade", effect: "openStore" },
              { text: "No thanks, just looking.", nextNodeId: "farewell" },
            ],
          },
          {
            id: "trade",
            text: "Here's what I have in stock. Take your time!",
          },
          {
            id: "farewell",
            text: "Come back anytime!",
          },
        ],
      };

    case "bank":
      return {
        entryNodeId: "greeting",
        nodes: [
          {
            id: "greeting",
            text: "Welcome to the bank! How may I assist you?",
            responses: [
              { text: "I'd like to access my bank.", nextNodeId: "open_bank", effect: "openBank" },
              { text: "What services do you offer?", nextNodeId: "services_info" },
              { text: "Goodbye.", nextNodeId: "farewell" },
            ],
          },
          {
            id: "open_bank",
            text: "Of course! Here are your belongings.",
          },
          {
            id: "services_info",
            text: "We offer secure storage for your items. Deposit them to keep them safe, and withdraw whenever you need.",
            responses: [
              { text: "I'd like to access my bank.", nextNodeId: "open_bank", effect: "openBank" },
              { text: "Thanks for the information.", nextNodeId: "farewell" },
            ],
          },
          {
            id: "farewell",
            text: "Take care, adventurer!",
          },
        ],
      };

    case "quest":
      return {
        entryNodeId: "greeting",
        nodes: [
          {
            id: "greeting",
            text: `Greetings, adventurer! I am ${npcName}. I have tasks that need doing.`,
            responses: [
              { text: "What kind of tasks?", nextNodeId: "quest_info" },
              { text: "Show me available quests.", nextNodeId: "quest_list", effect: "openQuests" },
              { text: "Maybe later.", nextNodeId: "farewell" },
            ],
          },
          {
            id: "quest_info",
            text: "There are always troubles that need solving - monsters to slay, items to retrieve, mysteries to uncover.",
            responses: [
              { text: "Show me the quests.", nextNodeId: "quest_list", effect: "openQuests" },
              { text: "I'll think about it.", nextNodeId: "farewell" },
            ],
          },
          {
            id: "quest_list",
            text: "Here are the available tasks. Choose wisely!",
          },
          {
            id: "farewell",
            text: "Return when you're ready for adventure!",
          },
        ],
      };

    default:
      return {
        entryNodeId: "greeting",
        nodes: [
          {
            id: "greeting",
            text: `Hello there, traveler. What brings you to me?`,
            responses: [
              { text: "Just passing through.", nextNodeId: "farewell" },
            ],
          },
          {
            id: "farewell",
            text: "Safe travels!",
          },
        ],
      };
  }
}

/**
 * Apply an asset bundle template to create all assets at once
 */
export function applyAssetBundleTemplate(templateId: string): TemplateResult {
  const bundleTemplate = ASSET_BUNDLE_TEMPLATES[templateId];
  if (!bundleTemplate) {
    log.warn("Unknown asset bundle template", { templateId });
    return { items: [], mobs: [], npcs: [], summary: { itemCount: 0, mobCount: 0, npcCount: 0, materials: [] } };
  }

  const items: GeneratedItem[] = [];
  const mobs: GeneratedMob[] = [];
  const npcs: GeneratedNPC[] = [];
  const materials: string[] = [];

  for (const assetDef of bundleTemplate.assets) {
    if (assetDef.type === "item") {
      // Handle item creation
      let itemTemplate: ItemTemplate | undefined;

      if (assetDef.templateType === "weapon") {
        itemTemplate = WEAPON_TEMPLATES[assetDef.templateId];
      } else if (assetDef.templateType === "armor") {
        itemTemplate = ARMOR_TEMPLATES[assetDef.templateId];
      } else if (assetDef.templateType === "tool") {
        itemTemplate = TOOL_TEMPLATES[assetDef.templateId];
      }

      if (itemTemplate && assetDef.material) {
        items.push(createItemFromTemplate(itemTemplate, assetDef.material));
        if (!materials.includes(assetDef.material)) {
          materials.push(assetDef.material);
        }
      }
    } else if (assetDef.type === "mob") {
      // Handle mob creation
      const mobTemplate = MOB_TEMPLATES[assetDef.templateId];
      if (mobTemplate) {
        const tier = assetDef.mobTier || "weak";
        mobs.push(createMobFromTemplate(mobTemplate, tier));
      }
    } else if (assetDef.type === "npc") {
      // Handle NPC creation
      const npcTemplate = NPC_TEMPLATES[assetDef.templateId];
      if (npcTemplate) {
        npcs.push(createNPCFromTemplate(npcTemplate));
      }
    }
  }

  log.info("Applied asset bundle template", {
    templateId,
    itemCount: items.length,
    mobCount: mobs.length,
    npcCount: npcs.length,
    materials,
  });

  return {
    items,
    mobs,
    npcs,
    summary: {
      itemCount: items.length,
      mobCount: mobs.length,
      npcCount: npcs.length,
      materials,
    },
  };
}

/**
 * Get all available templates categorized by type
 */
export function getAllTemplates(): {
  tierSets: TierSetTemplate[];
  mobPacks: MobPackTemplate[];
  assetBundles: AssetBundleTemplate[];
  weapons: WeaponTemplate[];
  armors: ArmorTemplate[];
  tools: ToolTemplate[];
  mobs: MobTemplate[];
  npcs: NPCTemplate[];
} {
  return {
    tierSets: Object.values(TIER_SET_TEMPLATES),
    mobPacks: Object.values(MOB_PACK_TEMPLATES),
    assetBundles: Object.values(ASSET_BUNDLE_TEMPLATES),
    weapons: Object.values(WEAPON_TEMPLATES),
    armors: Object.values(ARMOR_TEMPLATES),
    tools: Object.values(TOOL_TEMPLATES),
    mobs: Object.values(MOB_TEMPLATES),
    npcs: Object.values(NPC_TEMPLATES),
  };
}

/**
 * Get a specific bundle template by ID
 */
export function getAssetBundleTemplate(templateId: string): AssetBundleTemplate | undefined {
  return ASSET_BUNDLE_TEMPLATES[templateId];
}

/**
 * Get all bundle template IDs
 */
export function getAssetBundleTemplateIds(): string[] {
  return Object.keys(ASSET_BUNDLE_TEMPLATES);
}

log.debug("Asset templates system initialized", {
  tierSetCount: Object.keys(TIER_SET_TEMPLATES).length,
  mobPackCount: Object.keys(MOB_PACK_TEMPLATES).length,
  assetBundleCount: Object.keys(ASSET_BUNDLE_TEMPLATES).length,
  weaponCount: Object.keys(WEAPON_TEMPLATES).length,
  armorCount: Object.keys(ARMOR_TEMPLATES).length,
  toolCount: Object.keys(TOOL_TEMPLATES).length,
  mobCount: Object.keys(MOB_TEMPLATES).length,
  npcCount: Object.keys(NPC_TEMPLATES).length,
});
