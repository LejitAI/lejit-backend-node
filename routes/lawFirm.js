const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ImageForm = require('../models/LawFirm');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * /api/law-firm/get-law-firms:
 *   get:
 *     summary: Get paginated law firms (basic info)
 *     description: Retrieves a paginated list of law firms with basic information (law firm name and ID).
 *     tags: [Law Firm]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination, default is 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of law firms per page, default is 10
 *     responses:
 *       200:
 *         description: Law firms retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Law firms retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: Law firm ID
 *                       law_firm_name:
 *                         type: string
 *                         description: Law firm name
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     totalLawFirms:
 *                       type: integer
 *                       example: 30
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *                     pageSize:
 *                       type: integer
 *                       example: 10
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       500:
 *         description: Failed to fetch law firms.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Failed to fetch law firms. Please try again later.
 *                 data:
 *                   type: object
 */
// Get paginated law firms
router.get('/get-law-firms', authenticateToken, async (req, res) => {
    try {
        let { page = 1, limit = 10 } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);
        const skip = (page - 1) * limit;

        const lawFirms = await User.find({ role: 'law_firm' }, 'law_firm_name _id')
            .sort({ _id: -1 }) // Latest first
            .skip(skip)
            .limit(limit);

        const totalLawFirms = await User.countDocuments({ role: 'law_firm' });

        res.status(200).json({
            status: true,
            message: 'Law firms retrieved successfully',
            data: lawFirms,
            pagination: {
                totalLawFirms,
                currentPage: page,
                totalPages: Math.ceil(totalLawFirms / limit),
                pageSize: limit,
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to fetch law firms. Please try again later.', data: {} });
    }
});

/**
 * @swagger
 * /api/law-firm/get-all-law-firms:
 *   get:
 *     summary: Get paginated all law firms (full details)
 *     description: Retrieves a paginated list of all law firms with complete details.
 *     tags: [Law Firm]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination, default is 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of law firms per page, default is 10
 *     responses:
 *       200:
 *         description: Law firms retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Law firms retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Law firm details object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     totalLawFirms:
 *                       type: integer
 *                       example: 30
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *                     pageSize:
 *                       type: integer
 *                       example: 10
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       500:
 *         description: Failed to fetch law firms.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Failed to fetch law firms. Please try again later.
 *                 data:
 *                   type: object
 */
// Get paginated all law firms
router.get('/get-all-law-firms', authenticateToken, async (req, res) => {
    try {
        let { page = 1, limit = 10 } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);
        const skip = (page - 1) * limit;

        const lawFirms = await ImageForm.find({}, 'lawFirmDetails professionalDetails bankAccountDetails createdAt createdBy')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalLawFirms = await ImageForm.countDocuments();

        res.status(200).json({
            status: true,
            message: 'Law firms retrieved successfully',
            data: lawFirms,
            pagination: {
                totalLawFirms,
                currentPage: page,
                totalPages: Math.ceil(totalLawFirms / limit),
                pageSize: limit,
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to fetch law firms. Please try again later.', data: {} });
    }
});

/**
 * @swagger
 * /api/law-firm/get-law-firm-details/{id}:
 *   get:
 *     summary: Get law firm details by ID
 *     description: Retrieves complete details of a law firm by its ID.
 *     tags: [Law Firm]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the law firm to retrieve details for
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Law firm details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Law firm details retrieved successfully
 *                 data:
 *                   type: object
 *                   description: Law firm details object
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       404:
 *         description: Law firm details not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Law firm details not found.
 *                 data:
 *                   type: object
 *       500:
 *         description: Failed to fetch law firm details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Failed to fetch law firm details. Please try again later.
 *                 data:
 *                   type: object
 */
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

/**
 * @swagger
 * /api/law-firm/add-law-firm-details:
 *   post:
 *     summary: Add new law firm details
 *     description: Adds new law firm details for a user.
 *     tags: [Law Firm]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lawFirmDetails
 *               - professionalDetails
 *               - bankAccountDetails
 *             properties:
 *               lawFirmDetails:
 *                 type: object
 *                 description: Law firm details object
 *               professionalDetails:
 *                 type: object
 *                 description: Professional details object
 *               bankAccountDetails:
 *                 type: object
 *                 description: Bank account details object
 *     responses:
 *       201:
 *         description: Law firm details added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Law firm details added successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     lawFirmDetails:
 *                       type: object
 *                       description: Newly created law firm details object
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       500:
 *         description: Failed to add law firm details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Failed to add law firm details. Please try again later.
 *                 data:
 *                   type: object
 */
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

/**
 * @swagger
 * /api/law-firm/get-law-firm-details:
 *   get:
 *     summary: Get law firm details for logged-in user
 *     description: Retrieves complete details of the law firm for the currently logged-in user.
 *     tags: [Law Firm]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Law firm details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Law firm details retrieved successfully
 *                 data:
 *                   type: object
 *                   description: Law firm details object
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       404:
 *         description: Law firm details not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Law firm details not found
 *                 data:
 *                   type: object
 *       500:
 *         description: Failed to retrieve law firm details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Failed to retrieve law firm details. Please try again later.
 *                 data:
 *                   type: object
 */
// Get law firm details for the logged-in user
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

/**
 * @swagger
 * /api/law-firm/update-law-firm-details:
 *   put:
 *     summary: Update law firm details
 *     description: Updates the law firm details for the logged-in user.
 *     tags: [Law Firm]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lawFirmDetails:
 *                 type: object
 *                 description: Law firm details object to update
 *               professionalDetails:
 *                 type: object
 *                 description: Professional details object to update
 *               bankAccountDetails:
 *                 type: object
 *                 description: Bank account details object to update
 *     responses:
 *       200:
 *         description: Law firm details updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Law firm details updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     updatedDetails:
 *                       type: object
 *                       description: Updated law firm details object
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       404:
 *         description: Law firm details not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Law firm details not found
 *                 data:
 *                   type: object
 *       500:
 *         description: Failed to update law firm details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Failed to update law firm details. Please try again later.
 *                 data:
 *                   type: object
 */
// Update law firm details
router.put('/update-law-firm-details', authenticateToken, async (req, res) => {
    try {
        const { lawFirmDetails, professionalDetails, bankAccountDetails } = req.body;
        console.log('Request Body:', req.body);
        console.log('User ID:', req.user.id);

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