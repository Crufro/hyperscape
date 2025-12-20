/**
 * Bulk Operations System
 *
 * Functions for creating multiple assets at once with material variants,
 * tier sets, and bulk cloning with modifications.
 */

import { logger } from "@/lib/utils";
import {
  MATERIAL_TIERS,
  WEAPON_TEMPLATES,
  ARMOR_TEMPLATES,
  TOOL_TEMPLATES,
  MOB_TEMPLATES,
  MOB_TIERS,
  createItemFromTemplate,
  createMobFromTemplate,
  generateItemId,
  generateFilePath,
  type MaterialTierId,
  type MaterialTier,
  type MobTierId,
  type GeneratedItem,
  type GeneratedMob,
  type ItemTemplate,
  type WeaponTemplate,
  type ArmorTemplate,
  type ToolTemplate,
} from "@/lib/templates/asset-templates";
import type { Rarity } from "@/types/core";

const log = logger.child("BulkOperations");

// =============================================================================
// TYPES
// =============================================================================

/**
 * Base asset structure that can be cloned and modified
 */
export interface BaseAsset {
  id: string;
  name: string;
  description?: string;
  type?: string;
  value?: number;
  rarity?: Rarity;
  bonuses?: Record<string, number>;
  requirements?: { level?: number; skills?: Record<string, number> };
  modelPath?: string;
  iconPath?: string;
  [key: string]: unknown;
}

/**
 * Modifications to apply when cloning
 */
export interface AssetModifications {
  idPrefix?: string;
  idSuffix?: string;
  namePrefix?: string;
  nameSuffix?: string;
  descriptionAppend?: string;
  valueMultiplier?: number;
  statMultiplier?: number;
  levelOffset?: number;
  rarityOverride?: Rarity;
  modelPathReplace?: { from: string; to: string };
  customFields?: Record<string, unknown>;
}

/**
 * Progress callback for bulk operations
 */
export type BulkProgressCallback = (progress: {
  current: number;
  total: number;
  currentItem: string;
  phase: "preparing" | "generating" | "complete";
}) => void;

/**
 * Result of a bulk operation
 */
export interface BulkOperationResult {
  success: boolean;
  items: GeneratedItem[];
  mobs: GeneratedMob[];
  errors: string[];
  summary: {
    totalCreated: number;
    itemsCreated: number;
    mobsCreated: number;
    materialsUsed: string[];
    duration: number;
  };
}

// =============================================================================
// MATERIAL VARIANT GENERATION
// =============================================================================

/**
 * Create material variants for a base item
 *
 * @param baseItem - The base item to create variants from
 * @param materials - Array of material tiers to create
 * @param onProgress - Optional progress callback
 */
