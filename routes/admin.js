// routes/admin.js
const express = require('express');
const Settings = require('../models/Settings');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');
const router = express.Router();
const User = require('../models/User');
const TeamMember = require('../models/TeamMember');
const bcrypt = require('bcryptjs');
const Case = require('../models/Case'); // Import Case model
const ImageForm = require('../models/LawFirm');
const ImageForm = require('../models/Client');

// Add or update ChatGPT API key
router.post('/set-chatgpt-api-key', authenticateToken, authorizeAdmin, async (req, res) => {
    const { chatgptApiKey } = req.body;

    if (!chatgptApiKey) {
        return res.status(400).json({ message: 'API key is required' });
    }

    try {
        let settings = await Settings.findOne();
        if (settings) {
            // Update existing API key
            settings.chatgptApiKey = chatgptApiKey;
            settings.updatedAt = Date.now();
            await settings.save();
        } else {
            // Create a new settings record with the API key
            settings = new Settings({ chatgptApiKey });
            await settings.save();
        }
        res.status(200).json({ message: 'ChatGPT API key saved successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/get-users', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const users = await User.find({}, 'username _id validated'); // Only select the fields we need
        res.status(200).json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});


// Get the ChatGPT API key (admin only)
router.get('/get-chatgpt-api-key', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const settings = await Settings.findOne();
        if (!settings || !settings.chatgptApiKey) {
            return res.status(404).json({ message: 'API key not found' });
        }
        res.status(200).json({ chatgptApiKey: settings.chatgptApiKey });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});


// API to add a new team member by an admin
router.post('/add-team-member', authenticateToken, authorizeAdmin, async (req, res) => {
    const {
        personalDetails,
        professionalDetails,
        bankAccountDetails,
        password
    } = req.body;

    try {
        // Create and save new team member
        const newTeamMember = new TeamMember({
            personalDetails,
            professionalDetails,
            bankAccountDetails,
            password,
            createdBy: req.user.id,
        });

        await newTeamMember.save();
        res.status(201).json({ message: 'Team member added successfully', teamMember: newTeamMember });
    } catch (error) {
        // Handle unique email constraint error
        if (error.code === 11000 && error.keyPattern && error.keyPattern['personalDetails.email']) {
            return res.status(400).json({ message: 'Email is already in use. Please use a different email.' });
        }
        console.error(error);
        res.status(500).json({ message: 'Failed to add team member. Please try again later.' });
    }
    
});


// API to add a new case by an admin
router.post('/add-case', authenticateToken, authorizeAdmin, async (req, res) => {
    const {
        title,
        startingDate,
        caseType,
        client,
        oppositeClient,
        caseWitness,
        caseDescription,
        documents
    } = req.body;

    if (!title || !startingDate || !caseType || !client) {
        return res.status(400).json({ message: 'Please fill in all required fields.' });
    }

    try {
        // Create and save new case
        const newCase = new Case({
            title,
            startingDate: new Date(startingDate),
            caseType,
            client,
            oppositeClient,
            caseWitness,
            caseDescription,
            documents,
            createdBy: req.user.id,
        });

        await newCase.save();
        res.status(201).json({ message: 'Case added successfully', case: newCase });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to add case. Please try again later.' });
    }
});


// API to get all team members
router.get('/get-team-members', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const teamMembers = await TeamMember.find({}, '-password'); // Exclude password field for security
        res.status(200).json(teamMembers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to retrieve team members. Please try again later.' });
    }
});


// Add a new law firm details (including personal, professional, and bank details)
router.post('/add-law-firm-details', authenticateToken, authorizeAdmin, async (req, res) => {
    const {
        lawFirmDetails,
        professionalDetails,
        bankAccountDetails
    } = req.body;

    try {
        // Create and save new law firm details
        const newLawFirmDetails = new ImageForm({
            lawFirmDetails,
            professionalDetails,
            bankAccountDetails,
            createdBy: req.user.id,
        });

        await newLawFirmDetails.save();
        res.status(201).json({ message: 'Law firm details added successfully', lawFirmDetails: newLawFirmDetails });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to add law firm details. Please try again later.' });
    }
});

// API to get law firm details
router.get('/get-law-firm-details', authenticateToken, async (req, res) => {
    try {
        const lawFirmDetails = await ImageForm.findOne({ createdBy: req.user.id }); // Find the details created by the logged-in admin
        
        if (!lawFirmDetails) {
            return res.status(404).json({ message: 'Law firm details not found' });
        }

        res.status(200).json(lawFirmDetails);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to retrieve law firm details. Please try again later.' });
    }
});

// API to get all case details
router.get('/get-cases', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        // Retrieve all cases from the database
        const cases = await Case.find({});
        res.status(200).json(cases);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to retrieve cases. Please try again later.' });
    }
});


// API to add client details
router.post('/add-client', authenticateToken, authorizeAdmin, async (req, res) => {
    const {
        name,
        dateOfBirth,
        gender,
        email,
        mobile,
        address,
        profilePhoto,
    } = req.body;

    if (!name || !dateOfBirth || !gender || !email || !mobile || !address) {
        return res.status(400).json({ message: 'Please fill in all required fields.' });
    }

    try {
        // Create and save new client details
        const newClient = new Client({
            name,
            dateOfBirth,
            gender,
            email,
            mobile,
            address,
            profilePhoto,
            createdBy: req.user.id,
        });

        await newClient.save();
        res.status(201).json({ message: 'Client details saved successfully', client: newClient });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to save client details. Please try again later.' });
    }
});


// API to get client details
router.get('/get-client', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const client = await Client.findOne({ createdBy: req.user.id }); // Get client details added by the logged-in admin
        
        if (!client) {
            return res.status(404).json({ message: 'Client details not found' });
        }

        res.status(200).json(client);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to retrieve client details. Please try again later.' });
    }
});



module.exports = router;
