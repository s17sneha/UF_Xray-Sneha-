# UF-Xray Deployment Guide

Version: 1.0
Date: 2025-09-20

This guide explains how the UF‑Xray application is deployed end‑to‑end: the React frontend on GitHub Pages and the Node.js + Python backend on Render (Docker).

---

## 1) Repository Layout (relevant to deploy)
- Frontend (React): project root
  - `.github/workflows/deploy.yml` — GitHub Actions workflow for GitHub Pages
  - `.env.production` — optional local build env file
- Backend (Node + Python): `server/`
  - `server/server.js` — Express app
  - `server/news.js` — RSS aggregation
  - `server/requirements.txt` — Python dependencies
  - `server/Dockerfile` — Container image for Render
- Render Blueprint: `render.yaml` (at repo root)

---

## 2) Frontend Deploy — GitHub Pages

We deploy the React app to GitHub Pages using a GitHub Actions workflow.

### Prerequisites
- Repo is Public (recommended for free GitHub Pages hosting)
- `package.json` includes:
  - `"homepage": "https://<username>.github.io/UF_Xray"`
  - Scripts: `predeploy`, `deploy` (already present)

### CI/CD Workflow
- File: `.github/workflows/deploy.yml`
- Steps:
  1. Checkout
  2. Setup Node 18
  3. `npm ci`
  4. Build with `REACT_APP_API_URL` (from GitHub Secrets) and `CI=false`
  5. Upload `build/` as artifact
  6. Deploy artifact to GitHub Pages

### Required GitHub Secret
- Name: `REACT_APP_API_URL`
- Value: your backend base URL (e.g., `https://uf-xray-api.onrender.com`)

Add it here: Repo → Settings → Secrets and variables → Actions → New repository secret.

### Triggering a Deploy
- Push to `main` branch, or
- Repo → Actions → "Deploy to GitHub Pages" → Run workflow

### Production Routing
- We use `HashRouter` in `src/App.js`, so GH Pages works with deep links like `/#/News`.

---

## 3) Backend Deploy — Render (Docker)

We containerize the backend so it runs with Node.js and Python together.

### Render Blueprint
- File: `render.yaml`
- Defines a web service:
  - `env: docker`
  - `rootDir: server`
  - Health check: `/healthz`
  - Env vars: `PYTHON_BIN=python3`

### Dockerfile (server/Dockerfile)
- Based on `node:18-bullseye`
- Installs Python3 and pip
- Installs Node deps (npm ci) and Python deps (pip install -r requirements.txt)
- Exposes port `5000`
- Starts with `npm start`

### Render Steps
1. Go to https://render.com → New → Blueprint
2. Connect your GitHub repo
3. Render detects `render.yaml` and configures `uf-xray-api`
4. Click Create Resources, then Deploy the service
5. After Status = Live, copy the service URL (e.g., `https://uf-xray-api.onrender.com`)

### Verify
- `GET /healthz` → `{ status: "ok", ... }`
- `GET /api/news` → News items
- `POST /api/scan-url` → `{ url }`
- `POST /api/scan-file` → multipart upload (field: file)
- `POST /api/scan-log` → upload file OR pass `{ text }`

---

## 4) Connecting Frontend and Backend

Set your backend URL as a GitHub Actions secret:
- Name: `REACT_APP_API_URL`
- Value: backend URL (e.g., `https://uf-xray-api.onrender.com`)
- Re-run the deploy workflow; the frontend will call API endpoints at that base URL.

Local development
- When `window.location.hostname === 'localhost'`, the frontend falls back to `http://localhost:5000`.

---

## 5) Mixed-Content Safe News Images

Problem: Some RSS feeds provide `http://` images that browsers block on `https://` sites.

Solution:
- Backend proxy: `GET /api/news-image?src=<encoded-url>` in `server/server.js` fetches the image and serves it over HTTPS
- Frontend (News, Home): if `imageUrl` starts with `http://`, route it through the proxy; else load directly

---

## 6) Manual Frontend Deploy (optional alternative)

If you want to publish without Actions:
1. Set `.env.production` with `REACT_APP_API_URL=https://<your-backend>`
2. Run `npm install` and `npm run deploy`
3. This deploys to `gh-pages` branch; ensure Pages Source = GitHub Actions or Branch as needed

---

## 7) Troubleshooting

- 404 on GitHub Pages
  - Ensure repo is Public
  - Settings → Pages → Source = GitHub Actions (or gh-pages branch)
  - Use `/#/` routes (HashRouter)
  - Wait ~1–5 minutes after a green deployment for propagation

- API calls fail in production
  - Set `REACT_APP_API_URL` secret and re-run deploy
  - Verify backend health: `GET /healthz`
  - CORS is open but can be restricted by `origin` if you prefer

- RSS images not loading
  - Ensure backend has the new `/api/news-image` route deployed
  - Check logs for proxy request errors/timeouts

---

## 8) Ongoing Maintenance
- Frontend changes: push to `main` to auto-deploy
- Backend changes: push to `main` and Render auto-deploys (Blueprint) if enabled
- Rotate secrets if backend URL changes

---

Prepared by: UF‑Xray Engineering
