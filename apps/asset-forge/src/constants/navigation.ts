import { NavigationView } from '../types'

// Navigation view constants
export const NAVIGATION_VIEWS = {
  ASSETS: 'assets',
  GENERATION: 'generation',
  EQUIPMENT: 'equipment',
  HAND_RIGGING: 'handRigging',
  ARMOR_FITTING: 'armorFitting',
  GAME_DATA: 'gameData',
  CONTENT_BUILDER: 'contentBuilder',
  CONTENT_QUESTS: 'content-quests',
  CONTENT_NPCS: 'content-npcs',
  CONTENT_LORE: 'content-lore',
  CONTENT_SCRIPTS: 'content-scripts',
  CONTENT_TRACKING: 'content-tracking',
  VOICE: 'voice',
  VOICE_STANDALONE: 'voice-standalone',
  VOICE_MANIFESTS: 'voice-manifests',
  VOICE_CHANGER: 'voice-changer',
  VOICE_DESIGN: 'voice-design',
  SOUND_EFFECTS: 'sound-effects',
  MUSIC: 'music',
  DASHBOARD: 'dashboard',
  ADMIN: 'admin',
  ADMIN_APPROVALS: 'admin-approvals',
  PROJECTS: 'projects',
  PROFILE: 'profile',
  TEAM: 'team',
  SETTINGS: 'settings',
  AI_CONTEXT_SETTINGS: 'ai-context-settings',
  HELP: 'help'
} as const satisfies Record<string, NavigationView>

// Grid background styles for the app
export const APP_BACKGROUND_STYLES = {
  gridSize: '50px 50px',
  gridImage: `linear-gradient(to right, var(--color-primary) 1px, transparent 1px),
               linear-gradient(to bottom, var(--color-primary) 1px, transparent 1px)`
} as const