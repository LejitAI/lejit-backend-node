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



// routes/admin.js
router.get('/get-law-firms', authenticateToken, async (req, res) => {
    try {
        const lawFirms = await User.find({ role: 'law_firm' }, 'law_firm_name _id');
        res.status(200).json(lawFirms);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch law firms. Please try again later.' });
    }
});



//get all law firms
// routes/admin.js
// API to get all law firm details
router.get('/get-all-law-firms', authenticateToken, async (req, res) => {
    try {
        // Query PostgreSQL to get all law firms
        const query = `
            SELECT id, law_firm_name, operating_since, years_of_experience, specialization,
                   email, mobile, address_line1, address_line2, city, state, postal_code,
                   lawyer_type, case_solved_count, case_based_bill_rate, time_based_bill_rate,
                   payment_method, card_number, expiration_date, cvv, save_card,
                   account_number, bank_name, ifsc_code, upi_id, created_at, created_by
            FROM image_forms
            ORDER BY created_at DESC;
        `;
        const result = await pool.query(query);

        // if (result.rows.length === 0) {
        //     return res.status(404).json({ message: 'No law firms found.' });
        // }

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching law firms:', error);
        res.status(500).json({ message: 'Failed to fetch law firms. Please try again later.' });
    }
});


// Get law firm details by ID
router.get('/get-law-firm-details/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const lawFirmDetails = await ImageForm.findOne({ createdBy: id });

        if (!lawFirmDetails) {
            return res.status(404).json({ message: 'Law firm details not found.' });
        }

        res.status(200).json(lawFirmDetails);
    } catch (error) {
        console.error('Error fetching law firm details:', error);
        res.status(500).json({ message: 'Failed to fetch law firm details. Please try again later.' });
    }
});



// routes/admin.js
router.get('/get-law-firms', authenticateToken, async (req, res) => {
    try {
        const lawFirms = await User.find({ role: 'law_firm' }, 'law_firm _id'); // Fetch law firm names and IDs
        res.status(200).json(lawFirms);
    } catch (error) {
        console.error('Error fetching law firms:', error);
        res.status(500).json({ message: 'Failed to fetch law firms. Please try again later.' });
    }
});








router.post('/add-law-firm-details', authenticateToken, async (req, res) => {
    const {
        lawFirmDetails,
        professionalDetails,
        bankAccountDetails
    } = req.body;

    try {
        // Validate required fields
        if (!lawFirmDetails || !lawFirmDetails.lawFirmName || !lawFirmDetails.contactInfo || !lawFirmDetails.contactInfo.email) {
            return res.status(400).json({ message: 'Law firm name and contact email are required.' });
        }

        // Call PostgreSQL model function
        const newLawFirmDetails = await ImageForm.createImageForm({
            lawFirmDetails,
            professionalDetails,
            bankAccountDetails,
            createdBy: req.user.id
        });

        res.status(201).json({ message: 'Law firm details added successfully', lawFirmDetails: newLawFirmDetails });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to add law firm details. Please try again later.' });
    }
});

// API to get law firm details
router.get('/get-all-law-firms', authenticateToken, async (req, res) => {
    try {
        // Query PostgreSQL to get all law firms
        const query = `
            SELECT id, law_firm_name, operating_since, years_of_experience, specialization,
                   email, mobile, address_line1, address_line2, city, state, postal_code,
                   lawyer_type, case_solved_count, case_based_bill_rate, time_based_bill_rate,
                   payment_method, card_number, expiration_date, cvv, save_card,
                   account_number, bank_name, ifsc_code, upi_id, created_at, created_by
            FROM image_forms
            ORDER BY created_at DESC;
        `;
        const result = await pool.query(query);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'No law firms found.' });
        }

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching law firms:', error);
        res.status(500).json({ message: 'Failed to fetch law firms. Please try again later.' });
    }
});

