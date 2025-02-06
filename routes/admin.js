// routes/admin.js
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



// Add or update ChatGPT API key
router.post('/set-chatgpt-api-key', authenticateToken, async (req, res) => {
    const { chatgptApiKey } = req.body;

    if (!chatgptApiKey) {
        return res.status(400).json({ message: 'API key is required' });
    }

    try {
        let settings = await Settings.findOne();
        if (settings) {
            // Update existing API key
            settings.chatgptApiKey = chatgptApiKey;
            settings.updatedAt = Date.now();
            await settings.save();
        } else {
            // Create a new settings record with the API key
            settings = new Settings({ chatgptApiKey });
            await settings.save();
        }
        res.status(200).json({ message: 'ChatGPT API key saved successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/get-users', authenticateToken, async (req, res) => {
    try {
        const users = await User.find({}, 'username _id validated'); // Only select the fields we need
        res.status(200).json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});


// Get the ChatGPT API key (admin only)
router.get('/get-chatgpt-api-key', authenticateToken, async (req, res) => {
    try {
        const settings = await Settings.findOne();
        if (!settings || !settings.chatgptApiKey) {
            return res.status(404).json({ message: 'API key not found' });
        }
        res.status(200).json({ chatgptApiKey: settings.chatgptApiKey });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});





router.post("/book-appointment", authenticateToken, async (req, res) => {
  const { 
    clientId, 
    appointmentDate, 
    appointmentTime, 
    gender, 
    caseNotes 
  } = req.body;

  // Validate required fields
  if (!clientId || !appointmentDate || !appointmentTime) {
    return res.status(400).json({ message: "Missing required fields: clientId, appointmentDate, appointmentTime." });
  }

  try {
    // Validate the client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found." });
    }

    // Fetch the logged-in user's lawyer ID and law firm ID dynamically
    const lawyerId = req.user.id; // Assuming the logged-in user is the lawyer
    const lawFirm = await User.findById(req.user.createdBy, '_id role');
    if (!lawFirm || lawFirm.role !== "law_firm") {
      return res.status(404).json({ message: "Law firm not found or invalid role." });
    }

    // Validate the appointment time slot
    const existingAppointment = await Appointment.findOne({
      lawyerId,
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
    });

    if (existingAppointment) {
      return res.status(400).json({ message: "This time slot is already booked." });
    }

    // Create the new appointment
    const newAppointment = new Appointment({
      clientId,
      lawyerId,
      lawFirmId: lawFirm._id,
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      caseNotes: caseNotes || null,
      gender: gender || null, // Optional fields
    });

    await newAppointment.save();
    res.status(201).json({ message: "Appointment booked successfully.", appointment: newAppointment });
  } catch (error) {
    console.error("Error booking appointment:", error);
    res.status(500).json({ message: "Failed to book appointment. Please try again later." });
  }
});



// Get all appointments for the law firm
router.get('/appointments', authenticateToken, async (req, res) => {
  try {
    const appointments = await Appointment.find({ lawFirmId: req.user.id })
      .populate('clientId', 'name')
      .populate('caseId', 'caseType description')
      .sort({ appointmentDate: -1 });

    const formattedAppointments = appointments.map(apt => ({
      id: apt._id,
      title: "Appointment Request",
      date: new Date(apt.appointmentDate).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        hour: 'numeric',
        minute: 'numeric',
      }),
      status: apt.status, // 'pending', 'accepted', 'rejected'
      client: {
        name: apt.clientId.name,
        caseType: apt.caseId?.caseType || 'New Consultation',
        description: apt.caseId?.description || apt.caseNotes || 'New client consultation request',
      }
    }));

    res.status(200).json(formattedAppointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ message: 'Failed to fetch appointments' });
  }
});

// Update appointment status
router.patch('/appointments/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'accepted' or 'rejected'

    const appointment = await Appointment.findOneAndUpdate(
      { _id: id, lawFirmId: req.user.id },
      { status },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    res.status(200).json({ message: `Appointment ${status} successfully` });
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ message: 'Failed to update appointment' });
  }
});



