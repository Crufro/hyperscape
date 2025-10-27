/**
 * Tour Definitions
 *
 * Comprehensive onboarding tours for Asset Forge UI using Driver.js
 * Each tour guides users through specific workflows and features
 */

import type { DriveStep, Config as DriverConfig } from 'driver.js'

// Tour configuration
export const TOUR_CONFIG: Partial<DriverConfig> = {
  animate: true,
  showProgress: true,
  showButtons: ['next', 'previous', 'close'],
  progressText: '{{current}} of {{total}}',
  nextBtnText: 'Next',
  prevBtnText: 'Previous',
  doneBtnText: 'Done',
  allowClose: true,
  popoverClass: 'driver-popover-custom',
  stagePadding: 10,
  stageRadius: 8,
}

// Tour: 3D Asset Generation
export const assetGenerationTour: DriveStep[] = [
  {
    element: '[data-tour="generation-type"]',
    popover: {
      title: 'Welcome to Asset Generation!',
      description: 'This workflow helps you create 3D game assets using AI. Let\'s walk through the process step by step.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="asset-details-card"]',
    popover: {
      title: 'Asset Details',
      description: 'Start by naming your asset, selecting its type (weapon, armor, tool, etc.), and providing a detailed description. The more specific you are, the better the AI results!',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="game-style-selector"]',
    popover: {
      title: 'Choose Your Style',
      description: 'Select a game art style like RuneScape low-poly or create your own custom style. This determines the visual aesthetic of your asset.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="project-selector"]',
    popover: {
      title: 'Project Organization',
      description: 'Organize your assets by assigning them to projects. This helps keep your work structured and easy to find.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="pipeline-options"]',
    popover: {
      title: 'Pipeline Options',
      description: 'Configure the generation pipeline. Enable GPT-4 enhancement for better prompts, retexturing for material variants, and sprite generation for 2D views.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="material-variants"]',
    popover: {
      title: 'Material Variants',
      description: 'When retexturing is enabled, you can generate multiple material variants (bronze, steel, mithril, etc.) from a single 3D model. Perfect for equipment systems!',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="reference-image"]',
    popover: {
      title: 'Reference Images',
      description: 'Upload or link to reference images to guide the AI. This is especially useful when you have a specific vision in mind.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="start-generation"]',
    popover: {
      title: 'Start Generation',
      description: 'Once you\'re happy with your settings, click here to start the AI generation pipeline. You can track progress in the Progress tab.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '[data-tour="tab-navigation"]',
    popover: {
      title: 'Tab Navigation',
      description: 'Switch between Config (setup), Progress (generation status), and Results (view completed assets) using these tabs.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="results-tab"]',
    popover: {
      title: 'View Your Results',
      description: 'After generation completes, check the Results tab to preview your 3D assets, download them, or generate additional sprites and variants.',
      side: 'bottom',
      align: 'center',
    },
  },
]

// Tour: Quest Building
export const questBuildingTour: DriveStep[] = [
  {
    popover: {
      title: 'Welcome to Quest Builder!',
      description: 'Create engaging game quests with AI assistance. This tool helps you design complete quest systems including objectives, rewards, and dialogue.',
    },
  },
  {
    element: '[data-tour="project-selector"]',
    popover: {
      title: 'Select Project',
      description: 'Choose which project this quest belongs to. This helps organize your game content and keeps related quests together.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="quest-builder"]',
    popover: {
      title: 'Quest Builder Form',
      description: 'This is where you create your quest. You can manually design each aspect or use AI to generate quest content based on your requirements.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="quest-title"]',
    popover: {
      title: 'Quest Title',
      description: 'Give your quest a memorable name. Good quest titles hint at the story or objective (e.g., "The Missing Heirloom", "Goblin Invasion").',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="quest-description"]',
    popover: {
      title: 'Quest Description',
      description: 'Describe what the quest is about. This helps the AI generate appropriate objectives, dialogue, and rewards.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="quest-objectives"]',
    popover: {
      title: 'Quest Objectives',
      description: 'Add objectives that players must complete. Each objective should be clear and trackable. The AI can suggest objectives based on your description.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="quest-rewards"]',
    popover: {
      title: 'Quest Rewards',
      description: 'Configure experience points, gold, and item rewards. Balance rewards based on quest difficulty and estimated completion time.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="quest-giver"]',
    popover: {
      title: 'Quest Giver (NPC)',
      description: 'Select or create an NPC who gives this quest. NPCs can have multiple quests, creating storylines and character relationships.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="dialogue-tree"]',
    popover: {
      title: 'Dialogue Trees',
      description: 'Create branching dialogue for quest interactions. Design conversation flows, player choices, and NPC responses to make quests feel interactive.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="ai-generate"]',
    popover: {
      title: 'AI Generation',
      description: 'Let AI generate complete quest content including objectives, dialogue, and appropriate rewards. You can always edit the results afterward.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '[data-tour="quest-list"]',
    popover: {
      title: 'Your Quests',
      description: 'View all your created quests here. Switch between grid and list views, and export quests as JSON for use in your game.',
      side: 'top',
      align: 'start',
    },
  },
]

// Tour: Armor Fitting
export const armorFittingTour: DriveStep[] = [
  {
    popover: {
      title: 'Welcome to Armor Fitting!',
      description: 'This powerful tool automatically fits armor and equipment to character models using advanced mesh deformation and rigging techniques.',
    },
  },
  {
    element: '[data-tour="project-selector"]',
    popover: {
      title: 'Select Project',
      description: 'Choose which project you\'re working on to see relevant assets and keep your work organized.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="asset-list"]',
    popover: {
      title: 'Asset Library',
      description: 'Browse your 3D assets here. Filter by Avatars (characters), Armor (equipment), or Helmets. Select assets to start fitting.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="avatar-select"]',
    popover: {
      title: 'Select Avatar',
      description: 'First, choose the character model (avatar) that will wear the armor. This becomes the base for all fitting operations.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="armor-select"]',
    popover: {
      title: 'Select Armor',
      description: 'Next, choose the armor piece you want to fit to the avatar. This can be chest armor, leg armor, or any equipment piece.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="viewport"]',
    popover: {
      title: '3D Viewport',
      description: 'View your character and armor in real-time 3D. Use mouse to rotate (left click), pan (right click), and zoom (scroll wheel).',
      side: 'left',
      align: 'center',
    },
  },
  {
    element: '[data-tour="fitting-controls"]',
    popover: {
      title: 'Fitting Controls',
      description: 'Configure how the armor fits to the character. Adjust body coverage, fit tightness, and which body parts the armor should conform to.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="auto-fit-button"]',
    popover: {
      title: 'Auto-Fit Magic',
      description: 'Click here to automatically fit the armor to your character using AI-powered mesh deformation. This handles most cases perfectly!',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '[data-tour="manual-adjustments"]',
    popover: {
      title: 'Manual Adjustments',
      description: 'Fine-tune the fit using manual controls. Adjust scale, position, rotation, and per-bone offsets for perfect customization.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="visualization-mode"]',
    popover: {
      title: 'Visualization Modes',
      description: 'Switch between different view modes: Normal (textured), Wireframe (mesh structure), Heat Map (deformation zones), and more.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="bind-skeleton"]',
    popover: {
      title: 'Bind to Skeleton',
      description: 'After fitting, bind the armor to the character\'s skeleton so it animates correctly with the character\'s movements.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '[data-tour="export-button"]',
    popover: {
      title: 'Export Results',
      description: 'Export your fitted armor as a GLB file ready to use in your game. You can export just the armor or the complete equipped character.',
      side: 'top',
      align: 'center',
    },
  },
]

// Tour: Voice Generation
export const voiceGenerationTour: DriveStep[] = [
  {
    popover: {
      title: 'Welcome to Voice Generation!',
      description: 'Generate professional AI voice clips using ElevenLabs. Perfect for creating NPC dialogue, narration, and character voices for your game.',
    },
  },
  {
    element: '[data-tour="quick-start-guide"]',
    popover: {
      title: 'Quick Start',
      description: 'Follow these three simple steps to create your first voice clip: Enter text, choose a voice, and generate!',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="project-selector"]',
    popover: {
      title: 'Project Organization',
      description: 'Assign voice clips to projects to keep your audio assets organized alongside your other game content.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="voice-generator"]',
    popover: {
      title: 'Voice Generator',
      description: 'This is the main voice generation interface. Enter your dialogue text, select a voice, adjust settings, and generate your audio.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="dialogue-input"]',
    popover: {
      title: 'Enter Dialogue',
      description: 'Type or paste the text you want to convert to speech. You can generate single lines or longer passages of dialogue.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="voice-selector"]',
    popover: {
      title: 'Choose Voice',
      description: 'Browse through 20+ professional AI voices. Each voice has different characteristics - preview them to find the perfect match for your character.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="voice-preview"]',
    popover: {
      title: 'Preview Voices',
      description: 'Click the play button next to any voice to hear a sample. This helps you choose the right voice before generating.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="voice-settings"]',
    popover: {
      title: 'Voice Settings',
      description: 'Adjust stability (how consistent the voice sounds) and similarity boost (how closely it matches the voice model). These fine-tune the output quality.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="generate-voice"]',
    popover: {
      title: 'Generate Voice Clip',
      description: 'Click here to generate your voice clip. The AI will process your text and create a professional audio file in seconds.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '[data-tour="generated-clips"]',
    popover: {
      title: 'Your Voice Clips',
      description: 'View all your generated voice clips here. Play them back, download them, or assign them to NPCs and game manifests.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="download-clip"]',
    popover: {
      title: 'Download & Use',
      description: 'Download voice clips as MP3 files for use in your game. You can also assign them directly to NPCs in the NPC Scripts section.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '[data-tour="assign-to-manifest"]',
    popover: {
      title: 'Assign to Manifest',
      description: 'Link voice clips to game manifests and NPCs to create complete character audio profiles. This integrates voice with your game content.',
      side: 'left',
      align: 'center',
    },
  },
]

// Export all tours with metadata
export const tours = {
  'asset-generation': {
    id: 'asset-generation' as const,
    title: '3D Asset Generation',
    description: 'Learn how to generate 3D game assets with AI',
    steps: assetGenerationTour,
    estimatedDuration: 3, // minutes
    category: 'creation',
  },
  'quest-building': {
    id: 'quest-building' as const,
    title: 'Quest Building',
    description: 'Create engaging quests with objectives and dialogue',
    steps: questBuildingTour,
    estimatedDuration: 4, // minutes
    category: 'content',
  },
  'armor-fitting': {
    id: 'armor-fitting' as const,
    title: 'Armor Fitting',
    description: 'Automatically fit equipment to character models',
    steps: armorFittingTour,
    estimatedDuration: 5, // minutes
    category: 'tools',
  },
  'voice-generation': {
    id: 'voice-generation' as const,
    title: 'Voice Generation',
    description: 'Generate AI voice clips for characters and NPCs',
    steps: voiceGenerationTour,
    estimatedDuration: 3, // minutes
    category: 'content',
  },
} as const

export type TourKey = keyof typeof tours
