#!/usr/bin/env node
/**
 * HyperForge Development Setup Script
 * 
 * Ensures all prerequisites are met before starting the dev server:
 * - CDN is running (for loading game assets)
 * - Manifests directory exists (for CDN asset loading)
 * - Database is ready
 */

import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const hyperforgeDir = path.join(__dirname, '..')
const rootDir = path.join(hyperforgeDir, '../..')
const serverDir = path.join(rootDir, 'packages/server')

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
}

console.log(`${colors.bright}${colors.cyan}
╔═══════════════════════════════════════════╗
║   HyperForge Development Setup            ║
╚═══════════════════════════════════════════╝
${colors.reset}`)

let hasWarnings = false

// 1. Check manifests directory
console.log(`${colors.blue}Checking asset manifests...${colors.reset}`)
const manifestsPath = path.join(serverDir, 'world/assets/manifests')
if (fs.existsSync(manifestsPath)) {
  const manifestFiles = ['items.json', 'npcs.json', 'resources.json']
  const existingManifests = manifestFiles.filter(f => 
    fs.existsSync(path.join(manifestsPath, f))
  )
  console.log(`${colors.green}✓ Found ${existingManifests.length}/${manifestFiles.length} manifests${colors.reset}`)
} else {
  console.log(`${colors.yellow}⚠️  Manifests directory not found at ${manifestsPath}${colors.reset}`)
  console.log(`${colors.dim}   CDN assets won't load until manifests are created${colors.reset}`)
  hasWarnings = true
}

// 2. Check avatars directory
console.log(`${colors.blue}Checking VRM avatars...${colors.reset}`)
const avatarsPath = path.join(serverDir, 'world/assets/avatars')
if (fs.existsSync(avatarsPath)) {
  try {
    const vrmFiles = fs.readdirSync(avatarsPath).filter(f => f.endsWith('.vrm'))
    console.log(`${colors.green}✓ Found ${vrmFiles.length} VRM avatar(s)${colors.reset}`)
  } catch {
    console.log(`${colors.yellow}⚠️  Could not read avatars directory${colors.reset}`)
    hasWarnings = true
  }
} else {
  console.log(`${colors.yellow}⚠️  Avatars directory not found${colors.reset}`)
  hasWarnings = true
}

// 3. Check CDN status
console.log(`${colors.blue}Checking CDN status...${colors.reset}`)

function isDockerAvailable() {
  try {
    execSync('docker info', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

async function checkCDN() {
  // First try to reach CDN directly
  try {
    const res = await fetch('http://localhost:8080/health', { 
      signal: AbortSignal.timeout(2000) 
    })
    if (res.ok) {
      console.log(`${colors.green}✓ CDN is running at localhost:8080${colors.reset}`)
      return true
    }
  } catch {
    // CDN not running
  }

  // Try to start it via Docker
  if (isDockerAvailable()) {
    console.log(`${colors.dim}CDN not running, attempting to start...${colors.reset}`)
    try {
      // Check if container exists but is stopped
      const status = execSync('docker ps -a --filter "name=hyperscape-cdn" --format "{{.Status}}"', { 
        encoding: 'utf8',
        cwd: serverDir 
      }).trim()

      if (status && !status.includes('Up')) {
        // Start existing container
        execSync('docker start hyperscape-cdn', { stdio: 'pipe', cwd: serverDir })
      } else if (!status) {
        // No container, try docker-compose
        execSync('docker-compose up -d cdn', { stdio: 'pipe', cwd: serverDir })
      }

      // Wait for CDN to be ready
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 500))
        try {
          const res = await fetch('http://localhost:8080/health', { 
            signal: AbortSignal.timeout(1000) 
          })
          if (res.ok) {
            console.log(`${colors.green}✓ CDN started successfully${colors.reset}`)
            return true
          }
        } catch {
          // Still starting
        }
      }
    } catch (e) {
      // Failed to start
    }
  }

  console.log(`${colors.yellow}⚠️  CDN not available at localhost:8080${colors.reset}`)
  console.log(`${colors.dim}   Run 'bun run cdn:up' from repo root to start CDN${colors.reset}`)
  console.log(`${colors.dim}   Or run the main 'bun run dev' which starts CDN automatically${colors.reset}`)
  hasWarnings = true
  return false
}

await checkCDN()

// 4. Check/create database directory
console.log(`${colors.blue}Checking database...${colors.reset}`)
const dbDir = path.join(hyperforgeDir, 'data')
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}
console.log(`${colors.green}✓ Database directory ready${colors.reset}`)

// Summary
console.log()
if (hasWarnings) {
  console.log(`${colors.yellow}⚠️  Setup complete with warnings${colors.reset}`)
  console.log(`${colors.dim}Some features may not work until issues are resolved${colors.reset}`)
} else {
  console.log(`${colors.bright}${colors.green}✓ Setup complete!${colors.reset}`)
}
console.log()
