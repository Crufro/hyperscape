/**
 * API Route Error Handling Wrapper
 * Provides consistent error handling for all Next.js API routes
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils";
import {
  HyperForgeError,
  NetworkError,
  ValidationError,
  GenerationError,
  StorageError,
  AuthError,
  normalizeError,
  recordError,
} from "./error-service";

const log = logger.child("API:ErrorHandler");

// =============================================================================
// TYPES
// =============================================================================

export interface ApiErrorResponse {
  error: string;
  code: string;
  isRetryable: boolean;
  details?: Record<string, unknown>;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

type ApiHandler = (
  request: NextRequest,
  context?: { params: Record<string, string> }
) => Promise<NextResponse<unknown>>;

type RawHandler<T> = (
  request: NextRequest,
  context?: { params: Record<string, string> }
) => Promise<T>;

// =============================================================================
// ERROR TO RESPONSE MAPPING
// =============================================================================

function getStatusCode(error: HyperForgeError): number {
  if (error instanceof ValidationError) return 400;
  if (error instanceof AuthError) return 401;
  if (error instanceof NetworkError && error.statusCode) return error.statusCode;
  if (error instanceof StorageError) return 500;
  if (error instanceof GenerationError) return 502;
  return 500;
}

function createErrorResponse(error: HyperForgeError): NextResponse<ApiErrorResponse> {
  const statusCode = getStatusCode(error);
  
  const response: ApiErrorResponse = {
    error: error.message,
    code: error.code,
    isRetryable: error.isRetryable,
  };

  // Include details in development
  if (process.env.NODE_ENV === "development" && error.context) {
    response.details = error.context;
  }

  return NextResponse.json(response, { status: statusCode });
}

// =============================================================================
// WRAPPER FUNCTION
// =============================================================================

/**
 * Wrap an API route handler with consistent error handling
 *
 * @example
 * ```typescript
 * export const GET = withErrorHandling(async (request) => {
 *   const data = await fetchData();
 *   return NextResponse.json({ success: true, data });
 * });
 * ```
 */
export function withErrorHandling(
  handler: ApiHandler
): ApiHandler {
  return async (request, context) => {
    const startTime = Date.now();
    const url = request.url;
    const method = request.method;

    try {
      const response = await handler(request, context);
      
      log.debug("API request completed", {
        method,
        url,
        status: response.status,
        durationMs: Date.now() - startTime,
      });

      return response;
    } catch (error) {
      const normalized = normalizeError(error);
      
      log.error("API request failed", {
        method,
        url,
        error: normalized.message,
        code: normalized.code,
        durationMs: Date.now() - startTime,
      });

      // Record in error history for debugging
      recordError(normalized, url);

      return createErrorResponse(normalized);
    }
  };
}

/**
 * Wrap an API handler that returns raw data (not NextResponse)
 * Automatically wraps successful responses in { success: true, data: ... }
 *
 * @example
 * ```typescript
 * export const GET = withApiHandler(async (request) => {
 *   const items = await getItems();
 *   return items; // Will be wrapped as { success: true, data: items }
 * });
 * ```
 */
export function withApiHandler<T>(
  handler: RawHandler<T>
): ApiHandler {
  return withErrorHandling(async (request, context) => {
    const data = await handler(request, context);
    return NextResponse.json({ success: true, data } as ApiSuccessResponse<T>);
  });
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Parse and validate JSON body from request
 * Throws ValidationError if body is invalid
 */
export async function parseJsonBody<T>(
  request: NextRequest,
  validate?: (data: unknown) => data is T
): Promise<T> {
  try {
    const body = await request.json();
    
    if (validate && !validate(body)) {
      throw new ValidationError("Invalid request body");
    }
    
    return body as T;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ValidationError("Failed to parse request body", {
      context: { error: String(error) },
    });
  }
}

/**
 * Get required query parameter
 * Throws ValidationError if parameter is missing
 */
export function getRequiredParam(
  request: NextRequest,
  name: string
): string {
  const value = request.nextUrl.searchParams.get(name);
  
  if (!value) {
    throw new ValidationError(`Missing required parameter: ${name}`, {
      field: name,
    });
  }
  
  return value;
}

/**
 * Get optional query parameter with default
 */
export function getOptionalParam(
  request: NextRequest,
  name: string,
  defaultValue?: string
): string | undefined {
  return request.nextUrl.searchParams.get(name) ?? defaultValue;
}

/**
 * Validate that required fields exist in an object
 */
export function validateRequired<T extends Record<string, unknown>>(
  data: T,
  requiredFields: (keyof T)[]
): void {
  const missing: string[] = [];
  
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null) {
      missing.push(String(field));
    }
  }
  
  if (missing.length > 0) {
    throw new ValidationError(`Missing required fields: ${missing.join(", ")}`, {
      validationDetails: {
        missing,
      },
    });
  }
}

// =============================================================================
// RE-EXPORTS
// =============================================================================

export {
  HyperForgeError,
  NetworkError,
  ValidationError,
  GenerationError,
  StorageError,
  AuthError,
} from "./error-service";