export async function createMaterialVariants(
  baseItem: BaseAsset,
  materials: MaterialTierId[],
  onProgress?: BulkProgressCallback
): Promise<BulkOperationResult> {
  const startTime = Date.now();
  const items: GeneratedItem[] = [];
  const errors: string[] = [];

  log.info("Creating material variants", {
    baseId: baseItem.id,
    materials,
  });

  onProgress?.({
    current: 0,
    total: materials.length,
    currentItem: "Preparing...",
    phase: "preparing",
  });

  // Detect the base item type and find matching template
  const itemType = detectItemType(baseItem);
  const template = findMatchingTemplate(baseItem, itemType);

  if (!template) {
    errors.push(`Could not find matching template for item: ${baseItem.id}`);
    log.warn("No matching template found", { baseId: baseItem.id });
    return {
      success: false,
      items: [],
      mobs: [],
      errors,
      summary: {
        totalCreated: 0,
        itemsCreated: 0,
        mobsCreated: 0,
        materialsUsed: [],
        duration: Date.now() - startTime,
      },
    };
  }

  for (let i = 0; i < materials.length; i++) {
    const material = materials[i];

    onProgress?.({
      current: i + 1,
      total: materials.length,
      currentItem: `${MATERIAL_TIERS[material].name} ${template.baseName}`,
      phase: "generating",
    });

    try {
      const item = createItemFromTemplate(template, material);
      items.push(item);
    } catch (error) {
      const errorMsg = `Failed to create ${material} variant: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);
      log.error("Variant creation failed", { material, error });
    }
  }

  onProgress?.({
    current: materials.length,
    total: materials.length,
    currentItem: "Complete",
    phase: "complete",
  });

  const duration = Date.now() - startTime;

  log.info("Material variants created", {
    count: items.length,
    errors: errors.length,
    duration,
  });

  return {
    success: errors.length === 0,
    items,
    mobs: [],
    errors,
    summary: {
      totalCreated: items.length,
      itemsCreated: items.length,
      mobsCreated: 0,
      materialsUsed: materials,
      duration,
    },
  };
}

/**
 * Create a complete tier set for specified materials
 *
 * @param categories - Item categories to include (weapon, armor, tool)
 * @param materials - Material tiers to create
 * @param onProgress - Optional progress callback
 */
export async function createTierSet(
  categories: ("weapon" | "armor" | "tool")[],
  materials: MaterialTierId[],
  onProgress?: BulkProgressCallback
): Promise<BulkOperationResult> {
  const startTime = Date.now();
  const items: GeneratedItem[] = [];
  const errors: string[] = [];

  // Collect all templates to process
  const templates: { template: ItemTemplate; category: string }[] = [];

  for (const category of categories) {
    if (category === "weapon") {
      for (const template of Object.values(WEAPON_TEMPLATES)) {
        templates.push({ template, category: "weapon" });
      }
    } else if (category === "armor") {
      for (const template of Object.values(ARMOR_TEMPLATES)) {
        templates.push({ template, category: "armor" });
      }
    } else if (category === "tool") {
      for (const template of Object.values(TOOL_TEMPLATES)) {
        templates.push({ template, category: "tool" });
      }
    }
  }

  const totalItems = templates.length * materials.length;

  log.info("Creating tier set", {
    categories,
    materials,
    templateCount: templates.length,
    totalItems,
  });

  onProgress?.({
    current: 0,
    total: totalItems,
    currentItem: "Preparing...",
    phase: "preparing",
  });

  let currentIndex = 0;

  for (const { template } of templates) {
    for (const material of materials) {
      currentIndex++;

      onProgress?.({
        current: currentIndex,
        total: totalItems,
        currentItem: `${MATERIAL_TIERS[material].name} ${template.baseName}`,
        phase: "generating",
      });

      try {
        const item = createItemFromTemplate(template, material);
        items.push(item);
      } catch (error) {
        const errorMsg = `Failed to create ${material} ${template.baseName}: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
        log.error("Tier set item creation failed", { material, template: template.baseId, error });
      }
    }
  }

  onProgress?.({
    current: totalItems,
    total: totalItems,
    currentItem: "Complete",
    phase: "complete",
  });

  const duration = Date.now() - startTime;

  log.info("Tier set created", {
    count: items.length,
    errors: errors.length,
    duration,
  });

  return {
    success: errors.length === 0,
    items,
    mobs: [],
    errors,
    summary: {
      totalCreated: items.length,
      itemsCreated: items.length,
      mobsCreated: 0,
      materialsUsed: materials,
      duration,
    },
  };
}

// =============================================================================
// MOB PACK GENERATION
// =============================================================================

/**
 * Create a mob pack with all tier variants
 *
 * @param mobTemplateId - The base mob template ID
 * @param tiers - Mob tiers to create (weak, medium, boss)
 * @param onProgress - Optional progress callback
 */
