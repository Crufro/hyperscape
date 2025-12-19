import { NextResponse } from "next/server";
import {
  listContentAssets,
  isSupabaseConfigured,
} from "@/lib/storage/supabase-storage";
import { logger } from "@/lib/utils";

const log = logger.child("API:content/list");

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: true,
        assets: [],
        message: "Supabase not configured",
      });
    }

    const assets = await listContentAssets();

    // Fetch actual content for each asset
    const assetsWithContent = await Promise.all(
      assets.map(async (asset) => {
        try {
          const response = await fetch(asset.url);
          if (response.ok) {
            const content = await response.json();
            return {
              ...asset,
              content,
            };
          }
        } catch (error) {
          log.warn("Failed to fetch content", { url: asset.url, error });
        }
        return asset;
      }),
    );

    return NextResponse.json({
      success: true,
      assets: assetsWithContent,
    });
  } catch (error) {
    log.error("Failed to list content assets", { error });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to list content assets",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
