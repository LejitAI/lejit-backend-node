const express = require('express');
const Settings = require('../models/Settings');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();
const OpenAI = require('openai');

// Chat with ChatGPT (validated users only)
router.post('/chat', authenticateToken, async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ message: 'Message is required' });
    }

    try {
        // Get the stored ChatGPT API key from settings
        const settings = await Settings.findOne();

        if (!settings || !settings.chatgptApiKey) {
            return res.status(404).json({ message: 'ChatGPT API key not found. Please contact the admin.' });
        }

        // Initialize OpenAI with the API key
        const openai = new OpenAI({
            apiKey: settings.chatgptApiKey, // Use the key from the settings
        });

        // Make a request to OpenAI using the official client
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", // Adjust this model as needed
            messages: [{ role: "user", content: message }]
        });

        // Return the response from OpenAI's API to the user
        res.status(200).json(completion);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error occurred while communicating with ChatGPT' });
    }
});

module.exports = router;
