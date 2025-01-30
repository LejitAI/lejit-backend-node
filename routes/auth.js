const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db'); // PostgreSQL connection
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');
const router = express.Router();

// Register a new user (Citizen, Law Firm, Corporate)
router.post('/register', async (req, res) => {
    const { role, username, email, password, confirmPassword, law_firm_name, company_name } = req.body;

    try {
        if (!role || !username || !email || !password || !confirmPassword) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        // Check if email already exists
        const emailExistsQuery = 'SELECT * FROM users WHERE email = $1';
        const existingUser = await pool.query(emailExistsQuery, [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: 'Email or Username is already registered' });
        }

        if (role === 'law_firm' && !law_firm_name) {
            return res.status(400).json({ message: 'Law firm name is required for law firms' });
        }

        if (role === 'corporate' && !company_name) {
            return res.status(400).json({ message: 'Company name is required for corporates' });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert the new user into the database
        const insertUserQuery = `
            INSERT INTO users (role, username, email, password, law_firm_name, company_name)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
        `;
        const values = [
            role,
            username,
            email,
            hashedPassword,
            role === 'law_firm' ? law_firm_name : null,
            role === 'corporate' ? company_name : null,
        ];
        const result = await pool.query(insertUserQuery, values);
        const newUser = result.rows[0];

        const token = jwt.sign(
            { id: newUser.id, role: newUser.role },
            process.env.JWT_SECRET
        );

        res.status(201).json({
            message: `${role} registered successfully`,
            token,
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role,
                law_firm_name: newUser.law_firm_name,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to register user. Please try again later.' });
    }
});


//login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Check if user exists
        const findUserQuery = 'SELECT * FROM users WHERE email = $1';
        const userResult = await pool.query(findUserQuery, [email]);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'User not found. Please register first.' });
        }

        // Validate password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Incorrect password' });
        }

        // Generate token
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                law_firm_name: user.law_firm_name || null,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to log in. Please try again later.' });
    }
});



// Fetch User Profile (Shared for all roles)
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        // Fetch user by ID
        const findUserQuery = 'SELECT id, username, email, role, law_firm_name, company_name FROM users WHERE id = $1';
        const userResult = await pool.query(findUserQuery, [req.user.id]);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ user });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ message: 'Failed to fetch user profile' });
    }
});

// Admin validates the user
router.patch('/validate-user/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        // Update the validation status of a user
        const validateUserQuery = 'UPDATE users SET validated = true WHERE id = $1 RETURNING *';
        const result = await pool.query(validateUserQuery, [req.params.id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = result.rows[0];
        res.json({ message: `${user.role} validated successfully` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to validate user. Please try again later.' });
    }
});

// Sign out route (optional for token blacklisting)
router.post('/signout', authenticateToken, async (req, res) => {
    try {
        // Implement token blacklisting here if needed
        res.status(200).json({ message: 'Signed out successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to sign out' });
    }
});

module.exports = router;
