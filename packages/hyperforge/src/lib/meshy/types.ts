/**
 * Meshy API Types
 * Based on official Meshy API documentation
 *
 * @see https://docs.meshy.ai/en/api/image-to-3d - Image-to-3D API
 * @see https://docs.meshy.ai/api/text-to-3d - Text-to-3D API
 * @see https://docs.meshy.ai/en/api/changelog - API changelog
 */

// ============================================================================
// API Model Versions
// ============================================================================

/**
 * Meshy AI model versions
 * Use "latest" to get the newest model (currently Meshy-6)
 */
export type MeshyAIModel = "meshy-4" | "meshy-5" | "meshy-6" | "latest";

/**
 * Mesh topology options
 * - "triangle": Standard triangle mesh (GPU-compatible, recommended for runtime)
 * - "quad": Quad-dominant mesh (artist-friendly for retopology, convert to triangles for runtime)
 */
export type MeshTopology = "quad" | "triangle";

/**
 * Art style for generation
 */
export type MeshyArtStyle = "realistic" | "sculpture";

/**
 * Symmetry mode for text-to-3d
 */
export type MeshySymmetryMode = "off" | "auto" | "on";

/**
 * Pose mode for character generation
 */
export type MeshyPoseMode = "a-pose" | "t-pose" | "";

// ============================================================================
// Task Responses
// ============================================================================

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

// ============================================================================
// Image-to-3D Options
// ============================================================================

/**
 * Image-to-3D generation options
 *
 * @see https://docs.meshy.ai/en/api/image-to-3d
 */
export interface ImageTo3DOptions {
  /** Source image URL or data URI */
  image_url: string;

  /**
   * Enable PBR texture generation (normal, metallic, roughness maps)
   * @default true
   */
  enable_pbr?: boolean;

  /**
   * AI model version to use
   * @default "meshy-4"
   */
  ai_model?: MeshyAIModel;

  /**
   * Mesh topology type
   * - "triangle": GPU-ready for Three.js/WebGL (recommended for runtime)
   * - "quad": Artist-friendly for retopology workflows
   * @default "quad"
   */
  topology?: MeshTopology;

  /**
   * Target polygon count for the generated mesh
   * Recommended ranges for Three.js web MMO:
   * - Small props: 500 - 2,000
   * - Medium props: 2,000 - 5,000
   * - Large props: 5,000 - 10,000
   * - NPC Characters: 2,000 - 10,000
   * - Small buildings: 5,000 - 15,000
   * - Large structures: 15,000 - 50,000
   * @default 30000
   */
  target_polycount?: number;

  /**
   * Texture resolution in pixels
   * @default 2048
   */
  texture_resolution?: number;

  /**
   * Enable mesh remeshing for cleaner topology
   * @default true
   */
  should_remesh?: boolean;

  /**
   * Enable texture generation
   * Set to false for untextured mesh (faster, lower cost)
   * @default true
   */
  should_texture?: boolean;
}

/**
 * Multi-image to 3D options (Meshy 5+)
 * Multi-view input improves geometry reconstruction
 *
 * @see https://fal.ai/models/fal-ai/meshy/v5/multi-image-to-3d/api
 */
export interface MultiImageTo3DOptions
  extends Omit<ImageTo3DOptions, "image_url"> {
  /**
   * Array of image URLs for multi-view reconstruction
   * Providing multiple angles improves mesh quality
   */
  image_urls: string[];
}

// ============================================================================
// Text-to-3D Options
// ============================================================================

/**
 * Text-to-3D generation options
 *
 * Two-stage process:
 * 1. Preview stage: Generates mesh without texture
 * 2. Refine stage: Adds texture to preview mesh
 *
 * @see https://docs.meshy.ai/api/text-to-3d
 */
export interface TextTo3DOptions {
  /** Text prompt describing the 3D model to generate */
  prompt: string;

  // -------------------------------------------------------------------------
  // Preview Stage Options (mesh generation)
  // -------------------------------------------------------------------------

  /**
   * Art style for generation
   * @default "realistic"
   */
  art_style?: MeshyArtStyle;

  /**
   * AI model version to use
   * Use "latest" for newest model (recommended)
   * @default "latest"
   */
  ai_model?: MeshyAIModel;

  /**
   * Mesh topology type
   * - "triangle": GPU-ready for Three.js/WebGL (recommended for runtime)
   * - "quad": Artist-friendly for retopology workflows
   * @default "triangle"
   */
  topology?: MeshTopology;

  /**
   * Target polygon count for the generated mesh
   * See ImageTo3DOptions for recommended ranges by asset type
   * @default 30000
   */
  target_polycount?: number;

  /**
   * Enable mesh remeshing for cleaner topology
   * @default true
   */
  should_remesh?: boolean;

