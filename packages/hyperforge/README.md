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

- **Text-to-3D**: Generate 3D models from text prompts
- **Image-to-3D**: Convert images to 3D models
- **Task Polling**: Automatic status polling until completion

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

- [Vercel AI Gateway Docs](https://vercel.com/docs/ai-gateway)
- [AI SDK Docs](https://sdk.vercel.ai/docs)
- [Meshy API Docs](https://docs.meshy.ai)

