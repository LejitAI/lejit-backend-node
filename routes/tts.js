
const express = require('express');
const { OpenAI } = require('openai');
require('dotenv').config();

const router = express.Router();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to stream audio from OpenAI
async function streamAudio(text) {
    const response = await openai.audio.speech.create({
        model: 'tts-1',
        input: text,
        voice: 'alloy', // Choose desired voice
    });
    return response.body;
}

// Endpoint for Text-to-Speech (TTS)
/**
 * @swagger
 * /api/tts:
 *   post:
 *     summary: Convert text to speech
 *     description: Synthesize speech from text using OpenAI's TTS model and stream the audio response.
 *     tags: [Text-to-Speech]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 description: Text to be converted to speech.
 *     responses:
 *       '200':
 *         description: Successful audio stream
 *         content:
 *           audio/mpeg:
 *             schema:
 *               type: string
 *               format: binary
 *               description: Audio stream in MPEG format.
 *       '400':
 *         description: Bad request - Text input is required
 *       '500':
 *         description: Error generating speech or OpenAI API error
 */
router.post('/', async (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).send('Text input is required.');
        }

        const chunks = text.match(/[^.!?]+[.!?]+/g) || [text];

        res.setHeader('Content-Type', 'audio/mpeg');

        const audioStreams = await Promise.all(chunks.map(chunk => streamAudio(chunk)));

        for (const audioStream of audioStreams) {
            audioStream.pipe(res, { end: false });

            await new Promise((resolve) => {
                audioStream.on('end', resolve);
                audioStream.on('error', (err) => {
                    console.error(err);
                    res.status(500).send('Error streaming audio');
                });
            });
        }

        res.end();
    } catch (error) {
        console.error('Error in TTS:', error);
        res.status(500).send('Error generating speech');
    }
});

module.exports = router;
