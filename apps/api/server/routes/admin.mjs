/**
 * Admin API Routes
 * Admin-only endpoints for platform management
 */

import express from 'express'
import { query } from '../database/db.mjs'
import { requireAdmin } from '../middleware/auth.mjs'
import adminModelsRouter from './admin-models.mjs'

const router = express.Router()

// Mount model configuration routes (admin-only)
router.use('/models', requireAdmin, adminModelsRouter)

/**
 * GET /api/admin/users
 * Get all users (paginated)
 */
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 50
    const offset = (page - 1) * limit

    // Get total count
    const countResult = await query('SELECT COUNT(*) FROM users')
    const totalUsers = parseInt(countResult.rows[0].count)
    const totalPages = Math.ceil(totalUsers / limit)

    // Get paginated users
    const result = await query(
      `SELECT id, privy_user_id, email, wallet_address, display_name, role, created_at
       FROM users
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    )

    res.json({
      users: result.rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    })
  } catch (error) {
    console.error('[Admin API] Error fetching users:', error)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

/**
 * PUT /api/admin/users/:id/role
 * Update user role
 */
router.put('/users/:id/role', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { role } = req.body

    // Validate role
    if (!role || !['admin', 'member'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: 'Role must be either "admin" or "member"'
      })
    }

    // Prevent admin from demoting themselves
    if (req.user.id === id && role === 'member') {
      return res.status(400).json({
        error: 'Cannot demote yourself',
        message: 'You cannot change your own role from admin to member'
      })
    }

    // Update user role
    const result = await query(
      `UPDATE users
       SET role = $1
       WHERE id = $2
       RETURNING id, privy_user_id, email, wallet_address, display_name, role, created_at, updated_at`,
      [role, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({
      success: true,
      message: `User role updated to ${role}`,
      user: result.rows[0]
    })
  } catch (error) {
    console.error('[Admin API] Error updating user role:', error)
    res.status(500).json({ error: 'Failed to update user role' })
  }
})

/**
 * GET /api/admin/stats
 * Platform statistics
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    // Get all stats in parallel
    const [usersResult, projectsResult, assetsResult, teamsResult, adminUsersResult] = await Promise.all([
      query('SELECT COUNT(*) FROM users'),
      query('SELECT COUNT(*) FROM projects WHERE status != \'deleted\''),
      query('SELECT COUNT(*) FROM assets WHERE status != \'archived\''),
      query('SELECT COUNT(*) FROM teams'),
      query('SELECT COUNT(*) FROM users WHERE role = \'admin\'')
    ])

    res.json({
      totalUsers: parseInt(usersResult.rows[0].count),
      totalProjects: parseInt(projectsResult.rows[0].count),
      totalAssets: parseInt(assetsResult.rows[0].count),
      totalTeams: parseInt(teamsResult.rows[0].count),
      adminUsers: parseInt(adminUsersResult.rows[0].count),
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[Admin API] Error fetching stats:', error)
    res.status(500).json({ error: 'Failed to fetch platform statistics' })
  }
})

/**
 * GET /api/admin/whitelist
 * Get whitelist (placeholder - to be implemented later)
 */
router.get('/whitelist', requireAdmin, async (req, res) => {
  try {
    // Placeholder implementation
    // TODO: Implement whitelist functionality with database table
    res.json({
      whitelist: [],
      message: 'Whitelist functionality coming soon'
    })
  } catch (error) {
    console.error('[Admin API] Error fetching whitelist:', error)
    res.status(500).json({ error: 'Failed to fetch whitelist' })
  }
})

/**
 * POST /api/admin/whitelist
 * Add to whitelist (placeholder - to be implemented later)
 */
router.post('/whitelist', requireAdmin, async (req, res) => {
  try {
    const { walletAddress, reason } = req.body

    if (!walletAddress) {
      return res.status(400).json({
        error: 'Wallet address is required'
      })
    }

    // Placeholder implementation
    // TODO: Implement whitelist functionality with database table
    res.json({
      success: true,
      message: 'Whitelist functionality coming soon',
      data: {
        walletAddress,
        reason: reason || 'No reason provided'
      }
    })
  } catch (error) {
    console.error('[Admin API] Error adding to whitelist:', error)
    res.status(500).json({ error: 'Failed to add to whitelist' })
  }
})

/**
 * DELETE /api/admin/whitelist/:address
 * Remove from whitelist (placeholder - to be implemented later)
 */
router.delete('/whitelist/:address', requireAdmin, async (req, res) => {
  try {
    const { address } = req.params

    // Placeholder implementation
    // TODO: Implement whitelist functionality with database table
    res.json({
      success: true,
      message: 'Whitelist functionality coming soon',
      data: {
        walletAddress: address
      }
    })
  } catch (error) {
    console.error('[Admin API] Error removing from whitelist:', error)
    res.status(500).json({ error: 'Failed to remove from whitelist' })
  }
})

export default router
