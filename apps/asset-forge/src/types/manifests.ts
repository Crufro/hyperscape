/**
 * Manifest Types
 * TypeScript definitions for game data manifests loaded from CDN
 */

export type ManifestType =
  | 'items'
  | 'mobs'   // Hostile creatures (separate from friendly NPCs)
  | 'npcs'   // Friendly NPCs
  | 'lore'
  | 'quests'
  | 'music'
  | 'voice'
  | 'sound_effects'
  | 'static_images'
  | 'resources'
  | 'world-areas'
  | 'biomes'
  | 'zones'
  | 'banks'
  | 'stores'

// Item Manifest
export interface ItemManifest {
  id: string
  name: string
  type: 'weapon' | 'armor' | 'tool' | 'resource' | 'ammunition' | 'consumable' | 'currency'
  quantity: number
  stackable: boolean
  maxStackSize: number
  value: number
  weight: number
  equipSlot: string | null
  weaponType: string | null
  equipable: boolean
  attackType: 'MELEE' | 'RANGED' | null
  description: string
  examine: string
  tradeable: boolean
  rarity: string
  modelPath: string | null
  iconPath: string | null
  healAmount: number
  stats: {
    attack: number
    defense: number
    strength: number
  }
  bonuses: {
    attack: number
    strength: number
    defense: number
    ranged: number
  }
  requirements: {
    level: number
    skills: Record<string, number>
  }
}

// NPC Manifest (Consolidated: includes both friendly NPCs and aggressive mobs)
export interface NPCManifest {
  id: string
  name: string
  description: string
  type: string
  npcType?: string // Alias for type (backward compatibility)
  modelPath: string

  // Combat properties (for aggressive NPCs/mobs)
  health?: number
  isAggressive: boolean
  stats?: {
    level: number
    attack: number
    strength: number
    defense: number
    constitution: number
    ranged: number
    magic: number
  }

  // Skills (combat abilities, special moves)
  skills?: Array<{
    id: string
    name: string
    type: string
    cooldown?: number
    damage?: number
  }>

  // Behavior (for aggressive NPCs)
  behavior?: {
    aggroRange?: number
    wanderRadius?: number
    respawnTime?: number
  }

  // Loot drops (for aggressive NPCs)
  drops?: Array<{
    itemId: string
    quantity: number
    chance: number
    isGuaranteed: boolean
  }>

  // Spawn locations
  spawnBiomes?: string[]
  respawnTime?: number
  xpReward?: number

  // Services (for friendly NPCs)
  services?: string[]

  // Difficulty (for aggressive NPCs)
  difficultyLevel?: 1 | 2 | 3

  // Backward compatibility
  mobType?: string // Deprecated: use type instead
  level?: number // Alias for stats.level
  combatLevel?: number // Alias for stats.level
}

// @deprecated Use NPCManifest with isAggressive: true instead
export type MobManifest = NPCManifest

// Resource Manifest
export interface ResourceManifest {
  id: string
  name: string
  type: string
  modelPath: string | null
  harvestSkill: string
  requiredLevel: number
  harvestTime: number
  respawnTime: number
  harvestYield: Array<{
    itemId: string
    quantity: number
    chance: number
  }>
}

// World Area Manifest
export interface WorldAreaManifest {
  id: string
  name: string
  description: string
  difficultyLevel: number
  bounds: {
    minX: number
    maxX: number
    minZ: number
    maxZ: number
  }
  biomeType: string
  safeZone: boolean
  npcs?: Array<{
    id: string
    name: string
    type: string
    position: { x: number; y: number; z: number }
    services: string[]
    description: string
  }>
  resources?: Array<{
    type: string
    position: { x: number; y: number; z: number }
    resourceId: string
    respawnTime: number
    level: number
  }>
  mobSpawns?: Array<{
    mobId: string
    position: { x: number; y: number; z: number }
    spawnRadius: number
    maxCount: number
    respawnTime: number
  }>
  connections: string[]
  specialFeatures: string[]
}

// Biome Manifest
export interface BiomeManifest {
  id: string
  name: string
  description: string
  terrainType: string
  climate: string
  difficulty: number
  commonResources: string[]
  commonMobs: string[]
  spawnRate: number
}

// Zone Manifest
export interface ZoneManifest {
  id: string
  name: string
  description: string
  level: number
  biomes: string[]
  recommendedSkills: string[]
  dangerLevel: string
}

// Bank Manifest
export interface BankManifest {
  id: string
  name: string
  location: string
  position: { x: number; y: number; z: number }
  services: string[]
}

// Store Manifest
export interface StoreManifest {
  id: string
  name: string
  type: string
  location: string
  position: { x: number; y: number; z: number }
  inventory: Array<{
    itemId: string
    stock: number
    price: number
  }>
}

// Lore Manifest
export interface LoreManifest {
  id: string
  title: string
  content: string
  summary?: string
  category: 'history' | 'character' | 'location' | 'item' | 'event' | 'legend' | 'culture'
  tags?: string[]
  era?: string
  region?: string
  importance: 1 | 2 | 3 | 4 | 5 // 1 = minor detail, 5 = critical lore
  relatedCharacters?: string[]
  relatedLocations?: string[]
  relatedEvents?: string[]
}

