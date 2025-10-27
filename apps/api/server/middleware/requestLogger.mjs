/**
 * Request Logger Middleware
 * Logs all API requests for statistics and debugging
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.join(__dirname, '../../../..')
// Use /tmp for logs on Railway (ephemeral but writable)
const LOGS_DIR = process.env.RAILWAY_ENVIRONMENT ? '/tmp/logs' : path.join(ROOT_DIR, 'logs')

/**
 * Ensure logs directory exists
 */
async function ensureLogsDir() {
  try {
    await fs.mkdir(LOGS_DIR, { recursive: true })
  } catch (err) {
    console.error('[RequestLogger] Failed to create logs directory:', err.message)
  }
}

/**
 * Write request log to file
 */
async function writeRequestLog(requestData) {
  try {
    await ensureLogsDir()

    const logEntry = `${JSON.stringify(requestData)}\n`
    const logPath = path.join(LOGS_DIR, 'api-requests.log')
    await fs.appendFile(logPath, logEntry, 'utf-8')
  } catch (err) {
    console.error('[RequestLogger] Failed to write request log:', err.message)
  }
}

/**
 * Request logging middleware
 * Captures all API requests and their outcomes
 */
export function requestLogger(req, res, next) {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()

  // Skip logging for static assets
  if (req.path.startsWith('/assets') || req.path.startsWith('/temp-images')) {
    return next()
  }

  // Capture original send method
  const originalSend = res.send
  const originalJson = res.json

  let responseBody = null
  let isError = false

  // Override send method to capture response
  res.send = function (body) {
    responseBody = body
    isError = res.statusCode >= 400
    return originalSend.call(this, body)
  }

  // Override json method to capture response
  res.json = function (body) {
    responseBody = body
    isError = res.statusCode >= 400
    return originalJson.call(this, body)
  }

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime
    const success = res.statusCode < 400

    const requestData = {
      timestamp,
      method: req.method,
      path: req.path,
      query: req.query,
      status: res.statusCode,
      success,
      duration,
      contentType: req.headers['content-type'],
      userAgent: req.headers['user-agent'],
      origin: req.headers.origin,
      errorMessage: isError && responseBody?.error?.message ? responseBody.error.message : null,
      errorCode: isError && responseBody?.error?.code ? responseBody.error.code : null
    }

    // Log to console (brief)
    console.log(
      `[API] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)${!success ? ' ERROR' : ''}`
    )

    // Write to log file (async, don't block)
    writeRequestLog(requestData).catch(logErr => {
      console.error('[RequestLogger] Log write failed:', logErr.message)
    })
  })

  next()
}
