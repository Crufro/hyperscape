#!/usr/bin/env node
/**
 * Railway Admin Whitelist Script
 * Add wallet to admin whitelist: 0x62122994F6aC68d98A11B1D17249BD4930253cbB
 */

import pg from 'pg'

const WALLET_ADDRESS = '0x62122994F6aC68d98A11B1D17249BD4930253cbB'

// Railway connection details from environment
const DATABASE_URL = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment')
  console.error('Run this script with: railway run node scripts/migrate-railway.mjs')
  process.exit(1)
}

console.log('🔗 Using database:', DATABASE_URL.replace(/:[^:@]+@/, ':****@'))

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Railway uses SSL
  }
})

async function addToWhitelist() {
  try {
    await client.connect()
    console.log('✅ Connected to database')

    // Add to whitelist (idempotent)
    console.log(`\n🔧 Adding wallet to admin whitelist: ${WALLET_ADDRESS}`)
    await client.query(
      `INSERT INTO admin_whitelist (wallet_address, reason)
       VALUES ($1, 'Initial admin setup for project owner')
       ON CONFLICT (wallet_address) DO NOTHING`,
      [WALLET_ADDRESS]
    )

    // Check whitelist
    const whitelistCheck = await client.query(
      'SELECT wallet_address, added_by, reason, created_at FROM admin_whitelist WHERE LOWER(wallet_address) = LOWER($1)',
      [WALLET_ADDRESS]
    )

    if (whitelistCheck.rows.length > 0) {
      console.log('\n✅ Wallet in admin whitelist:')
      console.log(`   Wallet: ${whitelistCheck.rows[0].wallet_address}`)
      console.log(`   Added by: ${whitelistCheck.rows[0].added_by}`)
      console.log(`   Reason: ${whitelistCheck.rows[0].reason}`)
      console.log(`   Added at: ${whitelistCheck.rows[0].created_at}`)
    }

    // Update existing user if they exist
    console.log('\n🔧 Updating existing user role (if user exists)...')
    const updateResult = await client.query(
      `UPDATE users SET role = 'admin' WHERE LOWER(wallet_address) = LOWER($1) AND role != 'admin' RETURNING id`,
      [WALLET_ADDRESS]
    )

    if (updateResult.rows.length > 0) {
      console.log(`✅ Updated ${updateResult.rows.length} user(s) to admin role`)
    } else {
      console.log('ℹ️  No existing user to update (will be set to admin on next login)')
    }

    // Show current user status
    const userCheck = await client.query(
      'SELECT id, wallet_address, role, created_at FROM users WHERE LOWER(wallet_address) = LOWER($1)',
      [WALLET_ADDRESS]
    )

    if (userCheck.rows.length > 0) {
      console.log('\n📋 Current user status:')
      console.log(`   ID: ${userCheck.rows[0].id}`)
      console.log(`   Wallet: ${userCheck.rows[0].wallet_address}`)
      console.log(`   Role: ${userCheck.rows[0].role}`)
      console.log(`   Created: ${userCheck.rows[0].created_at}`)
    }

    console.log('\n✅ Done! Wallet is now in admin whitelist')
    console.log('ℹ️  User will have admin access on next login/page refresh')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  } finally {
    await client.end()
    console.log('\n🔌 Database connection closed')
  }
}

addToWhitelist()
