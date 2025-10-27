/**
 * API Keys Management Routes
 * Handles creation, listing, and revocation of API keys for users and teams
 */

import express from 'express'
import crypto from 'crypto'
import { query } from '../database/db.mjs'

const router = express.Router()

/**
 * Generate a secure API key
 * Format: hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 */
function generateAPIKey() {
  const randomBytes = crypto.randomBytes(24).toString('hex')
  return `hf_${randomBytes}`
}

/**
 * Hash an API key for secure storage
 */
function hashAPIKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex')
}

/**
 * GET /api/api-keys/user
 * Get all API keys for the current user
 */
router.get('/user', async (req, res) => {
  try {
    const userId = req.headers['x-user-id']

    if (!userId) {
      return res.status(401).json({ error: 'User ID not provided in headers' })
    }

    // Get user's internal ID from Privy ID
    const userResult = await query(
      'SELECT id FROM users WHERE privy_user_id = $1',
      [userId]
    )

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const internalUserId = userResult.rows[0].id

    const result = await query(
      `SELECT
        id,
        name,
        key_prefix,
        permissions,
        last_used_at,
        expires_at,
        is_active,
        created_at
       FROM api_keys
       WHERE user_id = $1 AND team_id IS NULL
       ORDER BY created_at DESC`,
      [internalUserId]
    )

    res.json({
      count: result.rows.length,
      apiKeys: result.rows.map(key => ({
        id: key.id,
        name: key.name,
        keyPrefix: key.key_prefix,
        permissions: key.permissions || [],
        lastUsedAt: key.last_used_at,
        expiresAt: key.expires_at,
        isActive: key.is_active,
        createdAt: key.created_at
      }))
    })
  } catch (error) {
    console.error('[API Keys] Error fetching user API keys:', error)
    res.status(500).json({ error: 'Failed to fetch API keys' })
  }
})

/**
 * GET /api/api-keys/team/:teamId
 * Get all API keys for a specific team
 */
router.get('/team/:teamId', async (req, res) => {
  try {
    const userId = req.headers['x-user-id']
    const { teamId } = req.params

    if (!userId) {
      return res.status(401).json({ error: 'User ID not provided in headers' })
    }

    // Get user's internal ID
    const userResult = await query(
      'SELECT id FROM users WHERE privy_user_id = $1',
      [userId]
    )

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const internalUserId = userResult.rows[0].id

    // Check if user is a member of the team
    const memberCheck = await query(
      `SELECT role FROM team_members
       WHERE team_id = $1 AND user_id = $2`,
      [teamId, internalUserId]
    )

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this team' })
    }

    const result = await query(
      `SELECT
        id,
        name,
        key_prefix,
        permissions,
        last_used_at,
        expires_at,
        is_active,
        created_at
       FROM api_keys
       WHERE team_id = $1
       ORDER BY created_at DESC`,
      [teamId]
    )

    res.json({
      count: result.rows.length,
      apiKeys: result.rows.map(key => ({
        id: key.id,
        name: key.name,
        keyPrefix: key.key_prefix,
        permissions: key.permissions || [],
        lastUsedAt: key.last_used_at,
        expiresAt: key.expires_at,
        isActive: key.is_active,
        createdAt: key.created_at
      }))
    })
  } catch (error) {
    console.error('[API Keys] Error fetching team API keys:', error)
    res.status(500).json({ error: 'Failed to fetch API keys' })
  }
})

/**
 * POST /api/api-keys/user
 * Create a new API key for the current user
 */
router.post('/user', async (req, res) => {
  try {
    const userId = req.headers['x-user-id']
    const { name, permissions, expiresInDays } = req.body

    if (!userId) {
      return res.status(401).json({ error: 'User ID not provided in headers' })
    }

    if (!name) {
      return res.status(400).json({ error: 'API key name is required' })
    }

    // Get user's internal ID
    const userResult = await query(
      'SELECT id FROM users WHERE privy_user_id = $1',
      [userId]
    )

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const internalUserId = userResult.rows[0].id

    // Generate API key
    const apiKey = generateAPIKey()
    const keyHash = hashAPIKey(apiKey)
    const keyPrefix = apiKey.substring(0, 10) + '...'

    // Calculate expiration date
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null

    const result = await query(
      `INSERT INTO api_keys (user_id, name, key_hash, key_prefix, permissions, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, key_prefix, permissions, expires_at, is_active, created_at`,
      [internalUserId, name, keyHash, keyPrefix, permissions || [], expiresAt]
    )

    const createdKey = result.rows[0]

    res.status(201).json({
      id: createdKey.id,
      name: createdKey.name,
      apiKey: apiKey, // Only returned once on creation
      keyPrefix: createdKey.key_prefix,
      permissions: createdKey.permissions || [],
      expiresAt: createdKey.expires_at,
      isActive: createdKey.is_active,
      createdAt: createdKey.created_at,
      warning: 'Save this API key securely. It will not be shown again.'
    })
  } catch (error) {
    console.error('[API Keys] Error creating user API key:', error)
    res.status(500).json({ error: 'Failed to create API key' })
  }
})

