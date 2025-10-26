# Vercel AI Gateway Integration Guide

## Overview

The Vercel AI Gateway provides a unified interface to access AI models from multiple providers (OpenAI, Anthropic, Google, Meta, xAI, Mistral, DeepSeek, and more) through a single API. This eliminates the need to manage multiple API keys and provides built-in analytics, usage tracking, and cost optimization.

## 🎯 Benefits

### 1. **Unified Access**
- Single API for all AI providers
- No need to manage multiple API keys
- Automatic provider routing

### 2. **Cost Optimization**
- View pricing across all providers
- Track costs per user and feature
- Compare model costs before generation

### 3. **Analytics & Tracking**
- Track usage by user ID
- Categorize requests with tags
- View spend by feature or use case

### 4. **Automatic Features**
- OIDC authentication on Vercel deployments
- Automatic retry handling
- Rate limit management

## 🚀 Quick Start

### 1. **Enable AI Gateway**

Set your AI Gateway API key in `.env`:

```bash
# Vercel AI Gateway (optional - provides unified access to all models)
AI_GATEWAY_API_KEY=your_gateway_key_here
```

### 2. **Automatic Detection**

The system automatically detects and uses the AI Gateway when available:

```javascript
const aiService = new AISDKService()

// If AI_GATEWAY_API_KEY is set:
// ✅ Uses: gateway('openai/gpt-4')

// If only OPENAI_API_KEY is set:
// ✅ Uses: openai('gpt-4')
```

### 3. **Usage Tracking**

Track costs per user and feature:

```javascript
// Enhance prompt with user tracking
const result = await aiService.enhancePromptWithGPT4(
  'bronze sword',
  { type: 'weapon' },
  'user-123' // Track costs for this user
)

// Tags are automatically added: ['prompt-enhancement', 'weapon', 'gpt-4']
```

## 📡 API Endpoints

### Check Gateway Status

```bash
GET /api/ai-gateway/status
```

**Response:**
```json
{
  "enabled": true,
  "provider": "ai-gateway",
  "message": "Using Vercel AI Gateway for unified model access"
}
```

### List Available Models

```bash
GET /api/ai-gateway/models
```

**Response:**
```json
{
  "count": 45,
  "models": [
    {
      "id": "openai/gpt-5",
      "name": "GPT-5",
      "description": "Latest OpenAI model",
      "pricing": {
        "input": 0.000001,
        "output": 0.000003,
        "cachedInput": 0.0000005,
        "cacheCreation": 0.0000008
      }
    },
    {
      "id": "anthropic/claude-sonnet-4",
      "name": "Claude Sonnet 4",
      "pricing": {
        "input": 0.000003,
        "output": 0.000015
      }
    }
  ]
}
```

### Get Model Pricing

```bash
GET /api/ai-gateway/models/openai-gpt-4/pricing
```

**Response:**
```json
{
  "modelId": "openai/gpt-4",
  "pricing": {
    "input": 0.000001,
    "output": 0.000003,
    "cachedInput": 0.0000005,
    "cacheCreation": 0.0000008
  }
}
```

### Check Credit Balance

```bash
GET /api/ai-gateway/credits
```

**Response:**
```json
{
  "balance": 98.50,
  "totalUsed": 1.50,
  "unit": "USD"
}
```

### Estimate Generation Cost

```bash
POST /api/ai-gateway/estimate
Content-Type: application/json

{
  "model": "openai/gpt-4",
  "inputTokens": 1000,
  "outputTokens": 500
}
```

**Response:**
```json
{
  "model": "openai/gpt-4",
  "estimate": {
    "inputTokens": 1000,
    "outputTokens": 500,
    "costs": {
      "input": "0.001000",
      "output": "0.001500",
      "total": "0.002500"
    },
    "unit": "USD"
  },
  "pricing": {
    "input": 0.000001,
    "output": 0.000003
  }
}
```

### List Supported Providers

```bash
GET /api/ai-gateway/providers
```

**Response:**
```json
{
  "count": 12,
  "providers": [
    "alibaba",
    "amazon",
    "anthropic",
    "cohere",
    "deepseek",
    "google",
    "meta",
    "mistral",
    "openai",
    "perplexity",
    "xai"
  ]
}
```

## 🔧 Configuration

### Environment Variables

