const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
require('dotenv').config();

const router = express.Router();
const tempFolderPath = 'temp';

// Check if 'temp' folder exists, if not, create it
if (!fs.existsSync(tempFolderPath)) {
  fs.mkdirSync(tempFolderPath);
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Setup multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'temp/');
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const tempFileName = `temp_${Date.now()}${ext}`;
        cb(null, tempFileName);
    },
});

const upload = multer({ storage });

// Endpoint for Speech-to-Text (STT)
router.post('/', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No audio file uploaded.');
        }

        const audioPath = req.file.path;

        const response = await openai.audio.transcriptions.create({
            model: 'whisper-1',
            file: fs.createReadStream(audioPath),
            language: 'en', // Specify language if needed
        });

        fs.unlink(audioPath, (err) => {
            if (err) {
                console.error('Error deleting file:', err);
            }
        });

        res.json({ transcription: response.text });
    } catch (error) {
        console.error('Error in STT:', error);
        res.status(500).send('Error processing audio');
    }
});

module.exports = router;
