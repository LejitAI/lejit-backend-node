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



// Add or update ChatGPT API key
router.post('/set-chatgpt-api-key', authenticateToken, async (req, res) => {
    const { chatgptApiKey } = req.body;

    if (!chatgptApiKey) {
        return res.status(400).json({ status: false, message: 'API key is required', data: {} });
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
        res.status(200).json({ status: true, message: 'ChatGPT API key saved successfully', data: {} });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Server error', data: {} });
    }
});

router.get('/get-users', authenticateToken, async (req, res) => {
    try {
        const users = await User.find({}, 'username _id validated'); // Only select the fields we need
        res.status(200).json({ status: true, message: 'Users retrieved successfully', data: users });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Server error', data: {} });
    }
});


// Get the ChatGPT API key (admin only)
router.get('/get-chatgpt-api-key', authenticateToken, async (req, res) => {
    try {
        const settings = await Settings.findOne();
        if (!settings || !settings.chatgptApiKey) {
            return res.status(404).json({ status: false, message: 'API key not found', data: {} });
        }
        res.status(200).json({ status: true, message: 'API key retrieved successfully', data: { chatgptApiKey: settings.chatgptApiKey } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Server error', data: {} });
    }
});


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
            return res.status(404).json({ status: false, message: 'Team member not found or access denied.', data: {} });
        }

        res.status(200).json({ status: true, message: 'Team member deleted successfully.', data: {} });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to delete team member. Please try again later.', data: {} });
    }
});

// API to get team member details by ID
router.get('/get-team-member-details/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        // Find the team member by ID
        const teamMember = await TeamMember.findById(id).select('-password');

        if (!teamMember) {
            return res.status(404).json({ status: false, message: 'Team member not found.', data: {} });
        }

        res.status(200).json({ status: true, message: 'Team member details retrieved successfully', data: teamMember });
    } catch (error) {
        console.error('Error fetching team member details:', error);
        res.status(500).json({ status: false, message: 'Failed to fetch team member details. Please try again later.', data: {} });
    }
});


// routes/admin.js
router.get('/get-law-firms', authenticateToken, async (req, res) => {
    try {
        const lawFirms = await User.find({ role: 'law_firm' }, 'law_firm_name _id');
        res.status(200).json({ status: true, message: 'Law firms retrieved successfully', data: lawFirms });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to fetch law firms. Please try again later.', data: {} });
    }
});


// API to fetch team members by law firm ID
router.get('/get-team-members-by-law-firm/:lawFirmId', authenticateToken, async (req, res) => {
    const { lawFirmId } = req.params;

    try {
        const teamMembers = await TeamMember.find({ createdBy: lawFirmId }).populate('createdBy', 'law_firm_name');

        if (teamMembers.length === 0) {
            return res.status(404).json({ status: false, message: 'No team members found for this law firm.', data: {} });
        }

        res.status(200).json({ status: true, message: 'Team members retrieved successfully', data: teamMembers });
    } catch (error) {
        console.error('Error fetching team members:', error);
        res.status(500).json({ status: false, message: 'Failed to fetch team members. Please try again later.', data: {} });
    }
});


//get all law firms
// routes/admin.js
// API to get all law firm details
router.get('/get-all-law-firms', authenticateToken, async (req, res) => {
    try {
        // Fetch all law firms from the ImageForm schema
        const lawFirms = await ImageForm.find({}, 'lawFirmDetails professionalDetails bankAccountDetails createdAt createdBy');

        if (!lawFirms || lawFirms.length === 0) {
            return res.status(404).json({ status: false, message: 'No law firms found.', data: {} });
        }

        res.status(200).json({ status: true, message: 'Law firms retrieved successfully', data: lawFirms });
    } catch (error) {
        console.error('Error fetching law firms:', error);
        res.status(500).json({ status: false, message: 'Failed to fetch law firms. Please try again later.', data: {} });
    }
});


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



// routes/admin.js
router.get('/get-law-firms', authenticateToken, async (req, res) => {
    try {
        const lawFirms = await User.find({ role: 'law_firm' }, 'law_firm _id'); // Fetch law firm names and IDs
        res.status(200).json({ status: true, message: 'Law firms retrieved successfully', data: lawFirms });
    } catch (error) {
        console.error('Error fetching law firms:', error);
        res.status(500).json({ status: false, message: 'Failed to fetch law firms. Please try again later.', data: {} });
    }
});