```bash
# Required for AI Gateway
AI_GATEWAY_API_KEY=your_key_here

# OR deploy on Vercel for automatic OIDC auth
VERCEL_ENV=production

# Optional: Direct provider keys (fallback)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### Authentication Methods

1. **API Key** (Development & Production)
   ```bash
   AI_GATEWAY_API_KEY=your_key_here
   ```

2. **OIDC** (Vercel Deployments)
   - Automatic when deployed on Vercel
   - No API key needed
   - Local development:
     ```bash
     vercel env pull
     vercel dev
     ```

## 💡 Usage Examples

### Basic Text Generation

```javascript
import { AISDKService } from './services/AISDKService.mjs'

const aiService = new AISDKService()

// Automatically uses gateway if available
const { text } = await generateText({
  model: aiService.getModel('gpt-4', 'openai'),
  prompt: 'Generate a quest description'
})
```

### Image Generation with Tracking

```javascript
const result = await aiService.generateImage(
  'bronze sword with runic engravings',
  'weapon',
  'low-poly',
  'user-abc-123' // Track usage for this user
)

// Tags automatically added: ['image-generation', 'weapon', 'low-poly', 'gpt-image-1']
```

### Claude Generation

```javascript
const text = await aiService.generateWithClaude(
  'Write lore about the ancient kingdom',
  'You are a fantasy lore writer',
  {
    temperature: 0.8,
    tags: 'lore-generation' // Custom tag
  },
  'user-xyz-789'
)
```

### Cost Estimation Before Generation

```javascript
// Get pricing for a model
const pricing = await aiService.getModelPricing('openai/gpt-4')

// Estimate cost
const estimatedInputTokens = 1000
const estimatedOutputTokens = 500

const cost = {
  input: (estimatedInputTokens / 1000000) * pricing.input,
  output: (estimatedOutputTokens / 1000000) * pricing.output
}
const total = cost.input + cost.output

console.log(`Estimated cost: $${total.toFixed(4)}`)
```

### Check Available Models

```javascript
const models = await aiService.getAvailableModels()

// Filter by provider
const openaiModels = models.filter(m => m.id.startsWith('openai/'))

// Find cheapest model
const cheapest = models
  .filter(m => m.pricing)
  .sort((a, b) => a.pricing.output - b.pricing.output)[0]

console.log(`Cheapest model: ${cheapest.id} - $${cheapest.pricing.output}/1M tokens`)
```

### Monitor Credit Usage

```javascript
// Before generation
const before = await aiService.getCredits()
console.log(`Starting balance: $${before.balance}`)

// Perform generation
await aiService.generateImage(...)

// After generation
const after = await aiService.getCredits()
const cost = before.balance - after.balance
console.log(`Cost: $${cost.toFixed(4)}`)
```

## 📊 Analytics & Tracking

### User-Based Tracking

Track costs per user for billing or analytics:

```javascript
// All requests for user-123 will be tracked
await aiService.enhancePromptWithGPT4(
  description,
  config,
  'user-123'
)

await aiService.generateImage(
  prompt,
  type,
  style,
  'user-123'
)

// View usage by user in AI Gateway dashboard
```

### Feature-Based Tracking

Categorize spend by feature:

```javascript
// Tags are automatically added based on usage:
// - 'prompt-enhancement' for GPT-4 enhancement
// - 'image-generation' for image creation
// - 'text-generation' for Claude
// - Plus: asset type, style, model name

// View usage by tag in AI Gateway dashboard
```

## 🎛️ Advanced Features

### Provider Selection

```javascript
// Automatically uses best available method
const model = aiService.getModel('gpt-4', 'openai')

// With gateway: gateway('openai/gpt-4')
// Without gateway: openai('gpt-4')
```

### Model Comparison

```javascript
const models = await aiService.getAvailableModels()

// Compare GPT-4 vs Claude Sonnet
const gpt4 = models.find(m => m.id === 'openai/gpt-4')
const claude = models.find(m => m.id === 'anthropic/claude-sonnet-4')

console.log('GPT-4 output cost:', gpt4.pricing.output)
console.log('Claude output cost:', claude.pricing.output)
```

### Cost Optimization

```javascript
// Get all models sorted by cost
const modelsByCost = models
  .filter(m => m.pricing)
  .sort((a, b) => a.pricing.output - b.pricing.output)

