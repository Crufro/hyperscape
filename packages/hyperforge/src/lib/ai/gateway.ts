/**
 * AI Gateway Service
 * Unified AI text/image generation using Vercel AI Gateway
 *
 * Uses the AI SDK with gateway() function for all AI operations.
 * All requests route through Vercel AI Gateway for:
 * - Unified API access to OpenAI, Anthropic, Google, etc.
 * - Automatic failover and load balancing
 * - Centralized billing and usage tracking
 *
 * @see https://vercel.com/docs/ai-gateway
 * @see https://sdk.vercel.ai/docs
 *
 * Required environment variables:
 * - AI_GATEWAY_API_KEY: Your Vercel AI Gateway API key
 */

import { generateText, streamText, generateObject } from "ai";
import { gateway } from "@ai-sdk/gateway";
import type { z } from "zod";
import { TASK_MODELS, getTextModel, getVisionModel } from "./providers";

// ============================================================================
// Types
// ============================================================================

export interface TextGenerationOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface StreamTextOptions extends TextGenerationOptions {
  onChunk?: (chunk: string) => void;
}

export interface ImageGenerationOptions {
  provider?: string;
  size?: "1024x1024" | "1792x1024" | "1024x1792";
  quality?: "standard" | "hd";
  style?: "vivid" | "natural";
}

export interface StructuredOutputOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface PromptEnhancementResult {
  originalPrompt: string;
  enhancedPrompt: string;
  model: string;
  error?: string;
}

export interface EnhancementOptions {
  assetType: string;
  gameStyle?: string;
  isAvatar?: boolean;
}

// ============================================================================
// Text Generation
// ============================================================================

/**
 * Generate text using Vercel AI Gateway
 * Routes to the specified provider/model via AI Gateway
 */
export async function generateTextWithProvider(
  prompt: string,
  options: TextGenerationOptions = {},
): Promise<string> {
  const {
    model = TASK_MODELS.textGeneration,
    maxTokens = 2000,
    temperature = 0.7,
    systemPrompt,
  } = options;

  console.log(`[AI Gateway] Generating text with model: ${model}`);

  const result = await generateText({
    model: gateway(model),
    prompt,
    system: systemPrompt,
    maxTokens,
    temperature,
  });

  return result.text;
}

/**
 * Stream text using Vercel AI Gateway
 * Yields chunks as they arrive for real-time display
 */
export async function* streamTextWithProvider(
  prompt: string,
  options: StreamTextOptions = {},
): AsyncGenerator<string, void, unknown> {
  const {
    model = TASK_MODELS.textGeneration,
    maxTokens = 2000,
    temperature = 0.7,
    systemPrompt,
    onChunk,
  } = options;

  console.log(`[AI Gateway] Streaming text with model: ${model}`);

  const result = streamText({
    model: gateway(model),
    prompt,
    system: systemPrompt,
    maxTokens,
    temperature,
  });

  for await (const chunk of result.textStream) {
    if (onChunk) {
      onChunk(chunk);
    }
    yield chunk;
  }
}

// ============================================================================
// Structured Output (JSON with Zod schemas)
// ============================================================================

/**
 * Generate structured JSON output with type safety
 * Uses Zod schema for validation and type inference
 */
export async function generateStructuredOutput<T>(
  prompt: string,
  schema: z.ZodType<T>,
  options: StructuredOutputOptions = {},
): Promise<T> {
  const {
    model = TASK_MODELS.contentGeneration,
    maxTokens = 4000,
    temperature = 0.3,
    systemPrompt,
  } = options;

  console.log(`[AI Gateway] Generating structured output with model: ${model}`);

  const result = await generateObject({
    model: gateway(model),
    prompt,
    schema,
    system: systemPrompt,
    maxTokens,
    temperature,
  });

  return result.object;
}

/**
 * Generate JSON output (legacy - prefer generateStructuredOutput with Zod)
 * Parses response as JSON with cleanup for markdown formatting
 */
export async function generateJSON<T>(
  prompt: string,
  schemaDescription: string,
  options: TextGenerationOptions = {},
): Promise<T> {
  const systemPrompt = `You are a JSON generator. You MUST return ONLY valid JSON matching this schema:

${schemaDescription}

Return ONLY the JSON object, no markdown, no explanation, no code blocks.`;

  const result = await generateTextWithProvider(prompt, {
    ...options,
    systemPrompt,
    temperature: 0.3,
  });

  // Clean up any markdown formatting
  let cleaned = result.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  }
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }

  return JSON.parse(cleaned.trim()) as T;
}

// ============================================================================
// Vision / Image Analysis
// ============================================================================

/**
 * Analyze an image using a vision model via AI Gateway
 */
