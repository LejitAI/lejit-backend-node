const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');
const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
    const { userType, law_firm, username, email, password } = req.body;

    try {
        if (!userType) {
            return res.status(400).json({ message: 'User type is required' });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email or Username is already registered' });
        }

        // Create and save new user
        let newUser;
        if (userType === 'lawfirm') {
            if (!law_firm) {
                return res.status(400).json({ message: 'Law firm details are required for lawfirm users' });
            }
            newUser = new User({ law_firm, username, email, password, userType });
        } else if (userType === 'citizen' || userType === 'corporate') {
            newUser = new User({ username, email, password, userType });
        } else {
            return res.status(400).json({ message: 'Invalid user type' });
        }

        await newUser.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to register user. Please try again later.' });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'User not found. Please register first.' });
        }

        // Validate password
        if (!(await user.matchPassword(password))) {
            return res.status(401).json({ message: 'Incorrect password' });
        }

        // Generate token
        const token = jwt.sign(
            { id: user._id, userType: user.userType },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        
        res.json({ token, userType: user.userType });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to log in. Please try again later.' });
    }
});

// Admin validates the user
router.patch('/validate-user/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        // Find user by ID
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update validation status
        user.validated = true;
        await user.save();
        res.json({ message: 'User validated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to validate user. Please try again later.' });
    }
});

module.exports = router;
