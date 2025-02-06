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
const { pool } = require('../config/db'); // PostgreSQL connection
const HearingSchedule = require('../models/HearingSchedule');



router.post('/add-team-member', authenticateToken, async (req, res) => {
    const {
        personalDetails = {},
        professionalDetails = {},
        bankAccountDetails = {},
        password
    } = req.body;

    try {
        // Validate required fields
        if (!personalDetails.name || !personalDetails.email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required.' });
        }

        // Ensure `address` exists
        personalDetails.address = personalDetails.address || { 
            line1: "", line2: "", city: "", state: "", country: "", postalCode: "" 
        };

        // Call PostgreSQL model function
        const newTeamMember = await TeamMember.createTeamMember({
            name: personalDetails.name,
            dateOfBirth: personalDetails.dateOfBirth,
            gender: personalDetails.gender,
            yearsOfExperience: personalDetails.yearsOfExperience,
            mobile: personalDetails.mobile,
            email: personalDetails.email,
            address: personalDetails.address,
            professionalDetails,
            bankAccountDetails,
            password,
            createdBy: req.user.id,
        });

        res.status(201).json({ message: 'Team member added successfully', teamMember: newTeamMember });

    } catch (error) {
        if (error.code === '23505') { // Unique constraint violation for email
            return res.status(400).json({ message: 'Email is already in use. Please use a different email.' });
        }
        console.error(error);
        res.status(500).json({ message: 'Failed to add team member. Please try again later.' });
    }
});

router.delete('/delete-team-member/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        // Call model function to delete the team member
        const deletedMember = await TeamMember.deleteTeamMember(id, req.user.id);

        if (!deletedMember) {
            return res.status(404).json({ message: 'Team member not found or access denied.' });
        }

        res.status(200).json({ message: 'Team member deleted successfully.' });
    } catch (error) {
        console.error('Error deleting team member:', error);
        res.status(500).json({ message: 'Failed to delete team member. Please try again later.' });
    }
});

router.get('/get-team-member-details/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        // Query PostgreSQL to find the team member by ID
        const query = `
            SELECT id, name, date_of_birth, gender, years_of_experience, mobile, email, 
                   address_line1, address_line2, city, state, country, postal_code,
                   lawyer_type, government_id, degree_type, degree_institution, specialization,
                   payment_method, card_number, expiration_date, cvv, save_card, 
                   account_number, bank_name, ifsc_code, upi_id, created_by, created_at
            FROM team_members 
            WHERE id = $1
        `;
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Team member not found.' });
        }

        // Remove sensitive data (e.g., password) from the response
        const teamMember = result.rows[0];

        res.status(200).json(teamMember);
    } catch (error) {
        console.error('Error fetching team member details:', error);
        res.status(500).json({ message: 'Failed to fetch team member details. Please try again later.' });
    }
});


router.get('/get-team-members-by-law-firm/:lawFirmId', authenticateToken, async (req, res) => {
    const { lawFirmId } = req.params;

    try {
        const query = `
            SELECT tm.*, u.law_firm_name
            FROM team_members tm
            JOIN users u ON tm.created_by = u.id
            WHERE tm.created_by = $1
            ORDER BY tm.created_at DESC;
        `;
        const result = await pool.query(query, [lawFirmId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'No team members found for this law firm.' });
        }

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching team members:', error);
        res.status(500).json({ message: 'Failed to fetch team members. Please try again later.' });
    }
});



// API to get all team members
router.get('/get-team-members', authenticateToken, async (req, res) => {
    try {
        // Fetch team members created by the logged-in user
        const teamMembers = await TeamMember.find({ createdBy: req.user.id }, '-password').sort({ createdAt: -1 });
        res.status(200).json(teamMembers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to retrieve team members. Please try again later.' });
    }
});


module.exports = router;
