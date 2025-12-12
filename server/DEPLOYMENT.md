# Backend Deployment Guide (Render)

We recommend using **Render** for the backend because it provides both the Node.js web service and the PostgreSQL database in one platform, with a generous free tier.

## 1. Prepare your Code

Ensure your code is pushed to a Git repository (GitHub/GitLab/Bitbucket).

## 2. Create the Database (PostgreSQL)

1.  Log in to [Render Dashboard](https://dashboard.render.com/).
2.  Click **New +** -> **PostgreSQL**.
3.  Name: `mind-unwind-db` (or similar).
4.  Region: Choose one close to you (e.g., Ohio, Frankfurt).
5.  Instance Type: **Free** (for hobby/dev) or Starter.
6.  Click **Create Database**.
7.  **IMPORTANT:** Copy the **Internal Database URL** and keep it safe. You will need the host, user, password, etc., for the next step.
    *   Find these details in the "Info" tab or "Connect" dropdown.

## 3. Deploy the Web Service (Node.js)

1.  Click **New +** -> **Web Service**.
2.  Connect your Git repository.
3.  Name: `mind-unwind-api`.
4.  Root Directory: `server`.
5.  Runtime: **Node**.
6.  Build Command: `npm install`.
7.  Start Command: `node server.js` (or `npm start`).
8.  **Environment Variables**: Click "Advanced" or "Environment" and add:

    | Key | Value |
    | :--- | :--- |
    | `DB_HOST` | Your DB Host (from Step 2) |
    | `DB_NAME` | Your DB Name (from Step 2) |
    | `DB_USER` | Your DB User (from Step 2) |
    | `DB_PASSWORD` | Your DB Password (from Step 2) |
    | `DB_PORT` | `5432` |
    | `JWT_SECRET` | A long random string (e.g., `s3cr3t_k3y_123`) |
    | `CLIENT_URL` | Your Vercel Frontend URL (e.g., `https://mind-unwind...vercel.app`) - *Important for CORS* |
    | `NODE_ENV` | `production` |

9.  Click **Create Web Service**.

## 4. Connect Frontend to Backend

Once the backend is live (Render will give you a URL like `https://mind-unwind-api.onrender.com`):

1.  Go back to your **Vercel Project Settings**.
2.  Add/Update the Environment Variable:
    *   `VITE_API_URL`: `https://mind-unwind-api.onrender.com/api` (Make sure to include `/api` if your endpoints expect it, or just the base URL depending on your frontend code).
3.  Redeploy the Frontend (`vercel --prod`).

Your full stack application is now live!