  /**
   * Symmetry mode for mesh generation
   * - "off": No symmetry enforcement
   * - "auto": AI decides based on prompt
   * - "on": Force bilateral symmetry
   * @default "auto"
   */
  symmetry_mode?: MeshySymmetryMode;

  /**
   * Pose mode for character generation
   * - "a-pose": Arms at 45 degrees (better for rigging)
   * - "t-pose": Arms horizontal (traditional rigging pose)
   * - "": No specific pose
   * @default ""
   */
  pose_mode?: MeshyPoseMode;

  /**
   * Random seed for reproducible generation
   * Same seed + prompt = same result
   */
  seed?: number;

  /**
   * Enable content moderation
   * @default false
   */
  moderation?: boolean;

  // -------------------------------------------------------------------------
  // Refine Stage Options (texture generation)
  // -------------------------------------------------------------------------

  /**
   * Enable PBR texture generation (normal, metallic, roughness maps)
   * @default true
   */
  enable_pbr?: boolean;

  /**
   * Texture resolution in pixels
   * Note: Only valid for preview stage, not refine stage per Meshy docs
   * @default 2048
   */
  texture_resolution?: number;

  /**
   * Custom prompt to guide texture generation
   * If not provided, Meshy uses the original preview prompt
   */
  texture_prompt?: string;

  /**
   * Reference image URL for texture style
   * Alternative to texture_prompt
   */
  texture_image_url?: string;

  // -------------------------------------------------------------------------
  // Legacy Fields (deprecated, kept for compatibility)
  // -------------------------------------------------------------------------

  /** @deprecated Use prompt instead */
  negative_prompt?: string;
}

// ============================================================================
// Retexture Options
// ============================================================================

/**
 * Retexture task options
 * Apply new textures to existing 3D models
 */
export interface RetextureOptions {
  /** Task ID of the source model (use this OR model_url) */
  input_task_id?: string;

  /** URL of the source model (use this OR input_task_id) */
  model_url?: string;

  /** Text prompt describing desired texture style */
  text_style_prompt?: string;

  /** Reference image URL for texture style (alternative to text_style_prompt) */
  image_style_url?: string;

  /**
   * Art style for retexturing
   * @default "realistic"
   */
  art_style?: MeshyArtStyle;

  /**
   * AI model version
   * @default "meshy-5"
   */
  ai_model?: MeshyAIModel;

  /**
   * Preserve original UV mapping
   * @default true
   */
  enable_original_uv?: boolean;
}

// ============================================================================
// Rigging Options
// ============================================================================

/**
 * Auto-rigging task options
 * Add skeleton and basic animations to character meshes
 */
export interface RiggingOptions {
  /** Task ID of the source model (use this OR model_url) */
  input_task_id?: string;

  /** URL of the source model (use this OR input_task_id) */
  model_url?: string;

  /**
   * Character height in meters (for proper bone scaling)
   * @default 1.7
   */
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

// ============================================================================
// Asset Class Presets
// ============================================================================

/**
 * Asset class categories for polycount presets
 * Based on Three.js web MMO performance budgets
 */
export type AssetClass =
  | "small_prop" // 500 - 2,000 triangles
  | "medium_prop" // 2,000 - 5,000 triangles
  | "large_prop" // 5,000 - 10,000 triangles
  | "npc_character" // 2,000 - 10,000 triangles
  | "small_building" // 5,000 - 15,000 triangles
  | "large_structure" // 15,000 - 50,000 triangles
  | "custom"; // User-specified polycount

/**
 * Polycount preset configuration
 */
export interface PolycountPreset {
  /** Asset class identifier */
  assetClass: AssetClass;

  /** Display name */
  name: string;

  /** Description of use case */
  description: string;

  /** Minimum recommended polycount */
  minPolycount: number;

  /** Maximum recommended polycount */
  maxPolycount: number;

  /** Default/recommended polycount */
  defaultPolycount: number;

  /** Recommended topology for this asset class */
  recommendedTopology: MeshTopology;

  /** Whether PBR textures are recommended */
  recommendPBR: boolean;
}

/**
 * Generation pipeline configuration
 * Complete configuration for Meshy generation tasks
 */
export interface MeshyGenerationConfig {
  /** Asset class preset to use */
  assetClass: AssetClass;

  /** Override polycount (uses preset default if not specified) */
  targetPolycount?: number;

  /** Mesh topology */
  topology: MeshTopology;

  /** Enable PBR textures */
  enablePBR: boolean;

  /** AI model version */
  aiModel: MeshyAIModel;

  /** Texture resolution */
  textureResolution: 1024 | 2048 | 4096;

  /** Enable remeshing */
  shouldRemesh: boolean;

  /** Enable texturing (false = mesh only) */
  shouldTexture: boolean;
}
