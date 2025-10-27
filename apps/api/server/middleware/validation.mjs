/**
 * Request Validation Middleware
 *
 * Provides Express middleware for validating request bodies, params, and queries
 * using Zod schemas with proper error handling and logging.
 */

/**
 * Create a validation middleware for request body
 *
 * @param {import('zod').ZodType} schema - Zod schema to validate against
 * @returns {import('express').RequestHandler}
 */
export function validateBody(schema) {
  return async (req, res, next) => {
    const startTime = Date.now()

    try {
      const result = schema.safeParse(req.body)

      if (!result.success) {
        const duration = Date.now() - startTime
        console.warn(`[Validation] Body validation failed (${duration}ms):`, result.error.errors)

        return res.status(400).json({
          error: 'Validation failed',
          code: 'VAL_1100',
          message: 'Invalid request body',
          details: {
            errors: result.error.errors.map(e => ({
              path: e.path.join('.'),
              message: e.message,
              code: e.code
            }))
          },
          timestamp: new Date().toISOString()
        })
      }

      // Replace req.body with validated and typed data
      req.body = result.data
      const duration = Date.now() - startTime
      console.log(`[Validation] Body validation passed (${duration}ms)`)

      next()
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`[Validation] Body validation error (${duration}ms):`, error)

      res.status(500).json({
        error: 'Validation error',
        code: 'ERR_9001',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    }
  }
}

/**
 * Create a validation middleware for request params
 *
 * @param {import('zod').ZodType} schema - Zod schema to validate against
 * @returns {import('express').RequestHandler}
 */
export function validateParams(schema) {
  return async (req, res, next) => {
    const startTime = Date.now()

    try {
      const result = schema.safeParse(req.params)

      if (!result.success) {
        const duration = Date.now() - startTime
        console.warn(`[Validation] Params validation failed (${duration}ms):`, result.error.errors)

        return res.status(400).json({
          error: 'Validation failed',
          code: 'VAL_1100',
          message: 'Invalid URL parameters',
          details: {
            errors: result.error.errors.map(e => ({
              path: e.path.join('.'),
              message: e.message,
              code: e.code
            }))
          },
          timestamp: new Date().toISOString()
        })
      }

      req.params = result.data
      const duration = Date.now() - startTime
      console.log(`[Validation] Params validation passed (${duration}ms)`)

      next()
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`[Validation] Params validation error (${duration}ms):`, error)

      res.status(500).json({
        error: 'Validation error',
        code: 'ERR_9001',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    }
  }
}

/**
 * Create a validation middleware for query parameters
 *
 * @param {import('zod').ZodType} schema - Zod schema to validate against
 * @returns {import('express').RequestHandler}
 */
export function validateQuery(schema) {
  return async (req, res, next) => {
    const startTime = Date.now()

    try {
      const result = schema.safeParse(req.query)

      if (!result.success) {
        const duration = Date.now() - startTime
        console.warn(`[Validation] Query validation failed (${duration}ms):`, result.error.errors)

        return res.status(400).json({
          error: 'Validation failed',
          code: 'VAL_1100',
          message: 'Invalid query parameters',
          details: {
            errors: result.error.errors.map(e => ({
              path: e.path.join('.'),
              message: e.message,
              code: e.code
            }))
          },
          timestamp: new Date().toISOString()
        })
      }

      req.query = result.data
      const duration = Date.now() - startTime
      console.log(`[Validation] Query validation passed (${duration}ms)`)

      next()
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`[Validation] Query validation error (${duration}ms):`, error)

      res.status(500).json({
        error: 'Validation error',
        code: 'ERR_9001',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    }
  }
}

/**
 * Validate response data before sending
 * Useful for ensuring API responses match expected schema
 *
 * @param {import('zod').ZodType} schema - Zod schema to validate against
 * @param {any} data - Data to validate
 * @returns {any} Validated data
 * @throws {Error} If validation fails
 */
export function validateResponse(schema, data) {
  const startTime = Date.now()

  try {
    const result = schema.safeParse(data)

    if (!result.success) {
      const duration = Date.now() - startTime
      console.error(`[Validation] Response validation failed (${duration}ms):`, result.error.errors)

      throw new Error(`Response validation failed: ${result.error.errors.map(e => e.message).join(', ')}`)
    }

    const duration = Date.now() - startTime
    console.log(`[Validation] Response validation passed (${duration}ms)`)

    return result.data
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[Validation] Response validation error (${duration}ms):`, error)
    throw error
  }
}
