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


// Update user status
router.patch('/users/:userId', authenticateToken, authorizeAdmin, async (req, res) => {
    const { userId } = req.params;
    const { status, reason } = req.body;

    try {
        if (!status || !['active', 'suspended'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.status = status;
        if (status === 'suspended' && reason) {
            user.suspensionReason = reason;
        } else {
            user.suspensionReason = undefined;
        }

        await user.save();

        res.status(200).json({ message: `User status updated to ${status}` });
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({ message: 'Failed to update user status. Please try again later.' });
    }
});

//delete user

router.delete('/users/:userId', authenticateToken, authorizeAdmin, async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await user.remove();

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Failed to delete user. Please try again later.' });
    }
});



// Add users to law firm
router.post('/law-firms/:firmId/users', authenticateToken, authorizeAdmin, async (req, res) => {
    const { firmId } = req.params;
    const { userIds } = req.body;

    try {
        const lawFirm = await LawFirm.findById(firmId);
        if (!lawFirm) {
            return res.status(404).json({ message: 'Law firm not found' });
        }

        const users = await User.find({ _id: { $in: userIds } });
        if (users.length !== userIds.length) {
            return res.status(400).json({ message: 'Some users not found' });
        }

        const teamMembers = users.map(user => ({
            personalDetails: {
                name: user.username,
                email: user.email,
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
                lawyerType: 'Member',
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
            password: user.password,
            createdBy: user._id
        }));

        await TeamMember.insertMany(teamMembers);

        res.status(201).json({ message: 'Users added to law firm successfully' });
    } catch (error) {
        console.error('Error adding users to law firm:', error);
        res.status(500).json({ message: 'Failed to add users to law firm. Please try again later.' });
    }
});

// Get law firm details
router.get('/law-firms/:firmId', authenticateToken, authorizeAdmin, async (req, res) => {
    const { firmId } = req.params;

    try {
        const lawFirm = await LawFirm.findById(firmId).populate('createdBy', 'username email');
        if (!lawFirm) {
            return res.status(404).json({ message: 'Law firm not found' });
        }

        res.status(200).json(lawFirm);
    } catch (error) {
        console.error('Error fetching law firm details:', error);
        res.status(500).json({ message: 'Failed to fetch law firm details. Please try again later.' });
    }
});



module.exports = router;
