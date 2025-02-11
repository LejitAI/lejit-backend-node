// routes /api/team-Member.js
const express = require('express');
const Settings = require('../models/Settings');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const TeamMember = require('../models/TeamMember');
const bcrypt = require('bcryptjs');
const Case = require('../models/Case'); // Import Case model
const ImageForm = require('../models/LawFirm');
const Client = require('../models/client');
const Appointment = require("../models/Appointment");

/**
 * @swagger
 *  /api/team-member/add-team-member:
 *   post:
 *     summary: Add a new team member (Admin only)
 *     description: Allows an admin to add a new team member to their law firm.
 *     tags: [Admin - Team Members]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - personalDetails
 *               - professionalDetails
 *               - bankAccountDetails
 *               - password
 *             properties:
 *               personalDetails:
 *                 type: object
 *                 description: Personal details of the team member
 *               professionalDetails:
 *                 type: object
 *                 description: Professional details of the team member
 *               bankAccountDetails:
 *                 type: object
 *                 description: Bank account details of the team member
 *               password:
 *                 type: string
 *                 description: Password for the new team member
 *     responses:
 *       201:
 *         description: Team member added successfully
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
 *                   example: Team member added successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     teamMember:
 *                       type: object
 *                       description: Details of the newly created team member
 *       400:
 *         description: Bad request - Email already in use
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
 *                   example: Email is already in use. Please use a different email.
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       500:
 *         description: Failed to add team member.
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
 *                   example: Failed to add team member. Please try again later.
 *                 data:
 *                   type: object
 */
// API to add a new team member by an admin
router.post('/add-team-member', authenticateToken, async (req, res) => {
    const {
        personalDetails,
        professionalDetails,
        bankAccountDetails,
        password
    } = req.body;

    try {
        // Create and save new team member
        const newTeamMember = new TeamMember({
            personalDetails,
            professionalDetails,
            bankAccountDetails,
            password,
            createdBy: req.user.id,
        });

        await newTeamMember.save();
        res.status(201).json({ status: true, message: 'Team member added successfully', data: { teamMember: newTeamMember } });
    } catch (error) {
        // Handle unique email constraint error
        if (error.code === 11000 && error.keyPattern && error.keyPattern['personalDetails.email']) {
            return res.status(400).json({ status: false, message: 'Email is already in use. Please use a different email.', data: {} });
        }
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to add team member. Please try again later.', data: {} });
    }
    
});

/**
 * @swagger
 *  /api/team-member/delete-team-member/{id}:
 *   delete:
 *     summary: Delete a team member by ID (Admin only)
 *     description: Allows an admin to delete a team member by their ID.
 *     tags: [Admin - Team Members]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the team member to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Team member deleted successfully.
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
 *                   example: Team member deleted successfully.
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       404:
 *         description: Team member not found or access denied.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Team member not found or access denied.
 *       500:
 *         description: Failed to delete team member.
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
 *                   example: Failed to delete team member. Please try again later.
 *                 data:
 *                   type: object
 */
// API to delete a team member
router.delete('/delete-team-member/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        // Find and delete the team member created by the logged-in user
        const deletedMember = await TeamMember.findOneAndDelete({
            _id: id,
            createdBy: req.user.id
        });

        if (!deletedMember) {
            return res.status(404).json({ message: 'Team member not found or access denied.' });
        }

        res.status(200).json({ status: true, message: 'Team member deleted successfully.', data: {} });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to delete team member. Please try again later.', data: {} });
    }
});

/**
 * @swagger
 *  /api/team-member/get-team-member-details/{id}:
 *   get:
 *     summary: Get team member details by ID (Admin only)
 *     description: Allows an admin to retrieve details of a specific team member by their ID.
 *     tags: [Admin - Team Members]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the team member to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Team member details fetched successfully.
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
 *                   example: Team member details fetched successfully.
 *                 data:
 *                   type: object
 *                   properties:
 *                     teamMember:
 *                       type: object
 *                       description: Details of the requested team member
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       404:
 *         description: Team member not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Team member not found.
 *       500:
 *         description: Failed to fetch team member details.
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
 *                   example: Failed to fetch team member details. Please try again later.
 *                 data:
 *                   type: object
 */
// API to get team member details by ID
router.get('/get-team-member-details/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        // Find the team member by ID
        const teamMember = await TeamMember.findById(id).select('-password');

        if (!teamMember) {
            return res.status(404).json({ message: 'Team member not found.' });
        }

        res.status(200).json({ status: true, message: 'Team member details fetched successfully.', data: { teamMember } });
    } catch (error) {
        console.error('Error fetching team member details:', error);
        res.status(500).json({ status: false, message: 'Failed to fetch team member details. Please try again later.', data: {} });
    }
});

/**
 * @swagger
 *  /api/team-member/get-team-members-by-law-firm/{lawFirmId}:
 *   get:
 *     summary: Get team members by Law Firm ID with pagination (Admin only)
 *     description: Allows an admin to retrieve paginated list of team members belonging to a specific law firm.
 *     tags: [Admin - Team Members]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lawFirmId
 *         required: true
 *         description: ID of the law firm to retrieve team members for
 *         schema:
 *           type: string
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
 *         description: Number of team members per page, default is 10
 *     responses:
 *       200:
 *         description: Team members fetched successfully.
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
 *                   example: Fetched successfully.
 *                 data:
 *                   type: object
 *                   properties:
 *                     teamMembers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         description: Team member object (excluding password)
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 30
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       500:
 *         description: Failed to fetch team members.
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
 *                   example: Failed to fetch team members.
 *                 data:
 *                   type: object
 */
// API to fetch team members by law firm ID with pagination
router.get('/get-team-members-by-law-firm/:lawFirmId', authenticateToken, async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    try {
        const teamMembers = await TeamMember.find({ createdBy: req.params.lawFirmId }, '-password')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        const totalMembers = await TeamMember.countDocuments({ createdBy: req.params.lawFirmId });
        res.status(200).json({ status: true, message: 'Fetched successfully.', data: { teamMembers }, pagination: { total: totalMembers, page, limit } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to fetch team members.', data: {} });
    }
});

/**
 * @swagger
 *  /api/team-member/get-team-members:
 *   get:
 *     summary: Get all team members with pagination (Admin only)
 *     description: Allows an admin to retrieve a paginated list of all team members within their law firm.
 *     tags: [Admin - Team Members]
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
 *         description: Number of team members per page, default is 10
 *     responses:
 *       200:
 *         description: Team members retrieved successfully.
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
 *                   example: Fetched successfully.
 *                 data:
 *                   type: object
 *                   properties:
 *                     teamMembers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         description: Team member object (excluding password)
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 30
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       500:
 *         description: Failed to retrieve team members.
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
 *                   example: Failed to retrieve team members.
 *                 data:
 *                   type: object
 */
// API to get all team members with pagination
router.get('/get-team-members', authenticateToken, async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    try {
        const teamMembers = await TeamMember.find({ createdBy: req.user.id }, '-password')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        const totalMembers = await TeamMember.countDocuments({ createdBy: req.user.id });
        res.status(200).json({ status: true, message: 'Fetched successfully.', data: { teamMembers }, pagination: { total: totalMembers, page, limit } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to retrieve team members.', data: {} });
    }
});


module.exports = router;