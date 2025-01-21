const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const TeamMember = require('../models/TeamMember');
const ImageForm = require('../models/LawFirm'); // Import LawFirm model
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

        // If it's a law firm user, create a law firm entry and a team member entry
        if (role === 'law_firm') {
            // Create Law Firm entry
            const newLawFirm = new ImageForm({
                lawFirmDetails: {
                    lawFirmName: law_firm_name,
                    operatingSince: new Date().getFullYear().toString(),
                    yearsOfExperience: '0',
                    specialization: '',
                    contactInfo: {
                        email: email,
                        mobile: '',
                        address: {
                            line1: '',
                            line2: '',
                            city: '',
                            state: '',
                            postalCode: '',
                        },
                    },
                },
                professionalDetails: {
                    lawyerType: 'Law Firm',
                    caseDetails: {
                        caseSolvedCount: 0,
                        caseBasedBillRate: '',
                        timeBasedBillRate: '',
                        previousCases: [],
                    },
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
                createdBy: newUser._id, // Associate the law firm with the registered user
            });

            await newLawFirm.save();

            // Create a team member entry for the law firm owner
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
                    },
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
                createdBy: newUser._id,
            });

            await teamMember.save();
        }

        // Generate token without expiration
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
                law_firm_name: newUser.law_firm_name,
            },
        });
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

        // Generate token without expiration
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET
        );

        // Get team member details if it's a law firm
        let teamMemberDetails = null;
        if (user.role === 'law_firm') {
            teamMemberDetails = await TeamMember.findOne({ 'personalDetails.email': email }).select('-password');
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
                teamMemberDetails: teamMemberDetails,
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
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Fetch additional details for law firms
        let teamMemberDetails = null;
        if (user.role === 'law_firm') {
            teamMemberDetails = await TeamMember.findOne({ createdBy: user._id }).select('-password');
        }

        // Return user profile
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

module.exports = router;
