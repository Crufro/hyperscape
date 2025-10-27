/**
 * Zod Validation Schemas for Model Management API
 *
 * Backend validation schemas for model management endpoints
 */

import { z } from 'zod'

// =============================================================================
// ENUMS
// =============================================================================

export const ModelCategorySchema = z.enum([
  'text-generation',
  'image-generation',
  'voice-generation',
  'embedding',
  '3d-generation'
])

export const ModelTierSchema = z.enum([
  'quality',
  'speed',
  'balanced',
  'cost'
])

export const ModelProviderSchema = z.enum([
  'openai',
  'anthropic',
  'google',
  'elevenlabs',
  'meshy',
  'cohere',
  'replicate'
])

// =============================================================================
// ROUTE PARAMETER SCHEMAS
// =============================================================================

export const CategoryParamSchema = z.object({
  category: ModelCategorySchema
})

export const ModelIdParamSchema = z.object({
  modelId: z.string().min(1).regex(/^[\w-]+\/[\w-]+$/, 'Must be in format: provider/model-name')
})

// =============================================================================
// REQUEST BODY SCHEMAS
// =============================================================================

/**
 * Schema for enabling a new model
 */
export const EnableModelBodySchema = z.object({
  modelId: z.string().min(1).regex(/^[\w-]+\/[\w-]+$/),
  provider: ModelProviderSchema,
  category: ModelCategorySchema,
  displayName: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  tier: ModelTierSchema.optional(),
  capabilities: z.array(z.string()).optional(),
  contextWindow: z.number().int().positive().max(10000000).optional(),
  maxOutputTokens: z.number().int().positive().max(1000000).optional(),
  pricing: z.object({
    input: z.number().positive(),
    output: z.number().positive(),
    currency: z.literal('USD').default('USD')
  }).optional(),
  isRecommended: z.boolean().optional(),
  defaultTemperature: z.number().min(0).max(2).optional(),
  defaultMaxTokens: z.number().int().positive().optional()
}).strict()

/**
 * Schema for updating an existing model
 */
export const UpdateModelBodySchema = z.object({
  isEnabled: z.boolean().optional(),
  isRecommended: z.boolean().optional(),
  displayName: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  tier: ModelTierSchema.optional(),
  defaultTemperature: z.number().min(0).max(2).optional(),
  defaultMaxTokens: z.number().int().positive().optional(),
  pricing: z.object({
    input: z.number().positive().optional(),
    output: z.number().positive().optional()
  }).optional()
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
)

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Validate category parameter
 */
export function isValidCategory(category) {
  return ModelCategorySchema.safeParse(category).success
}

/**
 * Validate tier parameter
 */
export function isValidTier(tier) {
  return ModelTierSchema.safeParse(tier).success
}

/**
 * Validate model ID format
 */
export function isValidModelId(modelId) {
  return /^[\w-]+\/[\w-]+$/.test(modelId)
}
