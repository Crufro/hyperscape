/**
 * Asset Types
 * Unified types for all assets (CDN, Local, Base)
 */

import type { AssetSource, AssetRarity, AssetCategory } from "@/lib/cdn/types";

export interface SpriteData {
  angle: string;
  imageUrl: string;
}

export interface BaseAssetData {
  id: string;
  name: string;
  source: AssetSource;
  category: AssetCategory;
  description?: string;
  thumbnailUrl?: string;
  modelUrl?: string;
  rarity?: AssetRarity;
  /** Whether this asset has a VRM version */
  hasVRM?: boolean;
  /** URL to the VRM model (if available) */
  vrmUrl?: string;
  /** Path to the VRM model (if available) */
  vrmPath?: string;
  /** Whether this asset has hand bones added */
  hasHandRigging?: boolean;
  /** Whether this asset has generated sprites */
  hasSprites?: boolean;
  /** Array of sprite images for this asset */
  sprites?: SpriteData[];
}

export interface CDNAssetData extends BaseAssetData {
  source: "CDN";
  modelPath: string;
}

export interface LocalAssetData extends BaseAssetData {
  source: "LOCAL";
  status: "draft" | "processing" | "completed" | "failed";
  localPath: string;
  createdAt: Date;
  updatedAt: Date;
  prompt?: string;
  generationParams?: Record<string, unknown>;
}

export interface BaseTemplateAssetData extends BaseAssetData {
  source: "BASE";
  modelPath: string;
}

export type AssetData = CDNAssetData | LocalAssetData | BaseTemplateAssetData;
