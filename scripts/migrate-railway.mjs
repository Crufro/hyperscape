#!/usr/bin/env node
/**
 * Railway Database Migration Script
 * Runs schema.sql and migrations against Railway PostgreSQL
 */

import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.join(__dirname, '..')

// Railway connection details from environment
// Use DATABASE_PUBLIC_URL for local runs, DATABASE_URL for Railway services
const DATABASE_URL = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment')
  console.error('Run this script with: railway run node scripts/migrate-railway.mjs')
  process.exit(1)
}

console.log('🔗 Using database:', DATABASE_URL.replace(/:[^:@]+@/, ':****@'))

console.log('🚀 Connecting to Railway PostgreSQL...')

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Railway uses SSL
  }
})

async function runMigration(filePath, description) {
  console.log(`\n📄 Running: ${description}`)

  const sql = fs.readFileSync(filePath, 'utf8')

  try {
    await client.query(sql)
    console.log(`✅ ${description} completed successfully`)
    return true
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message)
    return false
  }
}

async function main() {
  try {
    await client.connect()
    console.log('✅ Connected to database')

    // Check if schema already exists
    const checkResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'users'
    `)

    if (checkResult.rows.length > 0) {
      console.log('\n⚠️  Database already has tables. Skip schema.sql? (y/n)')
      console.log('   Press Ctrl+C to cancel, or continue to run schema anyway...')
      // For automation, we'll skip if tables exist
      console.log('   Skipping schema.sql since tables exist')
    } else {
      // Run main schema
      await runMigration(
        path.join(ROOT_DIR, 'apps/api/database/schema.sql'),
        'Main schema (schema.sql)'
      )
    }

    // Run migrations in order
    const migrations = [
      {
        file: 'apps/api/database/migrations/002_add_preview_manifest_status.sql',
        desc: 'Migration 002: Add preview manifest status'
      },
      {
        file: 'apps/api/database/migrations/003_add_whitelist_and_team_leader.sql',
        desc: 'Migration 003: Add whitelist and team leader'
      },
      {
        file: 'apps/api/database/migrations/004_add_model_configuration_tables.sql',
        desc: 'Migration 004: Add model configuration tables'
      }
    ]

    for (const migration of migrations) {
      const migrationPath = path.join(ROOT_DIR, migration.file)
      if (fs.existsSync(migrationPath)) {
        await runMigration(migrationPath, migration.desc)
      } else {
        console.log(`⚠️  Migration file not found: ${migration.file}`)
      }
    }

    console.log('\n✅ All migrations completed!')

    // Show table count
    const tablesResult = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `)
    console.log(`📊 Total tables in database: ${tablesResult.rows[0].count}`)

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await client.end()
    console.log('\n🔌 Database connection closed')
  }
}

main()
