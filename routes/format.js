const express = require('express');
const { OpenAI } = require('openai');
require('dotenv').config();
const router = express.Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * @swagger
 * /api/format:
 *   post:
 *     summary: Suggest text formatting
 *     description: Uses OpenAI's GPT-4 to suggest formatting (e.g., bold, headings) for the provided text.
 *     tags: [Format]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: The text to be formatted
 *                 example: "This is some plain text that needs formatting."
 *     responses:
 *       200:
 *         description: Successful formatting suggestion
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 formattedText:
 *                   type: string
 *                   description: The formatted text suggested by OpenAI
 *                   example: "**This is some** _plain text_ that needs formatting. # Heading 1"
 *       500:
 *         description: Formatting failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Formatting failed
 */
router.post('/', async (req, res) => {
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