const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

console.log('--- Diagnostic Info ---');
console.log('Current Directory:', __dirname);
console.log('Project Root:', path.resolve(__dirname));
console.log('Looking for index.html at:', path.join(__dirname, 'index.html'));
console.log('-----------------------');

// S3 Configuration
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }
});

// Explicitly serve index.html for the root route
// app.get('/', (req, res) => {
//     console.log('Handling GET / request');
//     res.sendFile(path.join(__dirname, 'index.html'), (err) => {
//         if (err) {
//             console.error('Error sending index.html:', err);
//             res.status(500).send('Error loading page: ' + err.message);
//         }
//     });
// });

// Serve other static files (css, js, images)
// app.use(cors());
// app.use(express.static(path.join(__dirname)));
// app.use(express.json());
app.use(cors());
app.use(express.json());

// Serve all static files (html, css, js)
app.use(express.static(__dirname));


app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});
// 1. Resume Upload Route
app.post('/upload', upload.single('resume'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No resume provided' });
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_BUCKET_NAME) {
        return res.status(500).json({ error: 'S3 Credentials not found in .env' });
    }

    try {
        const key = `applications/${Date.now()}-${req.file.originalname}`;
        const uploader = new Upload({
            client: s3Client,
            params: {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: key,
                Body: req.file.buffer,
                ContentType: req.file.mimetype
            }
        });
        await uploader.done();
        res.json({ message: 'Stored in S3', key: key });
    } catch (err) {
        res.status(500).json({ error: 'S3 storage error', details: err.message });
    }
});

// 2. Contact Data Storage (JSON in S3)
app.post('/contact', async (req, res) => {
    const { name, email, message, timestamp } = req.body;
    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Incomplete contact data' });
    }

    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_BUCKET_NAME) {
        return res.status(500).json({ error: 'S3 Credentials missing' });
    }

    try {
        const key = `contacts/contact-${Date.now()}.json`;
        const body = JSON.stringify({ name, email, message, timestamp }, null, 2);
        
        const command = new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
            Body: body,
            ContentType: 'application/json'
        });

        await s3Client.send(command);
        res.json({ message: 'Contact data archived in S3' });
    } catch (err) {
        res.status(500).json({ error: 'Cloud storage failed', details: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`\n🚀 InternQ Engine running at http://localhost:${PORT}`);
    console.log(`🔒 S3 Storage: ${process.env.AWS_BUCKET_NAME || 'NOT CONFIGURED'}\n`);
});
