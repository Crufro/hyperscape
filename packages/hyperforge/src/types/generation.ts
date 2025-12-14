/**
 * Generation Types
 * Types for AI generation pipelines
 */

export type GenerationPipeline = "image-to-3d" | "text-to-3d";

export type GenerationStatus =
  | "idle"
  | "generating-image"
  | "converting-to-3d"
  | "completed"
  | "failed";

export interface GenerationConfig {
  pipeline: GenerationPipeline;
  prompt: string;
  provider?: "openai" | "anthropic" | "google";
  imageUrl?: string; // For image-to-3d pipeline
  options?: {
    enablePBR?: boolean;
    topology?: "quad" | "triangle";
    targetPolycount?: number;
    textureResolution?: number;
  };
}

export interface GenerationProgress {
  status: GenerationStatus;
  progress: number; // 0-100
  currentStep?: string;
  error?: string;
}

export interface GenerationResult {
  taskId: string;
  modelUrl: string;
  thumbnailUrl?: string;
  status: "completed" | "failed";
  error?: string;
}
