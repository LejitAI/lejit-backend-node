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



// ✅ API to Get All Cases for Logged-in User
router.get('/get-cases', authenticateToken, async (req, res) => {
    try {
        // Fetch all cases created by the logged-in user
        const cases = await Case.getCasesByUser(req.user.id);

        res.status(200).json(cases);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to retrieve cases. Please try again later.' });
    }
});

// ✅ API to Get a Single Case by ID
router.get('/get-case/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Find the case and ensure it belongs to the logged-in user
        const caseDetail = await Case.findCaseById(id);

        if (!caseDetail) {
            return res.status(404).json({ message: 'Case not found or you do not have permission to view it.' });
        }

        res.status(200).json(caseDetail);
    } catch (error) {
        console.error(error);

        if (error.code === '22P02') { // Invalid UUID error in PostgreSQL
            return res.status(400).json({ message: 'Invalid case ID format.' });
        }

        res.status(500).json({ message: 'Failed to retrieve the case. Please try again later.' });
    }
});

// ✅ API to Add a New Case
router.post('/add-case', authenticateToken, async (req, res) => {
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
        // Create and save new case in PostgreSQL
        const newCase = await Case.createCase({
            title,
            startingDate,
            caseType,
            client,
            oppositeClient,
            caseWitness,
            caseDescription,
            documents,
            createdBy: req.user.id, // Associate the logged-in user
        });

        res.status(201).json({ message: 'Case added successfully', case: newCase });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to add case. Please try again later.' });
    }
});

// ✅ API to Delete a Case
router.delete('/delete-case/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        // Delete the case only if the logged-in user created it
        const deletedCase = await Case.deleteCase(id, req.user.id);

        if (!deletedCase) {
            return res.status(404).json({ message: 'Case not found or access denied.' });
        }

        res.status(200).json({ message: 'Case deleted successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete case. Please try again later.' });
    }
});


router.put('/update-case-timer/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { timer, isRunning } = req.body;

    if (typeof timer !== 'number' || typeof isRunning !== 'boolean') {
        return res.status(400).json({ message: 'Invalid timer or isRunning value.' });
    }

    try {
        const updatedCase = await Case.findOneAndUpdate(
            { _id: id, createdBy: req.user.id },
            { timer, isRunning },
            { new: true }
        );

        if (!updatedCase) {
            return res.status(404).json({ message: 'Case not found or access denied.' });
        }

        res.status(200).json({ message: 'Timer updated successfully', case: updatedCase });
    } catch (error) {
        console.error('Error updating timer:', error);
        res.status(500).json({ message: 'Failed to update timer. Please try again later.' });
    }
});


module.exports = router;

