# Frontend Deployment Guide

Deploy the Mind Unwind frontend to Vercel.

## Prerequisites

- [Vercel account](https://vercel.com)
- [Vercel CLI](https://vercel.com/cli) (optional)
- Backend already deployed (see `../server/DEPLOYMENT.md`)

## Quick Deploy

### Option 1: Vercel CLI

```bash
cd client
npm install -g vercel
vercel login
vercel --prod
```

### Option 2: Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Set root directory to `client`
4. Add environment variables (see below)
5. Deploy

## Environment Variables

Set these in Vercel Dashboard → Project → Settings → Environment Variables:

| Variable | Value | Required |
|----------|-------|----------|
| `VITE_API_URL` | `https://your-backend.onrender.com/api` | ✅ Yes |
| `VITE_GEMINI_API_KEY` | Your Google Gemini API key | ✅ Yes |
| `VITE_OLLAMA_URL` | Ollama URL (optional fallback) | ❌ No |

## Build Settings

Vercel auto-detects Vite, but if needed:

| Setting | Value |
|---------|-------|
| Framework | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

## Custom Domain

1. Go to Project → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

## Troubleshooting

### API calls return 404
- Ensure `VITE_API_URL` is set correctly
- Redeploy after adding environment variables

### Manifest 401 error
- This is normal for preview deployments (password protected)
- Use the production URL instead

### Build fails
- Check that all dependencies are in `dependencies` (not `devDependencies`)
- Verify TypeScript has no errors: `npx tsc --noEmit`
