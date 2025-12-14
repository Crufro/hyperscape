/**
 * AI Provider Model Configurations
 * Uses Vercel AI Gateway exclusively - all models route through AI Gateway
 *
 * Model strings use provider/model-name format that AI Gateway recognizes.
 * The gateway() function routes these to the appropriate provider via AI Gateway.
 *
 * Example: 'anthropic/claude-sonnet-4' → AI Gateway → Anthropic API
 *
 * We do NOT use direct provider SDKs - only AI Gateway.
 */

export type AIProvider = "openai" | "anthropic" | "google";

export interface ModelConfig {
  text: string;
  image?: string;
  vision?: string;
}

/**
 * Model configurations for each provider
 * These use the provider/model-name format that AI Gateway recognizes
 */
export const PROVIDER_MODELS: Record<AIProvider, ModelConfig> = {
  openai: {
    text: "openai/gpt-4o",
    image: "openai/dall-e-3",
    vision: "openai/gpt-4o",
  },
  anthropic: {
    text: "anthropic/claude-sonnet-4-20250514",
    vision: "anthropic/claude-sonnet-4-20250514",
    // Anthropic doesn't support image generation
  },
  google: {
    text: "google/gemini-2.0-flash",
    image: "google/imagen-3",
    vision: "google/gemini-2.0-flash",
  },
};

/**
 * Get text model string for provider
 */
export function getTextModel(provider: AIProvider): string {
  return PROVIDER_MODELS[provider].text;
}

/**
 * Get image model string for provider
 */
export function getImageModel(provider: AIProvider): string {
  const model = PROVIDER_MODELS[provider].image;
  if (!model) {
    throw new Error(`Provider ${provider} does not support image generation`);
  }
  return model;
}

/**
 * Get vision model string for provider
 */
export function getVisionModel(provider: AIProvider): string {
  return PROVIDER_MODELS[provider].vision || PROVIDER_MODELS[provider].text;
}
