const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ImageForm = require('../models/LawFirm');
const { authenticateToken } = require('../middleware/auth');

// Get law firms
router.get('/get-law-firms', authenticateToken, async (req, res) => {
    try {
        const lawFirms = await User.find({ role: 'law_firm' }, 'law_firm_name _id');
        res.status(200).json({ status: true, message: 'Law firms retrieved successfully', data: lawFirms });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to fetch law firms. Please try again later.', data: {} });
    }
});

// Get all law firms
router.get('/get-all-law-firms', authenticateToken, async (req, res) => {
    try {
        const lawFirms = await ImageForm.find({}, 'lawFirmDetails professionalDetails bankAccountDetails createdAt createdBy');

        if (!lawFirms || lawFirms.length === 0) {
            return res.status(404).json({ status: false, message: 'No law firms found.', data: {} });
        }

        res.status(200).json({ status: true, message: 'Law firms retrieved successfully', data: lawFirms });
    } catch (error) {
        console.error('Error fetching law firms:', error);
        res.status(500).json({ status: false, message: 'Failed to fetch law firms. Please try again later.', data: {} });
    }
});

// Get law firm details by ID
router.get('/get-law-firm-details/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const lawFirmDetails = await ImageForm.findOne({ createdBy: id });

        if (!lawFirmDetails) {
            return res.status(404).json({ status: false, message: 'Law firm details not found.', data: {} });
        }

        res.status(200).json({ status: true, message: 'Law firm details retrieved successfully', data: lawFirmDetails });
    } catch (error) {
        console.error('Error fetching law firm details:', error);
        res.status(500).json({ status: false, message: 'Failed to fetch law firm details. Please try again later.', data: {} });
    }
});

// Add a new law firm details
router.post('/add-law-firm-details', authenticateToken, async (req, res) => {
    const {
        lawFirmDetails,
        professionalDetails,
        bankAccountDetails
    } = req.body;

    try {
        const newLawFirmDetails = new ImageForm({
            lawFirmDetails,
            professionalDetails,
            bankAccountDetails,
            createdBy: req.user.id,
        });

        await newLawFirmDetails.save();
        res.status(201).json({ status: true, message: 'Law firm details added successfully', data: { lawFirmDetails: newLawFirmDetails } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to add law firm details. Please try again later.', data: {} });
    }
});

// Get law firm details
router.get('/get-law-firm-details', authenticateToken, async (req, res) => {
    try {
        const lawFirmDetails = await ImageForm.findOne({ createdBy: req.user.id });
        
        if (!lawFirmDetails) {
            return res.status(404).json({ status: false, message: 'Law firm details not found', data: {} });
        }

        res.status(200).json({ status: true, message: 'Law firm details retrieved successfully', data: lawFirmDetails });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to retrieve law firm details. Please try again later.', data: {} });
    }
});

// Update law firm details
router.put('/update-law-firm-details', authenticateToken, async (req, res) => {
    try {
        const { lawFirmDetails, professionalDetails, bankAccountDetails } = req.body;

        const updatedDetails = await ImageForm.findOneAndUpdate(
            { createdBy: req.user.id },
            {
                lawFirmDetails,
                professionalDetails,
                bankAccountDetails,
            },
            { new: true }
        );

        if (!updatedDetails) {
            return res.status(404).json({ status: false, message: 'Law firm details not found', data: {} });
        }

        res.status(200).json({ status: true, message: 'Law firm details updated successfully', data: { updatedDetails } });
    } catch (error) {
        console.error('Error updating law firm details:', error);
        res.status(500).json({ status: false, message: 'Failed to update law firm details. Please try again later.', data: {} });
    }
});

module.exports = router;
