# AI Model Configuration Guide

## Overview

The Asset Forge platform now includes a comprehensive AI Model Configuration system that allows administrators to control which AI models are used for different tasks across the platform. This provides flexibility, cost optimization, and the ability to adapt to new models as they become available.

## 🎯 Features

### 1. **Task-Based Configuration**
Configure different models for different tasks:
- Prompt Enhancement (GPT-4 optimization)
- Image Generation (DALL-E, GPT Image)
- Text Generation (Claude, GPT)
- Quest Generation
- NPC Dialogue
- Lore Writing

### 2. **Model Settings**
For each task, configure:
- **Model**: Select from available AI models
- **Temperature**: Control randomness (0-2)
- **Max Tokens**: Set output length limits

### 3. **Real-Time Pricing**
When using AI Gateway, automatically fetches and displays:
- Input token costs
- Output token costs
- Per-model pricing comparison

### 4. **Database-Backed**
All configurations are stored in PostgreSQL and cached for performance.

## 🚀 Quick Start

### 1. **Run Migration**

Apply the database migration to create the necessary tables:

```bash
docker exec -i asset-forge-db psql -U asset_forge -d asset_forge < apps/api/database/migrations/002-add-model-config.sql
```

Or if PostgreSQL is running locally:

```bash
psql -U asset_forge -d asset_forge < apps/api/database/migrations/002-add-model-config.sql
```

### 2. **Access Admin Dashboard**

1. Log in as an admin user
2. Navigate to `/admin`
3. Scroll to "AI Model Configuration" section

### 3. **Configure Models**

For each task:
1. Click "Edit"
2. Select a model from the dropdown (if AI Gateway is enabled)
3. Adjust temperature (0 = focused, 2 = creative)
4. Set max tokens if needed
5. Click "Save"

## 📊 API Endpoints

### Get All Configurations

```bash
GET /api/admin/models
```

**Response:**
```json
{
  "count": 6,
  "models": [
    {
      "taskType": "prompt-enhancement",
      "modelId": "openai/gpt-4",
      "provider": "openai",
      "temperature": 0.7,
      "maxTokens": 200,
      "pricing": {
        "input": 0.000001,
        "output": 0.000003
      }
    }
  ]
}
```

### Update Configuration

```bash
PUT /api/admin/models/:taskType
Content-Type: application/json

{
  "modelId": "anthropic/claude-sonnet-4",
  "temperature": 0.8,
  "maxTokens": 1000
}
```

### Get Available Models

```bash
GET /api/admin/models/available
```

Returns all models available through AI Gateway with pricing.

### Get System Settings

```bash
GET /api/admin/settings/all
```

### Update System Setting

```bash
PUT /api/admin/settings/:key
Content-Type: application/json

{
  "value": true
}
```

## 🔧 Configuration Options

### Task Types

| Task Type | Default Model | Description |
|-----------|--------------|-------------|
| `prompt-enhancement` | `openai/gpt-4` | Optimizes prompts for 3D generation |
| `image-generation` | `openai/gpt-image-1` | Generates concept art images |
| `text-generation` | `anthropic/claude-sonnet-4` | General text generation |
| `quest-generation` | `anthropic/claude-sonnet-4` | Quest content creation |
| `npc-dialogue` | `openai/gpt-4o` | NPC dialogue generation |
| `lore-writing` | `anthropic/claude-opus-4` | High-quality lore writing |

### Model Settings

#### Temperature
- **Range**: 0.0 - 2.0
- **Default**: 0.7
- **Low (0.0-0.5)**: Focused, deterministic, consistent
- **Medium (0.5-1.0)**: Balanced creativity and coherence
- **High (1.0-2.0)**: Creative, varied, exploratory

#### Max Tokens
- **Prompt Enhancement**: 200 tokens
- **Image Generation**: N/A (fixed by model)
- **Text Generation**: 1000 tokens
- **Quest Generation**: 2000 tokens
- **NPC Dialogue**: 1000 tokens
- **Lore Writing**: 2000 tokens

## 💡 How It Works

### 1. **Configuration Storage**

```sql
-- Model configurations table
CREATE TABLE model_configurations (
  task_type VARCHAR(100) PRIMARY KEY,
  model_id VARCHAR(255),
  provider VARCHAR(100),
  temperature FLOAT,
  max_tokens INTEGER,
  pricing_input DECIMAL,
  pricing_output DECIMAL,
  ...
);
```

### 2. **Runtime Model Selection**

```javascript
// AISDKService automatically uses configured models
const model = await aiService.getConfiguredModel(
  'prompt-enhancement',  // Task type
  'gpt-4',              // Fallback if not configured
  'openai'              // Default provider
)

// Generate with configured settings
const { text } = await generateText({
  model: model,
  temperature: settings.temperature,
  maxTokens: settings.maxTokens,
  ...
})
```

### 3. **Caching**

Model configurations are cached for 5 minutes to reduce database queries:

```javascript
// Cache is automatically managed
aiService.clearModelCache() // Force refresh if needed
```

## 📈 Cost Optimization

### View Pricing

All available models display their pricing when AI Gateway is enabled:

```
GPT-4: $0.03/1M tokens output
Claude Sonnet 4: $0.15/1M tokens output
GPT-4o Mini: $0.006/1M tokens output
```

### Compare Models

Before changing models, compare costs:

1. View pricing in the model dropdown
2. Estimate usage (tokens per generation)
3. Calculate monthly costs
4. Select optimal model for your budget

### Example Cost Analysis

