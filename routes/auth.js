const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db'); // PostgreSQL connection
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');
const User = require('../models/User');
const TeamMember = require('../models/TeamMember');
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

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email or Username is already registered' });
        }

        if (role === 'law_firm' && !law_firm_name) {
            return res.status(400).json({ message: 'Law firm name is required for law firms' });
        }

        if (role === 'corporate' && !company_name) {
            return res.status(400).json({ message: 'Company name is required for corporates' });
        }

        const newUser = new User({
            role,
            username,
            email,
            password,
            law_firm_name: role === 'law_firm' ? law_firm_name : undefined,
            company_name: role === 'corporate' ? company_name : undefined,
        });

        await newUser.save();

        if (role === 'law_firm') {
            const teamMember = new TeamMember({
                personalDetails: {
                    name: username,
                    email: email,
                    mobile: '',
                    gender: '',
                    yearsOfExperience: 0,
                    address: {
                        line1: '',
                        line2: '',
                        city: '',
                        state: '',
                        country: '',
                        postalCode: '',
                    }
                },
                professionalDetails: {
                    lawyerType: 'Owner',
                    governmentID: '',
                    degreeType: '',
                    degreeInstitution: '',
                    specialization: '',
                },
                bankAccountDetails: {
                    paymentMethod: 'Card',
                    cardDetails: {
                        cardNumber: '',
                        expirationDate: '',
                        cvv: '',
                        saveCard: false,
                    },
                    bankDetails: {
                        accountNumber: '',
                        bankName: '',
                        ifscCode: '',
                    },
                    upiId: '',
                },
                password: password,
                createdBy: newUser._id
            });

            await teamMember.save();
        }

        const token = jwt.sign(
            { id: newUser._id, role: newUser.role },
            process.env.JWT_SECRET
        );

        res.status(201).json({ 
            message: `${role} registered successfully`,
            token,
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role,
                law_firm_name: newUser.law_firm_name
            }
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

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'User not found. Please register first.' });
        }

        if (!(await user.matchPassword(password))) {
            return res.status(401).json({ message: 'Incorrect password' });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET
        );
        
        // Get team member details if it's a law firm
        let teamMemberDetails = null;
        if (user.role === 'law_firm') {
            teamMemberDetails = await TeamMember.findOne({ 'personalDetails.email': email })
                .select('-password');
        }

        res.json({ 
            token, 
            role: user.role,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                law_firm_name: user.law_firm_name,
                teamMemberDetails: teamMemberDetails
            }
        });
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

        let teamMemberDetails = null;
        if (user.role === 'law_firm') {
            teamMemberDetails = await TeamMember.findOne({ createdBy: user._id })
                .select('-password');
        }

        res.json({
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                law_firm_name: user.law_firm_name || null,
                teamMemberDetails: teamMemberDetails || null,
            },
        });
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

// Signout
router.post('/signout', authenticateToken, async (req, res) => {
    try {
        res.status(200).json({ message: 'Signed out successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to sign out' });
    }
});

module.exports = router;
