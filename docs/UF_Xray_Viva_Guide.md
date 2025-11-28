# UF-Xray Viva Guide

Version: 1.0
Date: 2025-09-20

## 1. Project Overview
- UF-Xray is a full‑stack security helper:
  - Frontend: React + Tailwind CSS, deployed on GitHub Pages.
  - Backend: Node.js (Express) + Python scanners, deployable on Render via Docker.
  - Features: URL scan, File scan, Log analysis, Security News aggregation.

## 2. Key Frontend Concepts (React)
- Component-based UI using functional components and React Hooks (`useState`, `useEffect`).
- Routing with `react-router-dom` and `HashRouter` to work on static hosting (GitHub Pages):
  - `src/App.js`: defines routes for Home, Analyze File/URL/Log, News, About, Contact.
  - `HashRouter` ensures deep links like `/#/News` work without a server.
- State and side-effects:
  - Data fetching in components like `News` and `Home` via `useEffect`.
  - Local UI state for loaders/errors and mobile menu toggles in `Navbar`.
- API layer:
  - `src/utils/api.js`: thin wrapper over `fetch` with JSON handling, file upload support, and base URL from `REACT_APP_API_URL`.
  - `src/api.js`: axios-compatible base URL if needed by other modules.
- Styling:
  - Tailwind CSS utility classes for quick, consistent styling.
  - Removed dark mode as per requirements; site is fixed to light theme.

## 3. Frontend Architecture
- `src/Components/`:
  - `Navbar.js`: responsive top nav, mobile menu with collapsible "Scan" section.
  - `Home.js`: hero + quick links + news preview (first 6 items).
  - `News.js`: paginated list of cybersecurity headlines with graceful fallbacks.
  - `AnalyzeURL.js`, `AnalyzeFile.js`, `AnalyzeLog.js`: submit data to backend and render results; provide report downloads (JSON/PDF helpers).
- Utilities:
  - `src/utils/api.js`: core HTTP logic (GET/POST, uploads, auth header placeholder).
  - `src/utils/pdf.js`: PDF report generation helpers for scans.
  - `src/utils/download.js`: helper for JSON/Blob downloads.
- Entrypoint:
  - `src/index.js`: forces light theme, normalizes URL for `HashRouter`.

### Component data flow (example: News)
1. On mount or when `limit` changes, call `api.get('/api/news?limit=...')`.
2. Set `items` state with returned `items` array.
3. Render grid of cards with title, summary, source, date, and image.
4. Image source logic:
   - If `imageUrl` starts with `http://`, it routes through backend proxy `GET /api/news-image?src=...` to avoid mixed-content on HTTPS.
   - Else uses the URL as-is; on error falls back to Unsplash placeholder.

## 4. Tailwind CSS Usage
- Utility-first classes used across components for spacing, typography, borders, shadows, and layout grids.
- Examples:
  - Buttons: `px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700`.
  - Cards: `rounded-2xl border border-gray-200 bg-white shadow hover:shadow-lg`.
  - Layouts: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6`.
- Best practices applied:
  - Consistent contrast for readability.
  - Removed dark-mode variants (`dark:*`) as per final requirements.

## 5. Backend Overview
- Node.js (Express) app in `server/`.
- Python scripts invoked via `child_process.spawn`:
  - `url_scanner_enhanced.py`, `scanner.py` (file), `log_analyzer.py`.
- Endpoints (public, CORS enabled):
  - `POST /api/scan-url` with `{ url }` JSON.
  - `POST /api/scan-file` with `multipart/form-data` (field: file).
  - `POST /api/scan-log` accepts uploaded file OR `{ text }`.
  - `GET  /api/news` returns cached aggregated items.
  - `GET  /api/news-image?src=...` image proxy to avoid mixed content.
  - `GET  /healthz` health endpoint.
- CORS configuration in `server/server.js` allows common headers.

### News aggregation
- Implemented in `server/news.js` using `rss-parser`.
- Sources: KrebsOnSecurity, The Hacker News, BleepingComputer, CISA Advisories.
- Image selection attempts: `enclosure`, `media:*`, `<img src>` in `content`, else fallback.
- Items cached ~4 hours to reduce network load.

## 6. Environment Config
- `REACT_APP_API_URL` controls API base URL in production builds.
  - Set as GitHub Actions secret for CI builds or `.env.production` locally.
- Local dev falls back to `http://localhost:5000` when host is `localhost`.

## 7. Deployment Summary
- Frontend: GitHub Pages via GitHub Actions workflow `.github/workflows/deploy.yml`.
  - Node 18, `npm ci`, `npm run build`, upload artifact, deploy pages.
  - `CI: false` prevents CRA from failing builds on warnings in CI.
- Backend: Render with `render.yaml` and `server/Dockerfile`.
  - Dockerfile installs Node + Python + Python requirements.
  - Exposes port 5000; `PYTHON_BIN=python3` env var.

## 8. Security & Reliability
- CORS configured for public use; consider restricting origins for production.
- Input validation for URL scanning.
- File upload cleanup via `fs.unlink`.
- Basic error handling for Python process output.
- Image proxy has timeouts and status checks.

## 9. Performance & UX
- News list limited by `limit` with quick refresh button.
- Card images lazy by browser defaults; proxy caches via `Cache-Control` header.
- Mobile nav: collapsible "Scan" reduces scroll.

## 10. Common Viva Questions & Short Answers
- Q: Why `HashRouter` on GitHub Pages?
  - A: GH Pages is static hosting without server rewrite rules; hash-based routing keeps client-side routes functional.
- Q: How does `REACT_APP_API_URL` work?
  - A: CRA inlines env variables prefixed with `REACT_APP_` at build time; we read it in `api.js` and `utils/api.js`.
- Q: Why is an image proxy needed?
  - A: To avoid mixed-content (HTTP images on HTTPS page) which browsers block; proxy serves them over HTTPS.
- Q: How are PDF reports generated?
  - A: `src/utils/pdf.js` builds a PDF (or uses jsPDF/autoTable style helpers if integrated) and `downloadJSON` provides JSON fallback.
- Q: How does the backend run Python?
  - A: Uses `child_process.spawn(PYTHON_BIN, [script, args...])`; captures stdout/stderr and parses JSON.
- Q: What are Tailwind’s benefits here?
  - A: Rapid prototyping, consistent design tokens, responsive utilities without writing custom CSS.

## 11. File Map (high level)
- `src/Components/`: UI components like `Navbar.js`, `Home.js`, `News.js`, `Analyze*.js`.
- `src/utils/`: `api.js`, `pdf.js`, `download.js`.
- `server/`: `server.js`, `news.js`, Python scripts, `requirements.txt`, `Dockerfile`.
- `.github/workflows/deploy.yml`: CI to GH Pages.
- `render.yaml`: Render blueprint.

## 12. How to run locally
- Backend: `cd server && npm install && npm start` (ensure Python and requirements installed; or use Docker).
- Frontend: In project root: `npm install && npm start` then open `http://localhost:3000`.

## 13. Troubleshooting
- 404 on GH Pages: ensure repo is Public, Pages Source = GitHub Actions, wait a few minutes after deploy, use `/#/` URLs.
- API calls fail in production: set `REACT_APP_API_URL` secret; redeploy frontend; confirm backend `healthz`.
- ESLint CI failures: warnings treated as errors by default; workflow sets `CI=false` to avoid blocking deploy.

---
Prepared for viva. Use this guide to explain design choices, architecture, and trade-offs.
