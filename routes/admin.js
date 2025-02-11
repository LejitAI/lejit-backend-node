const express = require('express');
const Settings = require('../models/Settings');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

/**
 * @swagger
 * /api/admin/set-chatgpt-api-key:
 *   post:
 *     summary: Add or update ChatGPT API key
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               chatgptApiKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: ChatGPT API key saved successfully
 *       400:
 *         description: API key is required
 *       500:
 *         description: Server error
 */
router.post('/set-chatgpt-api-key', authenticateToken, async (req, res) => {
    const { chatgptApiKey } = req.body;

    if (!chatgptApiKey) {
        return res.status(400).json({ status: false, message: 'API key is required', data: {} });
    }

    try {
        let settings = await Settings.findOne();
        if (settings) {
            settings.chatgptApiKey = chatgptApiKey;
            settings.updatedAt = Date.now();
            await settings.save();
        } else {
            settings = new Settings({ chatgptApiKey });
            await settings.save();
        }
        res.status(200).json({ status: true, message: 'ChatGPT API key saved successfully', data: {} });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Server error', data: {} });
    }
});

/**
 * @swagger
 * /api/admin/get-chatgpt-api-key:
 *   get:
 *     summary: Get the ChatGPT API key (admin only)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: API key retrieved successfully
 *       404:
 *         description: API key not found
 *       500:
 *         description: Server error
 */
router.get('/get-chatgpt-api-key', authenticateToken, async (req, res) => {
    try {
        const settings = await Settings.findOne();
        if (!settings || !settings.chatgptApiKey) {
            return res.status(404).json({ status: false, message: 'API key not found', data: {} });
        }
        res.status(200).json({ status: true, message: 'API key retrieved successfully', data: { chatgptApiKey: settings.chatgptApiKey } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Server error', data: {} });
    }
});

/**
 * @swagger
 * /api/admin/get-users:
 *   get:
 *     summary: Get users with pagination & search
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of results per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query for username
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/get-users', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const query = search
            ? { username: { $regex: search, $options: 'i' } }
            : {};

        const users = await User.find(query, 'username _id validated')
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const totalUsers = await User.countDocuments(query);

        res.status(200).json({
            status: true,
            message: 'Users retrieved successfully',
            data: {
                users,
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalUsers / limit),
                totalUsers,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Server error', data: {} });
    }
});

// Import routes from other files
router.use('/case', require('./case'));
router.use('/client', require('./client'));
router.use('/law-firm', require('./lawFirm'));

module.exports = router;
