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

module.exports = router;
