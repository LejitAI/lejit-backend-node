const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');
const router = express.Router();

// Register a new user (Citizen, Law Firm, Corporate)
router.post('/register', async (req, res) => {
    const { role, username, email, password, confirmPassword, law_firm_name, company_name } = req.body;

    try {
        // Validate required fields
        if (!role || !username || !email || !password || !confirmPassword) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Ensure passwords match
        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email or Username is already registered' });
        }

        // Additional role-specific validations
        if (role === 'law_firm' && !law_firm_name) {
            return res.status(400).json({ message: 'Law firm name is required for law firms' });
        }

        if (role === 'corporate' && !company_name) {
            return res.status(400).json({ message: 'Company name is required for corporates' });
        }

        // Create and save new user
        const newUser = new User({
            role,
            username,
            email,
            password,
            law_firm_name: role === 'law_firm' ? law_firm_name : undefined,
            company_name: role === 'corporate' ? company_name : undefined,
        });

        await newUser.save();
        res.status(201).json({ message: `${role} registered successfully` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to register user. Please try again later.' });
    }
});

// Login (Shared for all roles)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

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
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, role: user.role });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to log in. Please try again later.' });
    }
});

// Fetch User Profile (Shared for all roles)
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch user profile' });
    }
});

// (Optional) Admin validates the user (if needed in the future)
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
        res.json({ message: `${user.role} validated successfully` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to validate user. Please try again later.' });
    }
});

module.exports = router;
