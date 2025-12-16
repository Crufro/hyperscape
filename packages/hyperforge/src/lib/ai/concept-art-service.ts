/**
 * Concept Art Generation Service
 * Uses Vercel AI Gateway with Google Gemini for 2D concept art generation
 *
 * Generates concept art images that can be used:
 * 1. As visual reference for the asset
 * 2. As texture_image_url in Meshy refine stage for better texturing
 * 3. As input for Image-to-3D pipeline
 */

import { generateText } from "ai";
import { gateway } from "@ai-sdk/gateway";

export interface ConceptArtResult {
  imageUrl: string; // Data URL or saved file URL
  base64: string;
  mediaType: string;
}

export interface ConceptArtOptions {
  style?: "realistic" | "stylized" | "pixel" | "painterly";
  viewAngle?: "front" | "side" | "isometric" | "three-quarter";
  background?: "transparent" | "simple" | "contextual";
  assetType?: string;
}

/**
 * Build a detailed prompt for concept art generation
 */
function buildConceptArtPrompt(
  assetDescription: string,
  options: ConceptArtOptions = {},
): string {
  const {
    style = "realistic",
    viewAngle = "isometric",
    background = "simple",
    assetType = "object",
  } = options;

  const styleDescriptions: Record<string, string> = {
    realistic:
      "photorealistic rendering with accurate lighting, materials, and textures",
    stylized:
      "stylized 3D game art style with vibrant colors and clean shapes, similar to Fortnite or Overwatch",
    pixel: "high-quality pixel art style with clean edges and retro aesthetic",
    painterly:
      "hand-painted digital art style with visible brushstrokes and rich colors",
  };

  const viewDescriptions: Record<string, string> = {
    front: "front-facing view, centered and symmetrical",
    side: "side profile view showing the full silhouette",
    isometric:
      "isometric 3/4 view from slightly above, typical for game assets",
    "three-quarter":
      "three-quarter view showing depth and multiple sides of the object",
  };

  const backgroundDescriptions: Record<string, string> = {
    transparent: "on a transparent or solid neutral background",
    simple: "on a clean, simple gradient background that doesn't distract",
    contextual: "in an appropriate environmental context",
  };

  const assetTypeHints: Record<string, string> = {
    weapon:
      "Ensure the weapon has clear grip/handle area, detailed blade/head, and visible materials (metal, wood, leather).",
    armor:
      "Show clear armor structure with visible plates, straps, and material details (metal, leather, cloth).",
    character:
      "Full body character in a clear T-pose or A-pose with visible limbs, hands, and feet. No flowing capes or obscuring elements.",
    npc: "Full body character in a clear T-pose or A-pose with visible limbs, hands, and feet. No flowing capes or obscuring elements.",
    item: "Show the item from a clear angle with visible details and materials.",
    prop: "Environmental prop with clear structure and material definition.",
  };

  const typeHint = assetTypeHints[assetType] || "";

  return `Create a high-quality concept art image for a 3D game asset:

"${assetDescription}"

STYLE: ${styleDescriptions[style]}
VIEW: ${viewDescriptions[viewAngle]}
BACKGROUND: ${backgroundDescriptions[background]}

REQUIREMENTS:
- Clear, well-defined silhouette suitable for 3D modeling
- Visible material properties (metal should look metallic, wood should look wooden, etc.)
- Good lighting that reveals form and surface details
- Colors that are vibrant but not oversaturated
- High detail level appropriate for a AAA game asset
${typeHint}

This image will be used as a reference for 3D texturing, so ensure colors and materials are clearly visible.

Generate ONLY the concept art image, no text, labels, or annotations.`;
}

/**
 * Generate concept art using Google Gemini via Vercel AI Gateway
 */
export async function generateConceptArt(
  assetDescription: string,
  options: ConceptArtOptions = {},
): Promise<ConceptArtResult | null> {
  console.log(
    `[Concept Art] Generating concept art for: ${assetDescription.substring(0, 100)}...`,
  );

  try {
    const prompt = buildConceptArtPrompt(assetDescription, options);

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

      console.log(`[Concept Art] Generated successfully`);

      return {
        imageUrl: dataUrl,
        base64,
        mediaType: file.mediaType || "image/png",
      };
    } else {
      console.warn(
        `[Concept Art] No image generated, text response:`,
        result.text?.substring(0, 100),
      );
      return null;
    }
  } catch (error) {
    console.error(`[Concept Art] Generation failed:`, error);
    return null;
  }
}

/**
 * Generate concept art and save to asset storage
 */
export async function generateAndSaveConceptArt(
  assetId: string,
  assetDescription: string,
  options: ConceptArtOptions = {},
): Promise<string | null> {
  const result = await generateConceptArt(assetDescription, options);

  if (!result) {
    return null;
  }

  // Import fs dynamically to avoid issues in browser context
  const { promises: fs } = await import("fs");
  const path = await import("path");

  const assetsDir =
    process.env.HYPERFORGE_ASSETS_DIR || path.join(process.cwd(), "assets");
  const assetDir = path.join(assetsDir, assetId);

  // Ensure directory exists
  await fs.mkdir(assetDir, { recursive: true });

  // Save concept art
  const filename = "concept-art.png";
  const filepath = path.join(assetDir, filename);
  const buffer = Buffer.from(result.base64, "base64");
  await fs.writeFile(filepath, buffer);

  console.log(`[Concept Art] Saved to: ${filepath}`);

  return `/api/assets/${assetId}/${filename}`;
}