// API to get all hearings
router.get('/get-hearings', authenticateToken, async (req, res) => {
    try {
        const hearings = await Hearing.find({ createdBy: req.user.id })
            .sort({ date: 1, time: 1 })
            .populate('client', 'name')
            .populate('caseId', 'title caseType')
            .lean(); // Use lean for better performance
        
        // Calculate and include `endTime` in response
        const hearingsWithEndTime = hearings.map(hearing => {
            const [hours, minutes] = hearing.time.split(':').map(Number);
            const endDate = new Date(hearing.date);
            endDate.setHours(hours, minutes + (hearing.duration || 60));
            return {
                ...hearing,
                endTime: endDate.toISOString(),
            };
        });

        res.status(200).json(hearingsWithEndTime);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to retrieve hearings.' });
    }
});

// // API to add a new hearing
// router.post('/add-hearing', authenticateToken, async (req, res) => {
//     const {
//         caseId,
//         date,
//         time,
//         location,
//         judge,
//         courtRoom,
//         opposingParty,
//         witnesses,
//         documents
//     } = req.body;

//     if (!caseId || !date || !time || !location) {
//         return res.status(400).json({ message: 'Missing required fields.' });
//     }

//     try {
//         // Verify case existence
//         const existingCase = await Case.findById(caseId);
//         if (!existingCase) {
//             return res.status(404).json({ message: 'Case not found.' });
//         }

//         // Validate time conflict
//         const startTime = new Date(`${date}T${time}`);
//         const endTime = new Date(startTime.getTime() + (60 * 60 * 1000)); // Default 1-hour duration

//         const conflict = await Hearing.findOne({
//             caseId,
//             date,
//             $or: [
//                 { time: { $gte: time, $lt: endTime.toISOString().split('T')[1] } },
//                 { endTime: { $gte: time, $lt: endTime.toISOString().split('T')[1] } }
//             ]
//         });

//         if (conflict) {
//             return res.status(400).json({ message: 'Hearing time conflicts with an existing schedule.' });
//         }

//         const newHearing = new Hearing({
//             caseId,
//             date,
//             time,
//             location,
//             judge,
//             courtRoom,
//             opposingParty,
//             witnesses,
//             documents,
//             createdBy: req.user.id,
//             caseType: existingCase.caseType
//         });

//         await newHearing.save();
//         res.status(201).json({ message: 'Hearing scheduled successfully', hearing: newHearing });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Failed to schedule hearing.' });
//     }
// });

// // API to get hearing details by ID
// router.get('/get-hearing/:id', authenticateToken, async (req, res) => {
//     try {
//         const hearing = await Hearing.findOne({ 
//             _id: req.params.id,
//             createdBy: req.user.id 
//         })
//         .populate('client', 'name')
//         .populate('caseId', 'title caseType');

//         if (!hearing) {
//             return res.status(404).json({ message: 'Hearing not found.' });
//         }

//         res.status(200).json(hearing);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Failed to retrieve hearing details.' });
//     }
// });

// // API to update hearing details
// router.put('/update-hearing/:id', authenticateToken, async (req, res) => {
//     try {
//         const updatedHearing = await Hearing.findOneAndUpdate(
//             { _id: req.params.id, createdBy: req.user.id },
//             { 
//                 $set: {
//                     ...req.body,
//                     updatedAt: new Date()
//                 }
//             },
//             { new: true }
//         );

//         if (!updatedHearing) {
//             return res.status(404).json({ message: 'Hearing not found.' });
//         }

//         res.status(200).json({ message: 'Hearing updated successfully', hearing: updatedHearing });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Failed to update hearing.' });
//     }
// });

// // API to delete hearing
// router.delete('/delete-hearing/:id', authenticateToken, async (req, res) => {
//     try {
//         const deletedHearing = await Hearing.findOneAndDelete({
//             _id: req.params.id,
//             createdBy: req.user.id
//         });

//         if (!deletedHearing) {
//             return res.status(404).json({ message: 'Hearing not found.' });
//         }

//         res.status(200).json({ message: 'Hearing deleted successfully' });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Failed to delete hearing.' });
//     }
// });

