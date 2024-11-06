// routes/admin.js
const express = require('express');
const Settings = require('../models/Settings');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');
const router = express.Router();
const User = require('../models/User');

// Add or update ChatGPT API key
router.post('/set-chatgpt-api-key', authenticateToken, authorizeAdmin, async (req, res) => {
    const { chatgptApiKey } = req.body;

    if (!chatgptApiKey) {
        return res.status(400).json({ message: 'API key is required' });
    }

    try {
        let settings = await Settings.findOne();
        if (settings) {
            // Update existing API key
            settings.chatgptApiKey = chatgptApiKey;
            settings.updatedAt = Date.now();
            await settings.save();
        } else {
            // Create a new settings record with the API key
            settings = new Settings({ chatgptApiKey });
            await settings.save();
        }
        res.status(200).json({ message: 'ChatGPT API key saved successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/get-users', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const users = await User.find({}, 'username _id validated'); // Only select the fields we need
        res.status(200).json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});


// Get the ChatGPT API key (admin only)
router.get('/get-chatgpt-api-key', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const settings = await Settings.findOne();
        if (!settings || !settings.chatgptApiKey) {
            return res.status(404).json({ message: 'API key not found' });
        }
        res.status(200).json({ chatgptApiKey: settings.chatgptApiKey });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
