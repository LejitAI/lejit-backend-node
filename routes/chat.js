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

router.get('/get-case-arguments', authenticateToken, async (req, res) => {
    const { caseId } = req.query;


    try {
        const dirPath = path.join('./uploads', caseId);
        console.log(dirPath);
        if (!fs.existsSync(dirPath)) {
            return res.status(400).json({ message: 'No documents uploaded' });
        }

        let caseDoc = await CaseArgs.findOne({ caseId });

        if (!caseDoc) {
            // Call first API with file upload
            const form = new FormData();
            // Append all files in the directory to the form
            fs.readdirSync(dirPath).forEach(file => {
                console.log('Adding file:', file); // Log to confirm
                form.append('files', fs.createReadStream(path.join(dirPath, file)));
            });



            const response1 = await axios.post(
                'http://backend.lejit.ai/api/api/citation/feed-documents/?session_id=unique_session_identifier_12345',
                form,
                { headers: form.getHeaders() }
            );


            if (response1.status === 200) {
                // Call second API
                const response2 = await axios.post(
                    'http://backend.lejit.ai/api/api/citation/query',
                    {
                        session_id: 'unique_session_identifier_12345',
                        question: 'give some arguments'
                    }
                )
                console.log(response2.data.response);

                // Save to MongoDB
                caseDoc = new CaseArgs({
                    caseId,
                    arguments:response2.data.response // Remove any null values
                });
                await caseDoc.save();
            }
        }

        res.json({ caseId, arguments: caseDoc.arguments });
    } catch (error) {
        console.error('Error details:', error.response?.data || error.message);

        res.status(500).json({ error: error.message });
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
