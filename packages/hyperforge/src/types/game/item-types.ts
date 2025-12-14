/**
 * Game Item Types
 * Matches packages/shared/src/types/game/item-types.ts
 */

export type ItemRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type WeaponType =
  | "sword"
  | "axe"
  | "mace"
  | "dagger"
  | "spear"
  | "bow"
  | "crossbow"
  | "staff"
  | "wand"
  | "shield"
  | "scimitar"
  | "halberd"
  | "none";

export type ItemType =
  | "weapon"
  | "armor"
  | "food"
  | "resource"
  | "tool"
  | "misc"
  | "currency"
  | "consumable"
  | "ammunition";

export type AttackType = "melee" | "ranged" | "magic";

export interface CombatBonuses {
  attack?: number;
  strength?: number;
  defense?: number;
  ranged?: number;
  magic?: number;
}

export interface ItemRequirements {
  level: number;
  skills: Record<string, number>;
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  description: string;
  examine: string;
  value?: number;
  weight?: number;
  stackable?: boolean;
  tradeable: boolean;
  rarity: ItemRarity;
  modelPath?: string | null;
  equippedModelPath?: string | null;
  iconPath?: string;
  // Weapon-specific
  weaponType?: WeaponType | null;
  attackType?: AttackType | null;
  attackSpeed?: number;
  attackRange?: number;
  is2h?: boolean;
  bonuses?: CombatBonuses;
  requirements?: ItemRequirements;
  // Consumable
  healAmount?: number;
}
