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





// API to add client details
router.post('/add-client', authenticateToken, async (req, res) => {
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
        // Save new client details in PostgreSQL
        const newClient = await Client.createClient({
            name,
            dateOfBirth,
            gender,
            email,
            mobile,
            address,
            profilePhoto,
            createdBy: req.user.id, // Associate the logged-in user
        });

        res.status(201).json({ message: 'Client details saved successfully', client: newClient });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to save client details. Please try again later.' });
    }
});

// API to get client details
router.get('/get-client', authenticateToken, async (req, res) => {
    try {
        // Retrieve clients created by the logged-in user
        const clients = await Client.getClientsByUser(req.user.id);

        if (!clients || clients.length === 0) {
            return res.status(200).json([]); // Return an empty array if no clients are found
        }

        res.status(200).json(clients);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to retrieve client details. Please try again later.' });
    }
});

// API to delete a client
router.delete('/delete-client/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        // Ensure the client belongs to the logged-in user before deleting
        const deletedClient = await Client.deleteClient(id, req.user.id);

        if (!deletedClient) {
            return res.status(404).json({ message: 'Client not found or access denied.' });
        }

        res.status(200).json({ message: 'Client deleted successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete client. Please try again later.' });
    }
});


module.exports = router;
