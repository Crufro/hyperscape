/**
 * Projects API Routes
 * Handles project CRUD operations
 */

import express from 'express'
import { query } from '../database/db.mjs'

const router = express.Router()

// GET /api/projects - Get all projects for a user
router.get('/', async (req, res) => {
  try {
    // In production, get user_id from authenticated session
    // For now, we'll return all projects or filter by query param
    const userId = req.query.userId

    let sql = `
      SELECT
        p.*,
        u.display_name as owner_name,
        (SELECT COUNT(*) FROM assets WHERE project_id = p.id) as asset_count
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE p.status != 'deleted'
    `

    const params = []
    if (userId) {
      // Support both UUID and Privy DID formats
      sql += ' AND u.privy_user_id = $1'
      params.push(userId)
    }

    sql += ' ORDER BY p.updated_at DESC'

    const result = await query(sql, params)

    res.json({
      projects: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        status: row.status,
        assetCount: parseInt(row.asset_count) || 0,
        lastModified: formatTimeAgo(row.updated_at),
        createdAt: row.created_at,
        userId: row.owner_id
      }))
    })
  } catch (error) {
    console.error('[Projects API] Error fetching projects:', error)
    res.status(500).json({ error: 'Failed to fetch projects' })
  }
})

// GET /api/projects/:id - Get a single project
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT p.*, u.display_name as owner_name
       FROM projects p
       LEFT JOIN users u ON p.owner_id = u.id
       WHERE p.id = $1 AND p.status != 'deleted'`,
      [req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('[Projects API] Error fetching project:', error)
    res.status(500).json({ error: 'Failed to fetch project' })
  }
})

// POST /api/projects - Create a new project
router.post('/', async (req, res) => {
  try {
    const { name, description, userId, status = 'active' } = req.body

    if (!name || !userId) {
      return res.status(400).json({ error: 'Name and userId are required' })
    }

    // First, ensure user exists or create them, and get their UUID
    const userResult = await query(
      `INSERT INTO users (privy_user_id, display_name)
       VALUES ($1, $2)
       ON CONFLICT (privy_user_id) DO UPDATE SET privy_user_id = EXCLUDED.privy_user_id
       RETURNING id`,
      [userId, 'User']
    )

    const userUuid = userResult.rows[0].id

    const result = await query(
      `INSERT INTO projects (name, description, owner_id, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, description, userUuid, status]
    )

    const project = result.rows[0]

    res.status(201).json({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      assetCount: 0,
      lastModified: formatTimeAgo(project.updated_at),
      createdAt: project.created_at,
      userId: project.owner_id
    })
  } catch (error) {
    console.error('[Projects API] Error creating project:', error)
    res.status(500).json({ error: 'Failed to create project' })
  }
})

// PATCH /api/projects/:id - Update a project
router.patch('/:id', async (req, res) => {
  try {
    const { name, description, status } = req.body
    const updates = []
    const params = []
    let paramCount = 1

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`)
      params.push(name)
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`)
      params.push(description)
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`)
      params.push(status)
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' })
    }

    params.push(req.params.id)

    const result = await query(
      `UPDATE projects
       SET ${updates.join(', ')}
       WHERE id = $${paramCount} AND status != 'deleted'
       RETURNING *`,
      params
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' })
    }

    const project = result.rows[0]

    res.json({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      assetCount: 0,
      lastModified: formatTimeAgo(project.updated_at),
      createdAt: project.created_at,
      userId: project.owner_id
    })
  } catch (error) {
    console.error('[Projects API] Error updating project:', error)
    res.status(500).json({ error: 'Failed to update project' })
  }
})

// DELETE /api/projects/:id - Delete a project (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      `UPDATE projects
       SET status = 'deleted', archived_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id`,
      [req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' })
    }

    res.json({ success: true, message: 'Project deleted' })
  } catch (error) {
    console.error('[Projects API] Error deleting project:', error)
    res.status(500).json({ error: 'Failed to delete project' })
  }
})

// Helper function to format time ago
function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  }

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit)
    if (interval >= 1) {
      return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`
    }
  }

  return 'just now'
}

export default router
