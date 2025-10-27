/**
 * Content Embedder
 * Extracts embeddable content from different game content types
 * and manages automatic embedding on creation/update
 */

import EmbeddingService from './EmbeddingService.mjs'

export class ContentEmbedder {
  constructor(db) {
    this.embeddingService = new EmbeddingService(db)
  }

  /**
   * Extract embeddable text from lore content
   * @param {object} lore - Lore document
   */
  extractLoreContent(lore) {
    const parts = [
      lore.title || '',
      lore.category || '',
      lore.content || '',
      lore.summary || ''
    ].filter(Boolean)

    return parts.join('\n\n')
  }

  /**
   * Extract embeddable text from quest
   * @param {object} quest - Quest data
   */
  extractQuestContent(quest) {
    const parts = [
      quest.title || quest.name || '',
      quest.description || '',
      quest.objective || '',
      quest.questGiver || '',
      quest.rewards ? `Rewards: ${JSON.stringify(quest.rewards)}` : '',
      quest.requirements ? `Requirements: ${JSON.stringify(quest.requirements)}` : ''
    ].filter(Boolean)

    return parts.join('\n\n')
  }

  /**
   * Extract embeddable text from item
   * @param {object} item - Item data
   */
  extractItemContent(item) {
    const parts = [
      item.name || '',
      item.id || '',
      item.type || item.category || '',
      item.description || '',
      item.lore || '',
      item.stats ? `Stats: ${JSON.stringify(item.stats)}` : '',
      item.effects ? `Effects: ${JSON.stringify(item.effects)}` : ''
    ].filter(Boolean)

    return parts.join('\n\n')
  }

  /**
   * Extract embeddable text from character/NPC
   * @param {object} character - Character data
   */
  extractCharacterContent(character) {
    const parts = [
      character.name || '',
      character.title || '',
      character.race || character.species || '',
      character.class || character.role || '',
      character.description || '',
      character.backstory || '',
      character.personality || '',
      character.dialogue ? `Common phrases: ${character.dialogue.slice(0, 3).join('; ')}` : '',
      character.location ? `Location: ${character.location}` : ''
    ].filter(Boolean)

    return parts.join('\n\n')
  }

  /**
   * Extract embeddable text from manifest
   * @param {object} manifest - Manifest data
   */
  extractManifestContent(manifest) {
    const parts = [
      manifest.name || '',
      manifest.category || manifest.type || '',
      manifest.description || '',
      manifest.tags ? `Tags: ${manifest.tags.join(', ')}` : '',
      manifest.metadata ? `Metadata: ${JSON.stringify(manifest.metadata)}` : ''
    ].filter(Boolean)

    // If manifest has items, include a summary
    if (manifest.items && Array.isArray(manifest.items)) {
      const itemSummary = manifest.items.slice(0, 5)
        .map(item => item.name || item.id)
        .join(', ')
      parts.push(`Items: ${itemSummary}${manifest.items.length > 5 ? '...' : ''}`)
    }

    return parts.join('\n\n')
  }

  /**
   * Embed lore content
   * @param {string} loreId - Lore ID
   * @param {object} lore - Lore data
   */
  async embedLore(loreId, lore) {
    const content = this.extractLoreContent(lore)

    return this.embeddingService.embedContent({
      contentType: 'lore',
      contentId: loreId,
      content,
      metadata: {
        title: lore.title,
        category: lore.category,
        tags: lore.tags || []
      }
    })
  }

  /**
   * Embed quest content
   * @param {string} questId - Quest ID
   * @param {object} quest - Quest data
   */
  async embedQuest(questId, quest) {
    const content = this.extractQuestContent(quest)

    return this.embeddingService.embedContent({
      contentType: 'quest',
      contentId: questId,
      content,
      metadata: {
        title: quest.title || quest.name,
        difficulty: quest.difficulty,
        questGiver: quest.questGiver,
        level: quest.level || quest.requiredLevel
      }
    })
  }

  /**
   * Embed item content
   * @param {string} itemId - Item ID
   * @param {object} item - Item data
   */
  async embedItem(itemId, item) {
    const content = this.extractItemContent(item)

    return this.embeddingService.embedContent({
      contentType: 'item',
      contentId: itemId,
      content,
      metadata: {
        name: item.name,
        type: item.type || item.category,
        rarity: item.rarity,
        level: item.level
      }
    })
  }

  /**
   * Embed character/NPC content
   * @param {string} characterId - Character ID
   * @param {object} character - Character data
   */
  async embedCharacter(characterId, character) {
    const content = this.extractCharacterContent(character)

    return this.embeddingService.embedContent({
      contentType: 'character',
      contentId: characterId,
      content,
      metadata: {
        name: character.name,
        race: character.race || character.species,
        class: character.class || character.role,
        location: character.location
      }
    })
  }

  /**
   * Embed NPC content (alias for embedCharacter)
   * @param {string} npcId - NPC ID
   * @param {object} npc - NPC data
   */
  async embedNPC(npcId, npc) {
    const content = this.extractCharacterContent(npc)

    return this.embeddingService.embedContent({
      contentType: 'npc',
      contentId: npcId,
      content,
      metadata: {
        name: npc.name,
        type: npc.type || 'npc',
        location: npc.location,
        faction: npc.faction
      }
    })
  }

  /**
   * Embed manifest content
   * @param {string} manifestId - Manifest ID
   * @param {object} manifest - Manifest data
   */
  async embedManifest(manifestId, manifest) {
    const content = this.extractManifestContent(manifest)

    return this.embeddingService.embedContent({
      contentType: 'manifest',
      contentId: manifestId,
      content,
      metadata: {
        name: manifest.name,
        category: manifest.category,
        itemCount: manifest.items?.length || 0
      }
    })
  }

  /**
   * Batch embed multiple items of the same type
   * @param {string} contentType - Type of content
   * @param {Array<object>} items - Array of {id, data} objects
   */
  async embedBatch(contentType, items) {
    const extractorMap = {
      lore: this.extractLoreContent.bind(this),
      quest: this.extractQuestContent.bind(this),
      item: this.extractItemContent.bind(this),
      character: this.extractCharacterContent.bind(this),
      npc: this.extractCharacterContent.bind(this),
      manifest: this.extractManifestContent.bind(this)
    }

    const extractor = extractorMap[contentType]
    if (!extractor) {
      throw new Error(`Unknown content type: ${contentType}`)
    }

    const embeddingItems = items.map(({ id, data, metadata }) => ({
      contentType,
      contentId: id,
      content: extractor(data),
      metadata: metadata || {}
    }))

    return this.embeddingService.embedContentBatch(embeddingItems)
  }

  /**
   * Find similar content across all types
   * @param {string} queryText - Query text
   * @param {object} options - Search options
   */
  async findSimilar(queryText, options = {}) {
    return this.embeddingService.findSimilar(queryText, options)
  }

  /**
   * Build AI context from similar content
   * @param {string} queryText - Query text
   * @param {object} options - Search options
   */
  async buildContext(queryText, options = {}) {
    return this.embeddingService.buildContext(queryText, options)
  }

  /**
   * Get embedding statistics
   */
  async getStats() {
    return this.embeddingService.getStats()
  }

  /**
   * Delete embedding for content
   * @param {string} contentType - Content type
   * @param {string} contentId - Content ID
   */
  async deleteEmbedding(contentType, contentId) {
    return this.embeddingService.deleteEmbedding(contentType, contentId)
  }
}

export default ContentEmbedder
