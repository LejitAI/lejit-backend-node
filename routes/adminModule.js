const express = require('express');
const User = require('../models/User');
const TeamMember = require('../models/TeamMember');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const LawFirm = require('../models/LawFirm'); // Ensure you have this model
const router = express.Router();

// Get all users with pagination and filters
router.get('/users', authenticateToken, authorizeAdmin, async (req, res) => {
    const { page = 1, limit = 10, status, searchTerm } = req.query;

    try {
        const query = {};

        if (status) {
            query.validated = status === 'active';
        }

        if (searchTerm) {
            query.$or = [
                { username: { $regex: searchTerm, $options: 'i' } },
                { email: { $regex: searchTerm, $options: 'i' } },
                { company_name: { $regex: searchTerm, $options: 'i' } },
                { law_firm_name: { $regex: searchTerm, $options: 'i' } },
            ];
        }

        const users = await User.find(query)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .select('-password');

        const totalUsers = await User.countDocuments(query);

        res.json({
            users,
            totalPages: Math.ceil(totalUsers / limit),
            currentPage: parseInt(page),
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
});

// Admin validates the user
router.patch('/validate-user/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.validated = true;
        await user.save();
        res.json({ message: `${user.role} validated successfully` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to validate user. Please try again later.' });
    }
});



// Create new user (Admin only)
router.post('/users', authenticateToken, authorizeAdmin, async (req, res) => {
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
            // Save law firm name to LawFirm database
            const newLawFirm = new LawFirm({
                name: law_firm_name,
                createdBy: newUser._id
            });
            await newLawFirm.save();

            // Save user details to TeamMember database
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
            message: `${role} created successfully`,
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
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Failed to create user. Please try again later.' });
    }
});


module.exports = router;
