/**
 * Navigation Configuration
 *
 * Single source of truth for all navigation in HyperForge.
 * Defines routes, menu items, groups, permissions, and behaviors.
 *
 * @module navigation-config
 */

import {
  Home,
  Wand2,
  Database,
  Hand,
  Wrench,
  Shield,
  Scroll,
  FileJson,
  Mic,
  FileCode,
  Target,
  Users,
  BookOpen,
  MessageSquare,
  ListChecks,
  Settings,
  HelpCircle,
  Sparkles,
  Folder,
  User,
  FileEdit,
  SendHorizontal,
  CheckSquare,
  Brain,
  Volume2,
  Shuffle,
  Palette,
} from 'lucide-react'

import { ROUTES } from '../constants/routes'
import type { NavigationConfig, NavigationLink } from '../types/navigation'

/**
 * Primary navigation configuration
 * Defines all navigation items, groups, and their structure
 */
export const navigationConfig: NavigationConfig = {
  sections: [
    // Dashboard
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      type: 'single',
      path: ROUTES.DASHBOARD,
      tooltip: 'Main dashboard',
      keywords: ['dashboard', 'home', 'overview'],
    },

    // Projects
    {
      id: 'projects',
      label: 'Projects',
      icon: Folder,
      type: 'single',
      path: ROUTES.PROJECTS,
      tooltip: 'Manage your projects',
      keywords: ['projects', 'organize', 'folders'],
    },

    // Asset Creation
    {
      id: 'asset-creation',
      label: 'Assets',
      type: 'collapsible',
      icon: Database,
      collapsible: true,
      defaultExpanded: true,
      items: [
        {
          id: 'generate',
          type: 'link',
          path: ROUTES.GENERATION,
          label: 'Generate New',
          icon: Wand2,
          tooltip: 'Create new 3D assets with AI',
          keywords: ['generate', 'create', 'ai', 'meshy', 'new asset'],
          shortcut: 'g',
        },
        {
          id: 'assets',
          type: 'link',
          path: ROUTES.ASSETS,
          label: 'Browse Library',
          icon: Database,
          tooltip: 'Browse and manage your assets',
          keywords: ['assets', 'library', 'browse', 'manage', 'models'],
          shortcut: 'a',
        },
      ],
    },

    // Tools
    {
      id: 'fitting-rigging',
      label: 'Tools',
      type: 'collapsible',
      icon: Wrench,
      collapsible: true,
      defaultExpanded: false,
      items: [
        {
          id: 'hand-rigging',
          type: 'link',
          path: ROUTES.HAND_RIGGING,
          label: 'Hand Rigging',
          icon: Hand,
          tooltip: 'Rig hand-held items and weapons',
          keywords: ['hand', 'rigging', 'grip', 'weapon', 'hold'],
          shortcut: 'h',
        },
        {
          id: 'equipment',
          type: 'link',
          path: ROUTES.EQUIPMENT,
          label: 'Equipment',
          icon: Wrench,
          tooltip: 'Fit equipment to character models',
          keywords: ['equipment', 'fitting', 'attach', 'equip'],
          shortcut: 'e',
        },
        {
          id: 'armor',
          type: 'link',
          path: ROUTES.ARMOR_FITTING,
          label: 'Armor',
          icon: Shield,
          tooltip: 'Fit armor pieces to character models',
          keywords: ['armor', 'fitting', 'character', 'body'],
        },
      ],
    },

    // Game Content
    {
      id: 'game-content',
      label: 'Content',
      type: 'collapsible',
      icon: Scroll,
      collapsible: true,
      defaultExpanded: false,
      items: [
        {
          id: 'quests',
          type: 'link',
          path: ROUTES.CONTENT_QUESTS,
          label: 'Quests',
          icon: Target,
          tooltip: 'Generate and manage quests',
          keywords: ['quest', 'mission', 'objective', 'task'],
          shortcut: 'q',
        },
        {
          id: 'npcs',
          type: 'link',
          path: ROUTES.CONTENT_NPCS,
          label: 'NPCs',
          icon: Users,
          tooltip: 'Create NPC characters with personalities',
          keywords: ['npc', 'character', 'dialogue', 'personality'],
          shortcut: 'n',
        },
        {
          id: 'lore',
          type: 'link',
          path: ROUTES.CONTENT_LORE,
          label: 'Lore',
          icon: BookOpen,
          tooltip: 'Generate world lore and backstory',
          keywords: ['lore', 'story', 'world', 'backstory'],
          shortcut: 'l',
        },
        {
          id: 'scripts',
          type: 'link',
          path: ROUTES.CONTENT_SCRIPTS,
          label: 'Scripts',
          icon: FileCode,
          tooltip: 'Manage NPC behavior scripts',
          keywords: ['script', 'code', 'npc', 'behavior'],
        },
        {
          id: 'tracking',
          type: 'link',
          path: ROUTES.CONTENT_TRACKING,
          label: 'Tracker',
          icon: ListChecks,
          tooltip: 'Quest execution and tracking system',
          keywords: ['tracking', 'quest', 'objectives', 'progress'],
        },
      ],
    },

    // Voice Generation (dedicated section)
    {
      id: 'voice-generation',
      label: 'Voice',
      type: 'collapsible',
      icon: Mic,
      collapsible: true,
      defaultExpanded: false,
      items: [
        {
          id: 'voice-experiment',
          type: 'link',
          path: ROUTES.VOICE_STANDALONE,
          label: 'Experiment',
          icon: Sparkles,
          tooltip: 'Test voices and settings without NPCs',
          keywords: ['voice', 'experiment', 'test', 'standalone', 'preview'],
          isNew: true,
        },
        {
          id: 'voice-manifests',
          type: 'link',
          path: ROUTES.VOICE_MANIFESTS,
          label: 'Manifests',
          icon: Users,
          tooltip: 'Assign voices to NPCs and mobs from manifests',
          keywords: ['voice', 'manifest', 'npc', 'mob', 'assign'],
          isNew: true,
        },
        {
          id: 'voice-dialogue',
          type: 'link',
          path: ROUTES.CONTENT_VOICE,
          label: 'Dialogue',
          icon: MessageSquare,
          tooltip: 'Generate voices for NPC dialogue scripts',
          keywords: ['voice', 'dialogue', 'script', 'npc'],
        },
        {
          id: 'voice-changer',
          type: 'link',
          path: ROUTES.VOICE_CHANGER,
          label: 'Voice Changer',
          icon: Shuffle,
          tooltip: 'Transform audio to different voices',
          keywords: ['voice', 'changer', 'transform', 'convert', 'audio', 'speech-to-speech'],
          isNew: true,
        },
        {
          id: 'voice-design',
          type: 'link',
          path: ROUTES.VOICE_DESIGN,
          label: 'Voice Design',
          icon: Palette,
          tooltip: 'Design custom voices with AI',
          keywords: ['voice', 'design', 'create', 'custom', 'ai', 'generate'],
          isNew: true,
        },
      ],
    },

    // Sound Effects & Music
    {
      id: 'audio-generation',
      label: 'Audio',
      type: 'collapsible',
      icon: Volume2,
      collapsible: true,
      defaultExpanded: false,
      items: [
        {
          id: 'sound-effects',
          type: 'link',
          path: ROUTES.SOUND_EFFECTS,
          label: 'Sound Effects',
          icon: Volume2,
          tooltip: 'Generate game sound effects with AI',
          keywords: ['sfx', 'sound', 'effects', 'audio', 'game sounds'],
          isNew: true,
        },
        {
          id: 'music',
          type: 'link',
          path: ROUTES.MUSIC,
          label: 'Music',
          icon: Sparkles,
          tooltip: 'Generate background music and soundtracks with AI',
          keywords: ['music', 'soundtrack', 'background', 'audio', 'composition'],
          isNew: true,
        },
      ],
    },

    // Game Data & Manifests
    {
      id: 'manifests',
      label: 'Manifests',
      type: 'collapsible',
      icon: FileJson,
      collapsible: true,
      defaultExpanded: false,
      items: [
        {
          id: 'game-data',
          type: 'link',
          path: ROUTES.GAME_DATA,
          label: 'Game Data',
          icon: FileJson,
          tooltip: 'Browse approved game data manifests',
          keywords: ['manifest', 'data', 'items', 'mobs', 'resources', 'cdn'],
        },
        {
          id: 'preview-manifests',
          type: 'link',
          path: ROUTES.PREVIEW_MANIFESTS,
          label: 'Preview',
          icon: FileEdit,
          tooltip: 'Edit and manage your preview manifest',
          keywords: ['preview', 'manifest', 'edit', 'draft', 'working'],
          isNew: true,
        },
        {
          id: 'submissions',
          type: 'link',
          path: ROUTES.SUBMISSIONS,
          label: 'Submissions',
          icon: SendHorizontal,
          tooltip: 'Track your manifest submissions',
          keywords: ['submission', 'review', 'pending', 'approved', 'rejected'],
          isNew: true,
        },
      ],
    },

    // Team
    {
      id: 'team',
      label: 'Team',
      icon: Users,
      type: 'single',
      path: ROUTES.TEAM,
      tooltip: 'Team management and collaboration',
      keywords: ['team', 'collaborate', 'members', 'invite'],
    },

    // Profile
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      type: 'single',
      path: ROUTES.PROFILE,
      tooltip: 'User profile and settings',
      keywords: ['profile', 'account', 'settings', 'user'],
    },

    // Admin (admin only)
    {
      id: 'admin',
      label: 'Admin',
      type: 'collapsible',
      icon: Shield,
      collapsible: true,
      defaultExpanded: false,
      adminOnly: true,
      items: [
        {
          id: 'admin-dashboard',
          type: 'link',
          path: ROUTES.ADMIN,
          label: 'Dashboard',
          icon: Shield,
          tooltip: 'Admin dashboard and settings',
          keywords: ['admin', 'management', 'users', 'whitelist'],
        },
        {
          id: 'admin-approvals',
          type: 'link',
          path: ROUTES.ADMIN_APPROVALS,
          label: 'Approvals',
          icon: CheckSquare,
          tooltip: 'Review and approve manifest submissions',
          keywords: ['approval', 'review', 'submissions', 'moderate'],
          isNew: true,
        },
      ],
    },
  ],

  quickAccess: {
    enabled: true,
    maxItems: 5,
    showRecent: true,
    showFavorites: true,
  },

  footer: {
    items: [
      {
        id: 'settings',
        type: 'link',
        path: ROUTES.SETTINGS,
        label: 'Settings',
        icon: Settings,
        tooltip: 'Application settings and preferences',
        keywords: ['settings', 'preferences', 'config', 'options'],
        shortcut: ',',
      },
      {
        id: 'ai-context-settings',
        type: 'link',
        path: ROUTES.AI_CONTEXT_SETTINGS,
        label: 'AI Context',
        icon: Brain,
        tooltip: 'Configure AI context sources',
        keywords: ['ai', 'context', 'settings', 'sources', 'manifest'],
      },
      {
        id: 'help',
        type: 'link',
        path: ROUTES.HELP,
        label: 'Help',
        icon: HelpCircle,
        tooltip: 'Help and documentation',
        keywords: ['help', 'docs', 'support', 'documentation', 'guide'],
        shortcut: '?',
      },
    ],
    version: '1.0.0',
  },
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a navigation item is a link (has a route)
 */
