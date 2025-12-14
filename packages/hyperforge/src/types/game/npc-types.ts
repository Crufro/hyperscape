/**
 * Game NPC Types
 * Matches packages/shared/src/types/entities/npc-mob-types.ts
 */

import type { DialogueTree } from "./dialogue-types";

export type NPCCategory = "mob" | "boss" | "neutral" | "quest";

export interface NPCStats {
  health: number;
  maxHealth: number;
  attack: number;
  strength: number;
  defense: number;
  magic?: number;
  ranged?: number;
}

export interface NPCCombatConfig {
  enabled: boolean;
  attackType: "melee" | "ranged" | "magic";
  attackSpeed: number;
  attackRange: number;
  canRetreat: boolean;
  aggroRange: number;
}

export interface NPCMovementConfig {
  enabled: boolean;
  speed: number;
  canFly?: boolean;
  canSwim?: boolean;
}

export interface NPCAppearanceConfig {
  modelPath?: string;
  thumbnailPath?: string;
  iconPath?: string;
  scale: number;
  tint?: string;
}

export interface NPCDataInput {
  // Required
  id: string;
  name: string;
  description: string;
  category: NPCCategory;
  // Optional
  faction?: string;
  stats?: Partial<NPCStats>;
  combat?: Partial<NPCCombatConfig>;
  movement?: Partial<NPCMovementConfig>;
  appearance?: Partial<NPCAppearanceConfig>;
  level?: number;
  health?: number;
  combatLevel?: number;
  modelPath?: string;
  thumbnailPath?: string;
  position?: { x: number; y: number; z: number };
  spawnBiomes?: string[];
  dialogue?: DialogueTree;
  drops?: Record<string, unknown>;
  // Generation metadata
  personality?: string;
  backstory?: string;
  services?: string[];
}
