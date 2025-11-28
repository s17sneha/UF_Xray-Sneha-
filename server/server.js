const bodyParser = require("body-parser");
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { spawn } = require("child_process");
const fs = require("fs");
// const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const { getNews } = require("./news");
// const authRoutes = require("./routes/auth");
// const jwt = require("jsonwebtoken");
// Reports persistence disabled for simplified backend
// const User = require('./models/User');

dotenv.config();

const app = express();
// In-memory vulnerability store (ephemeral)
const FOUND_VULNS_MAX = 500;
let foundVulns = [];

// Known vulnerabilities cache (CISA KEV)
const KEV_TTL_MS = 12 * 60 * 60 * 1000; // 12h
let kevCache = { items: [], fetchedAt: 0 };
async function fetchCisaKEV() {
  try {
    await ensureFetch();
    const url = process.env.KEV_FEED_URL || 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`KEV fetch failed ${res.status}`);
    const json = await res.json();
    const arr = Array.isArray(json?.vulnerabilities) ? json.vulnerabilities : [];
    kevCache = { items: arr, fetchedAt: Date.now() };
    return arr;
  } catch (e) {
    return kevCache.items || [];
  }
}

function addFoundVuln(entry) {
  try {
    const now = new Date();
    const norm = {
      id: `${now.getTime()}_${Math.random().toString(36).slice(2,8)}`,
      title: String(entry.title || 'Detected vulnerability/finding'),
      type: String(entry.type || 'finding'),
      severity: String(entry.severity || 'LOW'),
      source: String(entry.source || 'unknown'),
      reference: entry.reference || null,
      details: entry.details || null,
      timestamp: now.toISOString(),
    };
    foundVulns.unshift(norm);
    if (foundVulns.length > FOUND_VULNS_MAX) foundVulns.length = FOUND_VULNS_MAX;
  } catch (_) { /* ignore */ }
}

const FALLBACK_SVG = (
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'>`+
  `<rect width='800' height='450' fill='rgb(15,23,42)'/>`+
  `<rect x='340' y='170' rx='12' ry='12' width='120' height='100' fill='rgba(96,165,250,0.15)' stroke='rgb(96,165,250)' stroke-width='8'/>`+
  `<path d='M360 170 v-20 a40 40 0 0 1 80 0 v20' fill='none' stroke='rgb(147,197,253)' stroke-width='8'/>`+
  `<text x='400' y='320' font-size='28' fill='rgb(203,213,225)' text-anchor='middle' font-family='Segoe UI,Roboto,Arial,sans-serif'>Cyber Security</text>`+
  `</svg>`
);
function sendFallback(res) {
  if (!res.headersSent) {
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Type', 'image/svg+xml');
    res.status(200).send(FALLBACK_SVG);
  }
}
// Basic rate limiter to protect upstream AI API and server
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: parseInt(process.env.CHAT_RATE_LIMIT || '30', 10), // 30 req/min by default
  standardHeaders: true,
  legacyHeaders: false,
});
// Ensure global fetch is available (Node < 18 fallback)
async function ensureFetch() {
  if (typeof fetch === 'undefined') {
    const mod = await import('node-fetch');
    global.fetch = mod.default;
  }
}
// Configure CORS (public, no credentials)
app.use(cors({
  origin: '*',
  methods: ['GET','POST','DELETE','PUT','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type','Accept','Authorization','X-Requested-With','Origin']
}));
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '5mb' }));

// Friendly root and health endpoints
app.get("/", (req, res) => {
    res.type("text").send("UF XRAY API is running. See /healthz for status.");
});

app.get("/healthz", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// ---------------- Contact (Email) ----------------
// Basic string sanitization to avoid script injection in emails/logs
function sanitizeStr(input, maxLen = 2000) {
    let s = String(input || '').trim();
    s = s.replace(/[\u0000-\u001F\u007F]/g, ''); // drop control chars
    s = s.slice(0, maxLen);
    // Escape angle brackets and ampersand
    s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return s;
}

const contactLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5, // 5 requests/minute per IP
  standardHeaders: true,
  legacyHeaders: false,
});

