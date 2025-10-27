/**
 * Quest API Routes
 * Endpoints for quest management and AI-powered quest fixing
 */

import express from 'express'
import db from '../database/db.mjs'
import { AISDKService } from '../services/AISDKService.mjs'
import QuestFixService from '../services/QuestFixService.mjs'

const router = express.Router()
const aiService = new AISDKService()

/**
 * POST /api/quests/fix-with-ai
 * Fix a quest based on playtester feedback using AI
 */
router.post('/fix-with-ai', async (req, res) => {
  const startTime = Date.now()

  try {
    const {
      quest,
      playtestFindings,
      fixOptions = {}
    } = req.body

    // Validate request
    if (!quest) {
      return res.status(400).json({
        error: 'Missing quest data',
        code: 'QUEST_4000'
      })
    }

    if (!playtestFindings) {
      return res.status(400).json({
        error: 'Missing playtester findings',
        code: 'QUEST_4001'
      })
    }

    console.log(`[Quest API] Fixing quest: ${quest.title || quest.id}`)
    console.log(`[Quest API] Playtester grade: ${playtestFindings.grade || 'N/A'}`)
    console.log(`[Quest API] Bug count: ${playtestFindings.bugReports?.length || 0}`)
    console.log(`[Quest API] Recommendation count: ${playtestFindings.recommendations?.length || 0}`)

    // Initialize quest fix service
    const questFixService = new QuestFixService(db, aiService)

    // Process playtester findings into the format expected by the service
    const formattedFindings = {
      grade: playtestFindings.summary?.grade || playtestFindings.grade,
      gradeScore: playtestFindings.summary?.gradeScore || playtestFindings.gradeScore || 0,
      recommendation: playtestFindings.summary?.recommendation || playtestFindings.recommendation,
      consensus: playtestFindings.consensus?.summary || '',
      bugReports: playtestFindings.bugReports || playtestFindings.aggregatedMetrics?.bugReports || [],
      recommendations: playtestFindings.recommendations || [],
      completionRate: playtestFindings.qualityMetrics?.completionRate || playtestFindings.aggregatedMetrics?.completionRate || 'N/A',
      avgDifficulty: playtestFindings.aggregatedMetrics?.averageDifficulty || 'N/A',
      avgEngagement: playtestFindings.aggregatedMetrics?.averageEngagement || 'N/A',
      pacing: playtestFindings.aggregatedMetrics?.pacing ? Object.keys(playtestFindings.aggregatedMetrics.pacing).sort((a, b) => playtestFindings.aggregatedMetrics.pacing[b] - playtestFindings.aggregatedMetrics.pacing[a])[0] : 'unknown',
      confusionPoints: playtestFindings.aggregatedMetrics?.confusionPoints || []
    }

    // Fix the quest
    const fixResult = await questFixService.fixQuest(quest, formattedFindings, {
      useEmbeddings: fixOptions.useEmbeddings !== false,
      model: fixOptions.model,
      temperature: fixOptions.temperature || 0.3
    })

    // Validate the fixed quest
    const validation = questFixService.validateFixedQuest(fixResult)

    if (!validation.valid) {
      console.error('[Quest API] Fixed quest validation failed:', validation.errors)
      return res.status(500).json({
        error: 'AI generated invalid quest fixes',
        code: 'QUEST_4002',
        validationErrors: validation.errors,
        details: 'The AI-generated fixes did not pass validation'
      })
    }

    if (validation.warnings.length > 0) {
      console.warn('[Quest API] Fixed quest has warnings:', validation.warnings)
    }

    const duration = Date.now() - startTime

    console.log(`[Quest API] Quest fixed successfully (${duration}ms)`)
    console.log(`[Quest API] Changes made: ${fixResult.changes.length}`)
    console.log(`[Quest API] Bugs fixed: ${fixResult.fixedIssues.bugsFixed?.length || 0}`)
    console.log(`[Quest API] Recommendations applied: ${fixResult.fixedIssues.recommendationsApplied?.length || 0}`)

    res.json({
      success: true,
      ...fixResult,
      validation: {
        valid: validation.valid,
        warnings: validation.warnings
      },
      duration
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[Quest API] Failed to fix quest (${duration}ms):`, error.message)
    console.error('[Quest API] Error stack:', error.stack)

    res.status(500).json({
      error: 'Failed to fix quest',
      code: 'QUEST_4003',
      message: error.message,
      duration
    })
  }
})

/**
 * POST /api/quests/validate
 * Validate a quest structure
 */
router.post('/validate', async (req, res) => {
  try {
    const { quest } = req.body

    if (!quest) {
      return res.status(400).json({
        error: 'Missing quest data',
        code: 'QUEST_4000'
      })
    }

    const questFixService = new QuestFixService(db, aiService)
    const validation = questFixService.validateFixedQuest({ fixedQuest: quest, changes: [] })

    res.json({
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings
    })
  } catch (error) {
    console.error('[Quest API] Validation failed:', error.message)
    res.status(500).json({
      error: 'Failed to validate quest',
      code: 'QUEST_4004',
      message: error.message
    })
  }
})

export default router
