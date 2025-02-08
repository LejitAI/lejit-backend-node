const express = require('express');
const router = express.Router();
const Case = require('../models/Case');
const { authenticateToken } = require('../middleware/auth');

// API to add a new case by an admin
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
        return res.status(400).json({ status: false, message: 'Please fill in all required fields.', data: {} });
    }

    try {
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
            startTime: new Date(),
        });

        await newCase.save();
        res.status(201).json({ status: true, message: 'Case added successfully', data: { case: newCase } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to add case. Please try again later.', data: {} });
    }
});

// API to delete a case
router.delete('/delete-case/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const deletedCase = await Case.findOneAndDelete({
            _id: id,
            createdBy: req.user.id
        });

        if (!deletedCase) {
            return res.status(404).json({ status: false, message: 'Case not found or access denied.', data: {} });
        }

        res.status(200).json({ status: true, message: 'Case deleted successfully.', data: {} });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to delete case. Please try again later.', data: {} });
    }
});

// API to get all case details
router.get('/get-cases', authenticateToken, async (req, res) => {
    try {
        const cases = await Case.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json({ status: true, message: 'Cases retrieved successfully', data: cases });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to retrieve cases. Please try again later.', data: {} });
    }
});

// API to get a single case by ID
router.get('/get-case/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const caseDetail = await Case.findOne({ _id: id, createdBy: req.user.id });

        if (!caseDetail) {
            return res.status(404).json({ status: false, message: 'Case not found or you do not have permission to view it.', data: {} });
        }

        res.status(200).json({ status: true, message: 'Case retrieved successfully', data: caseDetail });
    } catch (error) {
        console.error(error);

        if (error.name === 'CastError') {
            return res.status(400).json({ status: false, message: 'Invalid case ID format.', data: {} });
        }

        res.status(500).json({ status: false, message: 'Failed to retrieve the case. Please try again later.', data: {} });
    }
});

// Update timer for a case
router.put('/update-case-timer/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { timer, isRunning } = req.body;

    if (typeof timer !== 'number' || typeof isRunning !== 'boolean') {
        return res.status(400).json({ status: false, message: 'Invalid timer or isRunning value.', data: {} });
    }

    try {
        const updatedCase = await Case.findOneAndUpdate(
            { _id: id, createdBy: req.user.id },
            { timer, isRunning },
            { new: true }
        );

        if (!updatedCase) {
            return res.status(404).json({ status: false, message: 'Case not found or access denied.', data: {} });
        }

        res.status(200).json({ status: true, message: 'Timer updated successfully', data: { case: updatedCase } });
    } catch (error) {
        console.error('Error updating timer:', error);
        res.status(500).json({ status: false, message: 'Failed to update timer. Please try again later.', data: {} });
    }
});

// API to update the status of a case
router.put('/update-case-status/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ongoing', 'closed'].includes(status)) {
        return res.status(400).json({ status: false, message: 'Invalid status value.', data: {} });
    }

    try {
        const updatedCase = await Case.findOneAndUpdate(
            { _id: id, createdBy: req.user.id },
            { status },
            { new: true }
        );

        if (!updatedCase) {
            return res.status(404).json({ status: false, message: 'Case not found or access denied.', data: {} });
        }

        res.status(200).json({ status: true, message: 'Case status updated successfully', data: { case: updatedCase } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to update case status. Please try again later.', data: {} });
    }
});

// API to get case status count
router.get('/case-status-count', authenticateToken, async (req, res) => {
    try {
        const activeCasesCount = await Case.countDocuments({ createdBy: req.user.id, status: 'ongoing' });
        const closedCasesCount = await Case.countDocuments({ createdBy: req.user.id, status: 'closed' });

        res.status(200).json({ status: true, message: 'Case status count retrieved successfully', data: { activeCases: activeCasesCount, closedCases: closedCasesCount } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to retrieve case status count. Please try again later.', data: {} });
    }
});

module.exports = router;
