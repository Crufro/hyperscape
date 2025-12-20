/**
 * Generation Types for HyperForge
 *
 * Types for AI generation pipelines (image-to-3d, text-to-3d, audio, etc.)
 */

// =============================================================================
// PIPELINE TYPES
// =============================================================================

/**
 * 3D generation pipeline types
 */
export type GenerationPipeline = "image-to-3d" | "text-to-3d";

/**
 * AI provider options
 */
export type AIProvider = "openai" | "anthropic" | "google" | "meshy";

/**
 * Generation quality levels
 */
export type GenerationQuality = "preview" | "medium" | "high";

// =============================================================================
// STATUS & PROGRESS
// =============================================================================

/**
 * Generation status states
 */
export type GenerationStatus =
  | "idle"
  | "generating"
  | "generating-image"
  | "converting-to-3d"
  | "completed"
  | "failed";

/**
 * Generation progress tracking
 */
export interface GenerationProgress {
  status: GenerationStatus;
  progress: number; // 0-100
  percent?: number; // Alias for progress (SSE compatibility)
  stage?: string; // Current pipeline stage name
  currentStep?: string;
  error?: string;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * 3D generation configuration
 */
export interface GenerationConfig {
  pipeline: GenerationPipeline;
  prompt: string;
  provider?: AIProvider;
  quality?: GenerationQuality;
  imageUrl?: string; // For image-to-3d pipeline
  options?: GenerationOptions;
}

/**
 * Advanced generation options
 */
export interface GenerationOptions {
  enablePBR?: boolean;
  topology?: "quad" | "triangle";
  targetPolycount?: number;
  textureResolution?: number;
  style?: string;
  negativePrompt?: string;
}

// =============================================================================
// RESULTS
// =============================================================================

/**
 * Base fields shared by all generation results
 */
interface GenerationResultBase {
  /** Unique generation ID */
  id?: string;
  /** Meshy task ID */
  taskId: string;
}

/**
 * Successful generation result
 */
export interface GenerationResultSuccess extends GenerationResultBase {
  readonly status: "completed";
  /** URL to the generated 3D model */
  modelUrl: string;
  /** URL to the thumbnail preview */
  thumbnailUrl?: string;
  /** Additional metadata about the generation */
  metadata?: {
    /** Original prompt used */
    prompt?: string;
    /** Pipeline used */
    pipeline?: GenerationPipeline;
    /** Quality setting */
    quality?: GenerationQuality;
    /** Time taken in milliseconds */
    duration?: number;
    /** Polygon count */
    polycount?: number;
  };
}

/**
 * Failed generation result
 */
export interface GenerationResultFailed extends GenerationResultBase {
  readonly status: "failed";
  /** Error code for programmatic handling */
  errorCode: GenerationErrorCode;
  /** Human-readable error message */
  errorMessage: string;
  /** Additional error details for debugging */
  errorDetails?: {
    /** Original error from provider */
    providerError?: string;
    /** Retry suggestion */
    retryable?: boolean;
    /** Suggested fix */
    suggestion?: string;
  };
}

/**
 * Generation error codes for programmatic handling
 */
export type GenerationErrorCode =
  | "INVALID_INPUT"
  | "QUOTA_EXCEEDED"
  | "PROVIDER_ERROR"
  | "TIMEOUT"
  | "CONTENT_FILTERED"
  | "UNSUPPORTED_FORMAT"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

/**
 * Discriminated union for generation results
 * Use status to discriminate between success and failure
 *
 * @example
 * function handleResult(result: GenerationResult) {
 *   if (result.status === "completed") {
 *     // TypeScript knows modelUrl exists
 *     loadModel(result.modelUrl);
 *   } else {
 *     // TypeScript knows errorCode and errorMessage exist
 *     showError(result.errorMessage);
 *   }
 * }
 */
export type GenerationResult = GenerationResultSuccess | GenerationResultFailed;

/**
 * Type guard for successful generation
 */
export function isGenerationSuccess(
  result: GenerationResult,
): result is GenerationResultSuccess {
  return result.status === "completed";
}

/**
 * Type guard for failed generation
 */
export function isGenerationFailed(
  result: GenerationResult,
): result is GenerationResultFailed {
  return result.status === "failed";
}

/**
 * Create a success result
 */
export function createSuccessResult(
  taskId: string,
  modelUrl: string,
  options?: {
    id?: string;
    thumbnailUrl?: string;
    metadata?: GenerationResultSuccess["metadata"];
  },
): GenerationResultSuccess {
  return {
    status: "completed",
    taskId,
    modelUrl,
    id: options?.id,
    thumbnailUrl: options?.thumbnailUrl,
    metadata: options?.metadata,
  };
}

/**
 * Create a failed result
 */
export function createFailedResult(
  taskId: string,
  errorCode: GenerationErrorCode,
  errorMessage: string,
  options?: {
    id?: string;
    errorDetails?: GenerationResultFailed["errorDetails"];
  },
): GenerationResultFailed {
  return {
    status: "failed",
    taskId,
    errorCode,
    errorMessage,
    id: options?.id,
    errorDetails: options?.errorDetails,
  };
}

/**
 * Batch generation job
 */
export interface BatchGenerationJob {
  id: string;
  configs: GenerationConfig[];
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  results: GenerationResult[];
  errors: string[];
}
