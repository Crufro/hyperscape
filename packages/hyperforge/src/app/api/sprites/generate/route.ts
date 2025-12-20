/**
 * Sprites Generation API
 * POST /api/sprites/generate
 *
 * Generates 2D sprite images for an asset using Google Gemini via Vercel AI Gateway.
 * The front/isometric sprite becomes the asset thumbnail.
 *
 * For Supabase/FORGE assets: uploads to Supabase Storage
 * For local assets: saves to public/assets/{assetId}/
 */

import { NextRequest, NextResponse } from "next/server";
import {
  generateSpritesForAsset,
  type SpriteResult,
  type AssetInfo,
} from "@/lib/ai/sprite-service";
import {
  isSupabaseConfigured,
  uploadSpriteForAsset,
  readForgeAssetMetadata,
  BUCKET_NAMES,
  getSupabasePublicUrl,
} from "@/lib/storage/supabase-storage";
import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";
import { logger } from "@/lib/utils";

const log = logger.child("API:sprites");

interface SpriteGenerateRequest {
  assetId: string;
  assetName: string;
  assetDescription?: string;
  assetCategory?: string;
  views?: string[];
  style?: "pixel" | "clean" | "detailed";
  updateThumbnail?: boolean;
  /** Asset source: "LOCAL" for Supabase, "CDN" for CDN assets, undefined for local filesystem */
  source?: "LOCAL" | "CDN" | "FORGE";
}

