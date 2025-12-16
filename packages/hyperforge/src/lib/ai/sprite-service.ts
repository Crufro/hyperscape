/**
 * Sprite Generation Service
 * Uses Vercel AI Gateway with Google Gemini for 2D sprite generation
 *
 * Generates multiple sprite views from asset metadata:
 * - Front view (becomes the asset thumbnail)
 * - Side view (45-degree angle)
 * - Back view
 * - Isometric view (for inventory/UI)
 */

import { generateText } from "ai";
import { gateway } from "@ai-sdk/gateway";

export interface SpriteResult {
  angle: string;
  imageUrl: string;
  base64?: string;
  mediaType: string;
}

export interface AssetInfo {
  id: string;
  name: string;
  description?: string;
  category?: string;
}

export interface SpriteGenerationOptions {
  views?: string[];
  resolution?: number;
  style?: "pixel" | "clean" | "detailed";
}

// Default sprite views to generate
const DEFAULT_VIEWS = ["front", "side", "back", "isometric"];

/**
 * Build a detailed prompt for sprite generation based on asset and view
 */
function buildSpritePrompt(
  asset: AssetInfo,
  view: string,
  style: string = "clean",
): string {
  const styleDescriptions: Record<string, string> = {
    pixel:
      "retro pixel art style with clean edges and visible pixels, reminiscent of classic 16-bit games",
    clean:
      "clean vector-style 2D game sprite with smooth edges and flat colors",
    detailed:
      "detailed hand-painted 2D game sprite with subtle shading and textures",
  };

  const viewDescriptions: Record<string, string> = {
    front:
      "front-facing view, centered and symmetrical, showing the item head-on",
    side: "side profile view at a 90-degree angle, showing the full silhouette",
    back: "rear view, showing what the item looks like from behind",
    isometric:
      "isometric 3/4 view at a 45-degree angle from above, typical for inventory icons",
  };

  const viewDesc = viewDescriptions[view] || viewDescriptions.front;
  const styleDesc = styleDescriptions[style] || styleDescriptions.clean;

  return `Create a 2D game sprite of: "${asset.name}"${asset.description ? ` - ${asset.description}` : ""}.

STYLE: ${styleDesc}
VIEW: ${viewDesc}
CATEGORY: ${asset.category || "item"}

REQUIREMENTS:
- Transparent or solid color background (no complex backgrounds)
- Item should be centered in the frame
- Clear, recognizable silhouette
- Consistent lighting from top-left
- Game-ready asset suitable for UI display
- Square aspect ratio, suitable for 256x256 or 512x512 pixels

Generate ONLY the sprite image, no text or labels.`;
}

/**
 * Generate sprites for an asset using Google Gemini via Vercel AI Gateway
 */
export async function generateSpritesForAsset(
  asset: AssetInfo,
  options: SpriteGenerationOptions = {},
): Promise<SpriteResult[]> {
  const views = options.views || DEFAULT_VIEWS;
  const style = options.style || "clean";
  const sprites: SpriteResult[] = [];

  console.log(
    `[Sprite Service] Generating ${views.length} sprites for asset: ${asset.name}`,
  );

  for (const view of views) {
    try {
      const prompt = buildSpritePrompt(asset, view, style);

      console.log(`[Sprite Service] Generating ${view} view...`);

      // Use Vercel AI Gateway with Google's image generation model
      const result = await generateText({
        model: gateway("google/gemini-2.5-flash-image"),
        prompt,
      });

      // Extract images from result.files (Gemini image models return files)
      const imageFiles = result.files?.filter((f) =>
        f.mediaType?.startsWith("image/"),
      );

      if (imageFiles && imageFiles.length > 0) {
        const file = imageFiles[0];

        // Convert uint8Array to base64
        const base64 = Buffer.from(file.uint8Array).toString("base64");
        const dataUrl = `data:${file.mediaType};base64,${base64}`;

        sprites.push({
          angle: view,
          imageUrl: dataUrl,
          base64,
          mediaType: file.mediaType || "image/png",
        });

        console.log(`[Sprite Service] Generated ${view} view successfully`);
      } else {
        console.warn(
          `[Sprite Service] No image generated for ${view} view, text response:`,
          result.text?.substring(0, 100),
        );
      }
    } catch (error) {
      console.error(`[Sprite Service] Failed to generate ${view} view:`, error);
      // Continue with other views even if one fails
    }
  }

  console.log(
    `[Sprite Service] Completed: ${sprites.length}/${views.length} sprites generated`,
  );

  return sprites;
}

/**
 * Generate a single sprite for thumbnail use
 */
export async function generateThumbnailSprite(
  asset: AssetInfo,
  style: string = "clean",
): Promise<SpriteResult | null> {
  const sprites = await generateSpritesForAsset(asset, {
    views: ["isometric"], // Isometric is best for thumbnails
    style: style as SpriteGenerationOptions["style"],
  });

  return sprites.length > 0 ? sprites[0] : null;
}
