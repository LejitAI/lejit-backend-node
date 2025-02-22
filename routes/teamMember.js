const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// PostgreSQL-based models
const User = require('../models/User');               // User functions (createUser, findUserByEmail, etc.)
const TeamMember = require('../models/TeamMember');     // TeamMember functions (createTeamMember, deleteTeamMemberByIdAndCreatedBy, findTeamMemberById, getTeamMembersByCreatedBy)
const Case = require('../models/Case');                 // Case model (PostgreSQL version)
const ImageForm = require('../models/ImageForm');       // ImageForm model (PostgreSQL version)
const Client = require('../models/Client');             // Client model (PostgreSQL version)
const Appointment = require("../models/Appointment");   // Appointment model (PostgreSQL version)
const bcrypt = require('bcryptjs');

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
 */
router.post('/add-team-member', authenticateToken, async (req, res) => {
  const { personalDetails, professionalDetails, bankAccountDetails, password } = req.body;
  try {
    // Create new team member using our PostgreSQL function
    const newTeamMember = await TeamMember.createTeamMember({
      personalDetails,
      professionalDetails,
      bankAccountDetails,
      password,
      createdBy: req.user.id
    });
    res.status(201).json({
      status: true,
      message: 'Team member added successfully',
      data: { teamMember: newTeamMember }
    });
  } catch (error) {
    // In PostgreSQL, duplicate key errors typically have code '23505'
    if (error.message.includes('duplicate key')) {
      return res.status(400).json({
        status: false,
        message: 'Email is already in use. Please use a different email.',
        data: {}
      });
    }
    console.error(error);
    res.status(500).json({
      status: false,
      message: 'Failed to add team member. Please try again later.',
      data: {}
    });
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
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       404:
 *         description: Team member not found or access denied.
 *       500:
 *         description: Failed to delete team member.
 */
router.delete('/delete-team-member/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    // Delete team member where the record matches both id and createdBy
    const deletedMember = await TeamMember.deleteTeamMemberByIdAndCreatedBy(id, req.user.id);
    if (!deletedMember) {
      return res.status(404).json({ message: 'Team member not found or access denied.' });
    }
    res.status(200).json({
      status: true,
      message: 'Team member deleted successfully.',
      data: {}
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: 'Failed to delete team member. Please try again later.',
      data: {}
    });
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
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       404:
 *         description: Team member not found.
 *       500:
 *         description: Failed to fetch team member details.
 */
router.get('/get-team-member-details/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    // Retrieve team member details by id (excluding password)
    const teamMember = await TeamMember.findTeamMemberById(id);
    if (!teamMember) {
      return res.status(404).json({ message: 'Team member not found.' });
    }
    res.status(200).json({
      status: true,
      message: 'Team member details fetched successfully.',
      data: { teamMember }
    });
  } catch (error) {
    console.error('Error fetching team member details:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to fetch team member details. Please try again later.',
      data: {}
    });
  }
});

/**
 * @swagger
 *  /api/team-member/get-team-members-by-law-firm/{lawFirmId}:
 *   get:
 *     summary: Get team members by Law Firm ID with pagination (Admin only)
 *     description: Allows an admin to retrieve a paginated list of team members belonging to a specific law firm.
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
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       500:
 *         description: Failed to fetch team members.
 */
router.get('/get-team-members-by-law-firm/:lawFirmId', authenticateToken, async (req, res) => {
  const lawFirmId = req.params.lawFirmId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  try {
    // Retrieve paginated team members created by the given law firm ID
    const { teamMembers, total } = await TeamMember.getTeamMembersByCreatedBy(lawFirmId, page, limit);
    res.status(200).json({
      status: true,
      message: 'Fetched successfully.',
      data: { teamMembers },
      pagination: { total, page, limit }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: 'Failed to fetch team members.',
      data: {}
    });
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
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       500:
 *         description: Failed to retrieve team members.
 */
router.get('/get-team-members', authenticateToken, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  try {
    // Retrieve paginated team members for the logged-in user
    const { teamMembers, total } = await TeamMember.getTeamMembersByCreatedBy(req.user.id, page, limit);
    res.status(200).json({
      status: true,
      message: 'Fetched successfully.',
      data: { teamMembers },
      pagination: { total, page, limit }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: 'Failed to retrieve team members.',
      data: {}
    });
  }
});

module.exports = router;
