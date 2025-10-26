/**
 * AI Gateway API Routes
 * Provides endpoints for AI Gateway features:
 * - Available models and pricing
 * - Credit balance and usage
 * - Model selection helpers
 */

import express from 'express'
import { AISDKService } from '../services/AISDKService.mjs'

const router = express.Router()
const aiService = new AISDKService()

/**
 * GET /api/ai-gateway/status
 * Check if AI Gateway is enabled
 */
router.get('/status', async (req, res) => {
  try {
    res.json({
      enabled: aiService.useGateway,
      provider: aiService.useGateway ? 'ai-gateway' : 'direct',
      message: aiService.useGateway
        ? 'Using Vercel AI Gateway for unified model access'
        : 'Using direct provider access (OpenAI, Anthropic)'
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/ai-gateway/models
 * Get all available models with pricing
 */
router.get('/models', async (req, res) => {
  try {
    if (!aiService.useGateway) {
      return res.status(400).json({
        error: 'AI Gateway not enabled. Set AI_GATEWAY_API_KEY to use this endpoint.'
      })
    }

    const models = await aiService.getAvailableModels()
    res.json({
      count: models.length,
      models: models
    })
  } catch (error) {
    console.error('Failed to fetch models:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/ai-gateway/models/:modelId/pricing
 * Get pricing for a specific model
 */
router.get('/models/:modelId/pricing', async (req, res) => {
  try {
    if (!aiService.useGateway) {
      return res.status(400).json({
        error: 'AI Gateway not enabled. Set AI_GATEWAY_API_KEY to use this endpoint.'
      })
    }

    // Replace - with / in model ID (URL encoding)
    const modelId = req.params.modelId.replace('-', '/')
    const pricing = await aiService.getModelPricing(modelId)

    res.json({
      modelId: modelId,
      pricing: pricing
    })
  } catch (error) {
    console.error('Failed to fetch model pricing:', error)
    res.status(404).json({ error: error.message })
  }
})

/**
 * GET /api/ai-gateway/credits
 * Get team credit balance and usage
 */
router.get('/credits', async (req, res) => {
  try {
    if (!aiService.useGateway) {
      return res.status(400).json({
        error: 'AI Gateway not enabled. Set AI_GATEWAY_API_KEY to use this endpoint.'
      })
    }

    const credits = await aiService.getCredits()
    res.json({
      balance: credits.balance,
      totalUsed: credits.totalUsed,
      unit: 'USD'
    })
  } catch (error) {
    console.error('Failed to fetch credits:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/ai-gateway/providers
 * Get list of supported providers
 */
router.get('/providers', async (req, res) => {
  try {
    if (!aiService.useGateway) {
      return res.status(400).json({
        error: 'AI Gateway not enabled. Set AI_GATEWAY_API_KEY to use this endpoint.'
      })
    }

    const models = await aiService.getAvailableModels()

    // Extract unique providers
    const providers = [...new Set(models.map(m => m.id.split('/')[0]))]

    res.json({
      count: providers.length,
      providers: providers.sort()
    })
  } catch (error) {
    console.error('Failed to fetch providers:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/ai-gateway/estimate
 * Estimate cost for a generation request
 *
 * Body:
 * {
 *   "model": "openai/gpt-4",
 *   "inputTokens": 1000,
 *   "outputTokens": 500
 * }
 */
router.post('/estimate', async (req, res) => {
  try {
    if (!aiService.useGateway) {
      return res.status(400).json({
        error: 'AI Gateway not enabled. Set AI_GATEWAY_API_KEY to use this endpoint.'
      })
    }

    const { model, inputTokens, outputTokens } = req.body

    if (!model || !inputTokens || !outputTokens) {
      return res.status(400).json({
        error: 'Missing required fields: model, inputTokens, outputTokens'
      })
    }

    const pricing = await aiService.getModelPricing(model)

    if (!pricing) {
      return res.status(404).json({
        error: `Pricing not available for model: ${model}`
      })
    }

    const cost = {
      input: (inputTokens / 1000000) * pricing.input,
      output: (outputTokens / 1000000) * pricing.output,
      total: 0
    }
    cost.total = cost.input + cost.output

    res.json({
      model: model,
      estimate: {
        inputTokens: inputTokens,
        outputTokens: outputTokens,
        costs: {
          input: cost.input.toFixed(6),
          output: cost.output.toFixed(6),
          total: cost.total.toFixed(6)
        },
        unit: 'USD'
      },
      pricing: pricing
    })
  } catch (error) {
    console.error('Failed to estimate cost:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
