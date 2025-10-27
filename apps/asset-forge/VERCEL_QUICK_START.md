# Vercel Deployment Quick Start

## ⚡ Quick Deployment Guide

### 1️⃣ Vercel Dashboard Setup

**Project Settings:**
- Root Directory: `apps/asset-forge`
- Framework: Vite (auto-detected)
- Node Version: 20.x

**Environment Variables** (CRITICAL - Must be set):

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add these:
```bash
VITE_API_URL=https://dairy-queen-production.up.railway.app
VITE_PUBLIC_PRIVY_APP_ID=cmh5ag8yp004hl80drzj9i0g8
```

**Important**:
- Apply to: Production, Preview, Development (select all)
- After adding, click "Redeploy" to apply changes

### 2️⃣ Push to GitHub

```bash
git add .
git commit -m "feat: configure for Vercel deployment"
git push origin <your-branch>
```

### 3️⃣ Deploy

Vercel will auto-deploy when you push to your branch.

### 4️⃣ Update Railway CORS

After Vercel deploys, get your URL and update Railway:

**Railway Dashboard:**
1. Go to `dairy-queen` service
2. Variables → Add/Update:
   ```
   FRONTEND_URL=https://your-app.vercel.app
   ```
3. Redeploy

**Or via CLI:**
```bash
railway variables --set FRONTEND_URL=https://your-app.vercel.app
```

## ✅ Verification

Visit your Vercel URL and check:
- [ ] Site loads
- [ ] Login works
- [ ] API calls succeed (check Network tab)
- [ ] No CORS errors
- [ ] 3D models load

## 🔧 Files Modified

- ✅ `vercel.json` - Vercel configuration
- ✅ `vite.config.ts` - Fixed @xyflow/react resolution
- ✅ `.vercelignore` - Optimized upload

## 📚 Full Documentation

See [VERCEL_DEPLOYMENT.md](../../VERCEL_DEPLOYMENT.md) for complete guide.

## 🆘 Quick Troubleshooting

### Build Fails
- Check Vercel build logs
- Verify environment variables are set
- Ensure Node version is 20.x

### CORS Errors
- Update `FRONTEND_URL` on Railway
- Redeploy Railway `dairy-queen` service

### Login Issues
- Verify `VITE_PUBLIC_PRIVY_APP_ID` matches backend
- Check browser console for errors

---

**Railway API URL:** https://dairy-queen-production.up.railway.app
**Privy App ID:** cmh5ag8yp004hl80drzj9i0g8
