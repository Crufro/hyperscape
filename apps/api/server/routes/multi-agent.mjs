/**
 * Multi-Agent API Routes
 * Collaborative AI content generation with multiple agents
 */

import express from 'express'
import { POST as npcCollaborationHandler } from './generate-npc-collaboration.mjs'
import { POST as playtesterSwarmHandler } from './generate-playtester-swarm.mjs'

const router = express.Router()

/**
 * POST /api/generate-npc-collaboration
 * Multi-agent NPC collaboration for emergent content
 */
router.post('/generate-npc-collaboration', async (req, res) => {
  try {
    await npcCollaborationHandler(req, res)
  } catch (error) {
    console.error('[Multi-Agent] NPC Collaboration error:', error)
    res.status(500).json({
      error: 'Failed to generate NPC collaboration',
      code: 'MULTIAGENT_5000',
      details: error.message
    })
  }
})

/**
 * POST /api/generate-playtester-swarm
 * Generate playtester swarm to test game content
 */
router.post('/generate-playtester-swarm', async (req, res) => {
  try {
    await playtesterSwarmHandler(req, res)
  } catch (error) {
    console.error('[Multi-Agent] Playtester Swarm error:', error)
    res.status(500).json({
      error: 'Failed to generate playtester swarm',
      code: 'MULTIAGENT_5010',
      details: error.message
    })
  }
})

/**
 * GET /api/playtester-personas
 * Get predefined playtester personas
 */
router.get('/playtester-personas', async (req, res) => {
  try {
    // Import personas from playtester-prompts
    const { PLAYTESTER_PERSONAS } = await import('../utils/playtester-prompts.mjs')

    res.json({
      personas: PLAYTESTER_PERSONAS,
      count: PLAYTESTER_PERSONAS.length,
      description: 'Predefined AI playtester personas based on common player archetypes'
    })
  } catch (error) {
    console.error('[Multi-Agent] Playtester Personas error:', error)
    res.status(500).json({
      error: 'Failed to fetch playtester personas',
      code: 'MULTIAGENT_5020',
      details: error.message
    })
  }
})

export default router