export async function analyzeImage(
  imageUrl: string,
  prompt: string,
  options: TextGenerationOptions = {},
): Promise<string> {
  const {
    model = TASK_MODELS.vision,
    maxTokens = 1000,
    temperature = 0.3,
  } = options;

  console.log(`[AI Gateway] Analyzing image with model: ${model}`);

  const result = await generateText({
    model: gateway(model),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image", image: imageUrl },
        ],
      },
    ],
    maxTokens,
    temperature,
  });

  return result.text;
}

// ============================================================================
// Image Generation
// ============================================================================

/**
 * Generate an image using AI Gateway
 * Currently uses Google Gemini for image generation
 */
export async function generateImageWithProvider(
  prompt: string,
  options: ImageGenerationOptions = {},
): Promise<string> {
  console.log("[AI Gateway] Image generation requested:", { prompt, options });

  // Use AI SDK with Gemini for image generation
  const result = await generateText({
    model: gateway(TASK_MODELS.imageGeneration),
    prompt: `Generate an image: ${prompt}`,
  });

  // Check for generated image files
  const imageFiles = result.files?.filter((f) =>
    f.mediaType?.startsWith("image/"),
  );

  if (imageFiles && imageFiles.length > 0) {
    const file = imageFiles[0];
    const base64 = Buffer.from(file.uint8Array).toString("base64");
    const mediaType = file.mediaType || "image/png";
    return `data:${mediaType};base64,${base64}`;
  }

  // Fallback if no image generated
  console.warn("[AI Gateway] No image generated, returning placeholder");
  return `https://placeholder.hyperforge.ai/generated?prompt=${encodeURIComponent(prompt)}&size=${options.size || "1024x1024"}`;
}

// ============================================================================
// Prompt Enhancement
// ============================================================================

/**
 * Enhance a prompt using GPT-4 via Vercel AI Gateway
 * Optimizes prompts for 3D asset generation with Meshy AI
 */
export async function enhancePromptWithGPT4(
  description: string,
  options: EnhancementOptions,
): Promise<PromptEnhancementResult> {
  const modelName = TASK_MODELS.promptEnhancement;

  // Build system prompt based on asset type
  let systemPrompt = `You are an expert at optimizing prompts for 3D asset generation with Meshy AI.
Your task is to enhance the user's description to create better results with text-to-3D generation.

Focus on:
- Clear, specific visual details
- Material and texture descriptions  
- Geometric shape and form
- Game-ready asset considerations`;

  if (options.isAvatar) {
    systemPrompt += `

CRITICAL REQUIREMENTS FOR CHARACTER RIGGING:
The generated model will be auto-rigged, so the body structure MUST be clearly visible:

1. POSE: Standing in T-pose with arms stretched out horizontally to the sides, legs slightly apart
2. EMPTY HANDS: No weapons, tools, shields, or held items - hands must be empty and open
3. VISIBLE LIMBS: Arms and legs must be CLEARLY VISIBLE and separated from the body
   - NO long robes, cloaks, or dresses that cover or merge with the legs
   - NO bulky capes or flowing fabric that obscures arm silhouette
   - Clothing should be fitted or short enough to show leg separation
4. CLEAR SILHOUETTE: The body outline should clearly show head, torso, 2 arms, 2 legs
5. HUMANOID PROPORTIONS: Standard humanoid body with clearly defined joints

REWRITE the clothing/armor description to ensure limbs are visible:
- Instead of "long robes" → use "fitted tunic" or "short robes above the knee"
- Instead of "flowing cloak" → use "short shoulder cape" or remove it
- Instead of "heavy plate armor" → use "form-fitting armor" or "segmented armor showing joints"

Always end with: "Full body character in T-pose with arms extended horizontally, legs apart, empty open hands, clearly visible arms and legs."`;
  }

  systemPrompt += `

Keep the enhanced prompt concise but detailed. Return ONLY the enhanced prompt, nothing else.`;

  const userPrompt = `Enhance this ${options.assetType} asset description for 3D generation: "${description}"`;

  try {
    console.log("[AI Gateway] Enhancing prompt via Vercel AI Gateway...");

    const result = await generateText({
      model: gateway(modelName),
      prompt: userPrompt,
      system: systemPrompt,
      temperature: 0.7,
      maxTokens: 500,
    });

    const enhancedPrompt = result.text.trim();

    console.log("[AI Gateway] Prompt enhanced successfully");

    return {
      originalPrompt: description,
      enhancedPrompt,
      model: modelName,
    };
  } catch (error) {
    console.error("[AI Gateway] Enhancement failed:", error);

    // Fallback: add basic game-ready suffix
    const fallbackPrompt = `${description}. Game-ready 3D asset, clean geometry, detailed textures.`;

    return {
      originalPrompt: description,
      enhancedPrompt: fallbackPrompt,
      model: "fallback",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
