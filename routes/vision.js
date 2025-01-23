const express = require('express');
const multer = require('multer');
const { OpenAI } = require('openai');
require('dotenv').config();
const fs = require('fs');
const router = express.Router();

const upload = multer({ dest: 'uploads/' });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post('/', upload.single('image'), async (req, res) => {
    try {
        const imagePath = req.file.path;
        const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' });

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: 'Extract all text from this image, including handwriting. dont dive anything like here is your extracted text or tell me about furture things like this as i will deploy it for comercial pourposes' },
                        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
                    ],
                },
            ],
            max_tokens: 1000,
        });

        const extractedText = response.choices[0].message.content;
        res.json({ text: extractedText });
    } catch (error) {
        console.error('OpenAI Vision failed:', error);
        res.status(500).json({ error: 'OpenAI Vision failed' });
    }
});

module.exports = router;