// ✅ API to Update Law Firm Details
router.put('/update-law-firm-details', authenticateToken, async (req, res) => {
    try {
        const { lawFirmDetails = {}, professionalDetails = {}, bankAccountDetails = {} } = req.body;

        // Ensure required fields exist
        if (!lawFirmDetails || !lawFirmDetails.lawFirmName || !lawFirmDetails.contactInfo || !lawFirmDetails.contactInfo.email) {
            return res.status(400).json({ message: 'Law firm name and contact email are required.' });
        }

        // Ensure bank account details exist before accessing properties
        bankAccountDetails.cardDetails = bankAccountDetails.cardDetails || { cardNumber: "", expirationDate: "", cvv: "", saveCard: false };
        bankAccountDetails.bankDetails = bankAccountDetails.bankDetails || { accountNumber: "", bankName: "", ifscCode: "" };
        bankAccountDetails.upiId = bankAccountDetails.upiId || "";

        // Query to update law firm details
        const query = `
            UPDATE image_forms
            SET law_firm_name = $1, operating_since = $2, years_of_experience = $3, specialization = $4,
                email = $5, mobile = $6, address_line1 = $7, address_line2 = $8, city = $9, state = $10, postal_code = $11,
                lawyer_type = $12, case_solved_count = $13, case_based_bill_rate = $14, time_based_bill_rate = $15,
                payment_method = $16, card_number = $17, expiration_date = $18, cvv = $19, save_card = $20,
                account_number = $21, bank_name = $22, ifsc_code = $23, upi_id = $24
            WHERE created_by = $25
            RETURNING *;
        `;

        const values = [
            lawFirmDetails.lawFirmName, lawFirmDetails.operatingSince, lawFirmDetails.yearsOfExperience, lawFirmDetails.specialization,
            lawFirmDetails.contactInfo.email, lawFirmDetails.contactInfo.mobile, lawFirmDetails.contactInfo.address.line1,
            lawFirmDetails.contactInfo.address.line2, lawFirmDetails.contactInfo.address.city, lawFirmDetails.contactInfo.address.state,
            lawFirmDetails.contactInfo.address.postalCode, professionalDetails.lawyerType, professionalDetails.caseDetails.caseSolvedCount,
            professionalDetails.caseDetails.caseBasedBillRate, professionalDetails.caseDetails.timeBasedBillRate,
            bankAccountDetails.paymentMethod, bankAccountDetails.cardDetails.cardNumber, bankAccountDetails.cardDetails.expirationDate,
            bankAccountDetails.cardDetails.cvv, bankAccountDetails.cardDetails.saveCard, bankAccountDetails.bankDetails.accountNumber,
            bankAccountDetails.bankDetails.bankName, bankAccountDetails.bankDetails.ifscCode, bankAccountDetails.upiId,
            req.user.id // Ensures the logged-in user can only update their own law firm details
        ];

        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Law firm details not found' });
        }

        res.status(200).json({ message: 'Law firm details updated successfully', updatedDetails: result.rows[0] });
    } catch (error) {
        console.error('Error updating law firm details:', error);
        res.status(500).json({ message: 'Failed to update law firm details. Please try again later.' });
    }
});

// ✅ Create a new ImageForm
router.post('/create-image-form', authenticateToken, async (req, res) => {
    try {
        const newImageForm = await ImageForm.createImageForm({ ...req.body, createdBy: req.user.id });
        res.status(201).json({ message: 'ImageForm created successfully', imageForm: newImageForm });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to create ImageForm. Please try again later.' });
    }
});

// ✅ Get all ImageForms created by the logged-in user
router.get('/get-image-forms', authenticateToken, async (req, res) => {
    try {
        const imageForms = await ImageForm.getImageFormsByUser(req.user.id);
        res.status(200).json(imageForms);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to retrieve ImageForms. Please try again later.' });
    }
});

// ✅ Get ImageForm by ID
router.get('/get-image-form/:id', authenticateToken, async (req, res) => {
    try {
        const imageForm = await ImageForm.getImageFormById(req.params.id);
        if (!imageForm) {
            return res.status(404).json({ message: 'ImageForm not found' });
        }
        res.status(200).json(imageForm);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to retrieve ImageForm. Please try again later.' });
    }
});

// ✅ Delete an ImageForm
router.delete('/delete-image-form/:id', authenticateToken, async (req, res) => {
    try {
        const deletedForm = await ImageForm.deleteImageForm(req.params.id, req.user.id);
        if (!deletedForm) {
            return res.status(404).json({ message: 'ImageForm not found or access denied.' });
        }
        res.status(200).json({ message: 'ImageForm deleted successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete ImageForm. Please try again later.' });
    }
});


module.exports = router;
