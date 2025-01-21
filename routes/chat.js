const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Settings = require('../models/Settings');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();
const OpenAI = require('openai');

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const userId = req.user.id; // Assuming the user ID is available in the authenticated request
        const userDirectory = path.join('uploads', userId.toString());

        // Create user-specific directory if it doesn't exist
        if (!fs.existsSync(userDirectory)) {
            fs.mkdirSync(userDirectory, { recursive: true });
        }

        cb(null, userDirectory);
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
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded. Please attach a document.' });
    }

    try {
        // Process the uploaded file as needed
        res.status(200).json({
            message: 'File uploaded successfully!',
            filePath: req.file.path
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error occurred while uploading the file.' });
    }
});

router.get('/documents', authenticateToken, (req, res) => {
    const userId = req.user.id; // Authenticated user ID
    const userDirectory = path.join('uploads', userId.toString());

    try {
        if (!fs.existsSync(userDirectory)) {
            return res.status(404).json({ message: 'No documents found for this user.' });
        }

        const files = fs.readdirSync(userDirectory).map(file => ({
            name: file,
            url: `${req.protocol}://${req.get('host')}/uploads/${userId}/${encodeURIComponent(file)}`
        }));

        res.status(200).json({
            message: 'Documents retrieved successfully!',
            documents: files
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error occurred while retrieving documents.' });
    }
});



module.exports = router;
