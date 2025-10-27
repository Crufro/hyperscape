# Deployment Troubleshooting Guide

## Current Setup

- **Frontend**: Vercel at `https://forgery-smoky.vercel.app`
- **Backend API**: Railway at `https://dairy-queen-production.up.railway.app`
- **Database**: Railway PostgreSQL (private network)

## Issues Resolved ✅

### 1. React Duplicate Instances (Black Screen)
**Symptom**: `Cannot read properties of undefined (reading 'useLayoutEffect')`

**Cause**: Manual chunk splitting separated React from @react-three packages

**Fix**: Removed manual chunking in [vite.config.ts](apps/asset-forge/vite.config.ts)
```typescript
manualChunks: undefined // Let Vite handle it automatically
```

### 2. Multiple Three.js Instances Warning
**Cause**: Hardcoded path aliases pointing to wrong node_modules locations

**Fix**: Removed explicit path aliases, kept dedupe config
```typescript
resolve: {
  dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'three'],
  alias: {
    '@': path.resolve(__dirname, 'src'),
    'buffer': 'buffer/'
  }
}
```

### 3. Railway Logs Permission Errors
**Symptom**: `EACCES: permission denied, mkdir '/logs'`

**Cause**: `/logs` directory is read-only on Railway

**Fix**: Use `/tmp` for ephemeral logs on Railway
```javascript
const LOGS_DIR = process.env.RAILWAY_ENVIRONMENT ? '/tmp/logs' : path.join(ROOT_DIR, 'logs')
```

### 4. @xyflow/react Resolution on Vercel
**Symptom**: `Could not load @xyflow/react`

**Cause**: Bun workspace hoisting + Vercel monorepo build isolation

**Fix**: Updated install command in [vercel.json](apps/asset-forge/vercel.json)
```json
"installCommand": "cd ../.. && bun install && cd apps/asset-forge && bun install"
```

## Issues Pending ⚠️

### 1. Railway API 502 Errors
**Symptom**: Railway edge returns 502, but app logs show it's running

**Status**: App is running internally, Railway load balancer can't reach it

**Evidence**:
- Logs show: `API Server running on http://0.0.0.0:6333`
- Logs show: `GET /api/health - 200`
- External requests: `HTTP/2 502`

**Potential Causes**:
- Railway health check not passing (but we configured `healthcheckPath`)
- Railway edge routing cache issue
- Railway public domain not properly assigned

**Required Action**:
- Check Railway Dashboard → Dairy Queen service → Settings → Networking
- Verify "Generate Domain" is enabled
- Try "Restart" deployment from dashboard
- Wait 5-10 minutes for edge cache to clear

### 2. CORS Headers (Blocked by #1)
**Status**: Configuration is correct, can't test until API responds

**Configuration**:
```javascript
// apps/api/server/api.mjs:53-57
const origin = process.env.NODE_ENV === 'production'
  ? process.env.FRONTEND_URL || '*'
  : req.headers.origin || 'http://localhost:3000'

res.header('Access-Control-Allow-Origin', origin)
```

**Environment Variable Set**:
```bash
FRONTEND_URL=https://forgery-smoky.vercel.app
```

**How to Test Once API Works**:
```bash
curl -i https://dairy-queen-production.up.railway.app/api/health \
  -H "Origin: https://forgery-smoky.vercel.app"

# Should see:
# Access-Control-Allow-Origin: https://forgery-smoky.vercel.app
```

### 3. Privy Authentication Configuration
**Symptom**:
```
Refused to frame 'https://auth.privy.io/' because an ancestor violates CSP
auth.privy.io/api/v1/siwe/init:1 Failed to load resource: 403
```

**Cause**: Privy App doesn't have Vercel domain in allowed list

**Required Action**:
1. Go to Privy Dashboard: https://dashboard.privy.io
2. Select your app (ID: `cmh5ag8yp004hl80drzj9i0g8`)
3. Settings → Allowed Domains
4. Add: `https://forgery-smoky.vercel.app`
5. Add: `https://www.forgery-smoky.vercel.app` (optional, for www variant)
6. Save changes

