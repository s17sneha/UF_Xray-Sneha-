# UF XRAY - Cybersecurity Analysis Platform

## Quick Start

### 1. Backend Setup

1. Copy `.env.example` to `.env` in the `server/` directory:

   Windows (PowerShell):

   ```powershell
   cd server
   copy .env.example .env
   ```

   macOS/Linux:

   ```bash
   cd server
   cp .env.example .env
   ```

2. Edit `server/.env` and replace `<db_password>` with your MongoDB Atlas password (only needed if using the full DB/auth stack).

3. Install dependencies and start the backend:

   ```bash
   cd server
   npm install
   npm start
   ```

   You should see server start logs, e.g. "Server running on port 5000".

#### Chatbot (Cybersecurity Assistant) Setup

1. Obtain an OpenAI API key and set it in `server/.env`:

   ```ini
   OPENAI_API_KEY=sk-...
   # Optional (default is gpt-4o-mini)
   OPENAI_MODEL=gpt-4o-mini
   # Optional rate limit (requests per minute; default 30)
   CHAT_RATE_LIMIT=30
   ```

2. Restart the backend after setting the key: `npm start`

### 2. Frontend Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm start
   ```

   The app will open at http://localhost:3000

When the backend is running (default http://localhost:5000), click the floating "Chatbot" button at the bottom-right to ask cybersecurity questions.

### 2b. Docs PDF Export

The repository includes printable HTML docs in `docs/` and a script to export them to PDF using Puppeteer.

Run:

```bash
npm run docs:pdf
```

Outputs will be generated in `docs/pdf/`:

- `docs/pdf/UF_Xray_Viva_Guide.pdf`
- `docs/pdf/UF_Xray_Deployment_Guide.pdf`

### 3. Production Deployment

#### Frontend (GitHub Pages)

1. Deploy to GitHub Pages:
   
   ```bash
   npm run deploy
   ```
2. Your site will be live at: https://vishal0053.github.io/UF_Xray/

#### Backend (Optional - for production)

1. Deploy server/ to Render, Railway, or Heroku
2. Set environment variables on your hosting platform (Render):
   - `OPENAI_API_KEY` (required)
   - `OPENAI_MODEL` (optional, default `gpt-4o-mini`)
   - `CHAT_RATE_LIMIT` (optional, e.g., `30` requests/min)
3. Update frontend to use production backend:
   
   Windows (PowerShell):
   ```powershell
   setx REACT_APP_API_URL "https://your-backend-url.com"
   ```
   macOS/Linux (temporary for one shell session):
   ```bash
   export REACT_APP_API_URL="https://your-backend-url.com"
   ```
   Then redeploy the frontend:
   ```bash
   npm run deploy
   ```

## Features

- **File Analysis**: Upload and scan files for malware
- **URL Analysis**: Check URLs for phishing attempts
- **Cybersecurity Chatbot**: Ask the assistant questions about phishing, malware, secure coding, SIEM, log analysis, incident response, etc. Ethically refuses harmful requests.
- **User Authentication**: Secure signup and login
- **Reports**: View and download scan results
- **Dark/Light Theme**: Toggle between themes
- **Responsive Design**: Works on all devices

## Tech Stack

- **Frontend**: React, Tailwind CSS, React Router
- **Backend**: Node.js, Express, MongoDB
- **Authentication**: JWT tokens
- **File Processing**: Python scripts
- **Deployment**: GitHub Pages

## API Endpoints

- POST /api/auth/signup - User registration
- POST /api/auth/login - User login
- POST /api/scan - File/URL scanning
- GET /api/results/file - Get file scan results
- GET /api/results/url - Get URL scan results
- POST /api/chat - Cybersecurity assistant (body: `{ message: string, history?: {role, content}[] }`)

## Environment Variables

- MONGODB_URI - MongoDB connection string
- JWT_SECRET - Secret key for JWT tokens
- PORT - Server port (default: 5000)
- OPENAI_API_KEY - OpenAI key used by `/api/chat`
- OPENAI_MODEL - Optional model override (default: gpt-4o-mini)
  - CHAT_RATE_LIMIT - Optional rate limit for `/api/chat` requests per minute (default: 30)

### Frontend
- REACT_APP_API_URL - Backend API URL (for production)

## Security News & Images

- **Endpoint**: The frontend calls `GET /api/news` from the backend to fetch cybersecurity headlines from multiple RSS feeds.
- **Dynamic images**: Article images are resolved server-side from RSS `enclosure`, `media:content`, or embedded HTML. The frontend proxies all `http(s)` image URLs via `GET /api/news-image?src=...` to avoid mixed-content and CORS issues.
- **Fallback image**: If an article doesn't provide a valid image or the image fails to load, the app shows a local placeholder at `public/cyber-fallback.svg`. This works on GitHub Pages because components reference it via `process.env.PUBLIC_URL + '/cyber-fallback.svg'`.
- **Config**: Ensure the backend URL is set via `REACT_APP_API_URL` for production (see `.env.production`). In local dev, the app defaults to `http://localhost:5000`.

## Troubleshooting

1. **MongoDB Connection Issues**: Check your connection string and network access
2. **CORS Errors**: Ensure backend is running on port 5000
3. **Build Errors**: Check for missing dependencies