// API to fetch team members by law firm ID
router.get('/get-team-members-by-law-firm/:lawFirmId', authenticateToken, async (req, res) => {
    const { lawFirmId } = req.params;
    try {
        const teamMembers = await TeamMember.find({ createdBy: lawFirmId }, '-password').sort({ createdAt: -1 });
        res.status(200).json({ status: true, message: 'Team members retrieved successfully', data: teamMembers });
    } catch (error) {
        console.error('Error fetching team members:', error);
        res.status(500).json({ status: false, message: 'Failed to fetch team members. Please try again later.', data: {} });
    }
});



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
        // Create and save new case
        const newCase = new Case({
            title,
            startingDate: new Date(startingDate),
            caseType,
            client,
            oppositeClient,
            caseWitness,
            caseDescription,
            documents,
            createdBy: req.user.id, // Associate the logged-in user
            startTime: new Date(), // Set the start time to the current time
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
        // Find and delete the case created by the logged-in user
        const deletedCase = await Case.findOneAndDelete({
            _id: id,
            createdBy: req.user.id // Ensure the case belongs to the logged-in user
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




// API to get all team members
router.get('/get-team-members', authenticateToken, async (req, res) => {
    try {
        // Fetch team members created by the logged-in user
        const teamMembers = await TeamMember.find({ createdBy: req.user.id }, '-password').sort({ createdAt: -1 });
        res.status(200).json({ status: true, message: 'Team members retrieved successfully', data: teamMembers });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to retrieve team members. Please try again later.', data: {} });
    }
});



// Add a new law firm details (including personal, professional, and bank details)
router.post('/add-law-firm-details', authenticateToken, async (req, res) => {
    const {
        lawFirmDetails,
        professionalDetails,
        bankAccountDetails
    } = req.body;

    try {
        // Create and save new law firm details
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

// API to get law firm details
router.get('/get-law-firm-details', authenticateToken, async (req, res) => {
    try {
        const lawFirmDetails = await ImageForm.findOne({ createdBy: req.user.id }); // Find the details created by the logged-in admin
        
        if (!lawFirmDetails) {
            return res.status(404).json({ status: false, message: 'Law firm details not found', data: {} });
        }

        res.status(200).json({ status: true, message: 'Law firm details retrieved successfully', data: lawFirmDetails });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to retrieve law firm details. Please try again later.', data: {} });
    }
});

// Update law firm details
router.put('/update-law-firm-details', authenticateToken, async (req, res) => {
    try {
        const { lawFirmDetails, professionalDetails, bankAccountDetails } = req.body;

        // Find and update the law firm details for the logged-in admin
        const updatedDetails = await ImageForm.findOneAndUpdate(
            { createdBy: req.user.id }, // Match the user ID of the logged-in admin
            {
                lawFirmDetails,
                professionalDetails,
                bankAccountDetails,
            },
            { new: true } // Return the updated document after modification
        );

        if (!updatedDetails) {
            return res.status(404).json({ status: false, message: 'Law firm details not found', data: {} });
        }

        res.status(200).json({ status: true, message: 'Law firm details updated successfully', data: updatedDetails });
    } catch (error) {
        console.error('Error updating law firm details:', error);
        res.status(500).json({ status: false, message: 'Failed to update law firm details. Please try again later.', data: {} });
    }
});


// API to get all case details
router.get('/get-cases', authenticateToken, async (req, res) => {
    try {
        // Retrieve cases created by the logged-in user
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

        // Find the case by its ID and ensure it belongs to the logged-in user
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
        // Create and save new client details
        const newClient = new Client({
            name,
            dateOfBirth,
            gender,
            email,
            mobile,
            address,
            profilePhoto,
            createdBy: req.user.id, // Associate the logged-in user
        });

        await newClient.save();
        res.status(201).json({ status: true, message: 'Client details saved successfully', data: { client: newClient } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to save client details. Please try again later.', data: {} });
    }
});


// API to get client details
router.get('/get-client', authenticateToken, async (req, res) => {
    try {
        // Retrieve clients created by the logged-in user
        const clients = await Client.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
        
        if (!clients || clients.length === 0) {
            return res.status(200).json({ status: true, message: 'No clients found', data: [] });
        }

        res.status(200).json({ status: true, message: 'Clients retrieved successfully', data: clients });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to retrieve client details. Please try again later.', data: {} });
    }
});

router.delete('/delete-client/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        // Find and delete the client created by the logged-in user
        const deletedClient = await Client.findOneAndDelete({
            _id: id,
            createdBy: req.user.id, // Ensure the client belongs to the logged-in user
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
    return res.status(400).json({ status: false, message: "Missing required fields: clientId, appointmentDate, appointmentTime.", data: {} });
  }

  try {
    // Validate the client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ status: false, message: "Client not found.", data: {} });
    }

    // Fetch the logged-in user's lawyer ID and law firm ID dynamically
    const lawyerId = req.user.id; // Assuming the logged-in user is the lawyer
    const lawFirm = await User.findById(req.user.createdBy, '_id role');
    if (!lawFirm || lawFirm.role !== "law_firm") {
      return res.status(404).json({ status: false, message: "Law firm not found or invalid role.", data: {} });
    }

    // Validate the appointment time slot
    const existingAppointment = await Appointment.findOne({
      lawyerId,
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
    });

    if (existingAppointment) {
      return res.status(400).json({ status: false, message: "This time slot is already booked.", data: {} });
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
    res.status(201).json({ status: true, message: "Appointment booked successfully.", data: { appointment: newAppointment } });
  } catch (error) {
    console.error("Error booking appointment:", error);
    res.status(500).json({ status: false, message: "Failed to book appointment. Please try again later.", data: {} });
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

    res.status(200).json({ status: true, message: 'Appointments retrieved successfully', data: formattedAppointments });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ status: false, message: 'Failed to fetch appointments', data: {} });
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
      return res.status(404).json({ status: false, message: 'Appointment not found', data: {} });
    }

    res.status(200).json({ status: true, message: `Appointment ${status} successfully`, data: {} });
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ status: false, message: 'Failed to update appointment', data: {} });
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

        res.status(200).json({ status: true, message: 'Hearings retrieved successfully', data: hearingsWithEndTime });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to retrieve hearings.', data: {} });
    }
});

// API to add a new hearing
router.post('/add-hearing', authenticateToken, async (req, res) => {
    const {
        caseId,
        date,
        time,
        location,
        judge,
        courtRoom,
        opposingParty,
        witnesses,
        documents
    } = req.body;

    if (!caseId || !date || !time || !location) {
        return res.status(400).json({ status: false, message: 'Missing required fields.', data: {} });
    }

    try {
        // Verify case existence
        const existingCase = await Case.findById(caseId);
        if (!existingCase) {
            return res.status(404).json({ status: false, message: 'Case not found.', data: {} });
        }

        // Validate time conflict
        const startTime = new Date(`${date}T${time}`);
        const endTime = new Date(startTime.getTime() + (60 * 60 * 1000)); // Default 1-hour duration

        const conflict = await Hearing.findOne({
            caseId,
            date,
            $or: [
                { time: { $gte: time, $lt: endTime.toISOString().split('T')[1] } },
                { endTime: { $gte: time, $lt: endTime.toISOString().split('T')[1] } }
            ]
        });

        if (conflict) {
            return res.status(400).json({ status: false, message: 'Hearing time conflicts with an existing schedule.', data: {} });
        }

        const newHearing = new Hearing({
            caseId,
            date,
            time,
            location,
            judge,
            courtRoom,
            opposingParty,
            witnesses,
            documents,
            createdBy: req.user.id,
            caseType: existingCase.caseType
        });

        await newHearing.save();
        res.status(201).json({ status: true, message: 'Hearing scheduled successfully', data: { hearing: newHearing } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to schedule hearing.', data: {} });
    }
});

// API to get hearing details by ID
router.get('/get-hearing/:id', authenticateToken, async (req, res) => {
    try {
        const hearing = await Hearing.findOne({ 
            _id: req.params.id,
            createdBy: req.user.id 
        })
        .populate('client', 'name')
        .populate('caseId', 'title caseType');

        if (!hearing) {
            return res.status(404).json({ status: false, message: 'Hearing not found.', data: {} });
        }

        res.status(200).json({ status: true, message: 'Hearing details retrieved successfully', data: hearing });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to retrieve hearing details.', data: {} });
    }
});

// API to update hearing details
router.put('/update-hearing/:id', authenticateToken, async (req, res) => {
    try {
        const updatedHearing = await Hearing.findOneAndUpdate(
            { _id: req.params.id, createdBy: req.user.id },
            { 
                $set: {
                    ...req.body,
                    updatedAt: new Date()
                }
            },
            { new: true }
        );

        if (!updatedHearing) {
            return res.status(404).json({ status: false, message: 'Hearing not found.', data: {} });
        }

        res.status(200).json({ status: true, message: 'Hearing updated successfully', data: { hearing: updatedHearing } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to update hearing.', data: {} });
    }
});

// API to delete hearing
router.delete('/delete-hearing/:id', authenticateToken, async (req, res) => {
    try {
        const deletedHearing = await Hearing.findOneAndDelete({
            _id: req.params.id,
            createdBy: req.user.id
        });

        if (!deletedHearing) {
            return res.status(404).json({ status: false, message: 'Hearing not found.', data: {} });
        }

        res.status(200).json({ status: true, message: 'Hearing deleted successfully', data: {} });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to delete hearing.', data: {} });
    }
});

// API to get upcoming hearings
router.get('/get-upcoming-hearings', authenticateToken, async (req, res) => {
    try {
        const upcomingHearings = await Hearing.findUpcoming(req.user.id)
            .populate('client', 'name')
            .populate('caseId', 'title caseType');
        
        res.status(200).json({ status: true, message: 'Upcoming hearings retrieved successfully', data: upcomingHearings });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Failed to retrieve upcoming hearings.', data: {} });
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

module.exports = router;
