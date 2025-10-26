/**
 * Teams API Routes
 * Handles team CRUD operations and member management
 */

import express from 'express'
import { query } from '../database/db.mjs'
import crypto from 'crypto'

const router = express.Router()

// GET /api/teams - Get all teams for a user
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId

    let sql = `
      SELECT
        t.*,
        u.display_name as owner_name,
        (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count,
        COALESCE(
          (SELECT role FROM team_members WHERE team_id = t.id AND user_id = $1 LIMIT 1),
          CASE WHEN t.owner_id = $1 THEN 'owner' ELSE NULL END
        ) as user_role
      FROM teams t
      LEFT JOIN users u ON t.owner_id = u.id
    `

    const params = [userId || 'none']

    if (userId) {
      sql += `
        WHERE t.owner_id = $1
        OR t.id IN (SELECT team_id FROM team_members WHERE user_id = $1)
      `
    }

    sql += ' ORDER BY t.updated_at DESC'

    const result = await query(sql, params)

    // Get members for each team
    const teams = await Promise.all(result.rows.map(async (team) => {
      const membersResult = await query(
        `SELECT
          tm.id,
          tm.role,
          u.id as user_id,
          u.display_name as name,
          u.email
        FROM team_members tm
        LEFT JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = $1
        ORDER BY tm.joined_at ASC`,
        [team.id]
      )

      return {
        id: team.id,
        name: team.name,
        description: team.description,
        role: team.user_role || 'member',
        memberCount: parseInt(team.member_count) || 0,
        members: membersResult.rows,
        createdAt: team.created_at
      }
    }))

    res.json({ teams })
  } catch (error) {
    console.error('[Teams API] Error fetching teams:', error)
    res.status(500).json({ error: 'Failed to fetch teams' })
  }
})

// GET /api/teams/:id - Get a single team
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT t.*, u.display_name as owner_name
       FROM teams t
       LEFT JOIN users u ON t.owner_id = u.id
       WHERE t.id = $1`,
      [req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' })
    }

    const team = result.rows[0]

    // Get members
    const membersResult = await query(
      `SELECT
        tm.id,
        tm.role,
        u.id as user_id,
        u.display_name as name,
        u.email
      FROM team_members tm
      LEFT JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = $1
      ORDER BY tm.joined_at ASC`,
      [team.id]
    )

    res.json({
      ...team,
      members: membersResult.rows
    })
  } catch (error) {
    console.error('[Teams API] Error fetching team:', error)
    res.status(500).json({ error: 'Failed to fetch team' })
  }
})

// POST /api/teams - Create a new team
router.post('/', async (req, res) => {
  try {
    const { name, description, userId } = req.body

    if (!name || !userId) {
      return res.status(400).json({ error: 'Name and userId are required' })
    }

    // Ensure user exists
    await query(
      `INSERT INTO users (id, privy_user_id, display_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (privy_user_id) DO NOTHING`,
      [userId, userId, 'User']
    )

    const result = await query(
      `INSERT INTO teams (name, description, owner_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, description, userId]
    )

    const team = result.rows[0]

    // Add creator as owner in team_members
    await query(
      `INSERT INTO team_members (team_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [team.id, userId]
    )

    res.status(201).json({
      id: team.id,
      name: team.name,
      description: team.description,
      role: 'owner',
      memberCount: 1,
      members: [],
      createdAt: team.created_at
    })
  } catch (error) {
    console.error('[Teams API] Error creating team:', error)
    res.status(500).json({ error: 'Failed to create team' })
  }
})

// PATCH /api/teams/:id - Update a team
router.patch('/:id', async (req, res) => {
  try {
    const { name, description } = req.body
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

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' })
    }

    params.push(req.params.id)

    const result = await query(
      `UPDATE teams
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      params
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('[Teams API] Error updating team:', error)
    res.status(500).json({ error: 'Failed to update team' })
  }
})

// DELETE /api/teams/:id - Delete a team
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM teams WHERE id = $1 RETURNING id`,
      [req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' })
    }

    res.json({ success: true, message: 'Team deleted' })
  } catch (error) {
    console.error('[Teams API] Error deleting team:', error)
    res.status(500).json({ error: 'Failed to delete team' })
  }
})

// POST /api/teams/:id/invite - Invite a member to a team
router.post('/:id/invite', async (req, res) => {
  try {
    const { email } = req.body
    const teamId = req.params.id

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    // Check if team exists
    const teamResult = await query(
      `SELECT id FROM teams WHERE id = $1`,
      [teamId]
    )

    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' })
    }

    // Generate invitation token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Assuming invited_by comes from authenticated session
    const invitedBy = req.body.invitedBy || req.query.userId || 'system'

    await query(
      `INSERT INTO team_invitations (team_id, email, invited_by, token, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [teamId, email, invitedBy, token, expiresAt]
    )

    res.status(201).json({
      success: true,
      message: 'Invitation sent',
      token
    })
  } catch (error) {
    console.error('[Teams API] Error inviting member:', error)
    res.status(500).json({ error: 'Failed to invite member' })
  }
})

export default router
