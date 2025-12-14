/**
 * AI Gateway Service
 * Provides AI text generation capabilities
 *
 * Uses OpenAI-compatible API for text generation.
 * Can be configured to use Vercel AI Gateway, OpenAI, or other providers.
 *
 * Required environment variables:
 * - OPENAI_API_KEY or AI_GATEWAY_API_KEY
 */

export interface TextGenerationOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface StreamTextOptions extends TextGenerationOptions {
  onChunk?: (chunk: string) => void;
}

// Default models for different use cases
const DEFAULT_MODELS = {
  text: "gpt-4o-mini",
  fast: "gpt-4o-mini",
  image: "gpt-4o",
} as const;

/**
 * Generate text using OpenAI-compatible API
 */
export async function generateTextWithProvider(
  prompt: string,
  options: TextGenerationOptions = {},
): Promise<string> {
  const {
    model = DEFAULT_MODELS.text,
    maxTokens = 2000,
    temperature = 0.7,
    systemPrompt,
  } = options;

  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY or AI_GATEWAY_API_KEY is required");
  }

  const messages: Array<{ role: string; content: string }> = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `AI API error: ${response.status} - ${JSON.stringify(error)}`,
    );
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

/**
 * Stream text - placeholder that returns full response
 * (Full streaming implementation would use SSE)
 */
export async function* streamTextWithProvider(
  prompt: string,
  options: StreamTextOptions = {},
): AsyncGenerator<string, void, unknown> {
  const text = await generateTextWithProvider(prompt, options);
  yield text;
}

/**
 * Analyze image using vision model
 */
export async function analyzeImage(
  imageUrl: string,
  prompt: string,
  options: TextGenerationOptions = {},
): Promise<string> {
  const {
    model = DEFAULT_MODELS.image,
    maxTokens = 1000,
    temperature = 0.3,
  } = options;

  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY or AI_GATEWAY_API_KEY is required");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `AI API error: ${response.status} - ${JSON.stringify(error)}`,
    );
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

/**
 * Generate structured JSON output
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

/**
 * Image generation options
 */
export interface ImageGenerationOptions {
  provider?: string;
  size?: "1024x1024" | "1792x1024" | "1024x1792";
  quality?: "standard" | "hd";
  style?: "vivid" | "natural";
}

/**
 * Generate an image using AI provider
 *
 * Note: This is a placeholder - actual implementation would use
 * DALL-E, Midjourney API, or similar image generation service.
 *
 * For now, returns a placeholder URL.
 */
export async function generateImageWithProvider(
  prompt: string,
  options: ImageGenerationOptions = {},
): Promise<string> {
  // TODO: Implement actual image generation with OpenAI DALL-E or similar
  // For now, return a placeholder that indicates the prompt
  console.log("[AI Gateway] Image generation requested:", { prompt, options });

  // In production, this would call:
  // - OpenAI DALL-E API
  // - Midjourney API
  // - Stability AI
  // - etc.

  // Return placeholder for now
  return `https://placeholder.hyperforge.ai/generated?prompt=${encodeURIComponent(prompt)}&size=${options.size || "1024x1024"}`;
}
