/**
 * HyperForge Constants
 * Shared constants used across services
 */

import path from "path";

// =============================================================================
// STORAGE PATHS
// =============================================================================

/**
 * Base directory for local asset storage (fallback when Supabase is not configured)
 */
export const ASSETS_BASE_DIR =
  process.env.HYPERFORGE_ASSETS_DIR || path.join(process.cwd(), "assets");

// =============================================================================
// GAME CLIENT
// =============================================================================

/**
 * Game client URL for testing assets in-game
 */
export const GAME_CLIENT_URL =
  process.env.NEXT_PUBLIC_GAME_URL || "http://localhost:3333";

// =============================================================================
// SPAWN LOCATIONS
// =============================================================================

/**
 * Spawn location type definition
 */
export interface SpawnLocation {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  area: string;
}

/**
 * Spawn location presets for testing assets in-game
 */
export const SPAWN_LOCATIONS: readonly SpawnLocation[] = [
  {
    id: "near_player",
    name: "Near Player",
    position: { x: 2, y: 0, z: 2 },
    area: "central_haven",
  },
  {
    id: "town_center",
    name: "Town Center",
    position: { x: 0, y: 0, z: 0 },
    area: "central_haven",
  },
  {
    id: "bank_area",
    name: "Bank Area",
    position: { x: 5, y: 0, z: -5 },
    area: "central_haven",
  },
  {
    id: "shop_area",
    name: "Shop Area",
    position: { x: -5, y: 0, z: -5 },
    area: "central_haven",
  },
  {
    id: "training_area",
    name: "Training Area",
    position: { x: 10, y: 0, z: 10 },
    area: "central_haven",
  },
  {
    id: "forest_edge",
    name: "Forest Edge",
    position: { x: 15, y: 0, z: -10 },
    area: "central_haven",
  },
] as const;

// =============================================================================
// API TIMEOUTS
// =============================================================================

/**
 * Default timeout for API requests in milliseconds
 */
export const API_TIMEOUT_MS = 30000;

/**
 * Timeout for long-running generation tasks in milliseconds
 */
export const GENERATION_TIMEOUT_MS = 300000; // 5 minutes

/**
 * Polling interval for task status checks in milliseconds
 */
export const TASK_POLL_INTERVAL_MS = 2000;

// =============================================================================
// HAND RIGGING
// =============================================================================

/**
 * Standard VRM hand bone names
 * Used for hand rigging and pose detection
 */
export const HAND_BONE_NAMES = {
  left: {
    wrist: "leftHand",
    thumb: ["leftThumbProximal", "leftThumbIntermediate", "leftThumbDistal"],
    index: ["leftIndexProximal", "leftIndexIntermediate", "leftIndexDistal"],
    middle: [
      "leftMiddleProximal",
      "leftMiddleIntermediate",
      "leftMiddleDistal",
    ],
    ring: ["leftRingProximal", "leftRingIntermediate", "leftRingDistal"],
    little: [
      "leftLittleProximal",
      "leftLittleIntermediate",
      "leftLittleDistal",
    ],
  },
  right: {
    wrist: "rightHand",
    thumb: ["rightThumbProximal", "rightThumbIntermediate", "rightThumbDistal"],
    index: ["rightIndexProximal", "rightIndexIntermediate", "rightIndexDistal"],
    middle: [
      "rightMiddleProximal",
      "rightMiddleIntermediate",
      "rightMiddleDistal",
    ],
    ring: ["rightRingProximal", "rightRingIntermediate", "rightRingDistal"],
    little: [
      "rightLittleProximal",
      "rightLittleIntermediate",
      "rightLittleDistal",
    ],
  },
} as const;

/**
 * MediaPipe hand landmark indices
 */
export const HAND_LANDMARK_INDICES = {
  wrist: 0,
  thumbCMC: 1,
  thumbMCP: 2,
  thumbIP: 3,
  thumbTip: 4,
  indexMCP: 5,
  indexPIP: 6,
  indexDIP: 7,
  indexTip: 8,
  middleMCP: 9,
  middlePIP: 10,
  middleDIP: 11,
  middleTip: 12,
  ringMCP: 13,
  ringPIP: 14,
  ringDIP: 15,
  ringTip: 16,
  littleMCP: 17,
  littlePIP: 18,
  littleDIP: 19,
  littleTip: 20,
} as const;

/**
 * Hand landmarks object with uppercase keys
 * Used for pose detection
 */
export const HAND_LANDMARKS = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
} as const;

/**
 * Finger joint mappings for pose estimation
 */
export const FINGER_JOINTS = {
  thumb: [1, 2, 3, 4],
  index: [5, 6, 7, 8],
  middle: [9, 10, 11, 12],
  ring: [13, 14, 15, 16],
  little: [17, 18, 19, 20],
} as const;
