/**
 * Error Handler Middleware
 * Provides consistent error responses and logging
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.join(__dirname, '../../../..')
const LOGS_DIR = path.join(ROOT_DIR, 'logs')

/**
 * Ensure logs directory exists
 */
async function ensureLogsDir() {
  try {
    await fs.mkdir(LOGS_DIR, { recursive: true })
  } catch (err) {
    console.error('[ErrorHandler] Failed to create logs directory:', err.message)
  }
}

/**
 * Write error log to file
 */
async function writeErrorLog(errorData) {
  try {
    await ensureLogsDir()

    const logEntry = `
=== API ERROR ===
Time: ${errorData.timestamp}
Method: ${errorData.method}
Path: ${errorData.path}
Status: ${errorData.status}
Message: ${errorData.message}
Stack: ${errorData.stack}
Request Body: ${JSON.stringify(errorData.body, null, 2)}
Query Params: ${JSON.stringify(errorData.query, null, 2)}
Headers: ${JSON.stringify(errorData.headers, null, 2)}
Error Code: ${errorData.errorCode || 'N/A'}
==================

`

    const logPath = path.join(LOGS_DIR, 'api-errors.log')
    await fs.appendFile(logPath, logEntry, 'utf-8')
  } catch (err) {
    console.error('[ErrorHandler] Failed to write error log:', err.message)
  }
}

export async function errorHandler(err, req, res, next) {
  const timestamp = new Date().toISOString()
  const status = err.status || 500

  // Build error data
  const errorData = {
    timestamp,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    headers: {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent'],
      origin: req.headers.origin
    },
    status,
    errorCode: err.code
  }

  // Log to console
  console.error('[API Error]', {
    message: err.message,
    path: req.path,
    method: req.method,
    status,
    timestamp
  })

  // Write to log file (async, don't block response)
  writeErrorLog(errorData).catch(logErr => {
    console.error('[ErrorHandler] Log write failed:', logErr.message)
  })

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production'

  // Send error response
  res.status(status).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: status,
      code: err.code,
      ...(isDevelopment && { stack: err.stack })
    }
  })
}