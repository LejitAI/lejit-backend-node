const express = require('express');
const User = require('../models/User');
const TeamMember = require('../models/TeamMember');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const LawFirm = require('../models/LawFirm'); // Ensure you have this model
const router = express.Router();
// Get all users with pagination and filters
/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users with pagination and filters
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number (default is 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of results per page (default is 10)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter users by status (active/inactive)
 *       - in: query
 *         name: searchTerm
 *         schema:
 *           type: string
 *         description: Search query for username, email, company, or law firm
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *       500:
 *         description: Failed to fetch users
 */
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
/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     summary: Create a new user (Admin only)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *               law_firm_name:
 *                 type: string
 *                 description: Required if role is 'law_firm'
 *               company_name:
 *                 type: string
 *                 description: Required if role is 'corporate'
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Failed to create user
 */
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
/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     summary: Create a new user (Admin only)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *               law_firm_name:
 *                 type: string
 *                 description: Required if role is 'law_firm'
 *               company_name:
 *                 type: string
 *                 description: Required if role is 'corporate'
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Failed to create user
 */
router.post('/users', authenticateToken, authorizeAdmin, async (req, res) => {
    const { role, username, email, password, confirmPassword, law_firm_name, company_name } = req.body;

    try {
        // Validate required fields
        if (!role || !username || !email || !password || !confirmPassword) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Validate password match
        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email or Username is already registered' });
        }

        // Validate role-specific fields
        if (role === 'law_firm' && !law_firm_name) {
            return res.status(400).json({ message: 'Law firm name is required for law firms' });
        }
        if (role === 'corporate' && !company_name) {
            return res.status(400).json({ message: 'Company name is required for corporates' });
        }

        // Hash the password before saving
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = new User({
            role,
            username,
            email,
            password: hashedPassword, // Store hashed password
            law_firm_name: role === 'law_firm' ? law_firm_name : undefined,
            company_name: role === 'corporate' ? company_name : undefined,
        });

        await newUser.save();

        // If the user is a law firm owner, create law firm and team member records
        if (role === 'law_firm') {
            const newLawFirm = new LawFirm({
                name: law_firm_name,
                createdBy: newUser._id
            });
            await newLawFirm.save();

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
                password: hashedPassword, // Store hashed password
                createdBy: newUser._id
            });

            await teamMember.save();
        }

        // Generate JWT token for the new user
        const token = jwt.sign(
            { id: newUser._id, role: newUser.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: `${role} created successfully`,
            token,
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role,
                law_firm_name: newUser.law_firm_name,
                company_name: newUser.company_name
            }
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Failed to create user. Please try again later.' });
    }
});


// Update user status
/**
 * @swagger
 * /api/admin/users/{userId}:
 *   patch:
 *     summary: Update user status (Admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, suspended]
 *               reason:
 *                 type: string
 *                 description: Required if suspending user
 *     responses:
 *       200:
 *         description: User status updated
 *       400:
 *         description: Invalid status
 *       404:
 *         description: User not found
 *       500:
 *         description: Failed to update status
 */
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
/**
 * @swagger
 * /api/admin/users/{userId}:
 *   delete:
 *     summary: Delete a user (Admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to delete
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Failed to delete user
 */
router.delete('/users/:userId', authenticateToken, authorizeAdmin, async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Delete related team members if user is a law firm owner
        if (user.role === 'law_firm') {
            await LawFirm.deleteOne({ createdBy: user._id });
            await TeamMember.deleteMany({ createdBy: user._id });
        }

        // Delete the user
        await User.findByIdAndDelete(userId);

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Failed to delete user. Please try again later.' });
    }
});




// Add users to law firm
/**
 * @swagger
 * /api/admin/law-firms/{firmId}/users:
 *   post:
 *     summary: Add users to a law firm
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: firmId
 *         required: true
 *         schema:
 *           type: string
 *         description: Law firm ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of user IDs to add to the law firm
 *     responses:
 *       201:
 *         description: Users added to law firm successfully
 *       400:
 *         description: Some users not found
 *       500:
 *         description: Failed to add users
 */
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
/**
 * @swagger
 * /api/admin/law-firms/{firmId}:
 *   get:
 *     summary: Get law firm details
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: firmId
 *         required: true
 *         schema:
 *           type: string
 *         description: Law firm ID
 *     responses:
 *       200:
 *         description: Law firm details retrieved successfully
 *       404:
 *         description: Law firm not found
 *       500:
 *         description: Failed to fetch law firm details
 */
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
