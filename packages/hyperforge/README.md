# HyperForge

AI-powered 3D asset creation studio for Hyperscape. Built with Next.js 15, React Three Fiber, and Vercel AI Gateway.

## Features

- **CDN Asset Loading**: Loads assets from game CDN manifests (items, NPCs, resources)
- **AI Generation**: Text-to-3D and Image-to-3D pipelines using Meshy
- **Vercel AI Gateway**: Unified AI provider access for text and image generation
- **3D Viewport**: React Three Fiber-based model viewer
- **Studio Layout**: Professional asset creation interface

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **3D**: React Three Fiber + Drei
- **AI**: Vercel AI Gateway (via AI SDK)
- **Database**: SQLite with Drizzle ORM
- **Styling**: Tailwind CSS with OKLCH design tokens
- **State**: Zustand (planned)

## Setup

1. Install dependencies:
```bash
bun install
```

2. Set up environment variables (see `.env.example`):
```bash
cp .env.example .env.local
```

3. Initialize database:
```bash
bun run db:push
```

4. Start development server:
```bash
bun run dev
```

The app will be available at `http://localhost:3500`.

## Environment Variables

- `NEXT_PUBLIC_CDN_URL`: Game CDN URL (default: `http://localhost:8080`)
- `AI_GATEWAY_API_KEY`: Vercel AI Gateway API key (required)
- `MESHY_API_KEY`: Meshy API key for 3D generation (required)
- `DATABASE_URL`: SQLite database path (default: `file:./hyperforge.db`)

## Architecture

### AI Gateway Integration

HyperForge uses Vercel AI Gateway for all AI model inference:

- **Text Generation**: Uses `provider/model` format (e.g., `anthropic/claude-sonnet-4`)
- **Image Generation**: Supports OpenAI DALL-E 3 and Google Imagen 3
- **Automatic Routing**: AI SDK automatically uses AI Gateway when it detects `provider/model` format

Example:
```typescript
import { generateText } from 'ai';
import { gateway } from 'ai';

const result = await generateText({
  model: gateway('anthropic/claude-sonnet-4'),
  prompt: 'Generate a game asset description',
});
```

### CDN Integration

Loads assets from the same CDN the game uses:
- `/manifests/items.json`
- `/manifests/npcs.json`
- `/manifests/resources.json`

Assets are cached in-memory with 5-minute TTL.

### Meshy 3D Pipeline

HyperForge uses the Meshy API for AI-powered 3D model generation, optimized for Three.js web MMO assets.

**Generation Workflows:**
- **Text-to-3D**: Generate 3D models from text prompts (two-stage: preview → refine)
- **Image-to-3D**: Convert images to 3D models (single-stage)
- **Retexture**: Apply new textures to existing models
- **Rigging**: Add skeleton and basic animations to characters
- **Task Polling**: Automatic status polling until completion

**Mesh Control:**
- **Topology**: Triangle (GPU-ready) or Quad (artist-friendly)
- **Polycount**: Configurable target polygon count with asset-class presets
- **PBR Textures**: Optional normal, metallic, roughness maps

**Asset Class Presets** (recommended polycounts for web MMO):
| Asset Class | Polycount Range | Default |
|-------------|-----------------|---------|
| Small Props | 500 - 2,000 | 1,000 |
| Medium Props | 2,000 - 5,000 | 3,000 |
| Large Props | 5,000 - 10,000 | 7,500 |
| NPC Characters | 2,000 - 10,000 | 5,000 |
| Small Buildings | 5,000 - 15,000 | 10,000 |
| Large Structures | 15,000 - 50,000 | 30,000 |

**Three.js Best Practices:**
- Keep individual meshes < 100,000 triangles
- Use LOD (Level of Detail) for distant objects
- Instance frequently repeated objects (trees, rocks, etc.)
- Bake details into normal/roughness/AO maps
- Export as GLB with triangulated meshes

## Project Structure

```
packages/hyperforge/
├── lib/
│   ├── ai/          # AI Gateway integration
│   ├── meshy/       # Meshy 3D generation
│   ├── cdn/         # CDN asset loading
│   └── db/          # Database schema & client
├── src/
│   ├── app/         # Next.js App Router
│   ├── components/ # React components
│   ├── hooks/       # React hooks
│   └── types/       # TypeScript types
└── public/          # Static assets
```

## Development

### Database

```bash
# Generate migrations
bun run db:generate

# Push schema changes
bun run db:push

# Open Drizzle Studio
bun run db:studio
```

### Building

```bash
# Production build
bun run build

# Start production server
bun run start
```

## Next Steps

- [ ] Complete Meshy pipeline integration
- [ ] Add Zustand state management
- [ ] Implement asset CRUD operations
- [ ] Add asset filtering and search
- [ ] Complete 3D model viewer with GLTF loading
- [ ] Add generation history tracking
- [ ] Implement asset publishing workflow

## References

### AI & Generation
- [Vercel AI Gateway Docs](https://vercel.com/docs/ai-gateway)
- [AI SDK Docs](https://sdk.vercel.ai/docs)

### Meshy API Documentation
- [Meshy API Overview](https://www.meshy.ai/api) - High-level API overview
- [Image-to-3D API](https://docs.meshy.ai/en/api/image-to-3d) - Convert images to 3D models
- [Text-to-3D API](https://docs.meshy.ai/api/text-to-3d) - Generate 3D from text prompts
- [Quickstart Guide](https://docs.meshy.ai/en/api/quick-start) - API keys and authentication
- [API Changelog](https://docs.meshy.ai/en/api/changelog) - Latest features and updates
- [Multi-Image API (Fal.ai)](https://fal.ai/models/fal-ai/meshy/v5/multi-image-to-3d/api) - Multi-view reconstruction

### Performance Resources
- [Three.js Documentation](https://threejs.org/docs/)
- [glTF Optimization](https://github.com/KhronosGroup/glTF-Tutorials)