export function isNavLink(item: unknown): item is NavigationLink {
  return typeof item === 'object' && item !== null && 'type' in item && item.type === 'link' && 'path' in item
}

// Cached nav items for performance
let cachedNavItems: NavigationLink[] | null = null

/**
 * Get all nav items (flattened from all groups and sections)
 * Cached for performance
 */
export function getAllNavItems(): NavigationLink[] {
  if (cachedNavItems) return cachedNavItems

  const items: NavigationLink[] = []

  for (const section of navigationConfig.sections) {
    if (section.type === 'single' && section.path && section.icon) {
      items.push({
        id: section.id,
        type: 'link',
        label: section.label,
        icon: section.icon,
        path: section.path,
        tooltip: section.tooltip,
        keywords: section.keywords,
      } as NavigationLink)
    } else if (section.items) {
      for (const item of section.items) {
        if (isNavLink(item)) {
          items.push(item)
        }
      }
    }
  }

  // Add footer items
  for (const item of navigationConfig.footer.items) {
    if (isNavLink(item)) {
      items.push(item)
    }
  }

  cachedNavItems = items
  return items
}

/**
 * Get section for nav item by validating section.icon exists
 */
// function getSectionIconSafely(section: any): any {
//   if (section.icon) {
//     return section.icon
//   }
//   // Return a default icon or undefined
//   return undefined
// }

