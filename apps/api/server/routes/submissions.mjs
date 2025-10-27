/**
 * Manifest Submissions API Routes
 * Handles user submissions of items for admin approval
 */

import express from 'express'
import { query } from '../database/db.mjs'

const router = express.Router()

/**
 * Convert Privy user ID to internal UUID
 */
async function getUserId(privyUserId) {
  const result = await query(
    'SELECT id FROM users WHERE privy_user_id = $1',
    [privyUserId]
  )
  return result.rows[0]?.id
}

/**
 * Check if user is admin
 */
async function isAdmin(userId) {
  const result = await query('SELECT role FROM users WHERE id = $1', [userId])
  return result.rows[0]?.role === 'admin' || result.rows[0]?.role === 'owner'
}

/**
 * POST /api/submissions
 * Submit item for approval
 */
router.post('/', async (req, res) => {
  try {
    const privyUserId = req.headers['x-user-id']
    if (!privyUserId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const userId = await getUserId(privyUserId)
    if (!userId) {
      return res.status(404).json({ error: 'User not found' })
    }

    const {
      manifestType,
      itemId,
      itemData,
      spriteUrls,
      imageUrls,
      modelUrl,
      teamId
    } = req.body

    if (!manifestType || !itemId || !itemData) {
      return res.status(400).json({
        error: 'manifestType, itemId, and itemData are required'
      })
    }

    // Validation checks
    const validationErrors = []
    const hasDetails = itemData.name && itemData.description
    const hasSprites = Array.isArray(spriteUrls) && spriteUrls.length > 0
    const hasImages = Array.isArray(imageUrls) && imageUrls.length > 0
    const has3dModel = !!modelUrl

    if (!hasDetails) {
      validationErrors.push('Item must have name and description')
    }
    if (!hasSprites) {
      validationErrors.push('Item must have at least one sprite')
    }
    if (!hasImages) {
      validationErrors.push('Item must have at least one image')
    }
    if (!has3dModel) {
      validationErrors.push('Item must have a 3D model URL')
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        validationErrors
      })
    }

    // Insert submission
    const result = await query(
      `INSERT INTO manifest_submissions (
        user_id,
        team_id,
        manifest_type,
        item_id,
        item_data,
        has_details,
        has_sprites,
        has_images,
        has_3d_model,
        sprite_urls,
        image_urls,
        model_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        userId,
        teamId || null,
        manifestType,
        itemId,
        JSON.stringify(itemData),
        hasDetails,
        hasSprites,
        hasImages,
        has3dModel,
        spriteUrls,
        imageUrls,
        modelUrl
      ]
    )

    const submission = result.rows[0]

    // Create notification for admins
    const adminUsers = await query(
      `SELECT id FROM users WHERE role IN ('admin', 'owner')`
    )

    for (const admin of adminUsers.rows) {
      await query(
        `INSERT INTO notifications (user_id, type, title, message)
         VALUES ($1, $2, $3, $4)`,
        [
          admin.id,
          'submission',
          'New Submission for Review',
          `A new ${manifestType} item "${itemData.name}" has been submitted for approval`
        ]
      )
    }

    res.status(201).json({
      success: true,
      submission: {
        id: submission.id,
        manifestType: submission.manifest_type,
        itemId: submission.item_id,
        itemData: submission.item_data,
        status: submission.status,
        submittedAt: submission.submitted_at
      }
    })
  } catch (error) {
    console.error('[Submissions] Error creating submission:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/submissions
 * Get user's submissions
 */
router.get('/', async (req, res) => {
  try {
    const privyUserId = req.headers['x-user-id']
    if (!privyUserId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const userId = await getUserId(privyUserId)
    if (!userId) {
      return res.status(404).json({ error: 'User not found' })
    }

    const { status } = req.query

    let result
    if (status) {
      result = await query(
        `SELECT * FROM manifest_submissions
         WHERE user_id = $1 AND status = $2
         ORDER BY submitted_at DESC`,
        [userId, status]
      )
    } else {
      result = await query(
        `SELECT * FROM manifest_submissions
         WHERE user_id = $1
         ORDER BY submitted_at DESC`,
        [userId]
      )
    }

    res.json({
      count: result.rows.length,
      submissions: result.rows.map(row => ({
        id: row.id,
        manifestType: row.manifest_type,
        itemId: row.item_id,
        itemData: row.item_data,
        status: row.status,
        submittedAt: row.submitted_at,
        reviewedAt: row.reviewed_at,
        adminNotes: row.admin_notes,
        rejectionReason: row.rejection_reason,
        wasEdited: row.was_edited,
        spriteUrls: row.sprite_urls,
        imageUrls: row.image_urls,
        modelUrl: row.model_url
      }))
    })
  } catch (error) {
    console.error('[Submissions] Error fetching submissions:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/submissions/:id
 * Get submission details
 */
router.get('/:id', async (req, res) => {
  try {
    const privyUserId = req.headers['x-user-id']
    if (!privyUserId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const userId = await getUserId(privyUserId)
    if (!userId) {
      return res.status(404).json({ error: 'User not found' })
    }

    const { id } = req.params

    const result = await query(
      'SELECT * FROM manifest_submissions WHERE id = $1',
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' })
    }

    const submission = result.rows[0]

    // Verify user owns submission or is admin
    const userIsAdmin = await isAdmin(userId)
    if (submission.user_id !== userId && !userIsAdmin) {
      return res.status(403).json({ error: 'Unauthorized to view this submission' })
    }

    res.json({
      id: submission.id,
      manifestType: submission.manifest_type,
      itemId: submission.item_id,
      itemData: submission.item_data,
      editedItemData: submission.edited_item_data,
      wasEdited: submission.was_edited,
      status: submission.status,
      submittedAt: submission.submitted_at,
      reviewedAt: submission.reviewed_at,
      reviewedBy: submission.reviewed_by,
      adminNotes: submission.admin_notes,
      rejectionReason: submission.rejection_reason,
      spriteUrls: submission.sprite_urls,
      imageUrls: submission.image_urls,
      modelUrl: submission.model_url,
      hasDetails: submission.has_details,
      hasSprites: submission.has_sprites,
      hasImages: submission.has_images,
      has3dModel: submission.has_3d_model
    })
  } catch (error) {
    console.error('[Submissions] Error fetching submission:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * PUT /api/submissions/:id/withdraw
 * Withdraw pending submission
 */
router.put('/:id/withdraw', async (req, res) => {
  try {
    const privyUserId = req.headers['x-user-id']
    if (!privyUserId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const userId = await getUserId(privyUserId)
    if (!userId) {
      return res.status(404).json({ error: 'User not found' })
    }

    const { id } = req.params

    // Check if submission exists and is pending
    const checkResult = await query(
      'SELECT user_id, status FROM manifest_submissions WHERE id = $1',
      [id]
    )

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' })
    }

    const submission = checkResult.rows[0]

    // Verify ownership
    if (submission.user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to withdraw this submission' })
    }

    // Check if status is pending
    if (submission.status !== 'pending') {
      return res.status(400).json({
        error: 'Only pending submissions can be withdrawn',
        currentStatus: submission.status
      })
    }

    // Update status to withdrawn
    const result = await query(
      `UPDATE manifest_submissions
       SET status = 'withdrawn', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    )

    res.json({
      success: true,
      message: 'Submission withdrawn successfully',
      submission: {
        id: result.rows[0].id,
        status: result.rows[0].status,
        updatedAt: result.rows[0].updated_at
      }
    })
  } catch (error) {
    console.error('[Submissions] Error withdrawing submission:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/submissions/stats
 * Get user's submission statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const privyUserId = req.headers['x-user-id']
    if (!privyUserId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const userId = await getUserId(privyUserId)
    if (!userId) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Get counts by status
    const result = await query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected
       FROM manifest_submissions
       WHERE user_id = $1`,
      [userId]
    )

    const stats = result.rows[0]

    res.json({
      total: parseInt(stats.total) || 0,
      pending: parseInt(stats.pending) || 0,
      approved: parseInt(stats.approved) || 0,
      rejected: parseInt(stats.rejected) || 0
    })
  } catch (error) {
    console.error('[Submissions] Error fetching stats:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
