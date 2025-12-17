/**
 * Asset Database Queries
 * CRUD operations for assets using Drizzle ORM
 */

import { eq, desc, and, like, inArray, isNotNull } from "drizzle-orm";
import { db } from "./client";
import { assets, publishHistory, type Asset, type NewAsset } from "./schema";

// Default user ID for internal dev use (no auth required)
const DEFAULT_USER_ID = "hyperforge-dev";

export interface AssetQueryOptions {
  type?: string;
  category?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateAssetInput {
  name: string;
  description?: string;
  type: string;
  category?: string;
  tags?: string[];
  localPath?: string;
  thumbnailPath?: string;
  prompt?: string;
  generationParams?: Record<string, unknown>;
  aiModel?: string;
  pipelineId?: string;
  status?: string;
  parentAssetId?: string;
}

export interface UpdateAssetInput {
  name?: string;
  description?: string;
  type?: string;
  category?: string;
  tags?: string[];
  localPath?: string;
  thumbnailPath?: string;
  cdnUrl?: string;
  cdnThumbnailUrl?: string;
  prompt?: string;
  generationParams?: Record<string, unknown>;
  status?: string;
  visibility?: string;
  license?: string;
  publishedTo?: Array<{
    productId: string;
    externalId: string;
    status: "pending" | "approved" | "rejected";
    publishedAt: string;
  }>;
}

/**
 * Get a single asset by ID
 */
export async function getAssetById(id: string): Promise<Asset | null> {
  const result = await db
    .select()
    .from(assets)
    .where(eq(assets.id, id))
    .limit(1);
  return result[0] || null;
}

/**
 * Get all assets with optional filtering
 */
export async function getAssets(
  options: AssetQueryOptions = {},
): Promise<Asset[]> {
  const { type, category, status, search, limit = 100, offset = 0 } = options;

  let query = db.select().from(assets);

  const conditions = [];

  if (type) {
    conditions.push(eq(assets.type, type));
  }

  if (category) {
    conditions.push(eq(assets.category, category));
  }

  if (status) {
    conditions.push(eq(assets.status, status));
  }

  if (search) {
    conditions.push(like(assets.name, `%${search}%`));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  return query.orderBy(desc(assets.createdAt)).limit(limit).offset(offset);
}

/**
 * Get all variants of an asset (assets with this ID as parent)
 */
export async function getAssetVariants(
  parentAssetId: string,
): Promise<Asset[]> {
  return db
    .select()
    .from(assets)
    .where(eq(assets.parentAssetId, parentAssetId))
    .orderBy(desc(assets.createdAt));
}

/**
 * Create a new asset
 */
export async function createAsset(input: CreateAssetInput): Promise<Asset> {
  const id = crypto.randomUUID();

  const newAsset: NewAsset = {
    id,
    creatorId: DEFAULT_USER_ID,
    name: input.name,
    description: input.description,
    type: input.type,
    category: input.category,
    tags: input.tags || [],
    localPath: input.localPath,
    thumbnailPath: input.thumbnailPath,
    prompt: input.prompt,
    generationParams: input.generationParams,
    aiModel: input.aiModel,
    pipelineId: input.pipelineId,
    status: input.status || "draft",
    parentAssetId: input.parentAssetId,
  };

  const result = await db.insert(assets).values(newAsset).returning();
  return result[0];
}

/**
 * Update an existing asset
 */
export async function updateAsset(
  id: string,
  input: UpdateAssetInput,
): Promise<Asset | null> {
  const updateData: Partial<Asset> = {
    ...input,
    updatedAt: new Date(),
  };

  const result = await db
    .update(assets)
    .set(updateData)
    .where(eq(assets.id, id))
    .returning();

  return result[0] || null;
}

/**
 * Delete an asset and its publish history
 */
export async function deleteAsset(id: string): Promise<boolean> {
  // Delete publish history first (cascade should handle this, but explicit is safer)
  await db.delete(publishHistory).where(eq(publishHistory.assetId, id));

  // Delete the asset
  const result = await db.delete(assets).where(eq(assets.id, id)).returning();
  return result.length > 0;
}

/**
 * Duplicate an asset (creates a copy with new ID)
 */
export async function duplicateAsset(
  sourceId: string,
  newName?: string,
): Promise<Asset | null> {
  const source = await getAssetById(sourceId);
  if (!source) {
    return null;
  }

  const newId = crypto.randomUUID();

  const newAsset: NewAsset = {
    id: newId,
    creatorId: source.creatorId,
    projectId: source.projectId,
    name: newName || `${source.name} (Copy)`,
    description: source.description,
    type: source.type,
    category: source.category,
    tags: source.tags,
    // File paths will be updated after copying files
    localPath: null,
    thumbnailPath: null,
    prompt: source.prompt,
    negativePrompt: source.negativePrompt,
    generationParams: source.generationParams,
    aiModel: source.aiModel,
    pipelineId: source.pipelineId,
    status: "draft",
    visibility: source.visibility,
    license: source.license,
    parentAssetId: sourceId, // Link to original
    version: 1,
  };

  const result = await db.insert(assets).values(newAsset).returning();
  return result[0];
}

/**
 * Update asset file paths after file operations
 */
export async function updateAssetPaths(
  id: string,
  localPath: string,
  thumbnailPath?: string,
  fileSizeBytes?: number,
): Promise<Asset | null> {
  const updateData: Partial<Asset> = {
    localPath,
    thumbnailPath,
    fileSizeBytes,
    updatedAt: new Date(),
  };

  const result = await db
    .update(assets)
    .set(updateData)
    .where(eq(assets.id, id))
    .returning();

  return result[0] || null;
}

/**
 * Update asset status
 */
export async function updateAssetStatus(
  id: string,
  status: string,
): Promise<Asset | null> {
  const result = await db
    .update(assets)
    .set({ status, updatedAt: new Date() })
    .where(eq(assets.id, id))
    .returning();

  return result[0] || null;
}

/**
 * Get assets by IDs
 */
export async function getAssetsByIds(ids: string[]): Promise<Asset[]> {
  if (ids.length === 0) return [];
  return db.select().from(assets).where(inArray(assets.id, ids));
}

/**
 * Search assets by name or description
 */
export async function searchAssets(
  query: string,
  limit: number = 20,
): Promise<Asset[]> {
  return db
    .select()
    .from(assets)
    .where(like(assets.name, `%${query}%`))
    .orderBy(desc(assets.createdAt))
    .limit(limit);
}

/**
 * Get asset count by status
 */
export async function getAssetCountByStatus(): Promise<Record<string, number>> {
  const result = await db.select().from(assets);

  const counts: Record<string, number> = {};
  for (const asset of result) {
    counts[asset.status] = (counts[asset.status] || 0) + 1;
  }

  return counts;
}

/**
 * Get generation history - assets that have generation metadata (prompt)
 * Returns most recent generations first
 */
export async function getGenerationHistory(
  limit: number = 50,
  offset: number = 0,
): Promise<Asset[]> {
  return db
    .select()
    .from(assets)
    .where(isNotNull(assets.prompt))
    .orderBy(desc(assets.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get generation history count
 */
export async function getGenerationHistoryCount(): Promise<number> {
  const result = await db.select().from(assets).where(isNotNull(assets.prompt));
  return result.length;
}