// Lazy-create transporter so server starts without SMTP until first use
let mailTransporter = null;
async function getTransporter() {
  if (mailTransporter) return mailTransporter;
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    throw new Error('SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS');
  }
  mailTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return mailTransporter;
}

app.post('/api/contact', contactLimiter, async (req, res) => {
  try {
    const { name, email, phone, desc, website } = req.body || {};
    // Honeypot: if filled, pretend success but drop
    if (website && String(website).trim()) {
      return res.json({ ok: true });
    }
    const nm = sanitizeStr(name, 120);
    const em = sanitizeStr(email, 200);
    const ph = sanitizeStr(phone, 40);
    const msg = sanitizeStr(desc, 4000);

    if (!nm || !em || !msg) {
      return res.status(400).json({ message: 'name, email and message are required' });
    }
    // Basic email format check
    if (!/^\S+@\S+\.\S+$/.test(em)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const to = (process.env.CONTACT_TO && process.env.CONTACT_TO.trim()) || 'vishalhgiri@gmail.com';
    const from = process.env.MAIL_FROM || process.env.SMTP_USER || 'no-reply@ufxray.local';

    const transporter = await getTransporter();
    const subject = `[UF-Xray] New contact form submission from ${nm}`;

    // Plain text and safe HTML (escaped)
    const text = `New contact message\n\nName: ${nm}\nEmail: ${em}\nPhone: ${ph}\n\nMessage:\n${msg}`;
    const html = [
      `<div style="font-family:Segoe UI,Roboto,Arial,sans-serif;font-size:14px;color:#111">`,
      `<p><strong>Name:</strong> ${nm}</p>`,
      `<p><strong>Email:</strong> ${em}</p>`,
      ph ? `<p><strong>Phone:</strong> ${ph}</p>` : '',
      `<hr style="border:none;border-top:1px solid #e5e7eb;margin:8px 0">`,
      `<p style="white-space:pre-wrap">${msg}</p>`,
      `</div>`
    ].join('');

    await transporter.sendMail({ from, to, subject, text, html });
    return res.json({ ok: true });
  } catch (err) {
    console.error('/api/contact error:', err);
    return res.status(500).json({ message: 'Failed to send message' });
  }
});

// Vulnerabilities: Known from CISA KEV
app.get('/api/vuln/known', async (req, res) => {
    try {
        const limitRaw = req.query.limit || '50';
        const limit = Math.max(1, Math.min(parseInt(limitRaw, 10) || 50, 500));
        const q = String(req.query.q || '').toLowerCase();
        const now = Date.now();
        const needRefresh = (now - kevCache.fetchedAt) > KEV_TTL_MS || !Array.isArray(kevCache.items) || kevCache.items.length === 0;
        const items = needRefresh ? await fetchCisaKEV() : kevCache.items;
        const norm = (items || []).map((v) => ({
            id: v.cveID || v.vulnID || v.id || null,
            cve: v.cveID || null,
            vendor: v.vendorProject || '',
            product: v.product || '',
            name: v.vulnerabilityName || '',
            description: v.shortDescription || '',
            dateAdded: v.dateAdded || null,
            dueDate: v.dueDate || null,
            requiredAction: v.requiredAction || '',
            notes: v.notes || '',
            references: v?.references || [],
            severity: 'HIGH',
            source: 'CISA KEV'
        }));
        const filtered = q
            ? norm.filter(it => [it.id, it.cve, it.vendor, it.product, it.name, it.description].join(' ').toLowerCase().includes(q))
            : norm;
        return res.json({ items: filtered.slice(0, limit), total: filtered.length, updatedAt: new Date(kevCache.fetchedAt || now).toISOString() });
    } catch (e) {
        return res.status(500).json({ message: 'Failed to fetch known vulnerabilities' });
    }
});

// Vulnerabilities: Found during scans (ephemeral in-memory)
app.get('/api/vuln/found', (req, res) => {
    try {
        const limitRaw = req.query.limit || '100';
        const limit = Math.max(1, Math.min(parseInt(limitRaw, 10) || 100, FOUND_VULNS_MAX));
        return res.json({ items: foundVulns.slice(0, limit), total: foundVulns.length });
    } catch (e) {
        return res.status(500).json({ message: 'Failed to fetch found vulnerabilities' });
    }
});

// Vulnerabilities summary
app.get('/api/vuln/summary', (req, res) => {
    try {
        const bySeverity = foundVulns.reduce((acc, it) => {
            const k = (it.severity || 'LOW').toUpperCase();
            acc[k] = (acc[k] || 0) + 1;
            return acc;
        }, {});
        const latest = foundVulns[0]?.timestamp || null;
        res.json({ totalFound: foundVulns.length, bySeverity, latest });
    } catch (e) {
        res.status(500).json({ message: 'Failed to summarize vulnerabilities' });
    }
});

// Simple image proxy to avoid mixed-content (http) issues on HTTPS sites
app.get('/api/news-image', (req, res) => {
    try {
        const src = req.query.src;
        if (!src || typeof src !== 'string') {
            return res.status(400).send('src query param required');
        }
        let start;
        try { start = new URL(src); } catch { return sendFallback(res); }
        if (start.protocol !== 'http:' && start.protocol !== 'https:') {
            return sendFallback(res);
        }

        const visited = new Set();
        const MAX_REDIRECTS = 5;

        const fetchAndPipe = (target, redirectsLeft) => {
            const client = target.protocol === 'http:' ? require('http') : require('https');
            const request = client.get(target.toString(), {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
                    'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
                    'Referer': target.origin
                },
                timeout: 10000,
            }, (r) => {
                // Follow redirects server-side
                if (r.statusCode && r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
                    if (redirectsLeft <= 0) return sendFallback(res);
                    let nextUrl;
                    try { nextUrl = new URL(r.headers.location, target); } catch { return sendFallback(res); }
                    const key = nextUrl.toString();
                    if (visited.has(key)) return res.status(508).send('redirect loop');
                    visited.add(key);
                    r.resume(); // discard data
                    return fetchAndPipe(nextUrl, redirectsLeft - 1);
                }
                if (r.statusCode && r.statusCode >= 400) {
                    return sendFallback(res);
                }
                res.setHeader('Cache-Control', 'public, max-age=86400');
                const ct = r.headers['content-type'] || '';
                if (!ct.toLowerCase().startsWith('image/')) {
                    r.resume(); // discard non-image
                    return sendFallback(res);
                }
                res.setHeader('Content-Type', ct);
                r.on('error', () => res.status(502).end());
                r.pipe(res);
            });

            request.on('timeout', () => {
                request.destroy();
                sendFallback(res);
            });
            request.on('error', () => {
                sendFallback(res);
            });
        };

        fetchAndPipe(start, MAX_REDIRECTS);
    } catch (e) {
        res.status(500).send('proxy error');
    }
});

