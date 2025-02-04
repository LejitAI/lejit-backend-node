const express = require('express');
const multer = require('multer');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { fromPath } = require('pdf2pic');
const OpenAI = require('openai');

const router = express.Router();
const upload = multer({ dest: 'ocrpdfs/' });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post('/', upload.single('file'), async (req, res) => {
    try {
        const filePath = req.file.path;
        const fileType = req.file.mimetype;
        let extractedText = '';
        console.log('File uploaded:', req.file.originalname);
        console.log('File type:', fileType);

        if (fileType === 'application/pdf') {
            // Step 1: Convert PDF pages to images
            const outputPath = `ocrpdfs/page`; // Image output prefix
            const convert = fromPath(filePath, {
                density: 300, // High resolution for better OCR accuracy
                saveFilename: 'pdf_page',
                savePath: 'ocrpdfs',
                format: 'png', // Output format
                width: 1200,
                height: 1600
            });

            const pdfBuffer = fs.readFileSync(filePath);
            const pdfData = await pdfParse(pdfBuffer);
            const numPages = pdfData.numpages;

            console.log(`PDF has ${numPages} pages. Converting to images...`);

            let imageFiles = [];
            for (let i = 1; i <= numPages; i++) {
                await convert(i, { responseType: 'image' });
                imageFiles.push(`ocrpdfs/pdf_page.${i}.png`);
            }

            console.log('Conversion complete. Processing images with OpenAI...');

            // Step 2: Extract text from each image using OpenAI Vision
            let textArray = [];
            for (const imagePath of imageFiles) {
                const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' });

                const response = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: 'Extract all text from this handwritten document. Do not include extra information.' },
                                { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } },
                            ],
                        },
                    ],
                    max_tokens: 1000,
                });

                textArray.push(response.choices[0].message.content);
            }

            extractedText = textArray.join('\n'); // Combine all pages' text

        } else if (fileType.startsWith('image/')) {
            // Process images normally
            const imageBase64 = fs.readFileSync(filePath, { encoding: 'base64' });

            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: 'Extract all text from this image, including handwriting.' },
                            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
                        ],
                    },
                ],
                max_tokens: 1000,
            });

            extractedText = response.choices[0].message.content;
        } else {
            return res.status(400).json({ error: 'Unsupported file format. Please upload a PDF or an image.' });
        }

        res.json({ text: extractedText });

    } catch (error) {
        console.error('Error processing file:', error);
        res.status(500).json({ error: 'File processing failed' });
    } finally {
        // Cleanup: remove uploaded files
        fs.unlinkSync(req.file.path);
    }
});

module.exports = router;