```
Task: Prompt Enhancement
Average Input: 500 tokens
Average Output: 150 tokens
Generations per day: 100

GPT-4:
- Input: (500 * 100 * 30) / 1M * $0.001 = $0.15/month
- Output: (150 * 100 * 30) / 1M * $0.003 = $0.14/month
- Total: $0.29/month

GPT-4o Mini:
- Input: (500 * 100 * 30) / 1M * $0.00015 = $0.02/month
- Output: (150 * 100 * 30) / 1M * $0.0006 = $0.03/month
- Total: $0.05/month

Savings: $0.24/month (83% reduction)
```

## 🔒 Security

### Admin-Only Access

Model configuration is protected by the `requireAdmin` middleware:

```javascript
router.use('/models', requireAdmin, adminModelsRouter)
```

Only users with `role = 'admin'` can:
- View model configurations
- Update model settings
- Access available models list

### Audit Trail

All changes are tracked:
```sql
updated_by UUID REFERENCES users(id)
updated_at TIMESTAMP
```

## 🎛️ Advanced Usage

### Programmatic Configuration

Update models via API:

```bash
# Update quest generation to use Claude Opus
curl -X PUT http://localhost:3004/api/admin/models/quest-generation \
  -H "Content-Type: application/json" \
  -H "x-user-id: admin-user-id" \
  -d '{
    "modelId": "anthropic/claude-opus-4",
    "temperature": 0.8,
    "maxTokens": 2500
  }'
```

### Bulk Updates

Update multiple tasks:

```bash
#!/bin/bash

TASKS=("prompt-enhancement" "text-generation" "npc-dialogue")

for task in "${TASKS[@]}"; do
  curl -X PUT "http://localhost:3004/api/admin/models/$task" \
    -H "Content-Type: application/json" \
    -d '{"modelId": "openai/gpt-4o", "temperature": 0.7}'
done
```

### Reset to Defaults

Delete configuration to use defaults:

```bash
curl -X DELETE http://localhost:3004/api/admin/models/prompt-enhancement
```

## 🐛 Troubleshooting

### Models Not Showing

**Problem**: Available models list is empty

**Solution**:
1. Ensure `AI_GATEWAY_API_KEY` is set
2. Check gateway status: `curl http://localhost:3004/api/ai-gateway/status`
3. Verify API key is valid

### Configuration Not Applied

**Problem**: Changes don't take effect

**Solution**:
1. Clear cache: Model configs are cached for 5 minutes
2. Restart API server: `docker-compose restart api`
3. Check logs: `docker-compose logs -f api`

### Pricing Not Displayed

**Problem**: Pricing shows as `null`

**Solution**:
1. Enable AI Gateway (pricing only available via gateway)
2. Check that model exists in gateway catalog
3. Try refreshing configurations

### Database Errors

**Problem**: Migration fails or tables don't exist

**Solution**:
```bash
# Check if tables exist
docker exec asset-forge-db psql -U asset_forge -d asset_forge -c "\dt model_configurations"

# Re-run migration
docker exec -i asset-forge-db psql -U asset_forge -d asset_forge < apps/api/database/migrations/002-add-model-config.sql
```

## 📚 Database Schema

### Tables Created

```sql
-- Model configurations
model_configurations (
  id UUID PRIMARY KEY,
  task_type VARCHAR(100) UNIQUE,
  model_id VARCHAR(255),
  provider VARCHAR(100),
  temperature FLOAT,
  max_tokens INTEGER,
  pricing_input DECIMAL,
  pricing_output DECIMAL,
  is_active BOOLEAN,
  updated_by UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- System settings
system_settings (
  id UUID PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE,
  setting_value JSONB,
  description TEXT,
  updated_by UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Default Configurations

The migration automatically creates default configurations for all task types:
- Prompt Enhancement → GPT-4
- Image Generation → GPT Image 1
- Text Generation → Claude Sonnet 4
- Quest Generation → Claude Sonnet 4
- NPC Dialogue → GPT-4o
- Lore Writing → Claude Opus 4

## 🎯 Best Practices

### 1. **Test Before Production**

Test new models on development environment first:

```bash
# Dev environment
AI_GATEWAY_API_KEY=dev_key

# Test with cheaper models
Model: openai/gpt-4o-mini
Temperature: 0.7
```

### 2. **Monitor Costs**

Track spending using AI Gateway analytics:

```bash
curl http://localhost:3004/api/ai-gateway/credits
```

### 3. **Optimize Temperature**

- **Prompt Enhancement**: 0.7 (balanced)
- **Image Generation**: N/A (model-specific)
- **Creative Writing**: 0.8-1.0 (more varied)
- **Technical Content**: 0.3-0.5 (focused)

### 4. **Set Appropriate Max Tokens**

Avoid waste by setting realistic limits:

```
Short responses: 200-500 tokens
Medium content: 500-1500 tokens
Long-form: 1500-3000 tokens
```

### 5. **Use Task-Specific Models**

Match models to tasks:

```
Coding → GPT-4o (fast, good at code)
Creative → Claude Opus (high quality)
General → Sonnet (balanced)
Budget → Mini models (cost-effective)
```

## 🔄 Future Enhancements

Planned improvements:

- [ ] A/B testing between models
- [ ] Cost analytics dashboard
- [ ] Model performance metrics
- [ ] Automatic model selection based on budget
- [ ] Scheduled model changes
- [ ] Model usage quotas per user/project

## 📖 Related Documentation

- [AI_GATEWAY_GUIDE.md](AI_GATEWAY_GUIDE.md) - Vercel AI Gateway integration
- [AI_SDK_MIGRATION.md](AI_SDK_MIGRATION.md) - AI SDK v5 migration guide
- [DATABASE_SETUP.md](DATABASE_SETUP.md) - Database configuration

---

**Model Configuration System** - Version 1.0

Provides flexible, cost-effective AI model management for the Asset Forge platform.