export async function createMobPack(
  mobTemplateId: string,
  tiers: MobTierId[],
  onProgress?: BulkProgressCallback
): Promise<BulkOperationResult> {
  const startTime = Date.now();
  const mobs: GeneratedMob[] = [];
  const errors: string[] = [];

  const template = MOB_TEMPLATES[mobTemplateId];
  if (!template) {
    const errorMsg = `Unknown mob template: ${mobTemplateId}`;
    errors.push(errorMsg);
    log.warn(errorMsg);
    return {
      success: false,
      items: [],
      mobs: [],
      errors,
      summary: {
        totalCreated: 0,
        itemsCreated: 0,
        mobsCreated: 0,
        materialsUsed: [],
        duration: Date.now() - startTime,
      },
    };
  }

  log.info("Creating mob pack", {
    mobTemplateId,
    tiers,
  });

  onProgress?.({
    current: 0,
    total: tiers.length,
    currentItem: "Preparing...",
    phase: "preparing",
  });

  for (let i = 0; i < tiers.length; i++) {
    const tierId = tiers[i];
    const tier = MOB_TIERS[tierId];

    onProgress?.({
      current: i + 1,
      total: tiers.length,
      currentItem: tierId === "weak" ? template.baseName : `${template.baseName} ${tier.name}`,
      phase: "generating",
    });

    try {
      const mob = createMobFromTemplate(template, tierId);
      mobs.push(mob);
    } catch (error) {
      const errorMsg = `Failed to create ${tierId} mob: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);
      log.error("Mob creation failed", { tierId, error });
    }
  }

  onProgress?.({
    current: tiers.length,
    total: tiers.length,
    currentItem: "Complete",
    phase: "complete",
  });

  const duration = Date.now() - startTime;

  log.info("Mob pack created", {
    count: mobs.length,
    errors: errors.length,
    duration,
  });

  return {
    success: errors.length === 0,
    items: [],
    mobs,
    errors,
    summary: {
      totalCreated: mobs.length,
      itemsCreated: 0,
      mobsCreated: mobs.length,
      materialsUsed: [],
      duration,
    },
  };
}

// =============================================================================
// CLONE WITH MODIFICATIONS
// =============================================================================

/**
 * Clone an asset with modifications
 *
 * @param asset - The base asset to clone
 * @param modifications - Modifications to apply
 */
export function cloneWithModifications(
  asset: BaseAsset,
  modifications: AssetModifications
): BaseAsset {
  // Start with a deep clone
  const cloned: BaseAsset = JSON.parse(JSON.stringify(asset));

  // Apply ID modifications
  if (modifications.idPrefix) {
    cloned.id = `${modifications.idPrefix}_${cloned.id}`;
  }
  if (modifications.idSuffix) {
    cloned.id = `${cloned.id}_${modifications.idSuffix}`;
  }

  // Apply name modifications
  if (modifications.namePrefix) {
    cloned.name = `${modifications.namePrefix} ${cloned.name}`;
  }
  if (modifications.nameSuffix) {
    cloned.name = `${cloned.name} ${modifications.nameSuffix}`;
  }

  // Apply description modifications
  if (modifications.descriptionAppend && cloned.description) {
    cloned.description = `${cloned.description} ${modifications.descriptionAppend}`;
  }

  // Apply value multiplier
  if (modifications.valueMultiplier && cloned.value) {
    cloned.value = Math.round(cloned.value * modifications.valueMultiplier);
  }

  // Apply stat multiplier to bonuses
  if (modifications.statMultiplier && cloned.bonuses) {
    for (const key of Object.keys(cloned.bonuses)) {
      const value = cloned.bonuses[key];
      if (typeof value === "number") {
        cloned.bonuses[key] = Math.round(value * modifications.statMultiplier);
      }
    }
  }

  // Apply level offset
  if (modifications.levelOffset && cloned.requirements?.level) {
    cloned.requirements.level = Math.max(1, cloned.requirements.level + modifications.levelOffset);
  }

  // Apply rarity override
  if (modifications.rarityOverride) {
    cloned.rarity = modifications.rarityOverride;
  }

  // Apply model path replacement
  if (modifications.modelPathReplace && cloned.modelPath) {
    cloned.modelPath = cloned.modelPath.replace(
      modifications.modelPathReplace.from,
      modifications.modelPathReplace.to
    );
  }
  if (modifications.modelPathReplace && cloned.iconPath) {
    cloned.iconPath = cloned.iconPath.replace(
      modifications.modelPathReplace.from,
      modifications.modelPathReplace.to
    );
  }

  // Apply custom fields
  if (modifications.customFields) {
    Object.assign(cloned, modifications.customFields);
  }

  log.debug("Cloned asset with modifications", {
    originalId: asset.id,
    newId: cloned.id,
    modifications: Object.keys(modifications),
  });

  return cloned;
}

/**
 * Bulk clone multiple assets with the same modifications
 *
 * @param assets - Array of assets to clone
 * @param modifications - Modifications to apply to each
 * @param onProgress - Optional progress callback
 */
export async function bulkCloneWithModifications(
  assets: BaseAsset[],
  modifications: AssetModifications,
  onProgress?: BulkProgressCallback
): Promise<{ cloned: BaseAsset[]; errors: string[] }> {
  const cloned: BaseAsset[] = [];
  const errors: string[] = [];

  onProgress?.({
    current: 0,
    total: assets.length,
    currentItem: "Preparing...",
    phase: "preparing",
  });

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];

    onProgress?.({
      current: i + 1,
      total: assets.length,
      currentItem: asset.name,
      phase: "generating",
    });

    try {
      const clonedAsset = cloneWithModifications(asset, modifications);
      cloned.push(clonedAsset);
    } catch (error) {
      const errorMsg = `Failed to clone ${asset.id}: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);
      log.error("Clone failed", { assetId: asset.id, error });
    }
  }

  onProgress?.({
    current: assets.length,
    total: assets.length,
    currentItem: "Complete",
    phase: "complete",
  });

  log.info("Bulk clone completed", {
    clonedCount: cloned.length,
    errorCount: errors.length,
  });

  return { cloned, errors };
}

