/**
 * Users API Routes
 * Handles user profile management
 */

import express from 'express'
import { query } from '../database/db.mjs'

const router = express.Router()

// GET /api/users/me - Get current user profile
router.get('/me', async (req, res) => {
  try {
    // Get user ID from Privy authentication header
    const userId = req.headers['x-user-id']

    if (!userId) {
      return res.status(401).json({ error: 'User ID not provided in headers' })
    }

    // Find user by Privy DID
    let result = await query(
      `SELECT id, privy_user_id, email, wallet_address, display_name, avatar_url, role, settings, created_at
       FROM users
       WHERE privy_user_id = $1`,
      [userId]
    )

    // If user doesn't exist, create with defaults
    if (result.rows.length === 0) {
      console.log(`[Users API] Creating new user for Privy DID: ${userId}`)

      result = await query(
        `INSERT INTO users (privy_user_id, role, settings)
         VALUES ($1, $2, $3)
         RETURNING id, privy_user_id, email, wallet_address, display_name, avatar_url, role, settings, created_at`,
        [userId, 'member', JSON.stringify({})]
      )
    }

    const user = result.rows[0]

    res.json({
      id: user.id,
      privy_user_id: user.privy_user_id,
      email: user.email,
      wallet_address: user.wallet_address,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      role: user.role,
      settings: user.settings || {},
      created_at: user.created_at
    })
  } catch (error) {
    console.error('[Users API] Error fetching user profile:', error)
    res.status(500).json({ error: 'Failed to fetch user profile' })
  }
})

// PUT /api/users/me - Update user profile
router.put('/me', async (req, res) => {
  try {
    const userId = req.headers['x-user-id']

    if (!userId) {
      return res.status(401).json({ error: 'User ID not provided in headers' })
    }

    const { display_name, email, avatar_url } = req.body

    // Build dynamic update query
    const updates = []
    const params = []
    let paramCount = 1

    if (display_name !== undefined) {
      updates.push(`display_name = $${paramCount++}`)
      params.push(display_name)
    }
    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`)
      params.push(email)
    }
    if (avatar_url !== undefined) {
      updates.push(`avatar_url = $${paramCount++}`)
      params.push(avatar_url)
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' })
    }

    // Always update updated_at timestamp
    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    params.push(userId)

    const result = await query(
      `UPDATE users
       SET ${updates.join(', ')}
       WHERE privy_user_id = $${paramCount}
       RETURNING id, privy_user_id, email, wallet_address, display_name, avatar_url, role, settings, created_at, updated_at`,
      params
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = result.rows[0]

    res.json({
      id: user.id,
      privy_user_id: user.privy_user_id,
      email: user.email,
      wallet_address: user.wallet_address,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      role: user.role,
      settings: user.settings || {},
      created_at: user.created_at,
      updated_at: user.updated_at
    })
  } catch (error) {
    console.error('[Users API] Error updating user profile:', error)
    res.status(500).json({ error: 'Failed to update user profile' })
  }
})

// PUT /api/users/me/settings - Update user settings
router.put('/me/settings', async (req, res) => {
  try {
    const userId = req.headers['x-user-id']

    if (!userId) {
      return res.status(401).json({ error: 'User ID not provided in headers' })
    }

    const { settings } = req.body

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings must be an object' })
    }

    // First, get current settings to merge
    const currentResult = await query(
      `SELECT settings FROM users WHERE privy_user_id = $1`,
      [userId]
    )

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const currentSettings = currentResult.rows[0].settings || {}
    const mergedSettings = { ...currentSettings, ...settings }

    // Update with merged settings
    const result = await query(
      `UPDATE users
       SET settings = $1, updated_at = CURRENT_TIMESTAMP
       WHERE privy_user_id = $2
       RETURNING settings`,
      [JSON.stringify(mergedSettings), userId]
    )

    res.json({
      settings: result.rows[0].settings
    })
  } catch (error) {
    console.error('[Users API] Error updating user settings:', error)
    res.status(500).json({ error: 'Failed to update user settings' })
  }
})

// PATCH /api/users/me/last-login - Update last login timestamp
router.patch('/me/last-login', async (req, res) => {
  try {
    const userId = req.headers['x-user-id']

    if (!userId) {
      return res.status(401).json({ error: 'User ID not provided in headers' })
    }

    const result = await query(
      `UPDATE users
       SET last_login_at = CURRENT_TIMESTAMP
       WHERE privy_user_id = $1
       RETURNING last_login_at`,
      [userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({
      success: true,
      last_login_at: result.rows[0].last_login_at
    })
  } catch (error) {
    console.error('[Users API] Error updating last login:', error)
    res.status(500).json({ error: 'Failed to update last login' })
  }
})

export default router
