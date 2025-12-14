/**
 * Meshy API Types
 * Based on official Meshy API documentation
 */

/**
 * Task creation response
 * Returns { result: "task-id" } for task creation endpoints
 */
export interface MeshyTaskResponse {
  result?: string;
  task_id?: string;
  id?: string;
}

/**
 * Meshy Task object (from status endpoint)
 */
export interface MeshyTask {
  id: string;
  task_id?: string; // Legacy field
  status: "PENDING" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED" | "CANCELED";
  progress?: number; // 0-100
  model_urls?: {
    glb?: string;
    fbx?: string;
    usdz?: string;
    obj?: string;
    mtl?: string;
  };
  model_url?: string; // Legacy field (v1 API)
  thumbnail_url?: string;
  video_url?: string;
  texture_urls?: Array<{
    base_color: string;
    metallic?: string;
    normal?: string;
    roughness?: string;
  }>;
  prompt?: string;
  art_style?: string;
  texture_prompt?: string;
  texture_image_url?: string;
  seed?: number;
  started_at?: number; // Timestamp in milliseconds
  created_at?: number;
  finished_at?: number;
  preceding_tasks?: number; // Queue position
  task_error?: {
    message: string;
  };
  error?: string; // Legacy field
}

export interface ImageTo3DOptions {
  image_url: string;
  enable_pbr?: boolean;
  ai_model?: string;
  topology?: "quad" | "triangle";
  target_polycount?: number;
  texture_resolution?: number;
}

export interface TextTo3DOptions {
  prompt: string;
  // Preview stage options
  art_style?: "realistic" | "sculpture";
  ai_model?: string; // "meshy-4" | "meshy-5" | "latest"
  topology?: "quad" | "triangle";
  target_polycount?: number;
  should_remesh?: boolean;
  symmetry_mode?: "off" | "auto" | "on";
  pose_mode?: "a-pose" | "t-pose" | "";
  seed?: number;
  moderation?: boolean;
  // Refine stage options
  enable_pbr?: boolean;
  texture_resolution?: number;
  texture_prompt?: string;
  texture_image_url?: string;
  // Legacy fields
  negative_prompt?: string;
}

export interface RetextureOptions {
  input_task_id?: string;
  model_url?: string;
  text_style_prompt?: string;
  image_style_url?: string;
  art_style?: string;
  ai_model?: string;
  enable_original_uv?: boolean;
}

export interface RiggingOptions {
  input_task_id?: string;
  model_url?: string;
  height_meters?: number;
}

/**
 * Rigging task result from Meshy API
 * Note: Rigged models are in result.rigged_character_glb_url, not model_urls
 */
export interface RiggingTaskResult {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED" | "CANCELED";
  progress?: number;
  task_error?: { message: string } | null;
  result?: {
    rigged_character_glb_url?: string;
    rigged_character_fbx_url?: string;
    basic_animations?: {
      walking_glb_url?: string;
      running_glb_url?: string;
      walking_fbx_url?: string;
      running_fbx_url?: string;
      walking_armature_glb_url?: string;
      running_armature_glb_url?: string;
    };
  };
}
