/**
 * Export Helpers
 *
 * Utilities for exporting content in various formats (JSON, Markdown, ZIP)
 */

import JSZip from 'jszip'
import type { GeneratedQuest, GeneratedNPC } from '../types/content-generation'

/**
 * Download a file from a data URL
 */
export function downloadFile(dataUri: string, filename: string): void {
  const linkElement = document.createElement('a')
  linkElement.setAttribute('href', dataUri)
  linkElement.setAttribute('download', filename)
  linkElement.click()
}

/**
 * Export data as JSON file
 */
export function exportAsJSON<T>(data: T, filename: string): void {
  const dataStr = JSON.stringify(data, null, 2)
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
  downloadFile(dataUri, filename)
}

/**
 * Export quest as Markdown documentation
 */
export function questToMarkdown(quest: GeneratedQuest): string {
  let markdown = `# ${quest.title}\n\n`
  markdown += `**Difficulty:** ${quest.difficulty}\n\n`

  markdown += `## Description\n\n${quest.description}\n\n`

  markdown += `## Objectives\n\n`
  quest.objectives.forEach((obj, idx) => {
    markdown += `${idx + 1}. ${obj.description}\n`
  })

  markdown += `\n## Rewards\n\n`
  markdown += `- **Experience:** ${quest.rewards.experience} XP\n`
  markdown += `- **Gold:** ${quest.rewards.gold}\n`

  if (quest.rewards.items && quest.rewards.items.length > 0) {
    markdown += `- **Items:**\n`
    quest.rewards.items.forEach(item => {
      markdown += `  - ${item}\n`
    })
  }

  if (quest.questGiver) {
    markdown += `\n## Quest Giver\n\n${quest.questGiverData?.name || quest.questGiver}\n`
  }

  if (quest.loreContext) {
    markdown += `\n## Lore Context\n\n${quest.loreContext}\n`
  }

  if (quest.estimatedDuration) {
    markdown += `\n**Estimated Duration:** ${quest.estimatedDuration} minutes\n`
  }

  return markdown
}

/**
 * Export NPC as Markdown documentation
 */
export function npcToMarkdown(npc: GeneratedNPC): string {
  let markdown = `# ${npc.personality.name}\n\n`
  markdown += `**Archetype:** ${npc.personality.archetype}\n\n`

  markdown += `## Backstory\n\n${npc.personality.backstory}\n\n`

  markdown += `## Personality Traits\n\n`
  npc.personality.traits.forEach(trait => {
    markdown += `- ${trait}\n`
  })

  markdown += `\n## Goals\n\n`
  npc.personality.goals.forEach(goal => {
    markdown += `- ${goal}\n`
  })

  markdown += `\n## Dialogue\n\n`
  npc.dialogues.forEach((dialogue, idx) => {
    markdown += `### Node ${idx + 1} (ID: ${dialogue.id})\n\n`
    markdown += `> ${dialogue.text}\n\n`

    if (dialogue.responses.length > 0) {
      markdown += `**Player Responses:**\n\n`
      dialogue.responses.forEach((response, respIdx) => {
        markdown += `${respIdx + 1}. ${response.text}`
        if (response.questReference) {
          markdown += ` *(triggers quest: ${response.questReference})*`
        }
        markdown += `\n`
      })
      markdown += `\n`
    }
  })

  if (npc.services && npc.services.length > 0) {
    markdown += `## Services\n\n`
    npc.services.forEach(service => {
      markdown += `- ${service}\n`
    })
  }

  return markdown
}

/**
 * Export quest as Markdown file
 */
export function exportQuestAsMarkdown(quest: GeneratedQuest): void {
  const markdown = questToMarkdown(quest)
  const dataUri = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(markdown)
  const filename = `quest-${quest.title.toLowerCase().replace(/\s+/g, '-')}.md`
  downloadFile(dataUri, filename)
}

/**
 * Export NPC as Markdown file
 */
export function exportNPCAsMarkdown(npc: GeneratedNPC): void {
  const markdown = npcToMarkdown(npc)
  const dataUri = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(markdown)
  const filename = `npc-${npc.personality.name.toLowerCase().replace(/\s+/g, '-')}.md`
  downloadFile(dataUri, filename)
}

/**
 * Export multiple quests as ZIP file
 */
export async function exportQuestsAsZip(quests: GeneratedQuest[]): Promise<void> {
  const zip = new JSZip()

  // Add JSON file with all quests
  zip.file('quests.json', JSON.stringify(quests, null, 2))

  // Add individual markdown files
  const markdownFolder = zip.folder('markdown')
  if (markdownFolder) {
    quests.forEach((quest, idx) => {
      const filename = `${idx + 1}-${quest.title.toLowerCase().replace(/\s+/g, '-')}.md`
      markdownFolder.file(filename, questToMarkdown(quest))
    })
  }

  // Generate and download ZIP
  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const filename = `quests-${Date.now()}.zip`
  downloadFile(url, filename)
  URL.revokeObjectURL(url)
}

/**
 * Export multiple NPCs as ZIP file
 */
export async function exportNPCsAsZip(npcs: GeneratedNPC[]): Promise<void> {
  const zip = new JSZip()

  // Add JSON file with all NPCs
  zip.file('npcs.json', JSON.stringify(npcs, null, 2))

  // Add individual markdown files
  const markdownFolder = zip.folder('markdown')
  if (markdownFolder) {
    npcs.forEach((npc, idx) => {
      const filename = `${idx + 1}-${npc.personality.name.toLowerCase().replace(/\s+/g, '-')}.md`
      markdownFolder.file(filename, npcToMarkdown(npc))
    })
  }

  // Add dialogue scripts
  const dialogueFolder = zip.folder('dialogue-scripts')
  if (dialogueFolder) {
    npcs.forEach((npc, idx) => {
      const dialogueScript = {
        npc: npc.personality.name,
        archetype: npc.personality.archetype,
        dialogues: npc.dialogues
      }
      const filename = `${idx + 1}-${npc.personality.name.toLowerCase().replace(/\s+/g, '-')}-dialogue.json`
      dialogueFolder.file(filename, JSON.stringify(dialogueScript, null, 2))
    })
  }

  // Generate and download ZIP
  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const filename = `npcs-${Date.now()}.zip`
  downloadFile(url, filename)
  URL.revokeObjectURL(url)
}

/**
 * Export format options
 */
export interface ExportOptions {
  format: 'json' | 'markdown' | 'zip'
  includeMetadata?: boolean
  prettyPrint?: boolean
}

/**
 * Progress callback for export operations
 */
export type ExportProgressCallback = (progress: number, status: string) => void