const PYTHON_BIN = process.env.PYTHON_BIN || "python"; // allow overriding python executable

const upload = multer({ dest: "uploads/" });

// Authentication removed; endpoints are public in simplified backend

// Auth middleware removed in simplified backend


// URL Scan Endpoint
app.post("/api/scan-url", async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ message: "URL is required" });
    }

    if (!isValidUrl(url)) {
        return res.status(400).json({ error: "Invalid URL format" });
    }

    const pythonProcess = spawn(PYTHON_BIN, [
        path.join(__dirname, "url_scanner_enhanced.py"),
        url,
    ]);

    let scriptOutput = "";
    let scriptError = "";

    pythonProcess.stdout.on("data", (data) => {
        scriptOutput += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
        scriptError += data.toString();
    });

    pythonProcess.on("close", async (code) => {
        if (code === 0) {
            try {
                const scanResult = JSON.parse(scriptOutput);
                // Skipping DB save in simplified backend
                try {
                    const tl = String(scanResult?.threat_level || '').toUpperCase();
                    if (tl && tl !== 'SAFE') {
                        addFoundVuln({
                            title: `URL scan: ${scanResult?.url || 'unknown'} (${tl})`,
                            type: 'url',
                            severity: tl,
                            source: 'scan-url',
                            reference: scanResult?.url || null,
                            details: {
                                risk_score: scanResult?.risk_score,
                                liveness: scanResult?.liveness_check,
                                resolved_ips: Array.isArray(scanResult?.resolved_ips) ? scanResult.resolved_ips.slice(0, 5) : []
                            }
                        });
                    }
                } catch (_) {}
                res.json(scanResult);
            } catch (parseError) {
                console.error("Error parsing Python script output:", parseError);
                console.error("Raw stdout:", scriptOutput);
                console.error("stderr:", scriptError);
                res.status(500).json({ message: "Error processing scan results", details: scriptOutput });
            }
        } else {
            console.error(`Python script exited with code ${code}`);
            console.error("stderr:", scriptError);
            res.status(500).json({ message: "URL scan failed", details: scriptError });
        }
    });
});


