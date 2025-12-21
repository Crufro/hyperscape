/**
 * Bulk Variants API Route
 *
 * Creates multiple material variants of assets at once.
 * Generates proper IDs (bronze_sword, steel_sword, mithril_sword)
 * and updates manifest with all new entries.
 */

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import {
  createMaterialVariants,
  createTierSet,
  type BaseAsset,
} from "@/lib/bulk/bulk-operations";
import {
  MATERIAL_TIERS,
  WEAPON_TEMPLATES,
  ARMOR_TEMPLATES,
  TOOL_TEMPLATES,
  type MaterialTierId,
  type GeneratedItem,
} from "@/lib/templates/asset-templates";
import { logger } from "@/lib/utils";

const log = logger.child("API:bulk:variants");

// Enable dynamic responses
export const dynamic = "force-dynamic";

// Path to manifests directory
const MANIFESTS_DIR = path.join(process.cwd(), "../../server/world/assets/manifests");

interface BulkVariantsRequest {
  action: "create_variants" | "create_tier_set" | "preview";
  baseAssetId?: string;
  baseAsset?: BaseAsset;
  templateId?: string;
  materials: MaterialTierId[];
  categories?: ("weapon" | "armor" | "tool")[];
  updateManifest?: boolean;
}

interface VariantPreviewItem {
  id: string;
  name: string;
  material: MaterialTierId;
  level: number;
  rarity: string;
  stats: {
    attack: number;
    defense: number;
    strength: number;
  };
  value: number;
}

/**
 * POST /api/bulk/variants - Create multiple material variants
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BulkVariantsRequest;
    const { action, baseAsset, templateId, materials, categories, updateManifest = true } = body;

    // Validate materials
    if (!materials || materials.length === 0) {
      return NextResponse.json(
        { error: "At least one material must be specified" },
        { status: 400 }
      );
    }

    // Validate materials are valid
    for (const material of materials) {
      if (!MATERIAL_TIERS[material]) {
        return NextResponse.json(
          { error: `Invalid material: ${material}` },
          { status: 400 }
        );
      }
    }

    log.info("Bulk variants request", { action, materials, templateId });

    // Handle preview action
    if (action === "preview") {
      const previews = await generatePreview(templateId, baseAsset, materials);
      return NextResponse.json({
        success: true,
        previews,
        count: previews.length,
      });
    }

    // Handle create_variants action (for a specific base asset)
    if (action === "create_variants") {
      if (!baseAsset) {
        return NextResponse.json(
          { error: "baseAsset is required for create_variants action" },
          { status: 400 }
        );
      }

      const result = await createMaterialVariants(baseAsset, materials);

      if (updateManifest && result.items.length > 0) {
        await appendToManifest(result.items);
      }

      return NextResponse.json({
        success: result.success,
        items: result.items,
        errors: result.errors,
        summary: result.summary,
      });
    }

    // Handle create_tier_set action (for categories)
    if (action === "create_tier_set") {
      const cats = categories ?? ["weapon", "armor", "tool"];
      const result = await createTierSet(cats, materials);

      if (updateManifest && result.items.length > 0) {
        await appendToManifest(result.items);
      }

      return NextResponse.json({
        success: result.success,
        items: result.items,
        errors: result.errors,
        summary: result.summary,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    log.error("Bulk variants error", { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Bulk operation failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/bulk/variants - Get available materials and templates
 */
export async function GET() {
  try {
    const materialList = Object.entries(MATERIAL_TIERS).map(([id, tier]) => ({
      id,
      name: tier.name,
      level: tier.level,
      statMultiplier: tier.statMultiplier,
      valueMultiplier: tier.valueMultiplier,
      rarity: tier.rarity,
      color: tier.color,
    }));

    const weaponTemplates = Object.entries(WEAPON_TEMPLATES).map(([id, template]) => ({
      id,
      name: template.baseName,
      type: "weapon",
      baseStats: template.baseStats,
    }));

    const armorTemplates = Object.entries(ARMOR_TEMPLATES).map(([id, template]) => ({
      id,
      name: template.baseName,
      type: "armor",
      baseStats: template.baseStats,
    }));

    const toolTemplates = Object.entries(TOOL_TEMPLATES).map(([id, template]) => ({
      id,
      name: template.baseName,
      type: "tool",
      baseStats: template.baseStats,
    }));

    return NextResponse.json({
      success: true,
      materials: materialList,
      templates: {
        weapons: weaponTemplates,
        armor: armorTemplates,
        tools: toolTemplates,
      },
    });
  } catch (error) {
    log.error("Failed to get bulk variants info", { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get info" },
      { status: 500 }
    );
  }
}

/**
 * Generate preview of variants that would be created
 */
async function generatePreview(
  templateId: string | undefined,
  baseAsset: BaseAsset | undefined,
  materials: MaterialTierId[]
): Promise<VariantPreviewItem[]> {
  const previews: VariantPreviewItem[] = [];

  // Find template
  const template = templateId
    ? WEAPON_TEMPLATES[templateId] || ARMOR_TEMPLATES[templateId] || TOOL_TEMPLATES[templateId]
    : null;

  if (!template && !baseAsset) {
    return previews;
  }

  const baseName = template?.baseName || baseAsset?.name || "Item";
  const baseId = template?.baseId || baseAsset?.id || "item";
  const baseStats = template?.baseStats || {
    attack: baseAsset?.bonuses?.attack ?? 0,
    defense: baseAsset?.bonuses?.defense ?? 0,
    strength: baseAsset?.bonuses?.strength ?? 0,
  };

  for (const material of materials) {
    const tier = MATERIAL_TIERS[material];
    const itemId = `${material}_${baseId}`;
    const itemName = `${tier.name} ${baseName}`;

    previews.push({
      id: itemId,
      name: itemName,
      material,
      level: tier.level,
      rarity: tier.rarity,
      stats: {
        attack: Math.round((baseStats.attack || 0) * tier.statMultiplier),
        defense: Math.round((baseStats.defense || 0) * tier.statMultiplier),
        strength: Math.round((baseStats.strength || 0) * tier.statMultiplier),
      },
      value: Math.round(100 * tier.valueMultiplier),
    });
  }

  return previews;
}

/**
 * Append generated items to the items manifest
 */
async function appendToManifest(items: GeneratedItem[]): Promise<void> {
  try {
    const manifestPath = path.join(MANIFESTS_DIR, "items.json");

    // Check if manifest exists
    let existingItems: GeneratedItem[] = [];
    try {
      const content = await fs.readFile(manifestPath, "utf-8");
      existingItems = JSON.parse(content);
    } catch {
      // File doesn't exist or is invalid, start with empty array
      log.info("Creating new items manifest");
    }

    // Create a map of existing IDs for deduplication
    const existingIds = new Set(existingItems.map((item) => item.id));

    // Filter out items that already exist
    const newItems = items.filter((item) => !existingIds.has(item.id));

    if (newItems.length === 0) {
      log.info("No new items to add to manifest");
      return;
    }

    // Merge and save
    const mergedItems = [...existingItems, ...newItems];

    // Ensure directory exists
    await fs.mkdir(MANIFESTS_DIR, { recursive: true });

    await fs.writeFile(manifestPath, JSON.stringify(mergedItems, null, 2));

    log.info("Updated items manifest", {
      existingCount: existingItems.length,
      newCount: newItems.length,
      totalCount: mergedItems.length,
    });
  } catch (error) {
    log.error("Failed to update manifest", { error });
    throw new Error(`Failed to update manifest: ${error instanceof Error ? error.message : String(error)}`);
  }
}
