const express = require('express');
const { OpenAI } = require('openai');
const router = express.Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post('/format', async (req, res) => {
    try {
        const { text } = req.body;

        const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: 'Suggest formatting for the following text (e.g., bold, h1, h2, italics):' },
                { role: 'user', content: text },
            ],
        });

        res.json({ formattedText: response.choices[0].message.content });
    } catch (error) {
        console.error('Formatting failed:', error);
        res.status(500).json({ error: 'Formatting failed' });
    }
});

module.exports = router;
