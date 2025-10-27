/**
 * Zod Validation Schemas for AI Model Management
 *
 * Provides runtime validation for:
 * - Model configuration data
 * - API request/response payloads
 * - Database records
 */

import { z } from 'zod'

// =============================================================================
// MODEL ENUMS AND CONSTANTS
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
// CORE MODEL SCHEMAS
// =============================================================================

/**
 * Pricing information schema
 */
export const PricingSchema = z.object({
  input: z.number().positive().describe('Cost per 1M input tokens/units'),
  output: z.number().positive().describe('Cost per 1M output tokens/units'),
  currency: z.literal('USD').default('USD')
})

/**
 * Model capabilities schema
 */
export const CapabilitiesSchema = z.array(z.enum([
  'function-calling',
  'vision',
  'audio',
  'video',
  'streaming',
  'thinking',
  'reasoning',
  'code-execution',
  'computer-use',
  'grounding',
  'multimodal'
]))

/**
 * Default model settings schema
 */
export const DefaultSettingsSchema = z.object({
  temperature: z.number().min(0).max(2).nullable().default(0.7),
  maxTokens: z.number().int().positive().nullable().optional()
})

/**
 * Complete AI Model schema
 */
export const AIModelSchema = z.object({
  id: z.string().min(1).describe('Model ID in format: provider/model-name'),
  name: z.string().min(1).describe('Display name'),
  provider: ModelProviderSchema,
  category: ModelCategorySchema,
  tier: ModelTierSchema,
  description: z.string().optional(),
  capabilities: CapabilitiesSchema.optional().default([]),
  contextWindow: z.number().int().positive().nullable().optional(),
  maxOutputTokens: z.number().int().positive().nullable().optional(),
  pricing: PricingSchema.nullable().optional(),
  isRecommended: z.boolean().default(false),
  defaultSettings: DefaultSettingsSchema.optional()
})

// =============================================================================
// API REQUEST SCHEMAS
// =============================================================================

/**
 * Request to enable a model (admin)
 */
export const EnableModelRequestSchema = z.object({
  modelId: z.string().min(1),
  provider: ModelProviderSchema,
  category: ModelCategorySchema,
  displayName: z.string().min(1).optional(),
  description: z.string().optional(),
  tier: ModelTierSchema.optional(),
  capabilities: CapabilitiesSchema.optional(),
  contextWindow: z.number().int().positive().optional(),
  maxOutputTokens: z.number().int().positive().optional(),
  pricing: PricingSchema.optional(),
  isRecommended: z.boolean().optional(),
  defaultTemperature: z.number().min(0).max(2).optional(),
  defaultMaxTokens: z.number().int().positive().optional()
})

/**
 * Request to update a model (admin)
 */
export const UpdateModelRequestSchema = z.object({
  isEnabled: z.boolean().optional(),
  isRecommended: z.boolean().optional(),
  displayName: z.string().min(1).optional(),
  description: z.string().optional(),
  tier: ModelTierSchema.optional(),
  defaultTemperature: z.number().min(0).max(2).optional(),
  defaultMaxTokens: z.number().int().positive().optional(),
  pricing: PricingSchema.partial().optional()
}).strict() // Reject unknown fields

/**
 * Query parameters for fetching models
 */
export const GetModelsQuerySchema = z.object({
  category: ModelCategorySchema.optional(),
  tier: ModelTierSchema.optional(),
  provider: ModelProviderSchema.optional(),
  recommendedOnly: z.boolean().optional(),
  enabled: z.boolean().optional().default(true)
})

// =============================================================================
// API RESPONSE SCHEMAS
// =============================================================================

/**
 * Single model response
 */
export const ModelResponseSchema = z.object({
  id: z.string(),
  modelId: z.string(),
  provider: z.string(),
  category: z.string(),
  displayName: z.string(),
  description: z.string().nullable().optional(),
  tier: z.string(),
  capabilities: z.array(z.string()),
  contextWindow: z.number().nullable().optional(),
  maxOutputTokens: z.number().nullable().optional(),
  pricing: PricingSchema.nullable().optional(),
  isEnabled: z.boolean(),
  isRecommended: z.boolean(),
  defaultSettings: DefaultSettingsSchema.optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
})

/**
 * List of models response
 */
export const ModelsListResponseSchema = z.object({
  category: ModelCategorySchema.optional(),
  count: z.number().int().nonnegative(),
  models: z.array(AIModelSchema)
})

/**
 * Grouped models response
 */
export const GroupedModelsResponseSchema = z.object({
  categories: z.array(ModelCategorySchema),
  models: z.record(ModelCategorySchema, z.array(AIModelSchema)),
  totalEnabled: z.number().int().nonnegative()
})

// =============================================================================
// ERROR RESPONSE SCHEMA
// =============================================================================

export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  message: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
  validCategories: z.array(z.string()).optional(),
  timestamp: z.string()
})

// =============================================================================
// TYPE EXPORTS (for TypeScript)
// =============================================================================

export type ModelCategory = z.infer<typeof ModelCategorySchema>
export type ModelTier = z.infer<typeof ModelTierSchema>
export type ModelProvider = z.infer<typeof ModelProviderSchema>
export type Pricing = z.infer<typeof PricingSchema>
export type Capabilities = z.infer<typeof CapabilitiesSchema>
export type DefaultSettings = z.infer<typeof DefaultSettingsSchema>
export type AIModel = z.infer<typeof AIModelSchema>
export type EnableModelRequest = z.infer<typeof EnableModelRequestSchema>
export type UpdateModelRequest = z.infer<typeof UpdateModelRequestSchema>
export type GetModelsQuery = z.infer<typeof GetModelsQuerySchema>
export type ModelResponse = z.infer<typeof ModelResponseSchema>
export type ModelsListResponse = z.infer<typeof ModelsListResponseSchema>
export type GroupedModelsResponse = z.infer<typeof GroupedModelsResponseSchema>
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>

// =============================================================================
// VALIDATION HELPER FUNCTIONS
// =============================================================================

/**
 * Validate and parse data against a schema
 * Returns typed data or throws validation error
 */
export function validateSchema<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): z.infer<T> {
  return schema.parse(data)
}

/**
 * Safely validate data against a schema
 * Returns { success: true, data } or { success: false, error }
 */
export function safeValidateSchema<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
) {
  return schema.safeParse(data)
}

/**
 * Create a validation error response
 */
export function createValidationError(error: z.ZodError<unknown>): ErrorResponse {
  return {
    error: 'Validation failed',
    code: 'MODEL_2105',
    message: error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
    details: {
      errors: error.issues.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code
      }))
    },
    timestamp: new Date().toISOString()
  }
}
