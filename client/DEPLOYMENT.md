# Deployment Guide for Mind Unwind

This guide covers how to deploy the **Mind Unwind** application to production.

## Prerequisites

- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **Gemini API Key**: You need a valid API key from Google AI Studio.

## Environment Variables

Ensure your production environment has the following variables set. reference `.env.example` for a template.

| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_GEMINI_API_KEY` | **Required**. Your Google Gemini API Key. | `AIzaSy...` |
| `VITE_API_URL` | Optional. Backend API URL if you have a separate backend. | `https://api.myapp.com` |
| `VITE_OLLAMA_URL` | Optional. URL for Ollama fallback (local/custom hosting). | `http://localhost:11434` |

---

## Deployment Options

### 1. Static Hosting (Vercel, Netlify, Cloudflare Pages)

Since **Mind Unwind** is a Client-Side Rendered (CSR) React application (Vite), it is best deployed to a static host.

#### Vercel (Recommended)
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project root.
3. Follow the prompts.
4. Go to the Vercel Dashboard -> Settings -> Environment Variables and add `VITE_GEMINI_API_KEY`.

#### Netlify
1. Drag and drop the `dist` folder to Netlify Drop (for manual deploy) OR connect your Git repository.
2. In Site Settings -> Build & Deploy -> Environment, add `VITE_GEMINI_API_KEY`.
3. Build Command: `npm run build`
4. Publish Directory: `dist`

### 2. Docker Container

You can containerize the application using Nginx to serve the static files.

**Build the image:**
```bash
docker build -t mind-unwind-client .
```

**Run the container:**
```bash
docker run -p 80:80 -e VITE_GEMINI_API_KEY=your_key mind-unwind-client
```

*(Note: Since Vite variables are embedded at build time, for Docker you usually need to pass build args or use a runtime config injection strategy if you want to change keys without rebuilding).*

### 3. Traditional Web Server (Nginx/Apache)

1. Run `npm run build` locally.
2. Upload the contents of the `dist` folder to your web server's public root (e.g., `/var/www/html`).
3. Configure your server to redirect all 404s to `index.html` (for Client-Side Routing).

**Nginx Example Config:**
```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Post-Deployment Verification

1. Open the production URL.
2. Check the browser console for any errors.
3. Try adding a task to verify the AI integration (Gemini) is working.
    - *Note: If you see checking for Ollama warnings in console, that is expected behavior for the fallback mechanism.*
