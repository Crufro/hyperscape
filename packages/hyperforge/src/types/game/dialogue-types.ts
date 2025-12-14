/**
 * Dialogue Types for HyperForge
 * Matches the game's NPC dialogue system exactly
 */

/**
 * NPC Dialogue Response - A single response option in a dialogue node
 * Player clicks this to choose their response
 */
export interface DialogueResponse {
  text: string; // Display text for this response option
  nextNodeId: string; // ID of the next dialogue node (or "end" to end dialogue)
  condition?: string; // Optional condition (e.g., "hasItem:coins:100", "hasQuest:goblin_slayer")
  effect?: DialogueEffect; // Optional effect when selected
}

/**
 * Dialogue Effect Types
 * These trigger game actions when a response is selected
 */
export type DialogueEffect =
  | "openBank"
  | "openStore"
  | "openShop"
  | `startQuest:${string}`
  | `completeQuest:${string}`
  | `giveItem:${string}:${number}`
  | `takeItem:${string}:${number}`
  | `giveXP:${string}:${number}`
  | `teleport:${string}`
  | `setFlag:${string}`
  | `clearFlag:${string}`;

/**
 * NPC Dialogue Node - A single node in a dialogue tree
 * Contains NPC's text and player response options
 */
export interface DialogueNode {
  id: string; // Unique identifier for this node
  text: string; // NPC's dialogue text (what they say)
  responses?: DialogueResponse[]; // Player response options (if empty, dialogue ends)
  speakerOverride?: string; // Override speaker name (for cutscenes)
}

/**
 * NPC Dialogue Tree - Full conversation tree for an NPC
 */
export interface DialogueTree {
  entryNodeId: string; // Starting node ID
  nodes: DialogueNode[]; // All dialogue nodes
}

/**
 * Dialogue Generation Context
 * Passed to AI for generating dialogue
 */
export interface DialogueGenerationContext {
  npcName: string;
  npcDescription: string;
  npcCategory: "mob" | "boss" | "neutral" | "quest";
  npcPersonality?: string;
  npcRole?: string; // shopkeeper, banker, quest_giver, etc.
  services?: string[]; // bank, shop, quest, etc.
  questContext?: {
    questId: string;
    questName: string;
    questDescription: string;
    objectives?: string[];
  };
  lore?: string; // World lore context
  tone?: "friendly" | "grumpy" | "mysterious" | "aggressive" | "formal";
}

/**
 * Generated NPC Content
 * Full content package for an NPC
 */
export interface GeneratedNPCContent {
  id: string;
  name: string;
  description: string;
  category: "mob" | "boss" | "neutral" | "quest";
  personality: string;
  backstory?: string;
  dialogue: DialogueTree;
  generatedAt: string;
  prompt: string; // Original prompt used
}

/**
 * Visual Node for Dialogue Tree Editor
 * Extended node with position for visual editing
 */
export interface DialogueEditorNode extends DialogueNode {
  position: { x: number; y: number };
  isEntry?: boolean;
  isEnd?: boolean;
}

/**
 * Dialogue Tree Editor State
 */
export interface DialogueEditorState {
  nodes: DialogueEditorNode[];
  selectedNodeId: string | null;
  zoom: number;
  pan: { x: number; y: number };
}
