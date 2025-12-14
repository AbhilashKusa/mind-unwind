# Backend Deployment Guide

Deploy the Mind Unwind backend to Render.

## Prerequisites

- [Render account](https://render.com)
- GitHub repository connected to Render

## Deployment Steps

### 1. Create PostgreSQL Database

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** → **PostgreSQL**
3. Configure:
   - **Name**: `mind-unwind-db`
   - **Region**: Choose closest to your users
   - **Plan**: Free (or paid for production)
4. Click **Create Database**
5. Copy the **Internal Database URL**

### 2. Create Web Service

1. Click **New** → **Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `mind-unwind-api`
   - **Root Directory**: `server`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. Add environment variables (see below)
5. Click **Create Web Service**

## Environment Variables

Set these in Render → Web Service → Environment:

| Variable | Value | Required |
|----------|-------|----------|
| `DATABASE_URL` | PostgreSQL Internal URL from step 1 | ✅ Yes |
| `JWT_SECRET` | Random 32+ character string | ✅ Yes |
| `NODE_ENV` | `production` | ✅ Yes |
| `CLIENT_URL` | `https://your-frontend.vercel.app` | ✅ Yes |

### Generate JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/auth/register` | POST | User registration |
| `/api/auth/login` | POST | User login |
| `/api/tasks` | GET | Get all tasks |
| `/api/tasks` | POST | Create task |
| `/api/tasks/:id` | PUT | Update task |
| `/api/tasks/:id` | DELETE | Delete task |

## Troubleshooting

### Service won't start
- Check logs in Render Dashboard
- Verify all environment variables are set
- Ensure `morgan` is in `dependencies` (not `devDependencies`)

### Database connection fails
- Use the **Internal Database URL** (not External)
- Verify `DATABASE_URL` is set correctly

### Cold starts (free tier)
- First request after 15 minutes of inactivity may take 30-60 seconds
- This is normal for Render's free tier