/**
 * POST /api/api-keys/team/:teamId
 * Create a new API key for a team
 */
router.post('/team/:teamId', async (req, res) => {
  try {
    const userId = req.headers['x-user-id']
    const { teamId } = req.params
    const { name, permissions, expiresInDays } = req.body

    if (!userId) {
      return res.status(401).json({ error: 'User ID not provided in headers' })
    }

    if (!name) {
      return res.status(400).json({ error: 'API key name is required' })
    }

    // Get user's internal ID
    const userResult = await query(
      'SELECT id FROM users WHERE privy_user_id = $1',
      [userId]
    )

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const internalUserId = userResult.rows[0].id

    // Check if user is admin or owner of the team
    const memberCheck = await query(
      `SELECT role FROM team_members
       WHERE team_id = $1 AND user_id = $2`,
      [teamId, internalUserId]
    )

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this team' })
    }

    const role = memberCheck.rows[0].role
    if (role !== 'owner' && role !== 'admin') {
      return res.status(403).json({ error: 'Only team owners and admins can create API keys' })
    }

    // Generate API key
    const apiKey = generateAPIKey()
    const keyHash = hashAPIKey(apiKey)
    const keyPrefix = apiKey.substring(0, 10) + '...'

    // Calculate expiration date
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null

    const result = await query(
      `INSERT INTO api_keys (team_id, name, key_hash, key_prefix, permissions, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, key_prefix, permissions, expires_at, is_active, created_at`,
      [teamId, name, keyHash, keyPrefix, permissions || [], expiresAt]
    )

    const createdKey = result.rows[0]

    res.status(201).json({
      id: createdKey.id,
      name: createdKey.name,
      apiKey: apiKey, // Only returned once on creation
      keyPrefix: createdKey.key_prefix,
      permissions: createdKey.permissions || [],
      expiresAt: createdKey.expires_at,
      isActive: createdKey.is_active,
      createdAt: createdKey.created_at,
      warning: 'Save this API key securely. It will not be shown again.'
    })
  } catch (error) {
    console.error('[API Keys] Error creating team API key:', error)
    res.status(500).json({ error: 'Failed to create API key' })
  }
})

/**
 * DELETE /api/api-keys/:keyId
 * Revoke an API key
 */
router.delete('/:keyId', async (req, res) => {
  try {
    const userId = req.headers['x-user-id']
    const { keyId } = req.params

    if (!userId) {
      return res.status(401).json({ error: 'User ID not provided in headers' })
    }

    // Get user's internal ID
    const userResult = await query(
      'SELECT id FROM users WHERE privy_user_id = $1',
      [userId]
    )

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const internalUserId = userResult.rows[0].id

    // Check ownership - key must belong to user or user's team
    const keyCheck = await query(
      `SELECT user_id, team_id FROM api_keys WHERE id = $1`,
      [keyId]
    )

    if (keyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found' })
    }

    const key = keyCheck.rows[0]

    // Check if user owns the key directly
    if (key.user_id && key.user_id !== internalUserId) {
      return res.status(403).json({ error: 'You do not have permission to revoke this API key' })
    }

    // If it's a team key, check if user is admin/owner
    if (key.team_id) {
      const memberCheck = await query(
        `SELECT role FROM team_members
         WHERE team_id = $1 AND user_id = $2`,
        [key.team_id, internalUserId]
      )

      if (memberCheck.rows.length === 0) {
        return res.status(403).json({ error: 'You are not a member of this team' })
      }

      const role = memberCheck.rows[0].role
      if (role !== 'owner' && role !== 'admin') {
        return res.status(403).json({ error: 'Only team owners and admins can revoke API keys' })
      }
    }

    // Revoke the key (soft delete)
    await query(
      `UPDATE api_keys
       SET is_active = false, revoked_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [keyId]
    )

    res.json({
      success: true,
      message: 'API key revoked successfully'
    })
  } catch (error) {
    console.error('[API Keys] Error revoking API key:', error)
    res.status(500).json({ error: 'Failed to revoke API key' })
  }
})

export default router
