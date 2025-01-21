const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const TeamMember = require('../models/TeamMember');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');
const router = express.Router();
const ImageForm = require('../models/LawFirm'); // Import the LawFirm model


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

        // If it's a law firm user, create a law firm entry
        if (role === 'law_firm') {
            const lawFirmDetails = new ImageForm({
                lawFirmDetails: {
                    lawFirmName: law_firm_name,
                    operatingSince: '2023', // Example data, replace with actual input
                    yearsOfExperience: '10', // Example data, replace with actual input
                    specialization: 'General Practice', // Example data, replace with actual input
                    contactInfo: {
                        email: email,
                        mobile: '1234567890', // Example data, replace with actual input
                        address: {
                            line1: '123 Main St', // Example data, replace with actual input
                            city: 'City', // Example data, replace with actual input
                            state: 'State', // Example data, replace with actual input
                            postalCode: '12345', // Example data, replace with actual input
                        },
                    },
                },
                professionalDetails: {
                    lawyerType: 'Owner',
                    caseDetails: {
                        caseSolvedCount: 0,
                        caseBasedBillRate: '100',
                        timeBasedBillRate: '50',
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
                createdBy: newUser._id,
            });

            await lawFirmDetails.save();
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
                law_firm_name: newUser.law_firm_name
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to register user. Please try again later.' });
    }
});

module.exports = router;
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
        // Fetch user by ID
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Fetch additional details for law firms
        let teamMemberDetails = null;
        if (user.role === 'law_firm') {
            teamMemberDetails = await TeamMember.findOne({ createdBy: user._id })
                .select('-password');
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

// Add this new route to your existing auth.js
router.post('/signout', authenticateToken, async (req, res) => {
    try {
        // You could implement a token blacklist here if needed
        res.status(200).json({ message: 'Signed out successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to sign out' });
    }
});

module.exports = router;
