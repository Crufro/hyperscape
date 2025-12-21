"use client";

import type { AssetCategory } from "@/types/categories";
import type { GenerationFormMetadata } from "@/types/metadata";
import { NPCGenerationForm } from "./forms/NPCGenerationForm";
import { ResourceGenerationForm } from "./forms/ResourceGenerationForm";
import { WeaponGenerationForm } from "./forms/WeaponGenerationForm";
import { EnvironmentGenerationForm } from "./forms/EnvironmentGenerationForm";
import { PropGenerationForm } from "./forms/PropGenerationForm";
import { BuildingGenerationForm } from "./forms/BuildingGenerationForm";

interface GenerationFormRouterProps {
  category: AssetCategory | null;
  onGenerate: (config: GenerationConfig) => void;
  onCancel: () => void;
  /** Initial config from preset selection */
  initialConfig?: Partial<GenerationConfig>;
}

/**
 * Texture variant definition for generating multiple texture variations of a base model
 * Follows RuneScape-style material tier patterns (bronze, steel, mithril, etc.)
 */
export interface TextureVariant {
  id: string;
  name: string; // e.g., "Bronze", "Mithril", "Copper Ore"
  prompt?: string; // Text prompt for this variant's texture
  referenceImageUrl?: string; // Optional image reference for texturing
  materialPresetId?: string; // Link to material preset from material-presets.json
}

/**
 * Generated variant result after processing
 */
export interface GeneratedVariant {
  id: string;
  variantId: string; // References TextureVariant.id
  name: string;
  modelUrl: string;
  thumbnailUrl?: string;
  materialPresetId?: string;
}

/**
 * Options for what files to save after generation
 */
export interface SaveOptions {
  saveBaseMesh: boolean; // Untextured mesh only (for variant base)
  saveTexturedModel: boolean; // With base texture applied
  saveVariants: boolean; // Generate and save texture variants
}

export interface GenerationConfig {
  category: AssetCategory;
  prompt: string;
  pipeline: "text-to-3d" | "image-to-3d";
  imageUrl?: string;
  quality: "preview" | "medium" | "high"; // Maps to Meshy AI models: meshy-4, meshy-5, latest
  metadata: GenerationFormMetadata;
  convertToVRM?: boolean; // Automatically convert to VRM format after generation
  enableHandRigging?: boolean; // Add hand bones for proper finger animation (requires VRM)
  useGPT4Enhancement?: boolean; // Enhance prompt with GPT-4 via Vercel AI Gateway
  generateConceptArt?: boolean; // Generate concept art image before 3D (improves texturing)
  referenceImageUrl?: string; // Custom reference image URL (HTTP URL for Meshy texture_image_url)
  referenceImageDataUrl?: string; // Custom reference image as data URL (fallback)

  // Concept Art Options
  useConceptArtForTexturing?: boolean; // Whether to use generated concept art for texturing

  // Save Options
  saveOptions?: SaveOptions;

  // Texture Variants (upfront definition for batch generation)
  textureVariants?: TextureVariant[];

  // Mesh Quality Options
  options?: {
    enablePBR?: boolean;
    topology?: "quad" | "triangle";
    targetPolycount?: number;
    textureResolution?: number;
    style?: string;
    negativePrompt?: string;
  };
}

export function GenerationFormRouter({
  category,
  onGenerate,
  onCancel,
  initialConfig,
}: GenerationFormRouterProps) {
  if (!category) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a category to begin
      </div>
    );
  }

  const commonProps = {
    onGenerate,
    onCancel,
    initialConfig,
  };

  switch (category) {
    case "npc":
    case "character":
      return <NPCGenerationForm {...commonProps} />;
    case "resource":
      return <ResourceGenerationForm {...commonProps} />;
    case "weapon":
      return <WeaponGenerationForm {...commonProps} />;
    case "environment":
      return <EnvironmentGenerationForm {...commonProps} />;
    case "prop":
      return <PropGenerationForm {...commonProps} />;
    case "building":
      return <BuildingGenerationForm {...commonProps} />;
    default:
      return (
        <div className="p-4 text-destructive">Unknown category: {category}</div>
      );
  }
}
