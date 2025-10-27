/**
 * AI Creation Service for Server
 * Provides image generation and Meshy integration
 * Now using AI SDK v5 for all AI operations
 */

import fetch from 'node-fetch'
import { AISDKService } from './AISDKService.mjs'

export class AICreationService {
  constructor(config) {
    this.config = config
    // Use the new AI SDK service instead of direct API calls
    this.aiSDKService = new AISDKService(config.openai)
    this.imageService = new ImageGenerationService(this.aiSDKService)
    this.meshyService = new MeshyService(config.meshy)
  }
}

class ImageGenerationService {
  constructor(aiSDKService) {
    this.aiSDKService = aiSDKService
  }

  async generateImage(description, assetType, style) {
    // Delegate to AI SDK service
    return await this.aiSDKService.generateImage(description, assetType, style)
  }
}

class MeshyService {
  constructor(config) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl || 'https://api.meshy.ai'
  }

  async startImageTo3D(imageUrl, options) {
    const response = await fetch(`${this.baseUrl}/openapi/v1/image-to-3d`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_url: imageUrl,
        enable_pbr: options.enable_pbr ?? false,
        ai_model: options.ai_model || 'meshy-4',
        topology: options.topology || 'quad',
        target_polycount: options.targetPolycount || 2000,
        texture_resolution: options.texture_resolution || 512
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Meshy API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    // Normalize to task id string for polling
    const taskId = data.task_id || data.id || (data.result && (data.result.task_id || data.result.id))
    if (!taskId) {
      // Fallback to previous behavior but this will likely break polling
      return data.result || data
    }
    return taskId
  }

  async getTaskStatus(taskId) {
    const response = await fetch(`${this.baseUrl}/openapi/v1/image-to-3d/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Meshy API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    return data.result || data
  }

  async startRetextureTask(input, style, options) {
    const body = {
      art_style: options.artStyle || 'realistic',
      ai_model: options.aiModel || 'meshy-5',
      enable_original_uv: options.enableOriginalUV ?? true
    }

    if (input.inputTaskId) {
      body.input_task_id = input.inputTaskId
    } else {
      body.model_url = input.modelUrl
    }

    if (style.textStylePrompt) {
      body.text_style_prompt = style.textStylePrompt
    } else {
      body.image_style_url = style.imageStyleUrl
    }

    const response = await fetch(`${this.baseUrl}/openapi/v1/retexture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Meshy Retexture API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    // Normalize to task id string for polling
    const taskId = data.task_id || data.id || (data.result && (data.result.task_id || data.result.id))
    if (!taskId) {
      return data.result || data
    }
    return taskId
  }

  async getRetextureTaskStatus(taskId) {
    const response = await fetch(`${this.baseUrl}/openapi/v1/retexture/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Meshy API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    return data.result || data
  }

  // Rigging methods for auto-rigging avatars
  async startRiggingTask(input, options = {}) {
    const body = {
      height_meters: options.heightMeters || 1.7
    }

    if (input.inputTaskId) {
      body.input_task_id = input.inputTaskId
    } else if (input.modelUrl) {
      body.model_url = input.modelUrl
    } else {
      throw new Error('Either inputTaskId or modelUrl must be provided')
    }

    const response = await fetch(`${this.baseUrl}/openapi/v1/rigging`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Meshy rigging API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    // Normalize to task id string for polling
    const taskId = data.task_id || data.id || (data.result && (data.result.task_id || data.result.id))
    if (!taskId) {
      return data.result || data
    }
    return taskId
  }

  async getRiggingTaskStatus(taskId) {
    const response = await fetch(`${this.baseUrl}/openapi/v1/rigging/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Meshy rigging status error: ${response.status} - ${error}`)
    }

    return await response.json()
  }
} 