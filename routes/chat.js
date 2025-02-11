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
        try {
            return JSON.parse(data);
        } catch (error) {
            console.error('Error parsing JSON:', error.message);
            return {};
        }
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

/**
 * @swagger
 * /api/chat/upload:
 *   post:
 *     summary: Upload a document for a case
 *     description: Uploads a document to the specified case directory. Allowed file types are PDF, DOC, DOCX, and TXT.
 *     tags: [Case Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               caseId:
 *                 type: string
 *                 description: ID of the case to upload the document to
 *               tags:
 *                 type: string
 *                 description: Comma-separated tags for the document
 *               document:
 *                 type: string
 *                 format: binary
 *                 description: The document file to upload (PDF, DOC, DOCX, TXT)
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: File uploaded successfully!
 *                 filePath:
 *                   type: string
 *                   example: uploads/12345/1678886400000-document.pdf
 *                 caseId:
 *                   type: string
 *                   example: 12345
 *                 tags:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["tag1", "tag2"]
 *       400:
 *         description: Bad request - Missing caseId or no file uploaded, or invalid file type
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: caseId is required.
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       500:
 *         description: Error occurred while uploading the file.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Error occurred while uploading the file.
 */
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

/**
 * @swagger
 * /api/chat/documents:
 *   get:
 *     summary: Retrieve documents for a case
 *     description: Retrieves a list of documents associated with a given caseId.
 *     tags: [Case Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: caseId
 *         required: true
 *         description: ID of the case to retrieve documents for
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Documents retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Documents retrieved successfully!
 *                 documents:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: document.pdf
 *                       url:
 *                         type: string
 *                         example: http://localhost:5000/backend/uploads/12345/document.pdf
 *                 caseId:
 *                   type: string
 *                   example: 12345
 *                 tags:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["tag1", "tag2"]
 *       400:
 *         description: Bad request - Missing caseId
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: caseId is required.
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       404:
 *         description: No documents found for this case.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No documents found for this case.
 *       500:
 *         description: Error occurred while retrieving documents.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Error occurred while retrieving documents.
 */
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
/**
 * @swagger
 * /api/chat/documents:
 *   delete:
 *     summary: Delete a document for a case
 *     description: Deletes a specific document from a case's directory.
 *     tags: [Case Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: caseId
 *         required: true
 *         description: ID of the case containing the document
 *         schema:
 *           type: string
 *       - in: query
 *         name: fileName
 *         required: true
 *         description: Name of the file to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: File deleted successfully!
 *                 caseId:
 *                   type: string
 *                   example: 12345
 *                 fileName:
 *                   type: string
 *                   example: document.pdf
 *       400:
 *         description: Bad request - Missing caseId or fileName
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Both caseId and fileName are required.
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       404:
 *         description: File not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: File not found.
 *       500:
 *         description: Error occurred while deleting the file.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Error occurred while deleting the file.
 */
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

/**
 * @swagger
 * /api/chat/get-case-arguments:
 *   get:
 *     summary: Get case arguments from uploaded documents
 *     description: Processes documents uploaded for a case and retrieves arguments using an external API.
 *     tags: [Case Arguments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: caseId
 *         required: true
 *         description: ID of the case to get arguments for
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Case arguments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 caseId:
 *                   type: string
 *                   example: 12345
 *                 arguments:
 *                   type: string
 *                   example: "Arguments for the case will be displayed here."
 *       400:
 *         description: Bad request - Invalid caseId or no documents uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invalid caseId
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       500:
 *         description: Internal server error or error in external API calls
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */
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

/**
 * @swagger
 * /api/chat/delete-case-arguments:
 *   delete:
 *     summary: Delete case arguments
 *     description: Deletes the stored case arguments for a given caseId.
 *     tags: [Case Arguments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: caseId
 *         required: true
 *         description: ID of the case to delete arguments for
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Case arguments deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Arguments for caseId 12345 have been successfully deleted
 *       400:
 *         description: Bad request - Missing caseId
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: caseId is required
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       404:
 *         description: No arguments found for the provided caseId
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No arguments found for the provided caseId
 *       500:
 *         description: Error occurred while deleting case arguments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: An error occurred while deleting case arguments
 */
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