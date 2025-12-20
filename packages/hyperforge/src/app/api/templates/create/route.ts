/**
 * Templates Create API
 *
 * POST endpoint that creates all assets from a template.
 * Generates proper snake_case IDs, creates manifest entries,
 * and returns list of created asset IDs.
 */

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { logger } from "@/lib/utils";
import {
  applyTierSetTemplate,
  applyMobPackTemplate,
  applyAssetBundleTemplate,
  type MaterialTierId,
  type TemplateResult,
  type GeneratedItem,
  type GeneratedMob,
  type GeneratedNPC,
} from "@/lib/templates/asset-templates";

const log = logger.child("API:templates:create");

// Manifest directory path
const MANIFESTS_DIR =
  process.env.HYPERSCAPE_MANIFESTS_DIR ||
  path.resolve(process.cwd(), "..", "server", "world", "assets", "manifests");

// =============================================================================
// Request/Response Types
// =============================================================================

interface CreateTemplateRequest {
  templateId: string;
  templateType: "tier_set" | "mob_pack" | "asset_bundle";
  materials?: MaterialTierId[];
}

interface CreateTemplateResponse {
  success: boolean;
  createdAssetIds: string[];
  summary: {
    itemCount: number;
    mobCount: number;
    npcCount: number;
  };
  manifestsUpdated: string[];
}

// =============================================================================
// Manifest File Helpers
// =============================================================================

/**
 * Read a manifest JSON file
 */
async function readManifest<T>(filename: string): Promise<T[]> {
  const filePath = path.join(MANIFESTS_DIR, filename);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as T[];
  } catch (error) {
    log.warn(`Manifest not found or empty: ${filename}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Write a manifest JSON file
 */
async function writeManifest<T>(filename: string, data: T[]): Promise<void> {
  const filePath = path.join(MANIFESTS_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  log.debug(`Manifest written: ${filename}`, { count: data.length });
}

/**
 * Add items to the items manifest, avoiding duplicates
 */
async function addItemsToManifest(items: GeneratedItem[]): Promise<string[]> {
  if (items.length === 0) return [];

  const existingItems = await readManifest<GeneratedItem>("items.json");
  const existingIds = new Set(existingItems.map((i) => i.id));
  const addedIds: string[] = [];

  for (const item of items) {
    if (!existingIds.has(item.id)) {
      existingItems.push(item);
      addedIds.push(item.id);
      existingIds.add(item.id);
    } else {
      log.debug(`Item already exists, skipping: ${item.id}`);
    }
  }

  if (addedIds.length > 0) {
    await writeManifest("items.json", existingItems);
  }

  return addedIds;
}

/**
 * Add mobs/NPCs to the npcs manifest, avoiding duplicates
 */
async function addNpcsToManifest(
  mobs: GeneratedMob[],
  npcs: GeneratedNPC[]
): Promise<string[]> {
  if (mobs.length === 0 && npcs.length === 0) return [];

  // Read existing NPCs manifest
  const existingNpcs = await readManifest<Record<string, unknown>>("npcs.json");
  const existingIds = new Set(
    existingNpcs.map((n) => (n as { id: string }).id)
  );
  const addedIds: string[] = [];

  // Add mobs
  for (const mob of mobs) {
    if (!existingIds.has(mob.id)) {
      existingNpcs.push(mob as unknown as Record<string, unknown>);
      addedIds.push(mob.id);
      existingIds.add(mob.id);
    } else {
      log.debug(`Mob already exists, skipping: ${mob.id}`);
    }
  }

  // Add NPCs
  for (const npc of npcs) {
    if (!existingIds.has(npc.id)) {
      existingNpcs.push(npc as unknown as Record<string, unknown>);
      addedIds.push(npc.id);
      existingIds.add(npc.id);
    } else {
      log.debug(`NPC already exists, skipping: ${npc.id}`);
    }
  }

  if (addedIds.length > 0) {
    await writeManifest("npcs.json", existingNpcs);
  }

  return addedIds;
}

// =============================================================================
// POST Handler
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateTemplateRequest;
    const { templateId, templateType, materials } = body;

    if (!templateId || !templateType) {
      return NextResponse.json(
        { error: "templateId and templateType are required" },
        { status: 400 }
      );
    }

    log.info("Creating assets from template", {
      templateId,
      templateType,
      materials,
    });

    // Apply the appropriate template
    let result: TemplateResult;

    switch (templateType) {
      case "tier_set":
        if (!materials || materials.length === 0) {
          return NextResponse.json(
            { error: "materials array required for tier_set templates" },
            { status: 400 }
          );
        }
        result = applyTierSetTemplate(templateId, materials);
        break;

      case "mob_pack":
        result = applyMobPackTemplate(templateId);
        break;

      case "asset_bundle":
        result = applyAssetBundleTemplate(templateId);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown template type: ${templateType}` },
          { status: 400 }
        );
    }

    // Validate we got results
    const totalAssets =
      result.items.length + result.mobs.length + result.npcs.length;

    if (totalAssets === 0) {
      return NextResponse.json(
        {
          error: "Template generated no assets",
          hint: "Check that the templateId is valid",
        },
        { status: 400 }
      );
    }

    // Save to manifests
    const manifestsUpdated: string[] = [];
    const createdAssetIds: string[] = [];

    // Add items to items.json
    if (result.items.length > 0) {
      const addedItemIds = await addItemsToManifest(result.items);
      createdAssetIds.push(...addedItemIds);
      if (addedItemIds.length > 0) {
        manifestsUpdated.push("items.json");
      }
    }

    // Add mobs and NPCs to npcs.json
    if (result.mobs.length > 0 || result.npcs.length > 0) {
      const addedNpcIds = await addNpcsToManifest(result.mobs, result.npcs);
      createdAssetIds.push(...addedNpcIds);
      if (addedNpcIds.length > 0) {
        manifestsUpdated.push("npcs.json");
      }
    }

    log.info("Template assets created successfully", {
      templateId,
      createdCount: createdAssetIds.length,
      manifestsUpdated,
    });

    const response: CreateTemplateResponse = {
      success: true,
      createdAssetIds,
      summary: {
        itemCount: result.items.length,
        mobCount: result.mobs.length,
        npcCount: result.npcs.length,
      },
      manifestsUpdated,
    };

    return NextResponse.json(response);
  } catch (error) {
    log.error("Template creation failed", { error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Template creation failed",
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET Handler - List available templates
// =============================================================================

export async function GET() {
  try {
    const {
      TIER_SET_TEMPLATES,
      MOB_PACK_TEMPLATES,
      ASSET_BUNDLE_TEMPLATES,
    } = await import("@/lib/templates/asset-templates");

    return NextResponse.json({
      tierSets: Object.values(TIER_SET_TEMPLATES).map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        icon: t.icon,
        itemCount: t.items.length,
      })),
      mobPacks: Object.values(MOB_PACK_TEMPLATES).map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        icon: t.icon,
        tiers: t.tiers,
      })),
      assetBundles: Object.values(ASSET_BUNDLE_TEMPLATES).map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        icon: t.icon,
        category: t.category,
        assetCount: t.assets.length,
      })),
    });
  } catch (error) {
    log.error("Failed to list templates", { error });
    return NextResponse.json(
      { error: "Failed to list templates" },
      { status: 500 }
    );
  }
}