// File Scan Endpoint
app.post("/api/scan-file", upload.single("file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }

    const filePath = req.file.path;
    const filename = req.file.originalname;

    const pythonProcess = spawn(PYTHON_BIN, [
        path.join(__dirname, "scanner.py"),
        filePath,
        filename,
    ]);

    let scriptOutput = "";
    let scriptError = "";

    pythonProcess.stdout.on("data", (data) => {
        scriptOutput += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
        scriptError += data.toString();
    });

    pythonProcess.on("close", async (code) => {
        // Clean up the uploaded file
        fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) console.error("Error deleting temporary file:", unlinkErr);
        });

        if (code === 0) {
            try {
                const scanResult = JSON.parse(scriptOutput);
                // Skipping DB save in simplified backend
                try {
                    const tl = String(scanResult?.threat_level || '').toUpperCase();
                    const yaraCount = (scanResult?.indicators?.yara_match_count) || 0;
                    const clam = (scanResult?.clamav || {}).status;
                    const isMal = !!scanResult?.malicious || tl === 'HIGH' || tl === 'MEDIUM' || yaraCount > 0 || clam === 'infected';
                    if (isMal) {
                        addFoundVuln({
                            title: `File scan: ${scanResult?.filename || 'unknown'} (${tl || (clam==='infected'?'INFECTED':'SUSPECT')})`,
                            type: 'file',
                            severity: tl || (clam==='infected'?'HIGH':'LOW'),
                            source: 'scan-file',
                            reference: scanResult?.hashes?.sha256 || scanResult?.sha256 || null,
                            details: {
                                risk_score: scanResult?.risk_score,
                                yara_matches: scanResult?.yara?.matches || [],
                                clamav: scanResult?.clamav || {},
                            }
                        });
                    }
                } catch (_) {}
                res.json(scanResult);
            } catch (parseError) {
                console.error("Error parsing Python script output:", parseError);
                console.error("Raw stdout:", scriptOutput);
                console.error("stderr:", scriptError);
                res.status(500).json({ message: "Error processing scan results", details: scriptOutput });
            }
        } else {
            console.error(`Python script exited with code ${code}`);
            console.error("stderr:", scriptError);
            res.status(500).json({ message: "File scan failed", details: scriptError });
        }
    });
});


