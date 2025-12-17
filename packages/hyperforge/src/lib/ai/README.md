# HyperForge AI Services

This directory contains all AI-related services for HyperForge, using Vercel AI Gateway for unified access to multiple AI providers.

## Architecture

All AI operations route through Vercel AI Gateway:

```
HyperForge → AI SDK → Vercel AI Gateway → [OpenAI | Anthropic | Google | ...]
```

## Files

| File | Description |
|------|-------------|
| `gateway.ts` | Main AI service with text, image, and structured output generation |
| `providers.ts` | Model configurations and task-specific model recommendations |
| `concept-art-service.ts` | Concept art image generation for 3D asset pipeline |
| `sprite-service.ts` | 2D game sprite generation |
| `prompts.ts` | Reusable prompt templates |

## Quick Start

### Text Generation

```typescript
import { generateTextWithProvider } from "@/lib/ai/gateway";

const text = await generateTextWithProvider("Write a quest description", {
  model: "anthropic/claude-sonnet-4", // or use TASK_MODELS
  temperature: 0.7,
  maxTokens: 1000,
  systemPrompt: "You are a game designer...",
});
```

### Streaming Text

```typescript
import { streamTextWithProvider } from "@/lib/ai/gateway";

for await (const chunk of streamTextWithProvider("Generate a story")) {
  console.log(chunk); // Real-time chunks
}
```

### Structured Output (with Zod)

```typescript
import { generateStructuredOutput } from "@/lib/ai/gateway";
import { z } from "zod";

const QuestSchema = z.object({
  name: z.string(),
  objectives: z.array(z.string()),
  reward: z.number(),
});

const quest = await generateStructuredOutput(
  "Generate a quest about goblins",
  QuestSchema,
);
// quest is typed as { name: string, objectives: string[], reward: number }
```

### Image Analysis

```typescript
import { analyzeImage } from "@/lib/ai/gateway";

const description = await analyzeImage(
  "https://example.com/sword.png",
  "Describe this weapon for a game tooltip",
);
```

### Prompt Enhancement

```typescript
import { enhancePromptWithGPT4 } from "@/lib/ai/gateway";

const result = await enhancePromptWithGPT4("a goblin warrior", {
  assetType: "npc",
  isAvatar: true, // Adds T-pose requirements for rigging
});
// result.enhancedPrompt has optimized prompt for 3D generation
```

## Model Selection

Use `TASK_MODELS` for task-appropriate model selection:

```typescript
import { TASK_MODELS } from "@/lib/ai/providers";

// Available task models:
TASK_MODELS.promptEnhancement  // Fast, cheap: openai/gpt-4o-mini
TASK_MODELS.textGeneration     // General text: openai/gpt-4o-mini
TASK_MODELS.dialogueGeneration // JSON/dialogue: google/gemini-2.0-flash
TASK_MODELS.contentGeneration  // Creative: anthropic/claude-sonnet-4
TASK_MODELS.imageGeneration    // Images: google/gemini-2.5-flash-image
TASK_MODELS.vision             // Image analysis: openai/gpt-4o
TASK_MODELS.reasoning          // Complex reasoning: anthropic/claude-sonnet-4
```

## Environment Setup

Required environment variable:

```bash
AI_GATEWAY_API_KEY=your-vercel-ai-gateway-key
```

Get your key from: Vercel Dashboard → AI Gateway → API Keys

On Vercel deployments, OIDC tokens are generated automatically (zero-key auth).

## Adding New Functions

1. Import from AI SDK and gateway:
   ```typescript
   import { generateText } from "ai";
   import { gateway } from "@ai-sdk/gateway";
   import { TASK_MODELS } from "./providers";
   ```

2. Use the gateway function with model strings:
   ```typescript
   const result = await generateText({
     model: gateway(TASK_MODELS.textGeneration),
     prompt: "...",
   });
   ```

3. Export from `gateway.ts` for use by other modules

## Documentation

- [Vercel AI Gateway](https://vercel.com/docs/ai-gateway)
- [AI SDK](https://sdk.vercel.ai/docs)
- [AI Gateway Models](https://vercel.com/docs/ai-gateway/models-and-providers)
