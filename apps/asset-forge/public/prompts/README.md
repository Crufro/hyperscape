# HyperForge AI Prompts

This directory contains all AI prompts used across HyperForge. These JSON files can be updated without rebuilding the application, allowing for rapid iteration on AI generation quality.

## Prompt Files

### Asset Generation Prompts
- **`asset-type-prompts.json`** - Prompts for different asset types (weapons, armor, items, etc.)
- **`generation-prompts.json`** - Core 3D asset generation prompts for Meshy AI
- **`gpt4-enhancement-prompts.json`** - GPT-4 prompt enhancement templates
- **`game-style-prompts.json`** - Art style prompts (pixel art, low poly, realistic, etc.)
- **`material-presets.json`** - Material/texture presets (bronze, steel, leather, wood, etc.)
- **`material-prompts.json`** - Material-specific generation prompts
- **`weapon-detection-prompts.json`** - Computer vision prompts for weapon detection and classification

## Usage

These prompts are loaded dynamically at runtime via HTTP fetch:

```typescript
// Example: Loading material presets
const response = await fetch('/prompts/material-presets.json')
const presets = await response.json()
```

## Updating Prompts

1. Edit the JSON file directly
2. Refresh the application - no rebuild required!
3. Changes take effect immediately for new generations

## File Format

All files are standard JSON with appropriate schemas. See individual files for structure.

## Best Practices

- Keep prompts concise but descriptive
- Include style keywords (e.g., "RuneScape 2007 style")
- Test prompt changes with multiple generations
- Document significant changes in git commits
- Maintain consistent formatting across files

## Security Note

These files are publicly accessible. Do not include:
- API keys or secrets
- Proprietary algorithms
- Internal company information
- User data or PII