// Log Scan Endpoint (accepts uploaded file or raw text)
app.post("/api/scan-log", upload.single("file"), async (req, res) => {
    let tempCreated = false;
    let filePath = req?.file?.path;
    let cleanupPath = null;

    try {
        if (!filePath) {
            const text = (req.body && req.body.text) ? String(req.body.text) : "";
            if (!text.trim()) {
                return res.status(400).json({ message: "Provide a log file or non-empty 'text' field" });
            }
            // Write text to a temporary file
            const tmpName = `log_${Date.now()}.txt`;
            filePath = path.join(__dirname, 'uploads', tmpName);
            await fs.promises.mkdir(path.dirname(filePath), { recursive: true }).catch(() => {});
            await fs.promises.writeFile(filePath, text, 'utf8');
            tempCreated = true;
            cleanupPath = filePath;
        }

        let scriptOutput = "";
        let scriptError = "";
        const pythonProcess = spawn(PYTHON_BIN, [
            path.join(__dirname, "log_analyzer.py"),
            filePath,
        ]);

        pythonProcess.stdout.on("data", (data) => {
            scriptOutput += data.toString();
        });

        pythonProcess.stderr.on("data", (data) => {
            scriptError += data.toString();
        });

        pythonProcess.on("close", async (code) => {
            // Clean up the uploaded or temp file if needed
            const toDelete = cleanupPath || (req?.file?.path || null);
            if (toDelete) {
                fs.unlink(toDelete, (unlinkErr) => {
                    if (unlinkErr) console.error("Error deleting temporary file:", unlinkErr);
                });
            }

            if (code === 0) {
                try {
                    const scanResult = JSON.parse(scriptOutput);
                    try {
                        const tl = String(scanResult?.threat_level || '').toUpperCase();
                        const susHits = Array.isArray(scanResult?.detections?.suspicious_patterns) ? scanResult.detections.suspicious_patterns.length : 0;
                        if (tl && tl !== 'SAFE' || susHits > 0) {
                            addFoundVuln({
                                title: `Log scan: ${tl || 'ANALYZED'} (${susHits} suspicious hits)`,
                                type: 'log',
                                severity: tl || 'LOW',
                                source: 'scan-log',
                                reference: null,
                                details: {
                                    risk_score: scanResult?.risk_score,
                                    suspicious_count: susHits
                                }
                            });
                        }
                    } catch (_) {}
                    return res.json(scanResult);
                } catch (parseError) {
                    console.error("Error parsing Python script output:", parseError);
                    console.error("Raw stdout:", scriptOutput);
                    console.error("stderr:", scriptError);
                    return res.status(500).json({ message: "Error processing scan results", details: scriptOutput });
                }
            } else {
                console.error(`Python script exited with code ${code}`);
                console.error("stderr:", scriptError);
                return res.status(500).json({ message: "Log scan failed", details: scriptError });
            }
        });
    } catch (err) {
        if (tempCreated && cleanupPath) {
            try { await fs.promises.unlink(cleanupPath); } catch (_) {}
        }
        console.error("Unexpected error in /api/scan-log:", err);
        return res.status(500).json({ message: "Unexpected error", details: String(err) });
    }
});


// News feed (cached server-side, refresh ~4h)
app.get("/api/news", async (req, res) => {
    try {
        const limitRaw = req.query.limit || '12';
        const limit = Math.max(1, Math.min(parseInt(limitRaw, 10) || 12, 50));
        const nocache = String(req.query.nocache || '').toLowerCase();
        const items = await getNews(limit, { nocache: nocache === '1' || nocache === 'true' });
        return res.json({ items });
    } catch (e) {
        console.error("/api/news error:", e);
        return res.status(500).json({ message: "Failed to fetch news" });
    }
});


// Reports API removed in simplified backend

// Legacy scan endpoint removed. Use /api/scan-url or /api/scan-file

// Chatbot endpoint for cybersecurity Q&A
app.post('/api/chat', chatLimiter, async (req, res) => {
    try {
        await ensureFetch();
        const { message, history } = req.body || {};
        if (!message || typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({ message: "'message' is required" });
        }

        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
        if (!OPENAI_API_KEY) {
            return res.status(500).json({ message: "Server not configured with OPENAI_API_KEY" });
        }

        const systemPrompt = [
            "You are 'UF XRay Assistant', a helpful cybersecurity expert.",
            "Answer clearly and concisely, focusing on practical security guidance.",
            "You can explain concepts like malware, phishing, network security, SIEM, log analysis, incident response, and secure coding.",
            "Be safe and ethical. Do NOT provide instructions that facilitate wrongdoing (e.g., exploiting systems).",
            "If the user asks for something unsafe, refuse and provide safer alternatives like defensive best practices.",
        ].join(' ');

        const chatHistory = Array.isArray(history) ? history.slice(-10) : [];
        const messages = [
            { role: 'system', content: systemPrompt },
            ...chatHistory,
            { role: 'user', content: String(message) }
        ];

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                messages,
                temperature: 0.2,
                max_tokens: 800
            })
        });

        if (!response.ok) {
            const text = await response.text().catch(() => '');
            console.error('/api/chat upstream error:', response.status, text);
            return res.status(502).json({ message: 'AI provider error', details: text });
        }
        const data = await response.json();
        const answer = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content)
            ? data.choices[0].message.content.trim()
            : "Sorry, I couldn't generate a response.";

        return res.json({ answer });
    } catch (err) {
        console.error('/api/chat error:', err);
        return res.status(500).json({ message: 'Unexpected error', details: String(err) });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch (err) {
        return false;
    }
}

