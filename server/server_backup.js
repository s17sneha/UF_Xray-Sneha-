const bodyParser = require('body-parser');
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/visha';

mongoose.connect(uri)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Error connecting to MongoDB:', err));

const FileScanResultSchema = new mongoose.Schema({
    filename: String,
    results: Object,
    timestamp: { type: Date, default: Date.now },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const UrlScanResultSchema = new mongoose.Schema({
    url: String,
    results: Object,
    timestamp: { type: Date, default: Date.now },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const FileScanResult = mongoose.model('FileScanResult', FileScanResultSchema, 'file_scan_results');
const UrlScanResult = mongoose.model('UrlScanResult', UrlScanResultSchema, 'url_scan_results');

const upload = multer({ dest: 'uploads/' });

// Authentication routes
app.use('/api/auth', authRoutes);

// Verify JWT token middleware
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    jwt.verify(token.split(' ')[1], process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Failed to authenticate token' });
        }
        req.userId = decoded.userId;
        next();
    });
};

// Apply verifyToken middleware to protected routes (optional)
app.post('/api/scan',  upload.single('file'), async (req, res) => {
    try {
        if (req.file) {
            // File Scanning Logic
            const filePath = req.file.path;
            const filename = req.file.originalname;

            // TODO: Add file type validation and input sanitization here

            const pythonProcess = spawn('python', ['scanner.py', filePath, filename]);
            let scanResults = '';

            pythonProcess.stdout.on('data', (data) => scanResults += data.toString());
            pythonProcess.stderr.on('data', (data) => console.error(`stderr: ${data}`));

            pythonProcess.on('close', async (code) => {
                try {
                    await fs.promises.unlink(filePath);
                    if (code === 0) {
                        const results = JSON.parse(scanResults);
                        console.log("Data to be inserted into file_scan_results:", { filename, results });
                        const fileScanResult = new FileScanResult({ filename, results,  userId: req.userId});
                        await fileScanResult.save();
                        console.log("Data inserted successfully");
                        res.json(results);
                    } else {
                        res.status(500).json({ error: 'Scanning failed' });
                    }
                } catch (error) {
                    console.error("JSON parsing or MongoDB error:", error);
                    res.status(500).json({ error: 'Scan results processing failed' });
                }
            });

        } else if (req.body && req.body.url) {
            // URL Scanning Logic
            const { url } = req.body;
            if (!url) {
                return res.status(400).json({ error: 'URL is required' });
            }

            console.log("Received URL:", url);

            if (!isValidUrl(url)) {
                return res.status(400).json({ error: 'Invalid URL format' });
            }

            const pythonProcess = spawn('python', [
                path.join(__dirname, 'url_scanner_enhanced.py'),
                url,
            ]);

            let result = '';
            let errorOutput = '';

            pythonProcess.stdout.on('data', (data) => {
                result += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            pythonProcess.on('close', async (code) => {
                try {
                    if (code === 0) {
                        const jsonResult = JSON.parse(result);
                        console.log("Python output:", jsonResult);

                        console.log("Data to be inserted into url_scan_results:", { url, results: jsonResult });
                        const urlScanResult = new UrlScanResult({ url, results: jsonResult, userId: req.userId });
                        await urlScanResult.save();
                        console.log("Data inserted successfully");

                        res.json(jsonResult);
                    } else {
                        console.error("Python error:", errorOutput);
                        res.status(500).json({ error: `Python script exited with code ${code}.`, details: errorOutput });
                    }
                } catch (parseError) {
                    console.error("Error parsing python output:", parseError);
                    res.status(500).json({ error: "Error processing scan results", details: result });
                }
            });

            pythonProcess.on('error', (err) => {
                console.error("Python process error:", err);
                res.status(500).json({ error: "Internal server error." });
            });

        } else {
            res.status(400).json({ error: 'Invalid request' });
        }

    } catch (error) {
        console.error("Server error:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Fetch all file scan results
app.get('/api/results/file', async (req, res) => {
    try {
        const results = await FileScanResult.find({});
        res.json(results);
    } catch (error) {
        console.error('Error fetching file scan results:', error);
        res.status(500).send('Server error');
    }
});

// Fetch a specific file scan result by ID
app.get('/api/results/file/:id', async (req, res) => {
    try {
        console.log("Request to /api/results/file/:id with id:", req.params.id);
        const result = await FileScanResult.findById(req.params.id);
        if (result) {
            res.json(result);
        } else {
            res.status(404).send('Result not found');
        }
    } catch (error) {
        console.error('Error fetching file scan result:', error);
        res.status(500).send('Server error');
    }
});

// Fetch the results of a specific file scan by filename
app.get('/api/results/file/name/:filename', async (req, res) => {
    try {
        console.log("Request to /api/results/file/name/:filename with filename:", req.params.filename);
        const result = await FileScanResult.findOne({ filename: req.params.filename });
        if (result) res.json(result.results);
        else res.status(404).send('Result not found');
    } catch (error) {
        res.status(500).send('Server Error');
    }
});

// Fetch all URL scan results
app.get('/api/results/url', async (req, res) => {
    try {
        const results = await UrlScanResult.find({});
        res.json(results);
    } catch (error) {
        console.error('Error fetching URL scan results:', error);
        res.status(500).send('Server error');
    }
});

// Fetch the results of a specific URL scan by URL
app.get('/api/results/url/name/:url', async (req, res) => {
    try {
        console.log("Request to /api/results/url/name/:url with url:", req.params.url);
        const result = await UrlScanResult.findOne({ url: req.params.url });
        if (result) res.json(result.results);
        else res.status(404).send('Result not found');
    } catch (error) {
        res.status(500).send('Server Error');
    }
});

async function cleanupUploads(maxAgeMs) {
    const uploadsDir = 'uploads';
    try {
        const files = await fs.promises.readdir(uploadsDir);
        for (const file of files) {
            const filePath = path.join(uploadsDir, file);
            const stats = await fs.promises.stat(filePath);
            const fileAgeMs = Date.now() - stats.mtimeMs;
            if (fileAgeMs > maxAgeMs) {
                await fs.promises.unlink(filePath);
                console.log('Deleted old file from uploads:', filePath);
            }
        }
    } catch (err) {
        console.error('Error during cleanup:', err);
    }
}

const cleanupIntervalMs = 60 * 60 * 1000; // 1 hour
setInterval(() => cleanupUploads(cleanupIntervalMs), cleanupIntervalMs);
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