/**
 * Manifest Export API Route
 * Export assets to game manifest files
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils";

const log = logger.child("API:manifest");
import { promises as fs } from "fs";
import path from "path";
import { generateManifestEntry } from "@/lib/manifest/manifest-exporter";
import { getAssetById } from "@/lib/db/asset-queries";
import type { AssetCategory } from "@/types/categories";
import type {
  ItemManifest,
  NPCManifest,
  ResourceManifest,
} from "@/types/manifest";

/**
 * Union type for all manifest entry types
 */
type ManifestEntry = ItemManifest | NPCManifest | ResourceManifest;

/**
 * Single asset export request
 */
interface SingleAssetExport {
  assetId?: string;
  category?: AssetCategory;
  metadata?: Record<string, unknown>;
  modelPath?: string;
}

/**
 * Request body for POST /api/manifest/export
 *
 * Supports both single and batch exports:
 * - Single: { assetId: "bronze-sword", action: "write" }
 * - Batch: { assets: [{ assetId: "bronze-sword" }, { assetId: "iron-sword" }], action: "write" }
 */
interface ManifestExportRequest extends SingleAssetExport {
  action?: "preview" | "write";
  // Batch export: array of assets
  assets?: SingleAssetExport[];
}

// Path to game manifests
const MANIFESTS_DIR =
  process.env.HYPERSCAPE_MANIFESTS_DIR ||
  path.join(process.cwd(), "..", "server", "world", "assets", "manifests");

/**
 * Get manifest file name for a category
 */
function getManifestFileName(category: AssetCategory): string {
  switch (category) {
    case "weapon":
    case "prop":
    case "building":
      return "items.json";
    case "npc":
    case "character":
      return "npcs.json";
    case "resource":
      return "resources.json";
    case "environment":
      return "environments.json";
    default:
      return "items.json";
  }
}

/**
 * Read existing manifest file
 */
async function readManifest(filename: string): Promise<ManifestEntry[]> {
  try {
    const filePath = path.join(MANIFESTS_DIR, filename);
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as ManifestEntry[];
  } catch {
    return [];
  }
}

/**
 * Write manifest file
 */
async function writeManifest(
  filename: string,
  data: ManifestEntry[],
): Promise<void> {
  await fs.mkdir(MANIFESTS_DIR, { recursive: true });
  const filePath = path.join(MANIFESTS_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

/**
 * Process a single asset for export
 */
async function processAssetForExport(
  asset: SingleAssetExport,
): Promise<{ entry: ManifestEntry; category: AssetCategory; error?: string }> {
  const { assetId, category, metadata, modelPath } = asset;

  let assetMetadata = metadata;
  let assetCategory = category as AssetCategory;

  if (assetId) {
    const dbAsset = await getAssetById(assetId);
    if (!dbAsset) {
      throw new Error(`Asset not found: ${assetId}`);
    }
    assetMetadata = {
      id: dbAsset.id,
      name: dbAsset.name,
      description: dbAsset.description,
      type: dbAsset.type,
      category: dbAsset.category,
      tags: dbAsset.tags,
      prompt: dbAsset.prompt,
      ...dbAsset.generationParams,
    };
    assetCategory = (dbAsset.category || dbAsset.type) as AssetCategory;
  }

  if (!assetCategory || !assetMetadata) {
    throw new Error("Category and metadata required");
  }

  const manifestEntry = generateManifestEntry(
    assetCategory,
    assetMetadata as Record<string, unknown>,
    modelPath ||
      (assetMetadata.modelPath as string) ||
      `asset://models/${assetMetadata.id}/${assetMetadata.id}.glb`,
  ) as ManifestEntry;

  return { entry: manifestEntry, category: assetCategory };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ManifestExportRequest;
    const { action = "preview", assets } = body;

    // Determine if this is a batch or single export
    const assetList: SingleAssetExport[] = assets?.length
      ? assets
      : [{ assetId: body.assetId, category: body.category, metadata: body.metadata, modelPath: body.modelPath }];

    if (assetList.length === 0 || (!assetList[0].assetId && !assetList[0].metadata)) {
      return NextResponse.json(
        { error: "At least one asset (assetId or metadata) required" },
        { status: 400 },
      );
    }

    // Process all assets
    const results: {
      assetId: string;
      manifestEntry: ManifestEntry;
      manifestFile: string;
      action: "added" | "updated";
      error?: string;
    }[] = [];

    const errors: { assetId: string; error: string }[] = [];

    // Group entries by manifest file for batch writing
    const manifestGroups: Map<string, { entries: ManifestEntry[]; category: AssetCategory }> = new Map();

    for (const asset of assetList) {
      try {
        const { entry, category } = await processAssetForExport(asset);
        const manifestFileName = getManifestFileName(category);

        if (!manifestGroups.has(manifestFileName)) {
          manifestGroups.set(manifestFileName, { entries: [], category });
        }
        manifestGroups.get(manifestFileName)!.entries.push(entry);

        results.push({
          assetId: entry.id,
          manifestEntry: entry,
          manifestFile: manifestFileName,
          action: "added", // Will be updated below if writing
        });
      } catch (error) {
        const assetId = asset.assetId || (asset.metadata?.id as string) || "unknown";
        errors.push({
          assetId,
          error: error instanceof Error ? error.message : "Processing failed",
        });
      }
    }

    // Preview only - return what would be written
    if (action === "preview") {
      return NextResponse.json({
        success: errors.length === 0,
        isBatch: assetList.length > 1,
        count: results.length,
        results,
        errors: errors.length > 0 ? errors : undefined,
        message: "Preview only - use action: 'write' to save to manifests",
      });
    }

    // Write to manifest files
    if (action === "write") {
      const writeResults: {
        manifestFile: string;
        added: number;
        updated: number;
        total: number;
      }[] = [];

      for (const [manifestFileName, { entries }] of manifestGroups) {
        // Read existing manifest
        const existingManifest = await readManifest(manifestFileName);
        let added = 0;
        let updated = 0;

        for (const entry of entries) {
          const existingIndex = existingManifest.findIndex((e) => e.id === entry.id);

          if (existingIndex >= 0) {
            existingManifest[existingIndex] = entry;
            updated++;
            // Update result action
            const result = results.find((r) => r.assetId === entry.id);
            if (result) result.action = "updated";
          } else {
            existingManifest.push(entry);
            added++;
          }
        }

        // Write updated manifest
        await writeManifest(manifestFileName, existingManifest);

        writeResults.push({
          manifestFile: manifestFileName,
          added,
          updated,
          total: existingManifest.length,
        });

        log.info(`📝 Batch export to ${manifestFileName}: ${added} added, ${updated} updated`);
      }

      return NextResponse.json({
        success: errors.length === 0,
        isBatch: assetList.length > 1,
        count: results.length,
        results,
        writeResults,
        errors: errors.length > 0 ? errors : undefined,
        message: `Exported ${results.length} assets to ${writeResults.length} manifest(s)`,
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'preview' or 'write'" },
      { status: 400 },
    );
  } catch (error) {
    log.error({ error }, "Manifest export failed");
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Export failed",
      },
      { status: 500 },
    );
  }
}
