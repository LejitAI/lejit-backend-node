const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Settings = require('../models/Settings');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();
const OpenAI = require('openai');

const TAGS_FILE = path.join(__dirname, 'caseTags.json');

// Load tags from local JSON file
const loadTags = () => {
    if (fs.existsSync(TAGS_FILE)) {
        const data = fs.readFileSync(TAGS_FILE, 'utf-8');
        return JSON.parse(data);
    }
    return {};
};

// Save tags to local JSON file
const saveTags = (tags) => {
    fs.writeFileSync(TAGS_FILE, JSON.stringify(tags, null, 2), 'utf-8');
};

let caseTags = loadTags();

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { caseId } = req.body;
        if (!caseId) {
            return cb(new Error('caseId is required'), null);
        }
        const caseDirectory = path.join('uploads', caseId.toString());

        // Create case-specific directory if it doesn't exist
        if (!fs.existsSync(caseDirectory)) {
            fs.mkdirSync(caseDirectory, { recursive: true });
        }

        cb(null, caseDirectory);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const fileTypes = /pdf|doc|docx|txt/; // Allowed file extensions
        const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());
        const mimeType = fileTypes.test(file.mimetype);

        if (extName && mimeType) {
            return cb(null, true);
        }
        cb(new Error('Only documents are allowed (PDF, DOC, DOCX, TXT)'));
    }
});

// Document upload endpoint
router.post('/upload', authenticateToken, upload.single('document'), (req, res) => {
    const { caseId, tags } = req.body;

    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded. Please attach a document.' });
    }

    if (!caseId) {
        return res.status(400).json({ message: 'caseId is required.' });
    }

    try {
        // Store tags for the case
        if (tags) {
            const tagArray = tags.split(',').map(tag => tag.trim());
            caseTags[caseId] = (caseTags[caseId] || []).concat(tagArray);
            saveTags(caseTags);
        }

        res.status(200).json({
            message: 'File uploaded successfully!',
            filePath: req.file.path,
            caseId: caseId,
            tags: tags ? tags.split(',').map(tag => tag.trim()) : []
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error occurred while uploading the file.' });
    }
});

// Document retrieval endpoint
router.get('/documents', authenticateToken, (req, res) => {
    const { caseId } = req.query;

    if (!caseId) {
        return res.status(400).json({ message: 'caseId is required.' });
    }

    const caseDirectory = path.join('uploads', caseId.toString());

    try {
        if (!fs.existsSync(caseDirectory)) {
            return res.status(404).json({ message: 'No documents found for this case.' });
        }

        const files = fs.readdirSync(caseDirectory).map(file => ({
            name: file,
            url: `${req.protocol}://${req.get('host')}/backend/uploads/${caseId}/${encodeURIComponent(file)}`
        }));

        res.status(200).json({
            message: 'Documents retrieved successfully!',
            documents: files,
            caseId: caseId,
            tags: caseTags[caseId] || []
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error occurred while retrieving documents.' });
    }
});

module.exports = router;
