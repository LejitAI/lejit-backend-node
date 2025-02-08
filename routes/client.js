const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const { authenticateToken } = require('../middleware/auth');

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
        return res.status(400).json({ status: false, message: 'Please fill in all required fields.', data: {} });
    }

    try {
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
        res.status(201).json({ status: true, message: 'Client details saved successfully', data: { client: newClient } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to save client details. Please try again later.', data: {} });
    }
});

// API to get client details
router.get('/get-client', authenticateToken, async (req, res) => {
    try {
        const clients = await Client.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
        
        if (!clients || clients.length === 0) {
            return res.status(200).json({ status: true, message: 'No clients found', data: [] });
        }

        res.status(200).json({ status: true, message: 'Clients retrieved successfully', data: clients });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to retrieve client details. Please try again later.', data: {} });
    }
});

// API to delete client
router.delete('/delete-client/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const deletedClient = await Client.findOneAndDelete({
            _id: id,
            createdBy: req.user.id,
        });

        if (!deletedClient) {
            return res.status(404).json({ status: false, message: 'Client not found or access denied.', data: {} });
        }

        res.status(200).json({ status: true, message: 'Client deleted successfully.', data: {} });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to delete client. Please try again later.', data: {} });
    }
});

module.exports = router;
