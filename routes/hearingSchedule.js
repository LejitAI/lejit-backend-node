const express = require('express');
const router = express.Router();
const HearingSchedule = require('../models/HearingSchedule');
const Case = require('../models/Case');
const User = require('../models/User');

/**
 * @swagger
 * /api/hearing-schedule:
 *   post:
 *     summary: Create a new hearing schedule
 *     description: Creates a new hearing schedule entry, associating it with a user and a case.
 *     tags: [Hearing Schedule]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - caseId
 *               - caseName
 *               - date
 *               - time
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the user for whom the hearing is scheduled
 *               caseId:
 *                 type: string
 *                 description: ID of the case associated with the hearing
 *               caseName:
 *                 type: string
 *                 description: Name of the case
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Date of the hearing (YYYY-MM-DD)
 *               time:
 *                 type: string
 *                 format: time
 *                 description: Time of the hearing (HH:MM)
 *     responses:
 *       201:
 *         description: Hearing schedule created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Hearing schedule created successfully
 *                 hearingSchedule:
 *                   type: object
 *                   description: The newly created hearing schedule object
 *       404:
 *         description: User or Case not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User not found or Case not found
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Server error
 */
// POST /api/hearing-schedule
router.post('/', async (req, res) => {
    const { userId, caseId, caseName, date, time } = req.body;

    try {
        // Validate user and case existence
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const caseItem = await Case.findById(caseId);
        if (!caseItem) {
            return res.status(404).json({ message: 'Case not found' });
        }

        // Create new hearing schedule
        const newHearingSchedule = new HearingSchedule({
            userId,
            caseId,
            caseName,
            date,
            time,
        });

        await newHearingSchedule.save();
        res.status(201).json({ message: 'Hearing schedule created successfully', hearingSchedule: newHearingSchedule });
    } catch (error) {
        console.error('Error creating hearing schedule:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @swagger
 * /api/hearing-schedule/{userId}:
 *   get:
 *     summary: Get hearing schedules by user ID
 *     description: Retrieves a list of hearing schedules for a specific user, identified by userId.
 *     tags: [Hearing Schedule]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: ID of the user to retrieve hearing schedules for
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Hearing schedules retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   caseName:
 *                     type: string
 *                     example: "Client vs Company"
 *                   date:
 *                     type: string
 *                     format: date
 *                     example: "2024-01-15"
 *                   time:
 *                     type: string
 *                     format: time
 *                     example: "10:00"
 *       404:
 *         description: No hearing schedules found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No hearing schedules found
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Server error
 */
router.get('/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const hearingSchedules = await HearingSchedule.find({ userId }).select('caseName date time');
        if (!hearingSchedules.length) {
            return res.status(404).json({ message: 'No hearing schedules found' });
        }

        res.status(200).json(hearingSchedules);
    } catch (error) {
        console.error('Error fetching hearing schedules:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


module.exports = router;