/**
 * Embedding Service
 * Generates and stores vector embeddings for game content using Vercel AI SDK
 *
 * Supports:
 * - Vercel AI Gateway for unified model access
 * - Direct provider access (OpenAI, Anthropic)
 * - Lore documents, Quests, Items, Characters/NPCs, Manifests
 * - Semantic search and retrieval
 */

import { embed, embedMany, gateway } from 'ai'
import { openai } from '@ai-sdk/openai'

const EMBEDDING_MODEL = 'text-embedding-3-small' // 1536 dimensions, cost-effective
const EMBEDDING_DIMENSIONS = 1536
const BATCH_SIZE = 100 // OpenAI allows up to 2048 texts per batch

export class EmbeddingService {
  constructor(db) {
    this.db = db
    this.useGateway = this.shouldUseGateway()
    this.modelConfigCache = new Map()
    this.cacheExpiry = 5 * 60 * 1000 // 5 minutes

    // Check for required API keys
    if (!this.useGateway && !process.env.OPENAI_API_KEY) {
      console.warn('[EmbeddingService] Missing OPENAI_API_KEY - embedding features disabled')
      this.enabled = false
    } else {
      this.enabled = true

      if (this.useGateway) {
        console.log(`[EmbeddingService] Initialized with Vercel AI Gateway (${EMBEDDING_DIMENSIONS}d)`)
      } else {
        console.log(`[EmbeddingService] Initialized with ${EMBEDDING_MODEL} (${EMBEDDING_DIMENSIONS}d)`)
      }
    }
  }

  /**
   * Determine if we should use the AI Gateway
   */
  shouldUseGateway() {
    return !!(
      process.env.AI_GATEWAY_API_KEY ||
      process.env.VERCEL_ENV // Deployed on Vercel with OIDC
    )
  }

  /**
   * Get configured embedding model from database or use default
   */
  async getEmbeddingModel() {
    try {
      // Check cache first
      const cacheKey = 'embedding_model'
      const cached = this.modelConfigCache.get(cacheKey)

      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        return this.getModel(cached.modelId, cached.provider)
      }

      // Fetch from database
      const result = await this.db.query(`
        SELECT model_id, provider
        FROM enabled_models
        WHERE category = 'embedding'
          AND is_recommended = true
          AND tier = 'cost'
        ORDER BY created_at DESC
        LIMIT 1
      `)

      if (result.rows.length > 0) {
        const config = result.rows[0]

        // Cache the result
        this.modelConfigCache.set(cacheKey, {
          modelId: config.model_id,
          provider: config.provider,
          timestamp: Date.now()
        })

        return this.getModel(config.model_id, config.provider)
      }
    } catch (error) {
      console.warn('[EmbeddingService] Failed to fetch configured model:', error.message)
    }

