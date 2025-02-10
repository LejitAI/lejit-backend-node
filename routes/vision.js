const express = require('express');
const multer = require('multer');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { fromPath } = require('pdf2pic');
const OpenAI = require('openai');
const path = require('path');

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🔹 Multer storage setup: Save files with their original names
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'ocrpdfs/'); // Save in "ocrpdfs" folder
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); // Save with original name
    }
});

const upload = multer({ storage });

// 🔹 Allowed file types
const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];

router.post('/', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filePath = req.file.path;
        const fileName = req.file.originalname;
        const fileExt = path.extname(fileName).toLowerCase();

        console.log(`File uploaded: ${fileName}`);
        console.log(`File type: ${fileExt}`);

        // 🔹 Check if file type is allowed
        if (!allowedExtensions.includes(fileExt)) {
            fs.unlinkSync(filePath); // Delete unsupported file
            return res.status(400).json({ error: 'Unsupported file format. Please upload a PDF or an image (jpg, png).' });
        }

        let extractedText = '';

        if (fileExt === '.pdf') {
            // 📌 Handle PDF Extraction
            const outputPath = `ocrpdfs/page`; // Image output prefix
            const convert = fromPath(filePath, {
                density: 300,
                saveFilename: 'pdf_page',
                savePath: 'ocrpdfs',
                format: 'png',
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

            // 🔹 Process each image with OpenAI Vision
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

            extractedText = textArray.join('\n'); // Combine text from all pages

        } else {
            // 📌 Handle Image Extraction (jpg, png)
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
        }

        res.json({ text: extractedText });

    } catch (error) {
        console.error('Error processing file:', error);
        res.status(500).json({ error: 'File processing failed' });
    } finally {
        // Cleanup: remove uploaded files
        try {
            fs.unlinkSync(req.file.path);
        } catch (err) {
            console.warn(`Failed to delete file: ${req.file.path}`, err);
        }
    }
});

module.exports = router;
