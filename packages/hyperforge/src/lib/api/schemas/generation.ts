/**
 * Generation Route Schemas
 *
 * Zod schemas for /api/generation endpoint
 */

import { z } from "zod";
import {
  AssetCategorySchema,
  GenerationQualitySchema,
  ArtStyleSchema,
} from "./common";

// =============================================================================
// GENERATION CONFIG SCHEMAS
// =============================================================================

/**
 * Pipeline types for 3D generation
 */
export const GenerationPipelineSchema = z.enum(["image-to-3d", "text-to-3d"]);

/**
 * AI provider options
 */
export const AIProviderSchema = z.enum([
  "openai",
  "anthropic",
  "google",
  "meshy",
]);

/**
 * Advanced generation options
 */
export const GenerationOptionsSchema = z.object({
  enablePBR: z.boolean().optional(),
  topology: z.enum(["quad", "triangle"]).optional(),
  targetPolycount: z.number().positive().optional(),
  textureResolution: z.number().positive().optional(),
  style: z.string().optional(),
  negativePrompt: z.string().optional(),
});

/**
 * Full generation configuration
 */
export const GenerationConfigSchema = z.object({
  pipeline: GenerationPipelineSchema.optional(),
  prompt: z.string().min(1),
  provider: AIProviderSchema.optional(),
  quality: GenerationQualitySchema.optional(),
  imageUrl: z.string().url().optional(),
  options: GenerationOptionsSchema.optional(),
  // Additional fields from GenerationFormRouter config
  category: AssetCategorySchema.optional(),
  style: ArtStyleSchema.optional(),
  viewAngle: z.string().optional(),
  assetType: z.string().optional(),
});

// =============================================================================
// GENERATION REQUEST SCHEMAS
// =============================================================================

/**
 * Generate action - creates a new 3D model
 */
export const GenerateActionSchema = z.object({
  action: z.literal("generate"),
  config: GenerationConfigSchema,
  stream: z.boolean().optional(),
});

/**
 * Generate concept art action - creates preview image before 3D
 */
export const GenerateConceptArtActionSchema = z.object({
  action: z.literal("generate-concept-art"),
  config: z.object({
    prompt: z.string().min(1),
    style: z.string().optional(),
    viewAngle: z.string().optional(),
    assetType: z.string().optional(),
  }),
});

/**
 * Batch generation action
 */
export const BatchActionSchema = z.object({
  action: z.literal("batch"),
  config: GenerationConfigSchema,
  count: z.number().positive().max(10),
});

/**
 * Status check action
 */
export const StatusActionSchema = z.object({
  action: z.literal("status"),
  taskId: z.string().min(1),
  taskType: z.string().optional(),
});

/**
 * Combined generation request schema (discriminated union)
 */
export const GenerationRequestSchema = z.discriminatedUnion("action", [
  GenerateActionSchema,
  GenerateConceptArtActionSchema,
  BatchActionSchema,
  StatusActionSchema,
]);

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type GenerationPipeline = z.infer<typeof GenerationPipelineSchema>;
export type AIProvider = z.infer<typeof AIProviderSchema>;
export type GenerationOptions = z.infer<typeof GenerationOptionsSchema>;
export type GenerationConfig = z.infer<typeof GenerationConfigSchema>;
export type GenerationRequest = z.infer<typeof GenerationRequestSchema>;
