/**
 * Authentication Middleware
 * Handles user authentication and admin authorization
 */

import { query } from '../database/db.mjs'

/**
 * Basic authentication check
 * Verifies user exists and attaches to req.user
 */
export async function requireAuth(req, res, next) {
  try {
    // Get userId from header (set by frontend from Privy)
    const userId = req.headers['x-user-id']

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required. Please provide x-user-id header.'
      })
    }

    // Fetch user from database by privy_user_id
    const result = await query(
      `SELECT id, privy_user_id, email, wallet_address, display_name, role, settings, created_at, updated_at
       FROM users
       WHERE privy_user_id = $1`,
      [userId]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found. Please ensure you are registered.'
      })
    }

    // Attach user to request
    req.user = result.rows[0]

    next()
  } catch (error) {
    console.error('[Auth Middleware] Error in requireAuth:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to authenticate user'
    })
  }
}

/**
 * Admin-only authorization check
 * Requires authentication and admin role
 */
export async function requireAdmin(req, res, next) {
  try {
    // First check authentication
    const userId = req.headers['x-user-id']

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required. Please provide x-user-id header.'
      })
    }

    // Fetch user from database
    const result = await query(
      `SELECT id, privy_user_id, email, wallet_address, display_name, role, settings, created_at, updated_at
       FROM users
       WHERE privy_user_id = $1`,
      [userId]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found. Please ensure you are registered.'
      })
    }

    const user = result.rows[0]

    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required. You do not have permission to access this resource.'
      })
    }

    // Attach user to request
    req.user = user

    next()
  } catch (error) {
    console.error('[Auth Middleware] Error in requireAdmin:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to authenticate user'
    })
  }
}

/**
 * Team Leader or Admin authorization check
 * Requires authentication and team_leader or admin role
 */
export async function requireTeamLeaderOrAdmin(req, res, next) {
  try {
    // First check authentication
    const userId = req.headers['x-user-id']

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required. Please provide x-user-id header.'
      })
    }

    // Fetch user from database
    const result = await query(
      `SELECT id, privy_user_id, email, wallet_address, display_name, role, settings, created_at, updated_at
       FROM users
       WHERE privy_user_id = $1`,
      [userId]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found. Please ensure you are registered.'
      })
    }

    const user = result.rows[0]

    // Check if user is admin or team_leader
    if (user.role !== 'admin' && user.role !== 'team_leader') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Team Leader or Admin access required. You do not have permission to access this resource.'
      })
    }

    // Attach user to request
    req.user = user

    next()
  } catch (error) {
    console.error('[Auth Middleware] Error in requireTeamLeaderOrAdmin:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to authenticate user'
    })
  }
}
