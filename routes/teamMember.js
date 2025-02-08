// routes/admin.js
const express = require('express');
const Settings = require('../models/Settings');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const TeamMember = require('../models/TeamMember');
const bcrypt = require('bcryptjs');
const Case = require('../models/Case'); // Import Case model
const ImageForm = require('../models/LawFirm');
const Client = require('../models/Client');
const Appointment = require("../models/Appointment");



// API to add a new team member by an admin
router.post('/add-team-member', authenticateToken, async (req, res) => {
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
        res.status(201).json({ status: true, message: 'Team member added successfully', data: { teamMember: newTeamMember } });
    } catch (error) {
        // Handle unique email constraint error
        if (error.code === 11000 && error.keyPattern && error.keyPattern['personalDetails.email']) {
            return res.status(400).json({ status: false, message: 'Email is already in use. Please use a different email.', data: {} });
        }
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to add team member. Please try again later.', data: {} });
    }
    
});

// API to delete a team member
router.delete('/delete-team-member/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        // Find and delete the team member created by the logged-in user
        const deletedMember = await TeamMember.findOneAndDelete({
            _id: id,
            createdBy: req.user.id
        });

        if (!deletedMember) {
            return res.status(404).json({ message: 'Team member not found or access denied.' });
        }

        res.status(200).json({ status: true, message: 'Team member deleted successfully.', data: {} });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to delete team member. Please try again later.', data: {} });
    }
});

// API to get team member details by ID
router.get('/get-team-member-details/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        // Find the team member by ID
        const teamMember = await TeamMember.findById(id).select('-password');

        if (!teamMember) {
            return res.status(404).json({ message: 'Team member not found.' });
        }

        res.status(200).json({ status: true, message: 'Team member details fetched successfully.', data: { teamMember } });
    } catch (error) {
        console.error('Error fetching team member details:', error);
        res.status(500).json({ status: false, message: 'Failed to fetch team member details. Please try again later.', data: {} });
    }
});


// API to fetch team members by law firm ID
router.get('/get-team-members-by-law-firm/:lawFirmId', authenticateToken, async (req, res) => {
    const { lawFirmId } = req.params;

    try {
        const teamMembers = await TeamMember.find({ createdBy: lawFirmId }).populate('createdBy', 'law_firm_name');

        if (teamMembers.length === 0) {
            return res.status(404).json({ message: 'No team members found for this law firm.' });
        }

        res.status(200).json({ status: true, message: 'Team members fetched successfully.', data: { teamMembers } });
    } catch (error) {
        console.error('Error fetching team members:', error);
        res.status(500).json({ status: false, message: 'Failed to fetch team members. Please try again later.', data: {} });
    }
});

// API to fetch team members by law firm ID
router.get('/get-team-members-by-law-firm/:lawFirmId', authenticateToken, async (req, res) => {
    const { lawFirmId } = req.params;
    try {
        const teamMembers = await TeamMember.find({ createdBy: lawFirmId }, '-password').sort({ createdAt: -1 });
        res.status(200).json({ status: true, message: 'Team members fetched successfully.', data: { teamMembers } });
    } catch (error) {
        console.error('Error fetching team members:', error);
        res.status(500).json({ status: false, message: 'Failed to fetch team members. Please try again later.', data: {} });
    }
});

// API to get all team members
router.get('/get-team-members', authenticateToken, async (req, res) => {
    try {
        // Fetch team members created by the logged-in user
        const teamMembers = await TeamMember.find({ createdBy: req.user.id }, '-password').sort({ createdAt: -1 });
        res.status(200).json({ status: true, message: 'Team members fetched successfully.', data: { teamMembers } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to retrieve team members. Please try again later.', data: {} });
    }
});



module.exports = router;
