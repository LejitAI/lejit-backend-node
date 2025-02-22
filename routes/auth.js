const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User'); // PostgreSQL-based user functions
const TeamMember = require('../models/TeamMember'); // PostgreSQL-based team member functions
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user (Citizen, Law Firm, Corporate)
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
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Failed to register user
 */
router.post('/register', async (req, res) => {
  const { role, username, email, password, confirmPassword, law_firm_name, company_name } = req.body;

  try {
    if (!role || !username || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }
    const existingUser = await User.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Email or Username is already registered' });
    }
    if (role === 'law_firm' && !law_firm_name) {
      return res.status(400).json({ message: 'Law firm name is required for law firms' });
    }
    if (role === 'corporate' && !company_name) {
      return res.status(400).json({ message: 'Company name is required for corporates' });
    }

    // Create the user using our PostgreSQL function
    const newUser = await User.createUser({
      role,
      username,
      email,
      password,
      law_firm_name: role === 'law_firm' ? law_firm_name : null,
      company_name: role === 'corporate' ? company_name : null,
      validated: false
    });

    // If user is a law firm, create an associated team member record.
    if (role === 'law_firm') {
      const teamMemberData = {
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
            postalCode: ''
          }
        },
        professionalDetails: {
          lawyerType: 'Owner',
          governmentID: '',
          degreeType: '',
          degreeInstitution: '',
          specialization: ''
        },
        bankAccountDetails: {
          paymentMethod: 'Card',
          cardDetails: {
            cardNumber: '',
            expirationDate: '',
            cvv: '',
            saveCard: false
          },
          bankDetails: {
            accountNumber: '',
            bankName: '',
            ifscCode: ''
          },
          upiId: ''
        },
        password: password,
        createdBy: newUser.id
      };
      await TeamMember.createTeamMember(teamMemberData);
    }

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
        law_firm_name: newUser.law_firm_name
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to register user. Please try again later.' });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful login
 *       400:
 *         description: Missing credentials
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await User.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'User not found. Please register first.' });
    }
    if (!(await User.matchPassword(password, user.password))) {
      return res.status(401).json({ message: 'Incorrect password' });
    }
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET
    );
    
    // If the user is a law firm, fetch associated team member details.
    let teamMemberDetails = null;
    if (user.role === 'law_firm') {
      teamMemberDetails = await TeamMember.findTeamMemberByEmail(email);
    }

    res.json({
      token,
      role: user.role,
      user: {
        id: user.id,
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

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Fetch user profile
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    // Use findUserById from our PostgreSQL model
    const user = await User.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    let teamMemberDetails = null;
    if (user.role === 'law_firm') {
      teamMemberDetails = await TeamMember.findTeamMemberByCreatedBy(user.id);
    }
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        law_firm_name: user.law_firm_name || null,
        teamMemberDetails: teamMemberDetails || null,
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Failed to fetch user profile' });
  }
});

/**
 * @swagger
 * /api/auth/signout:
 *   post:
 *     summary: User signout
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Signed out successfully
 *       500:
 *         description: Server error
 */
router.post('/signout', authenticateToken, async (req, res) => {
  try {
    res.status(200).json({ message: 'Signed out successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to sign out' });
  }
});

module.exports = router;
