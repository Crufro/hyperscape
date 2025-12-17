/**
 * Generation Prompts
 * Reusable prompt templates for asset generation
 */

export interface PromptTemplates {
  imageGeneration: {
    base: string;
    enhancement: string;
  };
  textTo3D: {
    base: string;
    style: string;
  };
}

/**
 * Base prompts for asset generation
 */
export const PROMPTS: PromptTemplates = {
  imageGeneration: {
    base: `Generate a high-quality concept art image for a 3D game asset. 
The image should be:
- Stylized and game-ready
- Clear composition with good contrast
- Suitable for conversion to 3D model
- Professional game art quality

Description: {description}`,
    enhancement: `Enhance this game asset description for better 3D generation:
- Add specific details about materials, textures, and surface properties
- Include lighting and color information
- Specify proportions and scale
- Add style references if applicable

Original description: {description}`,
  },
  textTo3D: {
    base: `Create a 3D model for a game asset with these specifications:
- Game-ready topology optimized for real-time rendering
- Clean UV mapping for texture application
- Appropriate polycount for the asset type
- PBR materials ready

Description: {description}`,
    style: `Style: RuneScape-inspired, stylized low-poly aesthetic with vibrant colors and clear silhouettes.`,
  },
};

/**
 * Format prompt template with variables
 */
export function formatPrompt(
  template: string,
  variables: Record<string, string>,
): string {
  let formatted = template;
  for (const [key, value] of Object.entries(variables)) {
    formatted = formatted.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return formatted;
}
