const express = require('express');
const multer = require('multer');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { fromPath } = require('pdf2pic');
const OpenAI = require('openai');
const path = require('path');

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'ocrpdfs/'),
    filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });
const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];

/**
 * @swagger
 * /api/ocr:
 *   post:
 *     summary: Extract text from uploaded image or PDF
 *     description: Upload a PDF or image file, convert to text using OpenAI API.
 *     tags:
 *       - OCR
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Extracted text from the file
 *       400:
 *         description: No file uploaded or unsupported format
 *       500:
 *         description: File processing failed
 */
router.post('/', upload.single('file'), async (req, res) => {
    let imageFiles = []; // Store generated image paths for cleanup

    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const filePath = req.file.path;
        const fileName = req.file.originalname;
        const fileExt = path.extname(fileName).toLowerCase();

        console.log(`File uploaded: ${fileName}`);
        console.log(`File type: ${fileExt}`);

        if (!allowedExtensions.includes(fileExt)) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ error: 'Unsupported file format. Upload a PDF or an image.' });
        }

        let extractedText = '';

        if (fileExt === '.pdf') {
            // PDF to Image Conversion
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

            for (let i = 1; i <= numPages; i++) {
                await convert(i, { responseType: 'image' });
                imageFiles.push(`ocrpdfs/pdf_page.${i}.png`);
            }

            console.log('Conversion complete. Processing images with OpenAI...');

            let textArray = [];
            for (const imagePath of imageFiles) {
                const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' });

                const response = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'user', content: [{ type: 'text', text: 'Extract all text from this handwritten document. Do not include extra information.' },
                        { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } }] }
                    ],
                    max_tokens: 1000,
                });

                textArray.push(response.choices[0].message.content);
            }

            extractedText = textArray.join('\n');

        } else {
            // Image Processing
            const imageBase64 = fs.readFileSync(filePath, { encoding: 'base64' });

            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'user', content: [{ type: 'text', text: 'Extract all text from this image, including handwriting. Be professional and send only text.' },
                    { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }] }
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
        // Cleanup uploaded file
        try {
            if (req.file) fs.unlinkSync(req.file.path);
        } catch (err) {
            console.warn(`Failed to delete uploaded file: ${req.file.path}`, err);
        }

        // Cleanup generated images
        for (const imagePath of imageFiles) {
            try {
                fs.unlinkSync(imagePath);
            } catch (err) {
                console.warn(`Failed to delete image: ${imagePath}`, err);
            }
        }
    }
});

module.exports = router;
