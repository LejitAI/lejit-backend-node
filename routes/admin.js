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
        res.status(201).json({ message: 'Team member added successfully', teamMember: newTeamMember });
    } catch (error) {
        // Handle unique email constraint error
        if (error.code === 11000 && error.keyPattern && error.keyPattern['personalDetails.email']) {
            return res.status(400).json({ message: 'Email is already in use. Please use a different email.' });
        }
        console.error(error);
        res.status(500).json({ message: 'Failed to add team member. Please try again later.' });
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
            return res.status(404).json({ message: 'Team member not found or access denied.' });
        }

        res.status(200).json({ message: 'Team member deleted successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete team member. Please try again later.' });
    }
});

// API to get team member details by ID
router.get('/get-team-member-details/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        // Find the team member by ID
        const teamMember = await TeamMember.findById(id).select('-password');

        if (!teamMember) {
            return res.status(404).json({ message: 'Team member not found.' });
        }

        res.status(200).json(teamMember);
    } catch (error) {
        console.error('Error fetching team member details:', error);
        res.status(500).json({ message: 'Failed to fetch team member details. Please try again later.' });
    }
});


// routes/admin.js
router.get('/get-law-firms', authenticateToken, async (req, res) => {
    try {
        const lawFirms = await User.find({ role: 'law_firm' }, 'law_firm_name _id');
        res.status(200).json(lawFirms);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch law firms. Please try again later.' });
    }
});


// API to fetch team members by law firm ID
router.get('/get-team-members-by-law-firm/:lawFirmId', authenticateToken, async (req, res) => {
    const { lawFirmId } = req.params;

    try {
        const teamMembers = await TeamMember.find({ createdBy: lawFirmId }).populate('createdBy', 'law_firm_name');

        if (teamMembers.length === 0) {
            return res.status(404).json({ message: 'No team members found for this law firm.' });
        }

        res.status(200).json(teamMembers);
    } catch (error) {
        console.error('Error fetching team members:', error);
        res.status(500).json({ message: 'Failed to fetch team members. Please try again later.' });
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
            return res.status(404).json({ message: 'No law firms found.' });
        }

        res.status(200).json(lawFirms);
    } catch (error) {
        console.error('Error fetching law firms:', error);
        res.status(500).json({ message: 'Failed to fetch law firms. Please try again later.' });
    }
});


// Get law firm details by ID
router.get('/get-law-firm-details/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const lawFirmDetails = await ImageForm.findOne({ createdBy: id });

        if (!lawFirmDetails) {
            return res.status(404).json({ message: 'Law firm details not found.' });
        }

        res.status(200).json(lawFirmDetails);
    } catch (error) {
        console.error('Error fetching law firm details:', error);
        res.status(500).json({ message: 'Failed to fetch law firm details. Please try again later.' });
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
        return res.status(400).json({ message: 'Please fill in all required fields.' });
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
        });

        await newCase.save();
        res.status(201).json({ message: 'Case added successfully', case: newCase });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to add case. Please try again later.' });
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
            return res.status(404).json({ message: 'Case not found or access denied.' });
        }

        res.status(200).json({ message: 'Case deleted successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete case. Please try again later.' });
    }
});




// API to get all team members
router.get('/get-team-members', authenticateToken, async (req, res) => {
    try {
        // Fetch team members created by the logged-in user
        const teamMembers = await TeamMember.find({ createdBy: req.user.id }, '-password').sort({ createdAt: -1 });
        res.status(200).json(teamMembers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to retrieve team members. Please try again later.' });
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
        res.status(201).json({ message: 'Law firm details added successfully', lawFirmDetails: newLawFirmDetails });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to add law firm details. Please try again later.' });
    }
});

// API to get law firm details
router.get('/get-law-firm-details', authenticateToken, async (req, res) => {
    try {
        const lawFirmDetails = await ImageForm.findOne({ createdBy: req.user.id }); // Find the details created by the logged-in admin
        
        if (!lawFirmDetails) {
            return res.status(404).json({ message: 'Law firm details not found' });
        }

        res.status(200).json(lawFirmDetails);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to retrieve law firm details. Please try again later.' });
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
            return res.status(404).json({ message: 'Law firm details not found' });
        }

        res.status(200).json({ message: 'Law firm details updated successfully', updatedDetails });
    } catch (error) {
        console.error('Error updating law firm details:', error);
        res.status(500).json({ message: 'Failed to update law firm details. Please try again later.' });
    }
});


// API to get all case details
router.get('/get-cases', authenticateToken, async (req, res) => {
    try {
        // Retrieve cases created by the logged-in user
        const cases = await Case.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json(cases);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to retrieve cases. Please try again later.' });
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
        return res.status(400).json({ message: 'Please fill in all required fields.' });
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
        res.status(201).json({ message: 'Client details saved successfully', client: newClient });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to save client details. Please try again later.' });
    }
});


// API to get client details
router.get('/get-client', authenticateToken, async (req, res) => {
    try {
        // Retrieve clients created by the logged-in user
        const clients = await Client.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
        
        if (!clients || clients.length === 0) {
            return res.status(200).json([]); // Return an empty array if no clients are found
        }

        res.status(200).json(clients);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to retrieve client details. Please try again later.' });
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
            return res.status(404).json({ message: 'Client not found or access denied.' });
        }

        res.status(200).json({ message: 'Client deleted successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete client. Please try again later.' });
    }
});

// Book an appointment
// Book an appointment
router.post("/book-appointment", authenticateToken, async (req, res) => {
  const { clientId, lawyerId, lawFirmId, appointmentDate, appointmentTime, caseNotes } = req.body;

  if (!clientId || !lawyerId || !lawFirmId || !appointmentDate || !appointmentTime) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    // Check if lawyer exists
    const lawyer = await TeamMember.findById(lawyerId);
    if (!lawyer) {
      return res.status(404).json({ message: "Lawyer not found." });
    }

    // Check if client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found." });
    }

    // Check for conflicting appointments
    const conflictingAppointment = await Appointment.findOne({
      lawyerId,
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      status: { $in: ["Pending", "Confirmed"] },
    });

    if (conflictingAppointment) {
      return res.status(400).json({ message: "Time slot is already booked." });
    }

    // Create and save appointment
    const newAppointment = new Appointment({
      clientId,
      lawyerId,
      lawFirmId,
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      caseNotes,
    });

    await newAppointment.save();
    res.status(201).json({ message: "Appointment booked successfully", appointment: newAppointment });
  } catch (error) {
    console.error("Error booking appointment:", error);
    res.status(500).json({ message: "Failed to book appointment. Please try again later." });
  }
});

// Get pending appointments for a lawyer
router.get("/lawyer-appointments/:lawyerId", authenticateToken, async (req, res) => {
  const { lawyerId } = req.params;

  try {
    const appointments = await Appointment.find({ lawyerId, status: "Pending" })
      .populate("clientId", "name email")
      .populate("lawFirmId", "law_firm_name");
    res.status(200).json(appointments);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).json({ message: "Failed to fetch appointments." });
  }
});




module.exports = router;
