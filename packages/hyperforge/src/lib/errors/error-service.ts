/**
 * Error Service
 * Centralized error handling, categorization, and recovery for HyperForge
 */

import { logger } from "@/lib/utils";

const log = logger.child("ErrorService");

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Base error class for HyperForge errors
 */
export class HyperForgeError extends Error {
  public readonly code: string;
  public readonly isRetryable: boolean;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: string;

  constructor(
    message: string,
    code: string,
    options: {
      isRetryable?: boolean;
      context?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    super(message, { cause: options.cause });
    this.name = "HyperForgeError";
    this.code = code;
    this.isRetryable = options.isRetryable ?? false;
    this.context = options.context;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Network-related errors (API calls, fetch failures)
 */
export class NetworkError extends HyperForgeError {
  public readonly statusCode?: number;
  public readonly endpoint?: string;

  constructor(
    message: string,
    options: {
      statusCode?: number;
      endpoint?: string;
      context?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    const isRetryable = options.statusCode
      ? options.statusCode >= 500 || options.statusCode === 429
      : true;

    super(message, "NETWORK_ERROR", {
      isRetryable,
      context: options.context,
      cause: options.cause,
    });
    this.name = "NetworkError";
    this.statusCode = options.statusCode;
    this.endpoint = options.endpoint;
  }
}

/**
 * Validation errors (invalid input, schema violations)
 */
export class ValidationError extends HyperForgeError {
  public readonly field?: string;
  public readonly validationDetails?: Record<string, string[]>;

  constructor(
    message: string,
    options: {
      field?: string;
      validationDetails?: Record<string, string[]>;
      context?: Record<string, unknown>;
    } = {}
  ) {
    super(message, "VALIDATION_ERROR", {
      isRetryable: false,
      context: options.context,
    });
    this.name = "ValidationError";
    this.field = options.field;
    this.validationDetails = options.validationDetails;
  }
}

/**
 * Generation errors (AI generation failures)
 */
export class GenerationError extends HyperForgeError {
  public readonly taskId?: string;
  public readonly stage?: string;

  constructor(
    message: string,
    options: {
      taskId?: string;
      stage?: string;
      isRetryable?: boolean;
      context?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    super(message, "GENERATION_ERROR", {
      isRetryable: options.isRetryable ?? true,
      context: options.context,
      cause: options.cause,
    });
    this.name = "GenerationError";
    this.taskId = options.taskId;
    this.stage = options.stage;
  }
}

/**
 * Storage errors (file system, database, Supabase)
 */
export class StorageError extends HyperForgeError {
  public readonly storageType?: "local" | "supabase" | "database";
  public readonly operation?: "read" | "write" | "delete" | "list";

  constructor(
    message: string,
    options: {
      storageType?: "local" | "supabase" | "database";
      operation?: "read" | "write" | "delete" | "list";
      isRetryable?: boolean;
      context?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    super(message, "STORAGE_ERROR", {
      isRetryable: options.isRetryable ?? true,
      context: options.context,
      cause: options.cause,
    });
    this.name = "StorageError";
    this.storageType = options.storageType;
    this.operation = options.operation;
  }
}

/**
 * Authentication/Authorization errors
 */
export class AuthError extends HyperForgeError {
  constructor(
    message: string,
    options: {
      context?: Record<string, unknown>;
    } = {}
  ) {
    super(message, "AUTH_ERROR", {
      isRetryable: false,
      context: options.context,
    });
    this.name = "AuthError";
  }
}

// =============================================================================
// ERROR CATEGORIZATION
// =============================================================================

export type ErrorCategory =
  | "network"
  | "validation"
  | "generation"
  | "storage"
  | "auth"
  | "unknown";

/**
 * Categorize an unknown error
 */
export function categorizeError(error: unknown): ErrorCategory {
  if (error instanceof NetworkError) return "network";
  if (error instanceof ValidationError) return "validation";
  if (error instanceof GenerationError) return "generation";
  if (error instanceof StorageError) return "storage";
  if (error instanceof AuthError) return "auth";

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("timeout")
    ) {
      return "network";
    }
    if (
      message.includes("invalid") ||
      message.includes("required") ||
      message.includes("must be")
    ) {
      return "validation";
    }
    if (
      message.includes("generate") ||
      message.includes("meshy") ||
      message.includes("ai")
    ) {
      return "generation";
    }
    if (
      message.includes("storage") ||
      message.includes("file") ||
      message.includes("database")
    ) {
      return "storage";
    }
    if (
      message.includes("unauthorized") ||
      message.includes("forbidden") ||
      message.includes("auth")
    ) {
      return "auth";
    }
  }

  return "unknown";
}

/**
 * Convert unknown error to HyperForgeError
 */
export function normalizeError(error: unknown): HyperForgeError {
  if (error instanceof HyperForgeError) {
    return error;
  }

  if (error instanceof Error) {
    const category = categorizeError(error);

    switch (category) {
      case "network":
        return new NetworkError(error.message, { cause: error });
      case "validation":
        return new ValidationError(error.message);
      case "generation":
        return new GenerationError(error.message, { cause: error });
      case "storage":
        return new StorageError(error.message, { cause: error });
      case "auth":
        return new AuthError(error.message);
      default:
        return new HyperForgeError(error.message, "UNKNOWN_ERROR", {
          cause: error,
        });
    }
  }

  return new HyperForgeError(
    typeof error === "string" ? error : "An unknown error occurred",
    "UNKNOWN_ERROR"
  );
}

// =============================================================================
// RETRY LOGIC
// =============================================================================

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, "onRetry">> = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Execute a function with automatic retry for transient failures
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const normalizedError = normalizeError(error);
      lastError = normalizedError;

      if (!normalizedError.isRetryable || attempt === opts.maxAttempts) {
        throw normalizedError;
      }

      const delayMs = Math.min(
        opts.baseDelayMs * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelayMs
      );

      log.warn("Retrying after error", {
        attempt,
        maxAttempts: opts.maxAttempts,
        delayMs,
        error: normalizedError.message,
      });

      opts.onRetry?.(attempt, normalizedError, delayMs);

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError ?? new HyperForgeError("Retry failed", "RETRY_EXHAUSTED");
}

// =============================================================================
// ERROR FORMATTING
// =============================================================================

export interface FormattedError {
  message: string;
  code: string;
  category: ErrorCategory;
  isRetryable: boolean;
  userMessage: string;
  technicalDetails?: string;
}

/**
 * Format an error for display or logging
 */
export function formatError(error: unknown): FormattedError {
  const normalized = normalizeError(error);
  const category = categorizeError(normalized);

  const userMessages: Record<ErrorCategory, string> = {
    network:
      "Unable to connect to the server. Please check your internet connection.",
    validation: "The provided data is invalid. Please check your input.",
    generation:
      "Asset generation failed. Please try again or adjust your settings.",
    storage: "Unable to save or load data. Please try again.",
    auth: "You are not authorized to perform this action.",
    unknown: "An unexpected error occurred. Please try again.",
  };

  return {
    message: normalized.message,
    code: normalized.code,
    category,
    isRetryable: normalized.isRetryable,
    userMessage: userMessages[category],
    technicalDetails:
      process.env.NODE_ENV === "development"
        ? JSON.stringify(normalized.context, null, 2)
        : undefined,
  };
}

// =============================================================================
// ERROR HISTORY (for debugging)
// =============================================================================

interface ErrorHistoryEntry {
  error: FormattedError;
  timestamp: string;
  url?: string;
}

const errorHistory: ErrorHistoryEntry[] = [];
const MAX_ERROR_HISTORY = 50;

/**
 * Record an error in the history
 */
export function recordError(error: unknown, url?: string): void {
  const formatted = formatError(error);
  
  errorHistory.unshift({
    error: formatted,
    timestamp: new Date().toISOString(),
    url,
  });

  if (errorHistory.length > MAX_ERROR_HISTORY) {
    errorHistory.pop();
  }

  log.error("Error recorded", {
    code: formatted.code,
    message: formatted.message,
    category: formatted.category,
  });
}

/**
 * Get error history for debugging
 */
export function getErrorHistory(): ErrorHistoryEntry[] {
  return [...errorHistory];
}

/**
 * Clear error history
 */
export function clearErrorHistory(): void {
  errorHistory.length = 0;
}
