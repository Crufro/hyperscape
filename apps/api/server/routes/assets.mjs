/**
 * Assets API Routes
 * Handles asset CRUD operations with project associations
 */

import express from 'express'
import { query } from '../database/db.mjs'

const router = express.Router()

// GET /api/assets - List assets with filters
router.get('/', async (req, res) => {
  try {
    const { userId, projectId, type, status } = req.query

    let sql = `
      SELECT
        a.*,
        u.display_name as owner_name,
        u.privy_user_id as owner_privy_id,
        p.name as project_name
      FROM assets a
      LEFT JOIN users u ON a.owner_id = u.id
      LEFT JOIN projects p ON a.project_id = p.id
      WHERE 1=1
    `

    const params = []
    let paramCount = 1

    // Filter by user (support both UUID and Privy DID)
    if (userId) {
      sql += ` AND (u.id = $${paramCount} OR u.privy_user_id = $${paramCount})`
      params.push(userId)
      paramCount++
    }

    // Filter by project
    if (projectId) {
      sql += ` AND a.project_id = $${paramCount}`
      params.push(projectId)
      paramCount++
    }

    // Filter by type
    if (type) {
      sql += ` AND a.type = $${paramCount}`
      params.push(type)
      paramCount++
    }

    // Filter by status (exclude deleted by default unless explicitly requested)
    if (status) {
      sql += ` AND a.status = $${paramCount}`
      params.push(status)
      paramCount++
    } else {
      sql += ` AND a.status != 'deleted'`
    }

    sql += ' ORDER BY a.updated_at DESC'

    const result = await query(sql, params)

    res.json({
      assets: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.type,
        category: row.category,
        ownerId: row.owner_id,
        ownerName: row.owner_name,
        projectId: row.project_id,
        projectName: row.project_name,
        fileUrl: row.file_url,
        fileSize: row.file_size,
        fileType: row.file_type,
        thumbnailUrl: row.thumbnail_url,
        prompt: row.prompt,
        negativePrompt: row.negative_prompt,
        modelUsed: row.model_used,
        generationParams: row.generation_params,
        status: row.status,
        tags: row.tags,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })),
      count: result.rows.length
    })
  } catch (error) {
    console.error('[Assets API] Error fetching assets:', error)
    res.status(500).json({ error: 'Failed to fetch assets' })
  }
})

// GET /api/assets/:id - Get single asset details
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT
        a.*,
        u.display_name as owner_name,
        u.privy_user_id as owner_privy_id,
        p.name as project_name
       FROM assets a
       LEFT JOIN users u ON a.owner_id = u.id
       LEFT JOIN projects p ON a.project_id = p.id
       WHERE a.id = $1 AND a.status != 'deleted'`,
      [req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' })
    }

    const asset = result.rows[0]

    res.json({
      id: asset.id,
      name: asset.name,
      description: asset.description,
      type: asset.type,
      category: asset.category,
      ownerId: asset.owner_id,
      ownerName: asset.owner_name,
      projectId: asset.project_id,
      projectName: asset.project_name,
      fileUrl: asset.file_url,
      fileSize: asset.file_size,
      fileType: asset.file_type,
      thumbnailUrl: asset.thumbnail_url,
      prompt: asset.prompt,
      negativePrompt: asset.negative_prompt,
      modelUsed: asset.model_used,
      generationParams: asset.generation_params,
      status: asset.status,
      tags: asset.tags,
      createdAt: asset.created_at,
      updatedAt: asset.updated_at
    })
  } catch (error) {
    console.error('[Assets API] Error fetching asset:', error)
    res.status(500).json({ error: 'Failed to fetch asset' })
  }
})

// POST /api/assets - Create new asset
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      category,
      userId,
      projectId,
      fileUrl,
      fileSize,
      fileType,
      thumbnailUrl,
      prompt,
      negativePrompt,
      modelUsed,
      generationParams,
      status = 'active',
      tags = []
    } = req.body

    // Validate required fields
    if (!name || !type || !userId) {
      return res.status(400).json({ error: 'Name, type, and userId are required' })
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

    // Validate project exists if projectId provided
    let validatedProjectId = null
    if (projectId) {
      const projectResult = await query(
        `SELECT id FROM projects WHERE id = $1 AND status != 'deleted'`,
        [projectId]
      )

      if (projectResult.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid projectId - project not found' })
      }
      validatedProjectId = projectId
    }

    // Create the asset
    const result = await query(
      `INSERT INTO assets (
        name,
        description,
        type,
        category,
        owner_id,
        project_id,
        file_url,
        file_size,
        file_type,
        thumbnail_url,
        prompt,
        negative_prompt,
        model_used,
        generation_params,
        status,
        tags
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        name,
        description || null,
        type,
        category || null,
        userUuid,
        validatedProjectId,
        fileUrl || null,
        fileSize || null,
        fileType || null,
        thumbnailUrl || null,
        prompt || null,
        negativePrompt || null,
        modelUsed || null,
        generationParams || null,
        status,
        tags
      ]
    )

    const asset = result.rows[0]

    // Get project name if associated
    let projectName = null
    if (asset.project_id) {
      const projectResult = await query(
        `SELECT name FROM projects WHERE id = $1`,
        [asset.project_id]
      )
      if (projectResult.rows.length > 0) {
        projectName = projectResult.rows[0].name
      }
    }

    res.status(201).json({
      id: asset.id,
      name: asset.name,
      description: asset.description,
      type: asset.type,
      category: asset.category,
      ownerId: asset.owner_id,
      projectId: asset.project_id,
      projectName: projectName,
      fileUrl: asset.file_url,
      fileSize: asset.file_size,
      fileType: asset.file_type,
      thumbnailUrl: asset.thumbnail_url,
      prompt: asset.prompt,
      negativePrompt: asset.negative_prompt,
      modelUsed: asset.model_used,
      generationParams: asset.generation_params,
      status: asset.status,
      tags: asset.tags,
      createdAt: asset.created_at,
      updatedAt: asset.updated_at
    })
  } catch (error) {
    console.error('[Assets API] Error creating asset:', error)
    res.status(500).json({ error: 'Failed to create asset' })
  }
})