// Quest Manifest
export interface QuestManifest {
  id: string
  name: string
  description: string
  objective: string
  type: 'main' | 'side' | 'daily' | 'event' | 'tutorial'
  difficulty: 'easy' | 'medium' | 'hard' | 'epic'
  estimatedDuration: string // e.g., "30 minutes", "2 hours"
  prerequisites?: string[] // Quest IDs
  questChainId?: string
  questOrder?: number
  objectives: Array<{
    id: string
    description: string
    type: 'kill' | 'collect' | 'talk' | 'explore' | 'craft'
    target?: string
    amount?: number
    completed?: boolean
  }>
  rewards: {
    xp?: number
    gold?: number
    items?: Array<{ itemId: string; quantity: number }>
    unlocks?: string[]
  }
  dialogue?: Record<string, any>
  requirements?: {
    level?: number
    skills?: Record<string, number>
    items?: string[]
  }
}

// Music Manifest
export interface MusicManifest {
  id: string
  name: string
  description?: string
  type: 'combat' | 'ambient' | 'town' | 'dungeon' | 'boss' | 'menu' | 'event'
  audioUrl: string
  duration: number // in seconds
  loop: boolean
  volume?: number // 0-1
  fadeDuration?: number // in seconds
  triggers?: string[] // Events or locations that trigger this music
  biomes?: string[]
  zones?: string[]
}

// Voice Manifest
export interface VoiceManifest {
  id: string
  npcId: string
  name: string
  voiceModel: string
  voiceSettings: {
    pitch?: number
    speed?: number
    emotion?: string
    language?: string
  }
  audioSamples: Array<{
    id: string
    text: string
    audioUrl: string
    context: string // e.g., "greeting", "farewell", "quest_start"
  }>
}

// Sound Effect Manifest
export interface SoundEffectManifest {
  id: string
  name: string
  description?: string
  category: 'combat' | 'environment' | 'ui' | 'item' | 'spell' | 'ambient'
  audioUrl: string
  duration: number // in seconds
  volume?: number // 0-1
  variations?: string[] // URLs to sound variations
}

// Static Image Manifest
export interface StaticImageManifest {
  id: string
  name: string
  description?: string
  type: 'sprite' | 'icon' | 'background' | 'portrait' | 'texture' | 'ui_element'
  imageUrl: string
  width: number
  height: number
  tags?: string[]
  usage?: string[] // Where this image is used
}

// Union type for all manifests
export type AnyManifest =
  | ItemManifest
  | MobManifest
  | NPCManifest
  | LoreManifest
  | QuestManifest
  | MusicManifest
  | VoiceManifest
  | SoundEffectManifest
  | StaticImageManifest
  | ResourceManifest
  | WorldAreaManifest
  | BiomeManifest
  | ZoneManifest
  | BankManifest
  | StoreManifest

// Preview Manifest (user/team working manifest)
export interface PreviewManifest {
  id: string
  userId?: string
  teamId?: string
  manifestType: ManifestType
  content: AnyManifest[]
  version: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Manifest Submission
export interface ManifestSubmission {
  id: string
  userId: string
  teamId?: string
  manifestType: ManifestType
  itemId: string
  itemData: AnyManifest

  // Required assets
  hasDetails: boolean
  hasSprites: boolean
  hasImages: boolean
  has3dModel: boolean

  // Asset URLs
  spriteUrls?: string[]
  imageUrls?: string[]
  modelUrl?: string

  // Workflow
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn'
  submittedAt: string
  reviewedAt?: string
  reviewedBy?: string

  // Admin feedback
  adminNotes?: string
  rejectionReason?: string

  // Editing
  editedItemData?: AnyManifest
  wasEdited: boolean

  // Versioning
  submissionVersion: number
  parentSubmissionId?: string

  createdAt: string
  updatedAt: string
}

// AI Context Preferences
export interface AIContextPreferences {
  id: string
  userId: string
  useOwnPreview: boolean
  useCdnContent: boolean
  useTeamPreview: boolean
  useAllSubmissions: boolean
  maxContextItems: number
  preferRecent: boolean
  createdAt: string
  updatedAt: string
}

// Manifest Version
export interface ManifestVersion {
  id: string
  entityType: 'preview_manifest' | 'submission' | 'cdn_manifest'
  entityId: string
  versionNumber: number
  changeType: 'created' | 'updated' | 'deleted' | 'approved' | 'rejected'
  dataSnapshot: any
  changedBy?: string
  changeSummary?: string
  diffData?: any
  createdAt: string
}

// Manifest metadata
export interface ManifestInfo {
  type: ManifestType
  label: string
  icon: string
  description: string
  count?: number
}

// Helper function to get the display name from any manifest
export function getManifestName(manifest: AnyManifest): string {
  if ('name' in manifest && manifest.name) {
    return manifest.name
  }
  if ('title' in manifest && manifest.title) {
    return manifest.title
  }
  return 'Unnamed'
}