    // Fall back to default
    return this.getModel(EMBEDDING_MODEL, 'openai')
  }

  /**
   * Get the appropriate model based on gateway availability
   */
  getModel(modelId, provider = 'openai') {
    if (this.useGateway) {
      // Use gateway format: provider/model-name
      const gatewayModelId = modelId.includes('/') ? modelId : `${provider}/${modelId}`
      return gateway(gatewayModelId)
    }

    // Direct provider access
    if (provider === 'openai') {
      return openai.embedding(modelId.replace('openai/', ''))
    }

    throw new Error(`Unsupported embedding provider: ${provider}`)
  }

  /**
   * Generate embedding for a single text
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} - Embedding vector
   */
  async generateEmbedding(text) {
    if (!this.enabled) {
      throw new Error('Embedding service is disabled - API key not configured')
    }

    const startTime = Date.now()

    try {
      const model = await this.getEmbeddingModel()

      const { embedding } = await embed({
        model,
        value: text
      })

      const duration = Date.now() - startTime
      console.log(`[EmbeddingService] Generated embedding for ${text.length} chars (${duration}ms)`)

      return embedding
    } catch (error) {
      console.error('[EmbeddingService] Failed to generate embedding:', error.message)
      throw error
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   * @param {string[]} texts - Array of texts to embed
   * @returns {Promise<number[][]>} - Array of embedding vectors
   */
  async generateEmbeddings(texts) {
    if (!this.enabled) {
      throw new Error('Embedding service is disabled - API key not configured')
    }

    if (texts.length === 0) {
      return []
    }

    const startTime = Date.now()

    try {
      const model = await this.getEmbeddingModel()

      // Process in batches
      const results = []

      for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batch = texts.slice(i, i + BATCH_SIZE)

        const { embeddings } = await embedMany({
          model,
          values: batch
        })

        results.push(...embeddings)
      }

      const duration = Date.now() - startTime
      console.log(`[EmbeddingService] Generated ${results.length} embeddings (${duration}ms)`)

      return results
    } catch (error) {
      console.error('[EmbeddingService] Failed to generate embeddings:', error.message)
      throw error
    }
  }

  /**
   * Store embedding in database
   * @param {object} params - Embedding parameters
   * @param {string} params.contentType - Type of content (lore, quest, item, character, manifest, npc)
   * @param {string} params.contentId - ID of the content
   * @param {string} params.content - Text that was embedded
   * @param {number[]} params.embedding - Embedding vector
   * @param {object} params.metadata - Additional metadata
   */
  async storeEmbedding({ contentType, contentId, content, embedding, metadata = {} }) {
    const startTime = Date.now()

    try {
      // Convert embedding array to pgvector format
      const vectorString = `[${embedding.join(',')}]`

      const result = await this.db.query(`
        INSERT INTO content_embeddings (content_type, content_id, content, embedding, metadata)
        VALUES ($1, $2, $3, $4::vector, $5)
        ON CONFLICT (content_type, content_id)
        DO UPDATE SET
          content = EXCLUDED.content,
          embedding = EXCLUDED.embedding,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
        RETURNING id, created_at, updated_at
      `, [contentType, contentId, content, vectorString, JSON.stringify(metadata)])

      const duration = Date.now() - startTime
      const row = result.rows[0]

      console.log(`[EmbeddingService] Stored embedding for ${contentType}:${contentId} (id=${row.id}, ${duration}ms)`)

      return row
    } catch (error) {
      console.error(`[EmbeddingService] Failed to store embedding:`, error.message)
      throw error
    }
  }

  /**
   * Embed and store content in one operation
   * @param {object} params - Content parameters
   */
  async embedContent({ contentType, contentId, content, metadata = {} }) {
    if (!this.enabled) {
      console.warn(`[EmbeddingService] Skipping embedding for ${contentType}:${contentId} - service disabled`)
      return null
    }

    const startTime = Date.now()

    try {
      // Generate embedding
      const embedding = await this.generateEmbedding(content)

      // Store in database
      const result = await this.storeEmbedding({
        contentType,
        contentId,
        content,
        embedding,
        metadata
      })

      const duration = Date.now() - startTime
      console.log(`[EmbeddingService] Embedded ${contentType}:${contentId} (${duration}ms total)`)

      return result
    } catch (error) {
      console.error(`[EmbeddingService] Failed to embed content:`, error.message)
      throw error
    }
  }

  /**
   * Batch embed and store multiple content items
   * @param {Array<object>} items - Array of content items
   */
  async embedContentBatch(items) {
    if (!this.enabled || items.length === 0) {
      return []
    }

    const startTime = Date.now()

    try {
      // Extract texts for batch embedding
      const texts = items.map(item => item.content)

      // Generate all embeddings in batch
      const embeddings = await this.generateEmbeddings(texts)

      // Store all embeddings
      const results = []
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const embedding = embeddings[i]

        const result = await this.storeEmbedding({
          contentType: item.contentType,
          contentId: item.contentId,
          content: item.content,
          embedding,
          metadata: item.metadata || {}
        })

        results.push(result)
      }

      const duration = Date.now() - startTime
      console.log(`[EmbeddingService] Batch embedded ${results.length} items (${duration}ms total)`)

      return results
    } catch (error) {
      console.error('[EmbeddingService] Failed to batch embed content:', error.message)
      throw error
    }
  }

  /**
   * Find similar content using vector similarity search
   * @param {string} queryText - Text to search for
   * @param {object} options - Search options
   * @param {string} options.contentType - Filter by content type
   * @param {number} options.limit - Maximum results (default: 10)
   * @param {number} options.threshold - Similarity threshold 0-1 (default: 0.7)
   * @param {object} options.metadata - Metadata filters
   */
  async findSimilar(queryText, options = {}) {
    if (!this.enabled) {
      throw new Error('Embedding service is disabled - OPENAI_API_KEY not configured')
    }

    const {
      contentType = null,
      limit = 10,
      threshold = 0.7,
      metadata = null
    } = options

    const startTime = Date.now()

    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(queryText)
      const vectorString = `[${queryEmbedding.join(',')}]`

      // Build query
      let query = `
        SELECT
          id,
          content_type,
          content_id,
          content,
          metadata,
          1 - (embedding <=> $1::vector) as similarity,
          created_at
        FROM content_embeddings
        WHERE 1 - (embedding <=> $1::vector) >= $2
      `

      const params = [vectorString, threshold]

      // Add content type filter
      if (contentType) {
        query += ` AND content_type = $${params.length + 1}`
        params.push(contentType)
      }

      // Add metadata filter
      if (metadata) {
        for (const [key, value] of Object.entries(metadata)) {
          query += ` AND metadata->>'${key}' = $${params.length + 1}`
          params.push(value)
        }
      }

      // Order by similarity and limit
      query += `
        ORDER BY similarity DESC
        LIMIT $${params.length + 1}
      `
      params.push(limit)

      const result = await this.db.query(query, params)

      const duration = Date.now() - startTime
      console.log(`[EmbeddingService] Found ${result.rows.length} similar items (${duration}ms)`)

      return result.rows.map(row => ({
        id: row.id,
        contentType: row.content_type,
        contentId: row.content_id,
        content: row.content,
        metadata: row.metadata,
        similarity: parseFloat(row.similarity),
        createdAt: row.created_at
      }))
    } catch (error) {
      console.error('[EmbeddingService] Failed to find similar content:', error.message)
      throw error
    }
  }

  /**
   * Delete embedding for a content item
   * @param {string} contentType - Type of content
   * @param {string} contentId - ID of content
   */
  async deleteEmbedding(contentType, contentId) {
    try {
      const result = await this.db.query(`
        DELETE FROM content_embeddings
        WHERE content_type = $1 AND content_id = $2
        RETURNING id
      `, [contentType, contentId])

      if (result.rows.length > 0) {
        console.log(`[EmbeddingService] Deleted embedding for ${contentType}:${contentId}`)
        return true
      }

      return false
    } catch (error) {
      console.error(`[EmbeddingService] Failed to delete embedding:`, error.message)
      throw error
    }
  }

  /**
   * Get embedding statistics
   */
  async getStats() {
    try {
      const result = await this.db.query(`
        SELECT * FROM embedding_stats
        ORDER BY total_embeddings DESC
      `)

      return result.rows
    } catch (error) {
      console.error('[EmbeddingService] Failed to get stats:', error.message)
      throw error
    }
  }

  /**
   * Build context from similar content for AI prompts
   * @param {string} queryText - Query text
   * @param {object} options - Search options
   */
  async buildContext(queryText, options = {}) {
    const similar = await this.findSimilar(queryText, {
      limit: options.limit || 5,
      threshold: options.threshold || 0.7,
      ...options
    })

    if (similar.length === 0) {
      return {
        hasContext: false,
        context: '',
        sources: []
      }
    }

    const context = similar
      .map((item, i) => {
        const type = item.contentType.toUpperCase()
        return `[${type} ${i + 1}] (${Math.round(item.similarity * 100)}% relevant)\n${item.content}`
      })
      .join('\n\n')

    return {
      hasContext: true,
      context,
      sources: similar.map(item => ({
        type: item.contentType,
        id: item.contentId,
        similarity: item.similarity
      }))
    }
  }
}

export default EmbeddingService