// PATCH /api/assets/:id - Update asset
router.patch('/:id', async (req, res) => {
  try {
    const {
      name,
      description,
      projectId,
      status,
      tags,
      fileUrl,
      thumbnailUrl,
      category,
      fileSize,
      fileType
    } = req.body

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
    if (projectId !== undefined) {
      // Validate project exists if not null
      if (projectId !== null) {
        const projectResult = await query(
          `SELECT id FROM projects WHERE id = $1 AND status != 'deleted'`,
          [projectId]
        )

        if (projectResult.rows.length === 0) {
          return res.status(400).json({ error: 'Invalid projectId - project not found' })
        }
      }
      updates.push(`project_id = $${paramCount++}`)
      params.push(projectId)
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`)
      params.push(status)
    }
    if (tags !== undefined) {
      updates.push(`tags = $${paramCount++}`)
      params.push(tags)
    }
    if (fileUrl !== undefined) {
      updates.push(`file_url = $${paramCount++}`)
      params.push(fileUrl)
    }
    if (thumbnailUrl !== undefined) {
      updates.push(`thumbnail_url = $${paramCount++}`)
      params.push(thumbnailUrl)
    }
    if (category !== undefined) {
      updates.push(`category = $${paramCount++}`)
      params.push(category)
    }
    if (fileSize !== undefined) {
      updates.push(`file_size = $${paramCount++}`)
      params.push(fileSize)
    }
    if (fileType !== undefined) {
      updates.push(`file_type = $${paramCount++}`)
      params.push(fileType)
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' })
    }

    // Always update the updated_at timestamp
    updates.push(`updated_at = CURRENT_TIMESTAMP`)

    params.push(req.params.id)

    const result = await query(
      `UPDATE assets
       SET ${updates.join(', ')}
       WHERE id = $${paramCount} AND status != 'deleted'
       RETURNING *`,
      params
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' })
    }

    const asset = result.rows[0]

    // Get related data
    let ownerName = null
    let projectName = null

    const ownerResult = await query(
      `SELECT display_name FROM users WHERE id = $1`,
      [asset.owner_id]
    )
    if (ownerResult.rows.length > 0) {
      ownerName = ownerResult.rows[0].display_name
    }

    if (asset.project_id) {
      const projectResult = await query(
        `SELECT name FROM projects WHERE id = $1`,
        [asset.project_id]
      )
      if (projectResult.rows.length > 0) {
        projectName = projectResult.rows[0].name
      }
    }

    res.json({
      id: asset.id,
      name: asset.name,
      description: asset.description,
      type: asset.type,
      category: asset.category,
      ownerId: asset.owner_id,
      ownerName: ownerName,
      projectId: asset.project_id,
      projectName: projectName,
      fileUrl: asset.file_url,
      fileSize: asset.file_size,
      fileType: asset.file_type,
      thumbnailUrl: asset.thumbnail_url,
      prompt: asset.prompt,
      negativePrompt: asset.negative_prompt,
      modelUsed: asset.model_used,
      generationParams: asset.generation_params,
      status: asset.status,
      tags: asset.tags,
      createdAt: asset.created_at,
      updatedAt: asset.updated_at
    })
  } catch (error) {
    console.error('[Assets API] Error updating asset:', error)
    res.status(500).json({ error: 'Failed to update asset' })
  }
})

// DELETE /api/assets/:id - Soft delete
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      `UPDATE assets
       SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status != 'deleted'
       RETURNING id`,
      [req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' })
    }

    res.json({ success: true, message: 'Asset deleted' })
  } catch (error) {
    console.error('[Assets API] Error deleting asset:', error)
    res.status(500).json({ error: 'Failed to delete asset' })
  }
})

// POST /api/assets/bulk-delete - Bulk soft delete
router.post('/bulk-delete', async (req, res) => {
  try {
    const { assetIds } = req.body

    if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
      return res.status(400).json({ error: 'assetIds array is required' })
    }

    // Build placeholders for parameterized query
    const placeholders = assetIds.map((_, i) => `$${i + 1}`).join(', ')

    const result = await query(
      `UPDATE assets
       SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
       WHERE id IN (${placeholders}) AND status != 'deleted'
       RETURNING id`,
      assetIds
    )

    res.json({
      success: true,
      message: `${result.rows.length} assets deleted`,
      deletedCount: result.rows.length,
    })
  } catch (error) {
    console.error('[Assets API] Error bulk deleting assets:', error)
    res.status(500).json({ error: 'Failed to delete assets' })
  }
})

// POST /api/assets/bulk-export - Bulk export assets (metadata only, no ZIP)
router.post('/bulk-export', async (req, res) => {
  try {
    const { assetIds } = req.body

    if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
      return res.status(400).json({ error: 'assetIds array is required' })
    }

    // Build placeholders for parameterized query
    const placeholders = assetIds.map((_, i) => `$${i + 1}`).join(', ')

    const result = await query(
      `SELECT
        a.*,
        u.display_name as owner_name,
        p.name as project_name
       FROM assets a
       LEFT JOIN users u ON a.owner_id = u.id
       LEFT JOIN projects p ON a.project_id = p.id
       WHERE a.id IN (${placeholders}) AND a.status != 'deleted'`,
      assetIds
    )

    // Create JSON export
    const exportData = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      category: row.category,
      ownerName: row.owner_name,
      projectName: row.project_name,
      fileUrl: row.file_url,
      fileSize: row.file_size,
      fileType: row.file_type,
      thumbnailUrl: row.thumbnail_url,
      tags: row.tags,
      createdAt: row.created_at,
    }))

    // Send as JSON download
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="assets-export-${Date.now()}.json"`)
    res.json(exportData)
  } catch (error) {
    console.error('[Assets API] Error bulk exporting assets:', error)
    res.status(500).json({ error: 'Failed to export assets' })
  }
})

// POST /api/assets/bulk-archive - Bulk archive assets
router.post('/bulk-archive', async (req, res) => {
  try {
    const { assetIds } = req.body

    if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
      return res.status(400).json({ error: 'assetIds array is required' })
    }

    // Build placeholders for parameterized query
    const placeholders = assetIds.map((_, i) => `$${i + 1}`).join(', ')

    const result = await query(
      `UPDATE assets
       SET status = 'archived', updated_at = CURRENT_TIMESTAMP
       WHERE id IN (${placeholders}) AND status != 'deleted'
       RETURNING id`,
      assetIds
    )

    res.json({
      success: true,
      message: `${result.rows.length} assets archived`,
      archivedCount: result.rows.length,
    })
  } catch (error) {
    console.error('[Assets API] Error bulk archiving assets:', error)
    res.status(500).json({ error: 'Failed to archive assets' })
  }
})

export default router
