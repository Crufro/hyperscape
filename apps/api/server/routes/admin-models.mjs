/**
 * Admin Model Configuration Routes
 * Allows admins to configure which AI models are used for different tasks
 */

import express from 'express'
import { query } from '../database/db.mjs'
import { AISDKService } from '../services/AISDKService.mjs'
import { validateBody, validateParams } from '../middleware/validation.mjs'
import {
  EnableModelBodySchema,
  UpdateModelBodySchema,
  ModelIdParamSchema
} from '../validation/model-schemas.mjs'

const router = express.Router()
const aiService = new AISDKService()

// Create db object wrapper for compatibility
const db = { query }

/**
 * GET /api/admin/models
 * Get all model configurations
 */
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        id,
        task_type,
        model_id,
        provider,
        temperature,
        max_tokens,
        display_name,
        description,
        pricing_input,
        pricing_output,
        is_active,
        updated_at
      FROM model_configurations
      ORDER BY task_type
    `)

    res.json({
      count: result.rows.length,
      models: result.rows.map(row => ({
        id: row.id,
        taskType: row.task_type,
        modelId: row.model_id,
        provider: row.provider,
        temperature: parseFloat(row.temperature),
        maxTokens: row.max_tokens,
        displayName: row.display_name,
        description: row.description,
        pricing: row.pricing_input ? {
          input: parseFloat(row.pricing_input),
          output: parseFloat(row.pricing_output)
        } : null,
        isActive: row.is_active,
        updatedAt: row.updated_at
      }))
    })
  } catch (error) {
    console.error('Failed to fetch model configurations:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/admin/models/available
 * Get available models from AI Gateway
 */
router.get('/available', async (req, res) => {
  try {
    if (!aiService.useGateway) {
      return res.status(400).json({
        error: 'AI Gateway not enabled. Set AI_GATEWAY_API_KEY to use this feature.'
      })
    }

    const models = await aiService.getAvailableModels()

    res.json({
      count: models.length,
      models: models.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description,
        provider: m.id.split('/')[0],
        pricing: m.pricing
      }))
    })
  } catch (error) {
    console.error('Failed to fetch available models:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/admin/models/:taskType
 * Get model configuration for a specific task
 */
router.get('/:taskType', async (req, res) => {
  try {
    const { taskType } = req.params

    const result = await db.query(`
      SELECT
        id,
        task_type,
        model_id,
        provider,
        temperature,
        max_tokens,
        display_name,
        description,
        pricing_input,
        pricing_output,
        is_active,
        updated_at
      FROM model_configurations
      WHERE task_type = $1
    `, [taskType])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Model configuration not found' })
    }

    const row = result.rows[0]
    res.json({
      id: row.id,
      taskType: row.task_type,
      modelId: row.model_id,
      provider: row.provider,
      temperature: parseFloat(row.temperature),
      maxTokens: row.max_tokens,
      displayName: row.display_name,
      description: row.description,
      pricing: row.pricing_input ? {
        input: parseFloat(row.pricing_input),
        output: parseFloat(row.pricing_output)
      } : null,
      isActive: row.is_active,
      updatedAt: row.updated_at
    })
  } catch (error) {
    console.error('Failed to fetch model configuration:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * PUT /api/admin/models/:taskType
 * Update model configuration for a specific task
 */
router.put('/:taskType', async (req, res) => {
  try {
    const { taskType } = req.params
    const { modelId, temperature, maxTokens, isActive } = req.body
    const userId = req.headers['x-user-id']

    if (!modelId) {
      return res.status(400).json({ error: 'modelId is required' })
    }

    // Extract provider from modelId (e.g., 'openai/gpt-4' -> 'openai')
    const provider = modelId.split('/')[0]

    // Fetch pricing if using gateway
    let pricingInput = null
    let pricingOutput = null

    if (aiService.useGateway) {
      try {
        const pricing = await aiService.getModelPricing(modelId)
        pricingInput = pricing.input
        pricingOutput = pricing.output
      } catch (error) {
        console.warn('Failed to fetch pricing for model:', modelId, error.message)
      }
    }

    // Update or insert configuration
    const result = await db.query(`
      INSERT INTO model_configurations (
        task_type,
        model_id,
        provider,
        temperature,
        max_tokens,
        pricing_input,
        pricing_output,
        is_active,
        updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (task_type) DO UPDATE SET
        model_id = EXCLUDED.model_id,
        provider = EXCLUDED.provider,
        temperature = EXCLUDED.temperature,
        max_tokens = EXCLUDED.max_tokens,
        pricing_input = EXCLUDED.pricing_input,
        pricing_output = EXCLUDED.pricing_output,
        is_active = EXCLUDED.is_active,
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      taskType,
      modelId,
      provider,
      temperature || 0.7,
      maxTokens || null,
      pricingInput,
      pricingOutput,
      isActive !== undefined ? isActive : true,
      userId || null
    ])

    const row = result.rows[0]
    res.json({
      id: row.id,
      taskType: row.task_type,
      modelId: row.model_id,
      provider: row.provider,
      temperature: parseFloat(row.temperature),
      maxTokens: row.max_tokens,
      pricing: row.pricing_input ? {
        input: parseFloat(row.pricing_input),
        output: parseFloat(row.pricing_output)
      } : null,
      isActive: row.is_active,
      updatedAt: row.updated_at
    })
  } catch (error) {
    console.error('Failed to update model configuration:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * DELETE /api/admin/models/:taskType
 * Delete model configuration (reset to default)
 */
router.delete('/:taskType', async (req, res) => {
  try {
    const { taskType } = req.params

    const result = await db.query(`
      DELETE FROM model_configurations
      WHERE task_type = $1
      RETURNING task_type
    `, [taskType])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Model configuration not found' })
    }

    res.json({
      message: 'Model configuration deleted',
      taskType: result.rows[0].task_type
    })
  } catch (error) {
    console.error('Failed to delete model configuration:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/admin/settings
 * Get system settings
 */
router.get('/settings/all', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        setting_key,
        setting_value,
        description,
        updated_at
      FROM system_settings
      ORDER BY setting_key
    `)

    const settings = {}
    result.rows.forEach(row => {
      settings[row.setting_key] = {
        value: row.setting_value,
        description: row.description,
        updatedAt: row.updated_at
      }
    })

    res.json({ settings })
  } catch (error) {
    console.error('Failed to fetch system settings:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * PUT /api/admin/settings/:key
 * Update a system setting
 */
router.put('/settings/:key', async (req, res) => {
  try {
    const { key } = req.params
    const { value } = req.body
    const userId = req.headers['x-user-id']

    if (value === undefined) {
      return res.status(400).json({ error: 'value is required' })
    }

    const result = await db.query(`
      UPDATE system_settings
      SET
        setting_value = $1,
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE setting_key = $3
      RETURNING *
    `, [JSON.stringify(value), userId || null, key])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' })
    }

    const row = result.rows[0]
    res.json({
      key: row.setting_key,
      value: row.setting_value,
      description: row.description,
      updatedAt: row.updated_at
    })
  } catch (error) {
    console.error('Failed to update system setting:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// ENABLED MODELS MANAGEMENT
// Admin endpoints for managing which models are enabled platform-wide
// =============================================================================

// Valid model categories and tiers for validation
const VALID_CATEGORIES = ['text-generation', 'image-generation', 'voice-generation', 'embedding', '3d-generation']
const VALID_TIERS = ['quality', 'speed', 'balanced', 'cost']

/**
 * Validate model configuration data
 */
function validateModelConfig(data) {
  const errors = []

  if (!data.modelId) {
    errors.push('modelId is required')
  }

  if (!data.provider) {
    errors.push('provider is required')
  }

  if (!data.category || !VALID_CATEGORIES.includes(data.category)) {
    errors.push(`category must be one of: ${VALID_CATEGORIES.join(', ')}`)
  }

  if (data.tier && !VALID_TIERS.includes(data.tier)) {
    errors.push(`tier must be one of: ${VALID_TIERS.join(', ')}`)
  }

  if (data.pricing && (!data.pricing.input || !data.pricing.output)) {
    errors.push('pricing must include both input and output values')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * GET /api/admin/models/enabled
 * Get all enabled models
 */
router.get('/enabled/all', async (req, res) => {
  const startTime = Date.now()

  try {
    console.log('[Admin Models] Fetching all enabled models')

    const result = await db.query(`
      SELECT
        id,
        model_id,
        provider,
        category,
        display_name,
        description,
        tier,
        capabilities,
        context_window,
        max_output_tokens,
        pricing_input,
        pricing_output,
        pricing_currency,
        is_enabled,
        is_recommended,
        default_temperature,
        default_max_tokens,
        created_at,
        updated_at
      FROM enabled_models
      ORDER BY category, tier, display_name
    `)

    const duration = Date.now() - startTime
    console.log(`[Admin Models] Fetched ${result.rows.length} enabled models (${duration}ms)`)

    res.json({
      count: result.rows.length,
      models: result.rows.map(row => ({
        id: row.id,
        modelId: row.model_id,
        provider: row.provider,
        category: row.category,
        displayName: row.display_name,
        description: row.description,
        tier: row.tier,
        capabilities: row.capabilities || [],
        contextWindow: row.context_window,
        maxOutputTokens: row.max_output_tokens,
        pricing: row.pricing_input ? {
          input: parseFloat(row.pricing_input),
          output: parseFloat(row.pricing_output),
          currency: row.pricing_currency || 'USD'
        } : null,
        isEnabled: row.is_enabled,
        isRecommended: row.is_recommended,
        defaultSettings: {
          temperature: row.default_temperature ? parseFloat(row.default_temperature) : null,
          maxTokens: row.default_max_tokens
        },
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[Admin Models] Failed to fetch enabled models (${duration}ms):`, error.message)
    console.error('[Admin Models] Error stack:', error.stack)

    res.status(500).json({
      error: 'Failed to fetch enabled models',
      code: 'MODEL_2104',
      message: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * POST /api/admin/models/enabled
 * Enable a new model or update existing
 */
router.post('/enabled', validateBody(EnableModelBodySchema), async (req, res) => {
  const startTime = Date.now()

  try {
    const {
      modelId,
      provider,
      category,
      displayName,
      description,
      tier,
      capabilities,
      contextWindow,
      maxOutputTokens,
      pricing,
      isRecommended,
      defaultTemperature,
      defaultMaxTokens
    } = req.body

    console.log(`[Admin Models] Enabling model: ${modelId}`)

    // Validate input
    const validation = validateModelConfig({
      modelId,
      provider,
      category,
      tier,
      pricing
    })

    if (!validation.valid) {
      console.warn(`[Admin Models] Validation failed for ${modelId}:`, validation.errors)
      return res.status(400).json({
        error: 'Validation failed',
        code: 'MODEL_2105',
        errors: validation.errors,
        timestamp: new Date().toISOString()
      })
    }

    const userId = req.headers['x-user-id']

    const result = await db.query(`
      INSERT INTO enabled_models (
        model_id,
        provider,
        category,
        display_name,
        description,
        tier,
        capabilities,
        context_window,
        max_output_tokens,
        pricing_input,
        pricing_output,
        pricing_currency,
        is_enabled,
        is_recommended,
        default_temperature,
        default_max_tokens,
        created_by,
        updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (model_id) DO UPDATE SET
        provider = EXCLUDED.provider,
        category = EXCLUDED.category,
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        tier = EXCLUDED.tier,
        capabilities = EXCLUDED.capabilities,
        context_window = EXCLUDED.context_window,
        max_output_tokens = EXCLUDED.max_output_tokens,
        pricing_input = EXCLUDED.pricing_input,
        pricing_output = EXCLUDED.pricing_output,
        pricing_currency = EXCLUDED.pricing_currency,
        is_enabled = true,
        is_recommended = EXCLUDED.is_recommended,
        default_temperature = EXCLUDED.default_temperature,
        default_max_tokens = EXCLUDED.default_max_tokens,
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      modelId,
      provider,
      category,
      displayName || modelId,
      description || null,
      tier || 'balanced',
      capabilities ? JSON.stringify(capabilities) : null,
      contextWindow || null,
      maxOutputTokens || null,
      pricing?.input || null,
      pricing?.output || null,
      pricing?.currency || 'USD',
      true, // is_enabled
      isRecommended || false,
      defaultTemperature || 0.7,
      defaultMaxTokens || null,
      userId || null,
      userId || null
    ])

    const duration = Date.now() - startTime
    console.log(`[Admin Models] Successfully enabled model ${modelId} (${duration}ms)`)

    const row = result.rows[0]
    res.json({
      id: row.id,
      modelId: row.model_id,
      provider: row.provider,
      category: row.category,
      displayName: row.display_name,
      isEnabled: row.is_enabled,
      isRecommended: row.is_recommended,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })
  } catch (error) {
    const duration = Date.now() - startTime

    // Check for duplicate key constraint
    if (error.code === '23505') {
      console.warn(`[Admin Models] Model already exists: ${req.body.modelId}`)
      return res.status(409).json({
        error: 'Model already enabled',
        code: 'MODEL_2103',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    }

    console.error(`[Admin Models] Failed to enable model (${duration}ms):`, error.message)
    console.error('[Admin Models] Error stack:', error.stack)

    res.status(500).json({
      error: 'Failed to enable model',
      code: 'MODEL_2106',
      message: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * PATCH /api/admin/models/enabled/:modelId
 * Update an enabled model's settings
 */
router.patch('/enabled/:modelId', validateParams(ModelIdParamSchema), validateBody(UpdateModelBodySchema), async (req, res) => {
  const startTime = Date.now()
  const { modelId } = req.params

  try {
    console.log(`[Admin Models] Updating model: ${modelId}`)

    const {
      isEnabled,
      isRecommended,
      displayName,
      description,
      tier,
      defaultTemperature,
      defaultMaxTokens,
      pricing
    } = req.body

    const userId = req.headers['x-user-id']

    // Build dynamic UPDATE query
    const updates = []
    const values = []
    let paramCount = 1

    if (isEnabled !== undefined) {
      updates.push(`is_enabled = $${paramCount++}`)
      values.push(isEnabled)
    }
    if (isRecommended !== undefined) {
      updates.push(`is_recommended = $${paramCount++}`)
      values.push(isRecommended)
    }
    if (displayName) {
      updates.push(`display_name = $${paramCount++}`)
      values.push(displayName)
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`)
      values.push(description)
    }
    if (tier && VALID_TIERS.includes(tier)) {
      updates.push(`tier = $${paramCount++}`)
      values.push(tier)
    }
    if (defaultTemperature !== undefined) {
      updates.push(`default_temperature = $${paramCount++}`)
      values.push(defaultTemperature)
    }
    if (defaultMaxTokens !== undefined) {
      updates.push(`default_max_tokens = $${paramCount++}`)
      values.push(defaultMaxTokens)
    }
    if (pricing) {
      if (pricing.input !== undefined) {
        updates.push(`pricing_input = $${paramCount++}`)
        values.push(pricing.input)
      }
      if (pricing.output !== undefined) {
        updates.push(`pricing_output = $${paramCount++}`)
        values.push(pricing.output)
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update',
        code: 'MODEL_2105',
        timestamp: new Date().toISOString()
      })
    }

    updates.push(`updated_by = $${paramCount++}`)
    values.push(userId || null)
    updates.push(`updated_at = CURRENT_TIMESTAMP`)

    values.push(modelId)
    const modelIdParam = `$${paramCount}`

    const result = await db.query(`
      UPDATE enabled_models
      SET ${updates.join(', ')}
      WHERE model_id = ${modelIdParam}
      RETURNING *
    `, values)

    if (result.rows.length === 0) {
      console.warn(`[Admin Models] Model not found: ${modelId}`)
      return res.status(404).json({
        error: 'Model not found',
        code: 'MODEL_2100',
        modelId: modelId,
        timestamp: new Date().toISOString()
      })
    }

    const duration = Date.now() - startTime
    console.log(`[Admin Models] Successfully updated model ${modelId} (${duration}ms)`)

    const row = result.rows[0]
    res.json({
      id: row.id,
      modelId: row.model_id,
      provider: row.provider,
      category: row.category,
      displayName: row.display_name,
      tier: row.tier,
      isEnabled: row.is_enabled,
      isRecommended: row.is_recommended,
      updatedAt: row.updated_at
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[Admin Models] Failed to update model ${modelId} (${duration}ms):`, error.message)
    console.error('[Admin Models] Error stack:', error.stack)

    res.status(500).json({
      error: 'Failed to update model',
      code: 'MODEL_2106',
      message: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * DELETE /api/admin/models/enabled/:modelId
 * Disable a model (sets is_enabled = false)
 */
router.delete('/enabled/:modelId', validateParams(ModelIdParamSchema), async (req, res) => {
  const startTime = Date.now()
  const { modelId } = req.params

  try {
    console.log(`[Admin Models] Disabling model: ${modelId}`)

    const userId = req.headers['x-user-id']

    const result = await db.query(`
      UPDATE enabled_models
      SET
        is_enabled = false,
        updated_by = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE model_id = $2
      RETURNING model_id, display_name
    `, [userId || null, modelId])

    if (result.rows.length === 0) {
      console.warn(`[Admin Models] Model not found: ${modelId}`)
      return res.status(404).json({
        error: 'Model not found',
        code: 'MODEL_2100',
        modelId: modelId,
        timestamp: new Date().toISOString()
      })
    }

    const duration = Date.now() - startTime
    console.log(`[Admin Models] Successfully disabled model ${modelId} (${duration}ms)`)

    res.json({
      message: 'Model disabled successfully',
      modelId: result.rows[0].model_id,
      displayName: result.rows[0].display_name
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[Admin Models] Failed to disable model ${modelId} (${duration}ms):`, error.message)
    console.error('[Admin Models] Error stack:', error.stack)

    res.status(500).json({
      error: 'Failed to disable model',
      code: 'MODEL_2107',
      message: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

export default router