**Note**: This MUST be done by you in the Privy dashboard (requires login)

## Testing Checklist

Once Railway API is accessible:

### Backend API Tests
```bash
# Test health endpoint
curl https://dairy-queen-production.up.railway.app/api/health

# Test CORS
curl -i https://dairy-queen-production.up.railway.app/api/manifests \
  -H "Origin: https://forgery-smoky.vercel.app"

# Should return:
# - Status: 200
# - Header: Access-Control-Allow-Origin: https://forgery-smoky.vercel.app
```

### Frontend Tests
1. Visit `https://forgery-smoky.vercel.app`
2. Open DevTools → Console (should see no CORS errors)
3. Open DevTools → Network tab
4. Try to login with Privy
5. Check API calls are reaching Railway (no 502 errors)
6. Verify manifests load

## Environment Variables Reference

### Vercel (Frontend)
```bash
VITE_API_URL=https://dairy-queen-production.up.railway.app
VITE_PUBLIC_PRIVY_APP_ID=cmh5ag8yp004hl80drzj9i0g8
```

### Railway API (Backend)
```bash
# Authentication
PRIVY_APP_ID=cmh5ag8yp004hl80drzj9i0g8
PRIVY_APP_SECRET=<your-secret>
JWT_SECRET=hyper

# CORS Configuration
FRONTEND_URL=https://forgery-smoky.vercel.app
NODE_ENV=production

# Database (auto-injected by Railway)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# API Keys (optional - users can provide their own)
OPENAI_API_KEY=<your-key>
MESHY_API_KEY=<your-key>
ELEVENLABS_API_KEY=<your-key>
AI_GATEWAY_API_KEY=<your-key>
```

## Best Practices (from DeepWiki Research)

### Environment Variables
- **Client-side**: Prefix with `VITE_` for Vite (like `NEXT_PUBLIC_` for Next.js)
- **Server-side**: Never expose sensitive keys to client
- **Build Time**: Client env vars are inlined at build time

### CORS Configuration
- **Default**: API routes are same-origin only
- **Cross-origin**: Must explicitly set CORS headers on backend
- **Preflight**: Handle OPTIONS requests with proper headers

### Monorepo Build Optimization
- **Vite**: Uses `resolve.dedupe` to prevent duplicate modules
- **Install Strategy**: Install both root and local deps for proper resolution
- **Aliases**: Avoid hardcoded paths, let package manager resolve

## Files Modified

### Frontend (Vercel)
- [apps/asset-forge/vercel.json](apps/asset-forge/vercel.json) - Deployment config
- [apps/asset-forge/.vercelignore](apps/asset-forge/.vercelignore) - Optimize upload
- [apps/asset-forge/vite.config.ts](apps/asset-forge/vite.config.ts) - Fixed chunking + dedupe
- [apps/asset-forge/VERCEL_QUICK_START.md](apps/asset-forge/VERCEL_QUICK_START.md) - Quick reference

### Backend (Railway)
- [apps/api/railway.json](apps/api/railway.json) - Health check config
- [apps/api/server/middleware/requestLogger.mjs](apps/api/server/middleware/requestLogger.mjs) - Logs path fix

## Next Steps

1. **Immediate**: Restart Railway API service from dashboard
2. **After API works**: Test CORS headers
3. **Configure Privy**: Add Vercel domain to allowed list
4. **Test**: Full authentication flow
5. **Monitor**: Check for any runtime errors

## Related Documentation
- [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) - Complete Vercel deployment guide
- [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md) - Railway setup documentation
- [apps/asset-forge/VERCEL_QUICK_START.md](apps/asset-forge/VERCEL_QUICK_START.md) - Quick reference

---

**Last Updated**: 2025-10-26
**Status**: Railway API routing issue - requires platform intervention
