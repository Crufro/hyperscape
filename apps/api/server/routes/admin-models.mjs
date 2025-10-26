/**
 * Admin Model Configuration Routes
 * Allows admins to configure which AI models are used for different tasks
 */

import express from 'express'
import { query } from '../database/db.mjs'
import { AISDKService } from '../services/AISDKService.mjs'

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

export default router