// =============================================================================
// BATCH GENERATION
// =============================================================================

/**
 * Create all items for a specific material tier
 *
 * @param material - The material tier to create items for
 * @param categories - Item categories to include
 * @param onProgress - Optional progress callback
 */
export async function createAllForMaterial(
  material: MaterialTierId,
  categories: ("weapon" | "armor" | "tool")[] = ["weapon", "armor", "tool"],
  onProgress?: BulkProgressCallback
): Promise<BulkOperationResult> {
  return createTierSet(categories, [material], onProgress);
}

/**
 * Create all mobs for a specific tier level
 *
 * @param tierId - The mob tier to create
 * @param onProgress - Optional progress callback
 */
export async function createAllMobsForTier(
  tierId: MobTierId,
  onProgress?: BulkProgressCallback
): Promise<BulkOperationResult> {
  const startTime = Date.now();
  const mobs: GeneratedMob[] = [];
  const errors: string[] = [];

  const mobTemplates = Object.entries(MOB_TEMPLATES);

  log.info("Creating all mobs for tier", {
    tierId,
    templateCount: mobTemplates.length,
  });

  onProgress?.({
    current: 0,
    total: mobTemplates.length,
    currentItem: "Preparing...",
    phase: "preparing",
  });

  for (let i = 0; i < mobTemplates.length; i++) {
    const [templateId, template] = mobTemplates[i];
    const tier = MOB_TIERS[tierId];
    const mobName = tierId === "weak" ? template.baseName : `${template.baseName} ${tier.name}`;

    onProgress?.({
      current: i + 1,
      total: mobTemplates.length,
      currentItem: mobName,
      phase: "generating",
    });

    try {
      const mob = createMobFromTemplate(template, tierId);
      mobs.push(mob);
    } catch (error) {
      const errorMsg = `Failed to create ${templateId} ${tierId}: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);
      log.error("Mob creation failed", { templateId, tierId, error });
    }
  }

  onProgress?.({
    current: mobTemplates.length,
    total: mobTemplates.length,
    currentItem: "Complete",
    phase: "complete",
  });

  const duration = Date.now() - startTime;

  log.info("All mobs for tier created", {
    tierId,
    count: mobs.length,
    errors: errors.length,
    duration,
  });

  return {
    success: errors.length === 0,
    items: [],
    mobs,
    errors,
    summary: {
      totalCreated: mobs.length,
      itemsCreated: 0,
      mobsCreated: mobs.length,
      materialsUsed: [],
      duration,
    },
  };
}

// =============================================================================
// BULK DUPLICATE WITH MODIFICATIONS
// =============================================================================

/**
 * Duplicate multiple assets with the same modifications applied to each
 *
 * @param assetIds - Array of asset IDs to duplicate
 * @param modifications - Modifications to apply to each duplicate
 * @param getAsset - Function to retrieve asset by ID
 * @param onProgress - Optional progress callback
 */
export async function duplicateWithModifications(
  assetIds: string[],
  modifications: AssetModifications,
  getAsset: (id: string) => Promise<BaseAsset | null>,
  onProgress?: BulkProgressCallback
): Promise<{ duplicated: BaseAsset[]; errors: string[] }> {
  const duplicated: BaseAsset[] = [];
  const errors: string[] = [];

  log.info("Duplicating assets with modifications", {
    assetCount: assetIds.length,
    modifications: Object.keys(modifications),
  });

  onProgress?.({
    current: 0,
    total: assetIds.length,
    currentItem: "Preparing...",
    phase: "preparing",
  });

  for (let i = 0; i < assetIds.length; i++) {
    const assetId = assetIds[i];

    onProgress?.({
      current: i + 1,
      total: assetIds.length,
      currentItem: assetId,
      phase: "generating",
    });

    try {
      const asset = await getAsset(assetId);
      if (!asset) {
        errors.push(`Asset not found: ${assetId}`);
        continue;
      }

      const clonedAsset = cloneWithModifications(asset, modifications);
      duplicated.push(clonedAsset);
    } catch (error) {
      const errorMsg = `Failed to duplicate ${assetId}: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);
      log.error("Duplicate failed", { assetId, error });
    }
  }

  onProgress?.({
    current: assetIds.length,
    total: assetIds.length,
    currentItem: "Complete",
    phase: "complete",
  });

  log.info("Bulk duplicate completed", {
    duplicatedCount: duplicated.length,
    errorCount: errors.length,
  });

  return { duplicated, errors };
}

