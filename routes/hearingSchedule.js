const express = require('express');
const router = express.Router();
// const HearingSchedule = require('../models/HearingSchedule');
const Case = require('../models/Case');
const User = require('../models/User');

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
