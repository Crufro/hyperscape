# HyperForge API Routes Documentation

Complete API reference for the HyperForge Asset Generation Platform.

**Base URL**: `http://localhost:3004/api`

---

## 🔐 Authentication

All routes use Privy authentication with `x-user-id` header containing the user's Privy DID.

---

## 📁 Projects

**Base Path**: `/api/projects`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all projects for user |
| GET | `/:id` | Get single project |
| POST | `/` | Create new project |
| PATCH | `/:id` | Update project |
| DELETE | `/:id` | Delete project |

---

## 👥 Teams

**Base Path**: `/api/teams`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all teams for user |
| GET | `/:id` | Get single team |
| POST | `/` | Create new team |
| PATCH | `/:id` | Update team |
| DELETE | `/:id` | Delete team |
| POST | `/:id/invite` | Invite member to team |

---

## 👤 Users

**Base Path**: `/api/users`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/me` | Get current user profile |
| PUT | `/me` | Update user profile |
| PUT | `/me/settings` | Update user settings |
| PATCH | `/me/last-login` | Update last login timestamp |

---

## 🔑 API Keys

**Base Path**: `/api/api-keys`

### User API Keys
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/user` | Get all user's API keys |
| POST | `/user` | Create new user API key |

**POST Body Example**:
```json
{
  "name": "Production Key",
  "permissions": ["read:assets", "write:assets"],
  "expiresInDays": 365
}
```

### Team API Keys
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/team/:teamId` | Get all team's API keys |
| POST | `/team/:teamId` | Create new team API key (admin/owner only) |

### Revocation
| Method | Endpoint | Description |
|--------|----------|-------------|
| DELETE | `/:keyId` | Revoke API key |

---

## 🎨 Assets (Database-Driven)

**Base Path**: `/api/v2/assets`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all assets for user |
| GET | `/:id` | Get single asset |
| POST | `/` | Create new asset |
| PATCH | `/:id` | Update asset |
| DELETE | `/:id` | Delete asset |

---

## 📝 Prompts

**Base Path**: `/api`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/prompts/:type` | Get prompt file by type |
| GET | `/prompts` | Get list of all prompts |
| PUT | `/prompts/:type` | Update prompt file |

**Available Prompt Types**:
- `game-style-prompts`
- `asset-type-prompts`
- `material-prompts`
- `generation-prompts`
- `gpt4-enhancement-prompts`
- `weapon-detection-prompts`
- `quest-prompts`
- `npc-prompts`
- `dialogue-prompts`
- `lore-prompts`

---

## 👑 Admin Routes

**Base Path**: `/api/admin`

### User Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | Get all users (paginated) |
| PUT | `/users/:id/role` | Update user role |

### Statistics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stats` | Get platform statistics |

### Whitelist (Placeholder)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/whitelist` | Get whitelist |
| POST | `/whitelist` | Add to whitelist |
| DELETE | `/whitelist/:address` | Remove from whitelist |

---

## 🤖 Admin - AI Model Configuration

**Base Path**: `/api/admin/models`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all model configurations |
| GET | `/available` | Get available models from AI Gateway |
| GET | `/:taskType` | Get model config for specific task |
| PUT | `/:taskType` | Update model configuration |
| DELETE | `/:taskType` | Delete model configuration |

### Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/settings/all` | Get all system settings |
| PUT | `/settings/:key` | Update system setting |

---

## 🌐 AI Gateway

**Base Path**: `/api/ai-gateway`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/status` | Check AI Gateway status |
| GET | `/models` | List available models |
| GET | `/models/:provider` | Get models for specific provider |
| POST | `/test` | Test AI Gateway connection |
| POST | `/chat` | Send chat completion request |
| POST | `/generate` | Generate content with specific model |

---

## 🗄️ Database Tables

The following PostgreSQL tables are available:

### Core Tables
- `users` - User accounts with Privy integration
- `teams` - Team management
- `team_members` - Team membership with roles
- `team_invitations` - Team invite system
- `projects` - Project management
- `api_keys` - User & team API keys

### Asset Management
- `assets` - 3D asset storage
- `rigging_metadata` - Rigging data
- `fitting_sessions` - Armor/equipment fitting
- `file_uploads` - File tracking

### Game Content
- `quests` - Quest management
- `npcs` - NPC data
- `npc_scripts` - Dialogue & behavior scripts
- `lore_entries` - World-building content

### Voice & Audio
- `voice_generations` - AI voice generation
- `voice_manifests` - Voice assignments

### System
- `game_manifests` - Game data export
- `quest_tracking_sessions` - Playtest tracking
- `ai_playtesters` - AI playtester configs
- `entity_relationships` - Cross-entity relations
- `activity_log` - Audit trail
- `notifications` - User notifications

---

## 🔒 Security Features

### API Key System
- Secure generation with `crypto.randomBytes`
- SHA-256 hashing (keys never stored in plaintext)
- One-time display on creation
- Role-based access control for teams
- Soft deletion with `revoked_at` timestamp

### Authentication
- Privy-based user authentication
- JWT token management
- Role-based permissions (admin/member)
- Team-based access control

---

## 📊 Response Formats

### Success Response
```json
{
  "data": { ... },
  "success": true
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": "Additional context"
}
```

### Pagination Response
```json
{
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 95,
    "limit": 10,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

## 🚀 Getting Started

1. **Start the API server**:
   ```bash
   cd apps/api
   bun run dev
   ```

2. **API will be available at**: `http://localhost:3004`

3. **Health check**: `http://localhost:3004/api/health`

4. **Database**: PostgreSQL running on `localhost:5433`

---

## 📝 Notes

- All database tables have automatic `created_at` and `updated_at` timestamps
- Soft deletes use `status` fields or `revoked_at` timestamps
- JSONB columns are used for flexible metadata storage
- Full-text search capabilities on relevant fields
- Comprehensive foreign key constraints with CASCADE deletes
