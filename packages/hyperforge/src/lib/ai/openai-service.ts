/**
 * AI Service for Hyperforge
 * Uses Vercel AI Gateway for GPT-4 prompt enhancement
 *
 * Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *
 * Required env var:
 * - AI_GATEWAY_API_KEY: Your Vercel AI Gateway API key
 *   (Create at: Vercel Dashboard → AI Gateway → API Keys)
 */

interface PromptEnhancementResult {
  originalPrompt: string;
  enhancedPrompt: string;
  model: string;
  error?: string;
}

interface EnhancementOptions {
  assetType: string;
  gameStyle?: string;
  isAvatar?: boolean;
}

// Vercel AI Gateway base URL
const AI_GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1";

/**
 * Enhance a prompt using GPT-4 via Vercel AI Gateway
 */
export async function enhancePromptWithGPT4(
  description: string,
  options: EnhancementOptions,
): Promise<PromptEnhancementResult> {
  const apiKey = process.env.AI_GATEWAY_API_KEY;

  if (!apiKey) {
    console.warn(
      "[AI Gateway] No AI_GATEWAY_API_KEY found, skipping enhancement",
    );
    return {
      originalPrompt: description,
      enhancedPrompt: description,
      model: "none",
      error: "No AI_GATEWAY_API_KEY configured",
    };
  }

  // Use gpt-4o-mini for fast, cheap prompt enhancement
  // Model format for AI Gateway: provider/model
  const modelName = "openai/gpt-4o-mini";

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

    const response = await fetch(`${AI_GATEWAY_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI Gateway error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const enhancedPrompt = data.choices[0].message.content.trim();

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
