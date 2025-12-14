/**
 * Asset Category Definitions
 * Categories match game manifest types and have specific metadata requirements
 */

export type AssetCategory =
  | "npc"
  | "character"
  | "resource"
  | "weapon"
  | "environment"
  | "prop"
  | "building";

export interface CategoryDefinition {
  id: AssetCategory;
  name: string;
  description: string;
  icon: string;
  manifestType: "items" | "npcs" | "resources";
  metadataSchema: CategoryMetadataSchema;
}

export interface CategoryMetadataSchema {
  requiredFields: string[];
  optionalFields: string[];
  defaults: Record<string, unknown>;
}

/**
 * Category definitions with their metadata requirements
 */
export const CATEGORIES: Record<AssetCategory, CategoryDefinition> = {
  npc: {
    id: "npc",
    name: "NPCs & Characters",
    description: "Non-player characters, mobs, bosses, and quest NPCs",
    icon: "👤",
    manifestType: "npcs",
    metadataSchema: {
      requiredFields: [
        "id",
        "name",
        "description",
        "category",
        "level",
        "health",
      ],
      optionalFields: [
        "combatLevel",
        "faction",
        "stats",
        "drops",
        "dialogue",
        "spawnBiomes",
      ],
      defaults: {
        category: "mob",
        level: 1,
        health: 10,
        combatLevel: 1,
        scale: 1.0,
      },
    },
  },
  character: {
    id: "character",
    name: "Player Characters",
    description: "Player avatars and character models",
    icon: "🧙",
    manifestType: "npcs", // Characters use NPC manifest structure
    metadataSchema: {
      requiredFields: ["id", "name", "description"],
      optionalFields: ["scale", "isRigged", "isVRM", "animations"],
      defaults: {
        scale: 1.0,
        isRigged: true,
        isVRM: true,
      },
    },
  },
  resource: {
    id: "resource",
    name: "Resources",
    description: "Harvestable resources like trees, ore, plants",
    icon: "🌳",
    manifestType: "resources",
    metadataSchema: {
      requiredFields: [
        "id",
        "name",
        "type",
        "modelPath",
        "harvestSkill",
        "levelRequired",
      ],
      optionalFields: [
        "depletedModelPath",
        "scale",
        "depletedScale",
        "toolRequired",
        "harvestYield",
      ],
      defaults: {
        scale: 1.0,
        depletedScale: 0.3,
        baseCycleTicks: 4,
        depleteChance: 0.125,
        respawnTicks: 80,
      },
    },
  },
  weapon: {
    id: "weapon",
    name: "Weapons",
    description: "Melee and ranged weapons",
    icon: "⚔️",
    manifestType: "items",
    metadataSchema: {
      requiredFields: [
        "id",
        "name",
        "type",
        "weaponType",
        "attackType",
        "attackSpeed",
      ],
      optionalFields: [
        "equippedModelPath",
        "bonuses",
        "requirements",
        "attackRange",
        "is2h",
      ],
      defaults: {
        type: "weapon",
        attackSpeed: 4,
        attackRange: 1,
        tradeable: true,
        rarity: "common",
      },
    },
  },
  environment: {
    id: "environment",
    name: "Environment",
    description: "Trees, rocks, terrain features",
    icon: "🏔️",
    manifestType: "resources", // Environment uses resource manifest
    metadataSchema: {
      requiredFields: ["id", "name", "type", "modelPath"],
      optionalFields: ["scale", "depletedModelPath", "depletedScale"],
      defaults: {
        type: "environment",
        scale: 1.0,
      },
    },
  },
  prop: {
    id: "prop",
    name: "Props",
    description: "Decorative items and interactive objects",
    icon: "📦",
    manifestType: "items",
    metadataSchema: {
      requiredFields: ["id", "name", "type", "description"],
      optionalFields: ["modelPath", "iconPath", "value", "weight"],
      defaults: {
        type: "prop",
        tradeable: false,
        rarity: "common",
      },
    },
  },
  building: {
    id: "building",
    name: "Building Materials",
    description: "Walls, doors, steps, building components",
    icon: "🏗️",
    manifestType: "items",
    metadataSchema: {
      requiredFields: ["id", "name", "type", "modelPath"],
      optionalFields: ["iconPath", "value", "weight", "description"],
      defaults: {
        type: "building",
        tradeable: false,
        rarity: "common",
      },
    },
  },
};

/**
 * Get category definition by ID
 */
export function getCategory(categoryId: AssetCategory): CategoryDefinition {
  return CATEGORIES[categoryId];
}

/**
 * Get all categories as array
 */
export function getAllCategories(): CategoryDefinition[] {
  return Object.values(CATEGORIES);
}

/**
 * Get categories by manifest type
 */
export function getCategoriesByManifestType(
  manifestType: "items" | "npcs" | "resources",
): CategoryDefinition[] {
  return Object.values(CATEGORIES).filter(
    (cat) => cat.manifestType === manifestType,
  );
}