interface SpriteGenerateResponse {
  success: boolean;
  sprites: SpriteResult[];
  thumbnailUrl?: string;
  error?: string;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<SpriteGenerateResponse>> {
  try {
    const body = (await request.json()) as SpriteGenerateRequest;

    const {
      assetId,
      assetName,
      assetDescription,
      assetCategory,
      views,
      style,
      updateThumbnail = true,
      source,
    } = body;

    // Determine if this is a Supabase asset
    const isSupabaseAsset = source === "LOCAL" || source === "FORGE";

    if (!assetId || !assetName) {
      return NextResponse.json(
        {
          success: false,
          sprites: [],
          error: "assetId and assetName are required",
        },
        { status: 400 },
      );
    }

    log.info(`Generating sprites for asset: ${assetName}`);

    // Build asset info for sprite generation
    const assetInfo: AssetInfo = {
      id: assetId,
      name: assetName,
      description: assetDescription,
      category: assetCategory,
    };

    // Generate sprites
    const sprites = await generateSpritesForAsset(assetInfo, {
      views,
      style,
    });

    if (sprites.length === 0) {
      return NextResponse.json(
        {
          success: false,
          sprites: [],
          error: "No sprites were generated. Check AI Gateway configuration.",
        },
        { status: 500 },
      );
    }

    const savedSprites: SpriteResult[] = [];
    let thumbnailUrl: string | undefined;

    // Handle Supabase assets vs local assets
    if (isSupabaseAsset && isSupabaseConfigured()) {
      // Upload sprites to Supabase
      log.info("Uploading sprites to Supabase for asset:", assetId);

      for (const sprite of sprites) {
        if (sprite.base64) {
          const buffer = Buffer.from(sprite.base64, "base64");
          const result = await uploadSpriteForAsset(buffer, {
            assetId,
            view: sprite.angle,
            style,
            transparent: true,
          });

          if (result.success) {
            savedSprites.push({
              ...sprite,
              imageUrl: result.url,
            });
            log.info(`Uploaded sprite to Supabase: ${result.url}`, { assetId, view: sprite.angle });
          }
        }
      }

      // Update thumbnail if requested
      if (updateThumbnail && savedSprites.length > 0) {
        // Prefer isometric, then front
        const thumbnailSprite =
          savedSprites.find((s) => s.angle === "isometric") ||
          savedSprites.find((s) => s.angle === "front") ||
          savedSprites[0];

        if (thumbnailSprite?.base64) {
          const buffer = Buffer.from(thumbnailSprite.base64, "base64");

          // Upload thumbnail to concept-art-pipeline bucket
          const supabaseUrl =
            process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
          const supabaseKey =
            process.env.SUPABASE_SECRET_KEY ||
            process.env.SUPABASE_SERVICE_KEY ||
            process.env.SUPABASE_PUBLISHABLE_KEY ||
            process.env.SUPABASE_ANON_KEY;

          if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey);
            const thumbnailPath = `forge/models/${assetId}/concept-art.png`;

            const { error } = await supabase.storage
              .from(BUCKET_NAMES.CONCEPT_ART)
              .upload(thumbnailPath, buffer, {
                contentType: "image/png",
                upsert: true,
              });

            if (!error) {
              thumbnailUrl = getSupabasePublicUrl(
                BUCKET_NAMES.CONCEPT_ART,
                thumbnailPath,
              );
              log.info(`Updated Supabase thumbnail: ${thumbnailUrl}`);

              // Update metadata in Supabase
              const existingMetadata = await readForgeAssetMetadata(assetId);
              if (existingMetadata) {
                const updatedMetadata = {
                  ...existingMetadata,
                  thumbnailUrl,
                  hasSprites: true,
                  sprites: savedSprites.map((s) => ({
                    angle: s.angle,
                    imageUrl: s.imageUrl,
                  })),
                };

                const metadataPath = `forge/models/${assetId}/metadata.json`;
                const metadataBuffer = Buffer.from(
                  JSON.stringify(updatedMetadata, null, 2),
                );

                await supabase.storage
                  .from(BUCKET_NAMES.CONCEPT_ART)
                  .upload(metadataPath, metadataBuffer, {
                    contentType: "application/json",
                    upsert: true,
                  });

                log.info("Updated Supabase metadata with sprites info");
              }
            } else {
              log.warn({ error }, "Failed to upload thumbnail to Supabase");
            }
          }
        }
      }
    } else {
      // Local filesystem storage (original behavior)
      const assetDir = path.join(
        process.cwd(),
        "public",
        "assets",
        assetId,
        "sprites",
      );
      await fs.mkdir(assetDir, { recursive: true });

      for (const sprite of sprites) {
        if (sprite.base64) {
          const filename = `${sprite.angle}.png`;
          const filepath = path.join(assetDir, filename);

          // Decode base64 and save to file
          const buffer = Buffer.from(sprite.base64, "base64");
          await fs.writeFile(filepath, buffer);

          // Update sprite with local URL
          const localUrl = `/assets/${assetId}/sprites/${filename}`;
          savedSprites.push({
            ...sprite,
            imageUrl: localUrl,
          });

          log.info(`Saved sprite: ${localUrl}`);
        }
      }

      // Update thumbnail if requested (use front or isometric as thumbnail)
      if (updateThumbnail && savedSprites.length > 0) {
        // Prefer isometric, then front
        const thumbnailSprite =
          savedSprites.find((s) => s.angle === "isometric") ||
          savedSprites.find((s) => s.angle === "front") ||
          savedSprites[0];

        if (thumbnailSprite) {
          // Copy sprite as concept-art (thumbnail)
          const thumbnailFilename = "concept-art.png";
          const thumbnailPath = path.join(
            process.cwd(),
            "public",
            "assets",
            assetId,
            thumbnailFilename,
          );

          // Get source sprite path
          const sourceSpritePath = path.join(
            assetDir,
            `${thumbnailSprite.angle}.png`,
          );

          try {
            await fs.copyFile(sourceSpritePath, thumbnailPath);
            thumbnailUrl = `/assets/${assetId}/${thumbnailFilename}`;
            log.info(`Updated thumbnail: ${thumbnailUrl}`);
          } catch (error) {
            log.warn({ error }, "Failed to update thumbnail");
          }

          // Update metadata.json with new thumbnail
          const metadataPath = path.join(
            process.cwd(),
            "public",
            "assets",
            assetId,
            "metadata.json",
          );

          try {
            const metadataContent = await fs.readFile(metadataPath, "utf-8");
            const metadata = JSON.parse(metadataContent);

            metadata.thumbnailUrl = thumbnailUrl;
            metadata.hasSprites = true;
            metadata.sprites = savedSprites.map((s) => ({
              angle: s.angle,
              imageUrl: s.imageUrl,
            }));

            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
            log.info("Updated metadata.json with sprites info");
          } catch (error) {
            log.warn({ error }, "Failed to update metadata");
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      sprites: savedSprites,
      thumbnailUrl,
    });
  } catch (error) {
    log.error({ error }, "Sprite generation failed");

    return NextResponse.json(
      {
        success: false,
        sprites: [],
        error:
          error instanceof Error ? error.message : "Sprite generation failed",
      },
      { status: 500 },
    );
  }
}