/**
 * Find a nav item by ID
 */
export function findNavItem(id: string): NavigationLink | undefined {
  return getAllNavItems().find(item => item.id === id)
}

// Cached route map for O(1) lookups
let routeMap: Map<string, NavigationLink> | null = null

/**
 * Get nav item for a route path
 * Optimized with Map for O(1) lookups
 */
export function getNavItemForRoute(path: string): NavigationLink | undefined {
  if (!routeMap) {
    routeMap = new Map()
    getAllNavItems().forEach(item => routeMap!.set(item.path, item))
  }
  return routeMap.get(path)
}

/**
 * Check if a route is active (matches current path)
 */
export function isRouteActive(
  itemPath: string,
  currentPath: string,
  exact: boolean = false
): boolean {
  if (exact) {
    return itemPath === currentPath
  }

  // Normalize paths
  const normalizedItemPath = itemPath.replace(/\/$/, '')
  const normalizedCurrentPath = currentPath.replace(/\/$/, '')

  return (
    normalizedCurrentPath === normalizedItemPath ||
    normalizedCurrentPath.startsWith(normalizedItemPath + '/')
  )
}

/**
 * Get active nav item for current route
 */
export function getActiveNavItem(currentPath: string): NavigationLink | undefined {
  const allItems = getAllNavItems()

  // First try exact match
  const exactMatch = allItems.find(item => isRouteActive(item.path, currentPath, true))

  if (exactMatch) return exactMatch

  // Then try parent path match (longest match first)
  const sortedItems = allItems
    .filter(item => item.path)
    .sort((a, b) => b.path.length - a.path.length)

  return sortedItems.find(item => isRouteActive(item.path, currentPath))
}

export default navigationConfig
