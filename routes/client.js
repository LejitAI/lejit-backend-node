const express = require('express');
const router = express.Router();
const Client = require('../models/client');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * /api/client/add-client:
 *   post:
 *     summary: Add new client details
 *     description: Adds a new client with provided details.
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - dateOfBirth
 *               - gender
 *               - email
 *               - mobile
 *               - address
 *             properties:
 *               name:
 *                 type: string
 *                 description: Client's name
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 description: Client's date of birth (YYYY-MM-DD)
 *               gender:
 *                 type: string
 *                 enum: [Male, Female, Other]
 *                 description: Client's gender
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Client's email address
 *               mobile:
 *                 type: string
 *                 description: Client's mobile number
 *               address:
 *                 type: string
 *                 description: Client's address
 *               profilePhoto:
 *                 type: string
 *                 description: URL or path to client's profile photo (optional)
 *     responses:
 *       201:
 *         description: Client details saved successfully
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
 *                   example: Client details saved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     client:
 *                       type: object
 *                       description: Details of the newly created client
 *       400:
 *         description: Bad request - Missing required fields
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
 *                   example: Please fill in all required fields.
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       500:
 *         description: Failed to save client details.
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
 *                   example: Failed to save client details. Please try again later.
 *                 data:
 *                   type: object
 */
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

/**
 * @swagger
 * /api/client/get-client:
 *   get:
 *     summary: Retrieve clients with pagination
 *     description: Retrieves a list of clients created by the logged-in user, with pagination support.
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination (default is 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of clients per page (default is 10)
 *     responses:
 *       200:
 *         description: Clients retrieved successfully
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
 *                   example: Clients retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Client object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     totalClients:
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
 *         description: Failed to retrieve client details.
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
 *                   example: Failed to retrieve client details.
 *                 data:
 *                   type: object
 */
router.get('/get-client', authenticateToken, async (req, res) => {
    try {
        let { page = 1, limit = 10 } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);
        const skip = (page - 1) * limit;

        const clients = await Client.find({ createdBy: req.user.id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalClients = await Client.countDocuments({ createdBy: req.user.id });

        res.status(200).json({
            status: true,
            message: 'Clients retrieved successfully',
            data: clients,
            pagination: {
                totalClients,
                currentPage: page,
                totalPages: Math.ceil(totalClients / limit),
                pageSize: limit,
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to retrieve client details.', data: {} });
    }
});


/**
 * @swagger
 * /api/client/delete-client/{id}:
 *   delete:
 *     summary: Delete a client by ID
 *     description: Deletes a client record by their ID.
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the client to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Client deleted successfully.
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
 *                   example: Client deleted successfully.
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       404:
 *         description: Client not found or access denied.
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
 *                   example: Client not found or access denied.
 *                 data:
 *                   type: object
 *       500:
 *         description: Failed to delete client.
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
 *                   example: Failed to delete client. Please try again later.
 *                 data:
 *                   type: object
 */
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