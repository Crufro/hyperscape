/**
 * Agent API Schemas
 *
 * Zod schemas for /api/agent endpoint
 * The agent endpoint is a unified REST API for AI agents
 */

import { z } from "zod";

// =============================================================================
// AGENT REQUEST SCHEMA
// =============================================================================

/**
 * Base agent request - all agent calls follow this pattern
 */
export const AgentRequestSchema = z.object({
  /** Action to perform */
  action: z.string().min(1),
  /** Action-specific parameters */
  params: z.record(z.string(), z.unknown()).optional().default({}),
});

// =============================================================================
// SPECIFIC ACTION SCHEMAS
// =============================================================================

/**
 * Generate 3D model action
 */
export const AgentGenerate3DSchema = z.object({
  action: z.literal("generate-3d"),
  params: z.object({
    prompt: z.string().optional(),
    imageUrl: z.string().url().optional(),
    mode: z.enum(["text", "image"]).optional().default("text"),
    style: z.enum(["realistic", "stylized"]).optional().default("realistic"),
  }).refine((data) => data.prompt || data.imageUrl, {
    message: "Either prompt (for text-to-3d) or imageUrl (for image-to-3d) is required",
  }),
});

/**
 * Refine 3D model action
 */
export const AgentRefine3DSchema = z.object({
  action: z.literal("refine-3d"),
  params: z.object({
    taskId: z.string().min(1),
    texturePrompt: z.string().optional(),
    enablePBR: z.boolean().optional(),
  }),
});

/**
 * Generate image action
 */
export const AgentGenerateImageSchema = z.object({
  action: z.literal("generate-image"),
  params: z.object({
    prompt: z.string().min(1),
    type: z.enum(["concept", "sprite", "texture", "icon"]).optional().default("concept"),
    style: z.string().optional(),
    size: z.string().optional(),
  }),
});

/**
 * Generate audio action (SFX/Music)
 */
export const AgentGenerateSFXSchema = z.object({
  action: z.enum(["generate-sfx", "generate-sound"]),
  params: z.object({
    prompt: z.string().min(1),
    category: z.string().optional(),
    durationSeconds: z.number().positive().optional(),
  }),
});

/**
 * Generate music action
 */
export const AgentGenerateMusicSchema = z.object({
  action: z.literal("generate-music"),
  params: z.object({
    prompt: z.string().min(1),
    category: z.string().optional(),
    durationMs: z.number().positive().optional(),
    loopable: z.boolean().optional(),
  }),
});

/**
 * Generate voice/TTS action
 */
export const AgentGenerateVoiceSchema = z.object({
  action: z.enum(["generate-voice", "generate-tts"]),
  params: z.object({
    text: z.string().min(1),
    voiceId: z.string().optional(),
    voicePreset: z.string().optional(),
    npcId: z.string().optional(),
  }),
});

/**
 * List assets action
 */
export const AgentListAssetsSchema = z.object({
  action: z.literal("list-assets"),
  params: z.object({
    category: z.string().optional(),
    source: z.string().optional(),
    limit: z.number().positive().optional(),
    offset: z.number().nonnegative().optional(),
    search: z.string().optional(),
  }).optional().default({}),
});

/**
 * Get asset details action
 */
export const AgentGetAssetSchema = z.object({
  action: z.literal("get-asset"),
  params: z.object({
    id: z.string().min(1),
    source: z.string().optional(),
  }),
});

/**
 * Place entity in world action
 */
export const AgentPlaceEntitySchema = z.object({
  action: z.literal("place-entity"),
  params: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    type: z.string().optional(),
    position: z.object({
      x: z.number(),
      y: z.number().optional(),
      z: z.number(),
    }).optional(),
    modelPath: z.string().optional(),
    data: z.record(z.string(), z.unknown()).optional(),
  }),
});

/**
 * Get world entities action
 */
export const AgentGetWorldSchema = z.object({
  action: z.enum(["get-world", "list-entities"]),
  params: z.object({
    type: z.string().optional(),
    area: z.string().optional(),
    limit: z.number().positive().optional(),
  }).optional().default({}),
});

/**
 * Check task status action
 */
export const AgentStatusSchema = z.object({
  action: z.literal("status"),
  params: z.object({
    taskId: z.string().min(1),
    taskType: z.string().optional(),
  }),
});

/**
 * Help/list actions
 */
export const AgentHelpSchema = z.object({
  action: z.enum(["help", "actions"]),
  params: z.record(z.string(), z.unknown()).optional(),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type AgentRequest = z.infer<typeof AgentRequestSchema>;
export type AgentGenerate3DRequest = z.infer<typeof AgentGenerate3DSchema>;
export type AgentRefine3DRequest = z.infer<typeof AgentRefine3DSchema>;
export type AgentGenerateImageRequest = z.infer<typeof AgentGenerateImageSchema>;
export type AgentGenerateSFXRequest = z.infer<typeof AgentGenerateSFXSchema>;
export type AgentGenerateMusicRequest = z.infer<typeof AgentGenerateMusicSchema>;
export type AgentGenerateVoiceRequest = z.infer<typeof AgentGenerateVoiceSchema>;
export type AgentListAssetsRequest = z.infer<typeof AgentListAssetsSchema>;
export type AgentGetAssetRequest = z.infer<typeof AgentGetAssetSchema>;
export type AgentPlaceEntityRequest = z.infer<typeof AgentPlaceEntitySchema>;
export type AgentGetWorldRequest = z.infer<typeof AgentGetWorldSchema>;
export type AgentStatusRequest = z.infer<typeof AgentStatusSchema>;
