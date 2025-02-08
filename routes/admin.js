// routes/admin.js
const express = require('express');
const Settings = require('../models/Settings');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

// Add or update ChatGPT API key
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

// Get the ChatGPT API key (admin only)
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

// Get users
router.get('/get-users', authenticateToken, async (req, res) => {
    try {
        const users = await User.find({}, 'username _id validated');
        res.status(200).json({ status: true, message: 'Users retrieved successfully', data: users });
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