// =============================================================================
// BATCH UPDATE FIELD
// =============================================================================

/**
 * Update the same field on multiple assets
 *
 * @param assets - Array of assets to update
 * @param field - The field path to update (supports dot notation like "bonuses.attack")
 * @param value - The new value to set
 * @param onProgress - Optional progress callback
 */
export async function batchUpdateField<T>(
  assets: BaseAsset[],
  field: string,
  value: T,
  onProgress?: BulkProgressCallback
): Promise<{ updated: BaseAsset[]; errors: string[] }> {
  const updated: BaseAsset[] = [];
  const errors: string[] = [];

  log.info("Batch updating field", {
    assetCount: assets.length,
    field,
    value,
  });

  onProgress?.({
    current: 0,
    total: assets.length,
    currentItem: "Preparing...",
    phase: "preparing",
  });

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];

    onProgress?.({
      current: i + 1,
      total: assets.length,
      currentItem: asset.name,
      phase: "generating",
    });

    try {
      // Deep clone the asset
      const cloned: BaseAsset = JSON.parse(JSON.stringify(asset));

      // Set the field value using dot notation support
      setNestedValue(cloned, field, value);
      updated.push(cloned);
    } catch (error) {
      const errorMsg = `Failed to update ${asset.id}: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);
      log.error("Field update failed", { assetId: asset.id, field, error });
    }
  }

  onProgress?.({
    current: assets.length,
    total: assets.length,
    currentItem: "Complete",
    phase: "complete",
  });

  log.info("Batch field update completed", {
    updatedCount: updated.length,
    errorCount: errors.length,
  });

  return { updated, errors };
}

/**
 * Set a nested value using dot notation
 * e.g., setNestedValue(obj, "bonuses.attack", 10)
 */
function setNestedValue<T>(obj: Record<string, unknown>, path: string, value: T): void {
  const parts = path.split(".");
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current[part] === undefined) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}

// =============================================================================
// GENERATE MATERIAL PROGRESSIONS
// =============================================================================

/**
 * Material progression configuration for stat calculation
 */
export interface MaterialProgression {
  material: MaterialTierId;
  tier: MaterialTier;
  attackMultiplier: number;
  defenseMultiplier: number;
  valueMultiplier: number;
  levelRequirement: number;
}

/**
 * Generate stat progressions for all material tiers
 * Returns an array of progression objects showing how stats scale
 */
export function generateMaterialProgressions(): MaterialProgression[] {
  const progressions: MaterialProgression[] = [];

  for (const [materialId, tier] of Object.entries(MATERIAL_TIERS)) {
    progressions.push({
      material: materialId as MaterialTierId,
      tier,
      attackMultiplier: tier.statMultiplier,
      defenseMultiplier: tier.statMultiplier,
      valueMultiplier: tier.valueMultiplier,
      levelRequirement: tier.level,
    });
  }

  // Sort by level requirement
  progressions.sort((a, b) => a.levelRequirement - b.levelRequirement);

  log.debug("Generated material progressions", {
    count: progressions.length,
    materials: progressions.map((p) => p.material),
  });

  return progressions;
}

/**
 * Preview stats for an item at each material tier
 *
 * @param baseStats - Base stats of the item (at bronze/tier 1)
 * @param baseValue - Base value of the item
 */
export interface StatPreview {
  material: MaterialTierId;
  name: string;
  level: number;
  rarity: Rarity;
  color: string;
  stats: {
    attack: number;
    defense: number;
    strength: number;
  };
  value: number;
}

/**
 * Generate stat previews for all material tiers
 */
export function generateStatPreviews(
  baseStats: { attack?: number; defense?: number; strength?: number },
  baseValue: number
): StatPreview[] {
  const previews: StatPreview[] = [];

  for (const [materialId, tier] of Object.entries(MATERIAL_TIERS)) {
    previews.push({
      material: materialId as MaterialTierId,
      name: tier.name,
      level: tier.level,
      rarity: tier.rarity,
      color: tier.color,
      stats: {
        attack: Math.round((baseStats.attack ?? 0) * tier.statMultiplier),
        defense: Math.round((baseStats.defense ?? 0) * tier.statMultiplier),
        strength: Math.round((baseStats.strength ?? 0) * tier.statMultiplier),
      },
      value: Math.round(baseValue * tier.valueMultiplier),
    });
  }

  // Sort by level requirement
  previews.sort((a, b) => a.level - b.level);

  return previews;
}

/**
 * Get a formatted stat comparison table for display
 */
export function getStatComparisonTable(
  templateId: string,
  materials: MaterialTierId[]
): {
  headers: string[];
  rows: Array<{
    material: MaterialTierId;
    name: string;
    attack: number;
    defense: number;
    strength: number;
    value: number;
    level: number;
  }>;
} {
  // Try to find the template
  const template =
    WEAPON_TEMPLATES[templateId] ||
    ARMOR_TEMPLATES[templateId] ||
    TOOL_TEMPLATES[templateId];

  if (!template) {
    return { headers: [], rows: [] };
  }

  const headers = ["Material", "Attack", "Defense", "Strength", "Value", "Level"];
  const rows = materials.map((materialId) => {
    const tier = MATERIAL_TIERS[materialId];
    return {
      material: materialId,
      name: tier.name,
      attack: Math.round((template.baseStats.attack || 0) * tier.statMultiplier),
      defense: Math.round((template.baseStats.defense || 0) * tier.statMultiplier),
      strength: Math.round((template.baseStats.strength || 0) * tier.statMultiplier),
      value: Math.round(100 * tier.valueMultiplier), // Base value of 100
      level: tier.level,
    };
  });

  return { headers, rows };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Detect item type from base asset properties
 */
function detectItemType(asset: BaseAsset): "weapon" | "armor" | "tool" | "unknown" {
  const type = asset.type?.toLowerCase() ?? "";

  if (type === "weapon" || type.includes("sword") || type.includes("axe") || type.includes("bow")) {
    return "weapon";
  }

  if (type === "armor" || type.includes("helmet") || type.includes("body") || type.includes("shield")) {
    return "armor";
  }

  if (type === "tool" || type.includes("pickaxe") || type.includes("hatchet")) {
    return "tool";
  }

  // Try to detect from name or description
  const searchText = `${asset.name} ${asset.description ?? ""}`.toLowerCase();

  if (searchText.match(/sword|axe|dagger|mace|bow|staff|wand/)) {
    return "weapon";
  }

  if (searchText.match(/helmet|armor|shield|boots|gloves|legs|body/)) {
    return "armor";
  }

  if (searchText.match(/pickaxe|hatchet|fishing|hammer/)) {
    return "tool";
  }

  return "unknown";
}

/**
 * Find a matching template for the given asset
 */
function findMatchingTemplate(
  asset: BaseAsset,
  itemType: "weapon" | "armor" | "tool" | "unknown"
): ItemTemplate | undefined {
  const searchName = asset.name.toLowerCase();

  if (itemType === "weapon") {
    // Try to find exact match first
    for (const [key, template] of Object.entries(WEAPON_TEMPLATES)) {
      if (searchName.includes(key) || searchName.includes(template.baseName.toLowerCase())) {
        return template;
      }
    }
    // Default to sword if nothing matches
    return WEAPON_TEMPLATES.sword;
  }

  if (itemType === "armor") {
    for (const [key, template] of Object.entries(ARMOR_TEMPLATES)) {
      if (searchName.includes(key) || searchName.includes(template.baseName.toLowerCase())) {
        return template;
      }
    }
    // Default to chainbody if nothing matches
    return ARMOR_TEMPLATES.chainbody;
  }

  if (itemType === "tool") {
    for (const [key, template] of Object.entries(TOOL_TEMPLATES)) {
      if (searchName.includes(key) || searchName.includes(template.baseName.toLowerCase())) {
        return template;
      }
    }
    // Default to pickaxe if nothing matches
    return TOOL_TEMPLATES.pickaxe;
  }

  return undefined;
}

/**
 * Get available material tiers
 */
export function getAvailableMaterials(): MaterialTierId[] {
  return Object.keys(MATERIAL_TIERS) as MaterialTierId[];
}

/**
 * Get available mob tiers
 */
export function getAvailableMobTiers(): MobTierId[] {
  return Object.keys(MOB_TIERS) as MobTierId[];
}

/**
 * Estimate the number of items that will be created
 */
export function estimateItemCount(
  categories: ("weapon" | "armor" | "tool")[],
  materials: MaterialTierId[]
): number {
  let templateCount = 0;

  if (categories.includes("weapon")) {
    templateCount += Object.keys(WEAPON_TEMPLATES).length;
  }
  if (categories.includes("armor")) {
    templateCount += Object.keys(ARMOR_TEMPLATES).length;
  }
  if (categories.includes("tool")) {
    templateCount += Object.keys(TOOL_TEMPLATES).length;
  }

  return templateCount * materials.length;
}

/**
 * Estimate the number of mobs that will be created
 */
export function estimateMobCount(tiers: MobTierId[]): number {
  return Object.keys(MOB_TEMPLATES).length * tiers.length;
}

log.debug("Bulk operations system initialized", {
  materialCount: Object.keys(MATERIAL_TIERS).length,
  mobTierCount: Object.keys(MOB_TIERS).length,
});
