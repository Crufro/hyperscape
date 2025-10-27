/**
 * Voice Assignments API Routes
 * Handles voice assignment persistence for NPCs and Mobs from game manifests
 */

import express from 'express'
import { query } from '../database/db.mjs'

const router = express.Router()

/**
 * GET /api/voice-assignments/:manifestId
 * Get voice assignments for a specific manifest
 */
router.get('/:manifestId', async (req, res) => {
  try {
    const { manifestId } = req.params

    const result = await query(
      'SELECT * FROM voice_manifests WHERE id = $1',
      [manifestId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: `Voice manifest '${manifestId}' not found`
      })
    }

    const manifest = result.rows[0]

    res.json({
      manifestId: manifest.id,
      name: manifest.name,
      description: manifest.description,
      assignments: manifest.voice_assignments || [],
      version: manifest.version,
      updatedAt: manifest.updated_at,
      createdAt: manifest.created_at
    })
  } catch (error) {
    console.error('[VoiceAssignments API] Error retrieving assignments:', error)
    res.status(500).json({
      error: 'Failed to retrieve voice assignments',
      details: error.message
    })
  }
})

/**
 * POST /api/voice-assignments
 * Create new voice assignments manifest
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, assignments, projectId, ownerId } = req.body

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'name is required' })
    }

    if (!assignments || !Array.isArray(assignments)) {
      return res.status(400).json({ error: 'assignments array is required' })
    }

    if (!ownerId) {
      return res.status(400).json({ error: 'ownerId is required' })
    }

    // Validate assignment structure
    for (const assignment of assignments) {
      if (!assignment.npcId || !assignment.voiceId || !assignment.voiceName) {
        return res.status(400).json({
          error: 'Each assignment must have npcId, voiceId, and voiceName'
        })
      }
    }

    const result = await query(
      `INSERT INTO voice_manifests (name, description, voice_assignments, project_id, owner_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, description, JSON.stringify(assignments), projectId || null, ownerId]
    )

    const manifest = result.rows[0]

    res.status(201).json({
      success: true,
      message: 'Voice assignments created successfully',
      manifestId: manifest.id,
      assignments: manifest.voice_assignments,
      createdAt: manifest.created_at
    })
  } catch (error) {
    console.error('[VoiceAssignments API] Error creating assignments:', error)
    res.status(500).json({
      error: 'Failed to create voice assignments',
      details: error.message
    })
  }
})

/**
 * PUT /api/voice-assignments/:manifestId
 * Update existing voice assignments
 */
router.put('/:manifestId', async (req, res) => {
  try {
    const { manifestId } = req.params
    const { name, description, assignments } = req.body

    // Check if manifest exists
    const existing = await query(
      'SELECT * FROM voice_manifests WHERE id = $1',
      [manifestId]
    )

    if (existing.rows.length === 0) {
      return res.status(404).json({
        error: `Voice manifest '${manifestId}' not found`
      })
    }

    // Validate assignments if provided
    if (assignments) {
      if (!Array.isArray(assignments)) {
        return res.status(400).json({ error: 'assignments must be an array' })
      }

      for (const assignment of assignments) {
        if (!assignment.npcId || !assignment.voiceId || !assignment.voiceName) {
          return res.status(400).json({
            error: 'Each assignment must have npcId, voiceId, and voiceName'
          })
        }
      }
    }

    // Build dynamic update query
    const updates = []
    const values = []
    let paramCount = 1

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`)
      values.push(name)
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`)
      values.push(description)
    }

    if (assignments !== undefined) {
      updates.push(`voice_assignments = $${paramCount++}`)
      values.push(JSON.stringify(assignments))
    }

    // Increment version
    updates.push(`version = version + 1`)

    if (updates.length === 1) {
      return res.status(400).json({
        error: 'No valid fields to update'
      })
    }

    values.push(manifestId)

    const result = await query(
      `UPDATE voice_manifests
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    )

    const manifest = result.rows[0]

    res.json({
      success: true,
      message: 'Voice assignments updated successfully',
      manifestId: manifest.id,
      assignments: manifest.voice_assignments,
      version: manifest.version,
      updatedAt: manifest.updated_at
    })
  } catch (error) {
    console.error('[VoiceAssignments API] Error updating assignments:', error)
    res.status(500).json({
      error: 'Failed to update voice assignments',
      details: error.message
    })
  }
})

/**
 * DELETE /api/voice-assignments/:manifestId
 * Delete voice assignments manifest
 */
router.delete('/:manifestId', async (req, res) => {
  try {
    const { manifestId } = req.params

    const result = await query(
      'DELETE FROM voice_manifests WHERE id = $1 RETURNING *',
      [manifestId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: `Voice manifest '${manifestId}' not found`
      })
    }

    res.json({
      success: true,
      message: 'Voice assignments deleted successfully',
      manifestId
    })
  } catch (error) {
    console.error('[VoiceAssignments API] Error deleting assignments:', error)
    res.status(500).json({
      error: 'Failed to delete voice assignments',
      details: error.message
    })
  }
})

/**
 * GET /api/voice-assignments/by-owner/:ownerId
 * Get all voice assignment manifests for a specific owner
 */
router.get('/by-owner/:ownerId', async (req, res) => {
  try {
    const { ownerId } = req.params

    const result = await query(
      `SELECT * FROM voice_manifests
       WHERE owner_id = $1
       ORDER BY updated_at DESC`,
      [ownerId]
    )

    const manifests = result.rows.map(row => ({
      manifestId: row.id,
      name: row.name,
      description: row.description,
      assignments: row.voice_assignments || [],
      version: row.version,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))

    res.json({
      count: manifests.length,
      manifests
    })
  } catch (error) {
    console.error('[VoiceAssignments API] Error retrieving owner manifests:', error)
    res.status(500).json({
      error: 'Failed to retrieve voice assignments',
      details: error.message
    })
  }
})

/**
 * GET /api/voice-assignments/by-project/:projectId
 * Get all voice assignment manifests for a specific project
 */
router.get('/by-project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params

    const result = await query(
      `SELECT * FROM voice_manifests
       WHERE project_id = $1
       ORDER BY updated_at DESC`,
      [projectId]
    )

    const manifests = result.rows.map(row => ({
      manifestId: row.id,
      name: row.name,
      description: row.description,
      assignments: row.voice_assignments || [],
      version: row.version,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))

    res.json({
      count: manifests.length,
      manifests
    })
  } catch (error) {
    console.error('[VoiceAssignments API] Error retrieving project manifests:', error)
    res.status(500).json({
      error: 'Failed to retrieve voice assignments',
      details: error.message
    })
  }
})

export default router
