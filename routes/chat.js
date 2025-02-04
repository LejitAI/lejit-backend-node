const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Settings = require('../models/Settings');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();
const OpenAI = require('openai');
const axios = require('axios');
const FormData = require('form-data');


const CaseArgs = require('../models/CaseArgs');

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

// Document deletion endpoint
router.delete('/documents', authenticateToken, (req, res) => {
    const { caseId, fileName } = req.query;

    if (!caseId || !fileName) {
        return res.status(400).json({ message: 'Both caseId and fileName are required.' });
    }

    const filePath = path.join('uploads', caseId.toString(), fileName);

    try {
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found.' });
        }

        // Delete the file
        fs.unlinkSync(filePath);

        // Optionally, you can also remove the tags associated with the file if needed
        // For example, if you want to remove tags when the last file is deleted:
        const caseDirectory = path.join('uploads', caseId.toString());
        const remainingFiles = fs.readdirSync(caseDirectory);

        if (remainingFiles.length === 0) {
            delete caseTags[caseId];
            saveTags(caseTags);
        }

        res.status(200).json({ message: 'File deleted successfully!', caseId: caseId, fileName: fileName });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error occurred while deleting the file.' });
    }
});

router.get('/get-case-arguments', authenticateToken, async (req, res) => {
    const { caseId } = req.query;

    if (!caseId) {
        return res.status(400).json({ message: 'Invalid caseId' });
    }

    try {
        const dirPath = path.resolve('./uploads', caseId);
        console.log(`dirPath: ${dirPath}`);

        if (!fs.existsSync(dirPath)) {
            return res.status(400).json({ message: 'No documents uploaded' });
        }

        let caseDoc = await CaseArgs.findOne({ caseId });

        if (!caseDoc) {
            const sessionId = `${caseId}_${Date.now()}`;
            const form = new FormData();

            // Append files to the form
            try {
                fs.readdirSync(dirPath).forEach(file => {
                    console.log(`Adding file: ${file}`);
                    form.append('files', fs.createReadStream(path.join(dirPath, file)));
                });
            } catch (readError) {
                console.error('Error reading files:', readError.message);
                return res.status(500).json({ message: 'Error reading files', error: readError.message });
            }

            // Call the first API
            try {
                const response1 = await axios.post(
                    `http://backend.lejit.ai/api/api/citation/feed-documents/?session_id=${sessionId}`,
                    form,
                    { headers: form.getHeaders() }
                );

                if (response1.status === 200) {
                    // Call the second API
                    const response2 = await axios.post(
                        'http://backend.lejit.ai/api/api/citation/query',
                        {
                            session_id: sessionId,
                            question: 'give some arguments'
                        }
                    );

                    console.log('Arguments Response:', response2.data.response);

                    // Save to MongoDB
                    caseDoc = new CaseArgs({
                        caseId,
                        arguments: response2.data.response
                    });

                    try {
                        await caseDoc.save();
                    } catch (dbError) {
                        console.error('Error saving to MongoDB:', dbError.message);
                        return res.status(500).json({ message: 'Database save failed', error: dbError.message });
                    }
                }
            } catch (apiError) {
                console.error('Error in API calls:', apiError.response?.data || apiError.message);
                return res.status(500).json({ message: 'Error in external API calls', error: apiError.message });
            }
        }

        res.json({ caseId, arguments: caseDoc.arguments });
    } catch (error) {
        console.error('Unhandled Error:', error.response?.data || error.message || error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});


// Delete Current Arguments
router.delete('/delete-case-arguments', authenticateToken, async (req, res) => {
    const { caseId } = req.query; // Retrieve the caseId from the query parameters

    if (!caseId) {
        return res.status(400).json({ message: 'caseId is required' });
    }

    try {
        // Find and delete the document associated with the caseId
        const deletedCase = await CaseArgs.findOneAndDelete({ caseId });

        if (!deletedCase) {
            return res.status(404).json({ message: 'No arguments found for the provided caseId' });
        }

        res.status(200).json({ message: `Arguments for caseId ${caseId} have been successfully deleted` });
    } catch (error) {
        console.error('Error deleting case arguments:', error.message);
        res.status(500).json({ message: 'An error occurred while deleting case arguments', error: error.message });
    }
});


module.exports = router;