// // API to get upcoming hearings
// router.get('/get-upcoming-hearings', authenticateToken, async (req, res) => {
//     try {
//         const upcomingHearings = await Hearing.findUpcoming(req.user.id)
//             .populate('client', 'name')
//             .populate('caseId', 'title caseType');
        
//         res.status(200).json(upcomingHearings);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Failed to retrieve upcoming hearings.' });
//     }
// });

// Update timer for a case

// ✅ Create a new appointment
router.post('/create-appointment', authenticateToken, async (req, res) => {
    try {
        const newAppointment = await Appointment.createAppointment(req.body);
        res.status(201).json({ message: 'Appointment created successfully', appointment: newAppointment });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to create appointment. Please try again later.' });
    }
});

// ✅ Get appointment by ID
router.get('/get-appointment/:id', authenticateToken, async (req, res) => {
    try {
        const appointment = await Appointment.getAppointmentById(req.params.id);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }
        res.status(200).json(appointment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to retrieve appointment. Please try again later.' });
    }
});

// ✅ Get all appointments for a lawyer
router.get('/get-appointments-lawyer/:lawyerId', authenticateToken, async (req, res) => {
    try {
        const appointments = await Appointment.getAppointmentsByLawyer(req.params.lawyerId);
        res.status(200).json(appointments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to retrieve appointments. Please try again later.' });
    }
});

// ✅ Get all appointments for a client
router.get('/get-appointments-client/:clientId', authenticateToken, async (req, res) => {
    try {
        const appointments = await Appointment.getAppointmentsByClient(req.params.clientId);
        res.status(200).json(appointments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to retrieve appointments. Please try again later.' });
    }
});

// ✅ Update appointment status
router.put('/update-appointment-status/:id', authenticateToken, async (req, res) => {
    try {
        const updatedAppointment = await Appointment.updateAppointmentStatus(req.params.id, req.body.status);
        res.status(200).json({ message: 'Appointment status updated successfully', updatedAppointment });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to update appointment status. Please try again later.' });
    }
});

// ✅ Delete an appointment
router.delete('/delete-appointment/:id', authenticateToken, async (req, res) => {
    try {
        const deletedAppointment = await Appointment.deleteAppointment(req.params.id);
        if (!deletedAppointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }
        res.status(200).json({ message: 'Appointment deleted successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete appointment. Please try again later.' });
    }
});

// ✅ Create a new hearing schedule
router.post('/create-hearing', authenticateToken, async (req, res) => {
    try {
        const newHearingSchedule = await HearingSchedule.createHearingSchedule(req.body);
        res.status(201).json({ message: 'Hearing schedule created successfully', hearingSchedule: newHearingSchedule });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to create hearing schedule. Please try again later.' });
    }
});

// ✅ Get hearing schedule by ID
router.get('/get-hearing/:id', authenticateToken, async (req, res) => {
    try {
        const hearingSchedule = await HearingSchedule.getHearingScheduleById(req.params.id);
        if (!hearingSchedule) {
            return res.status(404).json({ message: 'Hearing schedule not found' });
        }
        res.status(200).json(hearingSchedule);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to retrieve hearing schedule. Please try again later.' });
    }
});

// ✅ Get all hearing schedules for a user
router.get('/get-hearings-user/:userId', authenticateToken, async (req, res) => {
    try {
        const hearingSchedules = await HearingSchedule.getHearingSchedulesByUser(req.params.userId);
        res.status(200).json(hearingSchedules);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to retrieve hearing schedules. Please try again later.' });
    }
});

// ✅ Delete a hearing schedule
router.delete('/delete-hearing/:id', authenticateToken, async (req, res) => {
    try {
        const deletedHearingSchedule = await HearingSchedule.deleteHearingSchedule(req.params.id);
        if (!deletedHearingSchedule) {
            return res.status(404).json({ message: 'Hearing schedule not found' });
        }
        res.status(200).json({ message: 'Hearing schedule deleted successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete hearing schedule. Please try again later.' });
    }
});


module.exports = router;



