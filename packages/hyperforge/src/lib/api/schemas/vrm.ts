/**
 * VRM Conversion Schemas
 *
 * Zod schemas for /api/vrm/convert endpoint
 */

import { z } from "zod";

// =============================================================================
// VRM CONVERT SCHEMA
// =============================================================================

/**
 * VRM conversion request
 * Accepts either modelUrl or glbData (base64)
 */
export const VRMConvertSchema = z
  .object({
    /** URL to download the GLB from */
    modelUrl: z.string().url().optional(),
    /** Base64-encoded GLB data (for hand-rigged models in memory) */
    glbData: z.string().optional(),
    /** Name for the avatar in VRM metadata */
    avatarName: z.string().optional(),
    /** Author name in VRM metadata */
    author: z.string().optional(),
  })
  .refine((data) => data.modelUrl || data.glbData, {
    message: "Either modelUrl or glbData is required",
  });

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type VRMConvertRequest = z.infer<typeof VRMConvertSchema>;