// Use cheapest model that meets requirements
const cheapModel = modelsByCost[0]
console.log(`Using ${cheapModel.id} at $${cheapModel.pricing.output}/1M tokens`)
```

## 🔒 Security

### API Key Management

```bash
# Development
AI_GATEWAY_API_KEY=dev_key_here

# Production (use environment variables)
AI_GATEWAY_API_KEY=${{ secrets.AI_GATEWAY_API_KEY }}
```

### Rate Limiting

The AI Gateway handles rate limiting automatically:

```javascript
try {
  await aiService.generateText(...)
} catch (error) {
  if (error.name === 'GatewayRateLimitError') {
    console.log('Rate limit exceeded, retry after delay')
  }
}
```

## 📈 Monitoring

### Real-Time Usage

```javascript
// Check current usage
const credits = await aiService.getCredits()
console.log(`Remaining: $${credits.balance}`)
console.log(`Used: $${credits.totalUsed}`)
```

### Per-Request Tracking

All AI requests include automatic tracking when using the gateway:

- **User ID**: Track costs per user
- **Tags**: Categorize by feature/asset type/model
- **Timestamps**: View usage over time

## 🎯 Best Practices

### 1. **Always Track Users**

```javascript
// ❌ Don't
await aiService.generateImage(description, type, style)

// ✅ Do
await aiService.generateImage(description, type, style, userId)
```

### 2. **Use Cost Estimation**

```javascript
// Check cost before expensive operations
const pricing = await aiService.getModelPricing('openai/gpt-4')
const estimatedCost = calculateCost(pricing, estimatedTokens)

if (estimatedCost > userBudget) {
  // Use cheaper model or notify user
}
```

### 3. **Monitor Credits**

```javascript
// Check balance periodically
const credits = await aiService.getCredits()

if (credits.balance < 10) {
  console.warn('Low balance! Add credits.')
}
```

### 4. **Tag Appropriately**

Tags help you understand where costs are coming from:

```javascript
// Automatic tags are added, but you can customize:
await aiService.generateWithClaude(
  prompt,
  system,
  { tags: 'quest-generation' }, // Custom tag
  userId
)
```

## 🆚 Gateway vs Direct Access

| Feature | AI Gateway | Direct Access |
|---------|-----------|---------------|
| **Providers** | All (OpenAI, Anthropic, Google, etc.) | One at a time |
| **API Keys** | Single gateway key | One per provider |
| **Analytics** | Built-in per-user/tag tracking | Manual implementation |
| **Pricing** | View across all providers | Manual lookup |
| **Cost Tracking** | Automatic | Manual implementation |
| **Rate Limiting** | Automatic handling | Provider-specific |
| **Authentication** | API Key or OIDC | API Key only |

## 🚨 Troubleshooting

### Gateway Not Enabled

```bash
# Check status
curl http://localhost:3004/api/ai-gateway/status

# If not enabled, set API key
echo "AI_GATEWAY_API_KEY=your_key" >> apps/api/.env
```

### Missing Models

```bash
# List available models
curl http://localhost:3004/api/ai-gateway/models
```

### Authentication Errors

```bash
# Verify API key is set
docker exec asset-forge-api env | grep AI_GATEWAY_API_KEY

# Or check locally
echo $AI_GATEWAY_API_KEY
```

### Cost Tracking Not Working

Ensure you're passing user IDs:

```javascript
// ❌ No tracking
await aiService.generateImage(desc, type, style)

// ✅ With tracking
await aiService.generateImage(desc, type, style, 'user-123')
```

## 📚 Resources

- [AI SDK Documentation](https://sdk.vercel.ai/docs)
- [AI Gateway Docs](https://vercel.com/docs/ai-gateway)
- [Pricing Comparison](https://sdk.vercel.ai/pricing)

## 🎉 Summary

The Vercel AI Gateway provides:

✅ **Unified Access** - Single API for all providers
✅ **Cost Tracking** - Per-user and per-feature analytics
✅ **Price Comparison** - View costs across providers
✅ **Automatic Auth** - OIDC on Vercel deployments
✅ **Built-in Analytics** - Track usage and spend
✅ **Rate Limiting** - Automatic handling

Enable it by setting `AI_GATEWAY_API_KEY` or deploying on Vercel!
