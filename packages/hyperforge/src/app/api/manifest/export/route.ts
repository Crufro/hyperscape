/**
 * Manifest Export API Route
 * Export assets to game manifest files
 */

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { generateManifestEntry } from "@/lib/manifest/manifest-exporter";
import { getAssetById } from "@/lib/db/asset-queries";
import type { AssetCategory } from "@/types/categories";

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
async function readManifest(filename: string): Promise<unknown[]> {
  try {
    const filePath = path.join(MANIFESTS_DIR, filename);
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}

/**
 * Write manifest file
 */
async function writeManifest(filename: string, data: unknown[]): Promise<void> {
  await fs.mkdir(MANIFESTS_DIR, { recursive: true });
  const filePath = path.join(MANIFESTS_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assetId, category, metadata, modelPath, action = "preview" } = body;

    // If assetId is provided, fetch from database
    let assetMetadata = metadata;
    let assetCategory = category as AssetCategory;

    if (assetId) {
      const asset = await getAssetById(assetId);
      if (!asset) {
        return NextResponse.json({ error: "Asset not found" }, { status: 404 });
      }
      assetMetadata = {
        id: asset.id,
        name: asset.name,
        description: asset.description,
        type: asset.type,
        category: asset.category,
        tags: asset.tags,
        prompt: asset.prompt,
        ...asset.generationParams,
      };
      assetCategory = (asset.category || asset.type) as AssetCategory;
    }

    if (!assetCategory || !assetMetadata) {
      return NextResponse.json(
        { error: "Category and metadata required" },
        { status: 400 },
      );
    }

    // Generate manifest entry
    const manifestEntry = generateManifestEntry(
      assetCategory,
      assetMetadata,
      modelPath ||
        assetMetadata.modelPath ||
        `asset://models/${assetMetadata.id}/${assetMetadata.id}.glb`,
    );

    // Determine manifest file
    const manifestFileName = getManifestFileName(assetCategory);
    const manifestType = manifestFileName.replace(".json", "");

    // Preview only - just return what would be written
    if (action === "preview") {
      return NextResponse.json({
        success: true,
        manifestEntry,
        manifestType,
        manifestFile: manifestFileName,
        message: "Preview only - use action: 'write' to save to manifest",
      });
    }

    // Write to manifest file
    if (action === "write") {
      // Read existing manifest
      const existingManifest = await readManifest(manifestFileName);

      // Check if entry already exists
      const existingIndex = (existingManifest as { id: string }[]).findIndex(
        (entry) => entry.id === manifestEntry.id,
      );

      if (existingIndex >= 0) {
        // Update existing entry
        existingManifest[existingIndex] = manifestEntry;
        console.log(
          `📝 Updated existing entry in ${manifestFileName}: ${manifestEntry.id}`,
        );
      } else {
        // Add new entry
        existingManifest.push(manifestEntry);
        console.log(
          `📝 Added new entry to ${manifestFileName}: ${manifestEntry.id}`,
        );
      }

      // Write updated manifest
      await writeManifest(manifestFileName, existingManifest);

      return NextResponse.json({
        success: true,
        manifestEntry,
        manifestType,
        manifestFile: manifestFileName,
        action: existingIndex >= 0 ? "updated" : "added",
        totalEntries: existingManifest.length,
        message: `Asset exported to ${manifestFileName}`,
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'preview' or 'write'" },
      { status: 400 },
    );
  } catch (error) {
    console.error("[API] Manifest export failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Export failed",
      },
      { status: 500 },
    );
  }
}
