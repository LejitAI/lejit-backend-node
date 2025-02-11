const express = require('express');
const router = express.Router();
const Case = require('../models/Case');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Cases
 *   description: APIs for managing legal cases
 */

/**
 * @swagger
 * /api/case/add-case:
 *   post:
 *     summary: Add a new case (Admin Only)
 *     tags: [Cases]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - startingDate
 *               - caseType
 *               - client
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title of the case
 *               startingDate:
 *                 type: string
 *                 format: date
 *               caseType:
 *                 type: string
 *                 description: Type of the case
 *               client:
 *                 type: string
 *                 description: Client ID
 *               oppositeClient:
 *                 type: string
 *               caseWitness:
 *                 type: string
 *               caseDescription:
 *                 type: string
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Case added successfully
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Server error
 */
router.post('/add-case', authenticateToken, async (req, res) => {
    const { title, startingDate, caseType, client, oppositeClient, caseWitness, caseDescription, documents } = req.body;

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

/**
 * @swagger
 * /api/case/delete-case/{id}:
 *   delete:
 *     summary: Delete a case by ID
 *     tags: [Cases]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID to delete
 *     responses:
 *       200:
 *         description: Case deleted successfully
 *       404:
 *         description: Case not found
 *       500:
 *         description: Server error
 */
router.delete('/delete-case/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const deletedCase = await Case.findOneAndDelete({ _id: id, createdBy: req.user.id });

        if (!deletedCase) {
            return res.status(404).json({ status: false, message: 'Case not found or access denied.', data: {} });
        }

        res.status(200).json({ status: true, message: 'Case deleted successfully.', data: {} });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to delete case. Please try again later.', data: {} });
    }
});

/**
 * @swagger
 * /api/case/get-cases:
 *   get:
 *     summary: Get all cases with pagination and search
 *     tags: [Cases]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of records per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for case title or type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Case status filter
 *     responses:
 *       200:
 *         description: Cases retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/get-cases', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', status } = req.query;
        const query = { createdBy: req.user.id };

        if (search) {
            query.$or = [{ title: { $regex: search, $options: 'i' } }, { caseType: { $regex: search, $options: 'i' } }];
        }

        if (status) query.status = status;

        const cases = await Case.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit));
        const totalCases = await Case.countDocuments(query);

        res.status(200).json({
            status: true,
            message: 'Cases retrieved successfully',
            data: { cases, totalCases, currentPage: Number(page), totalPages: Math.ceil(totalCases / limit) }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to retrieve cases.', data: {} });
    }
});

/**
 * @swagger
 * /api/case/get-case/{id}:
 *   get:
 *     summary: Get a single case by ID
 *     tags: [Cases]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *     responses:
 *       200:
 *         description: Case retrieved successfully
 *       404:
 *         description: Case not found
 *       500:
 *         description: Server error
 */
router.get('/get-case/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const caseDetail = await Case.findOne({ _id: id, createdBy: req.user.id });

        if (!caseDetail) {
            return res.status(404).json({ status: false, message: 'Case not found or access denied.', data: {} });
        }

        res.status(200).json({ status: true, message: 'Case retrieved successfully', data: caseDetail });
    } catch (error) {
        console.error(error);

        if (error.name === 'CastError') {
            return res.status(400).json({ status: false, message: 'Invalid case ID format.', data: {} });
        }

        res.status(500).json({ status: false, message: 'Failed to retrieve the case.', data: {} });
    }
});

module.exports = router;
