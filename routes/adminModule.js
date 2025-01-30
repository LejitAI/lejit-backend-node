const express = require('express');
const User = require('../models/User');
const TeamMember = require('../models/TeamMember');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');
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


// Create new user
router.post('/users', authenticateToken, authorizeAdmin, async (req, res) => {
    const { email, name, role, firmId } = req.body;

    try {
        if (!email || !name || !role) {
            return res.status(400).json({ message: 'Email, name, and role are required' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email is already registered' });
        }

        const newUser = new User({
            email,
            username: name,
            role,
            law_firm_name: role === 'lawFirm' ? firmId : undefined,
            company_name: role === 'corporate' ? firmId : undefined,
            password: 'defaultPassword123' // Set a default password or generate one
        });

        await newUser.save();

        res.status(201).json({ 
            message: 'User created successfully',
            user: {
                id: newUser._id,
                email: newUser.email,
                name: newUser.username,
                role: newUser.role,
                firmId: newUser.law_firm_name || newUser.company_name
            }
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Failed to create user. Please try again later.' });
    }
});


module.exports = router;
