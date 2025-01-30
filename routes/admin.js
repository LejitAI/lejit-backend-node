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


router.post('/add-team-member', authenticateToken, async (req, res) => {
    const {
        personalDetails = {},
        professionalDetails = {},
        bankAccountDetails = {},
        password
    } = req.body;

    try {
        // Validate required fields
        if (!personalDetails.name || !personalDetails.email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required.' });
        }

        // Ensure `address` exists
        personalDetails.address = personalDetails.address || { 
            line1: "", line2: "", city: "", state: "", country: "", postalCode: "" 
        };

        // Call PostgreSQL model function
        const newTeamMember = await TeamMember.createTeamMember({
            name: personalDetails.name,
            dateOfBirth: personalDetails.dateOfBirth,
            gender: personalDetails.gender,
            yearsOfExperience: personalDetails.yearsOfExperience,
            mobile: personalDetails.mobile,
            email: personalDetails.email,
            address: personalDetails.address,
            professionalDetails,
            bankAccountDetails,
            password,
            createdBy: req.user.id,
        });

        res.status(201).json({ message: 'Team member added successfully', teamMember: newTeamMember });

    } catch (error) {
        if (error.code === '23505') { // Unique constraint violation for email
            return res.status(400).json({ message: 'Email is already in use. Please use a different email.' });
        }
        console.error(error);
        res.status(500).json({ message: 'Failed to add team member. Please try again later.' });
    }
});

router.delete('/delete-team-member/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        // Call model function to delete the team member
        const deletedMember = await TeamMember.deleteTeamMember(id, req.user.id);

        if (!deletedMember) {
            return res.status(404).json({ message: 'Team member not found or access denied.' });
        }

        res.status(200).json({ message: 'Team member deleted successfully.' });
    } catch (error) {
        console.error('Error deleting team member:', error);
        res.status(500).json({ message: 'Failed to delete team member. Please try again later.' });
    }
});

router.get('/get-team-member-details/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        // Query PostgreSQL to find the team member by ID
        const query = `
            SELECT id, name, date_of_birth, gender, years_of_experience, mobile, email, 
                   address_line1, address_line2, city, state, country, postal_code,
                   lawyer_type, government_id, degree_type, degree_institution, specialization,
                   payment_method, card_number, expiration_date, cvv, save_card, 
                   account_number, bank_name, ifsc_code, upi_id, created_by, created_at
            FROM team_members 
            WHERE id = $1
        `;
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Team member not found.' });
        }

        // Remove sensitive data (e.g., password) from the response
        const teamMember = result.rows[0];

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



//get all law firms
// routes/admin.js
// API to get all law firm details
router.get('/get-all-law-firms', authenticateToken, async (req, res) => {
    try {
        // Query PostgreSQL to get all law firms
        const query = `
            SELECT id, law_firm_name, operating_since, years_of_experience, specialization,
                   email, mobile, address_line1, address_line2, city, state, postal_code,
                   lawyer_type, case_solved_count, case_based_bill_rate, time_based_bill_rate,
                   payment_method, card_number, expiration_date, cvv, save_card,
                   account_number, bank_name, ifsc_code, upi_id, created_at, created_by
            FROM image_forms
            ORDER BY created_at DESC;
        `;
        const result = await pool.query(query);

        // if (result.rows.length === 0) {
        //     return res.status(404).json({ message: 'No law firms found.' });
        // }

        res.status(200).json(result.rows);
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



// routes/admin.js
router.get('/get-law-firms', authenticateToken, async (req, res) => {
    try {
        const lawFirms = await User.find({ role: 'law_firm' }, 'law_firm _id'); // Fetch law firm names and IDs
        res.status(200).json(lawFirms);
    } catch (error) {
        console.error('Error fetching law firms:', error);
        res.status(500).json({ message: 'Failed to fetch law firms. Please try again later.' });
    }
});

router.get('/get-team-members-by-law-firm/:lawFirmId', authenticateToken, async (req, res) => {
    const { lawFirmId } = req.params;

    try {
        const query = `
            SELECT tm.*, u.law_firm_name
            FROM team_members tm
            JOIN users u ON tm.created_by = u.id
            WHERE tm.created_by = $1
            ORDER BY tm.created_at DESC;
        `;
        const result = await pool.query(query, [lawFirmId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'No team members found for this law firm.' });
        }

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching team members:', error);
        res.status(500).json({ message: 'Failed to fetch team members. Please try again later.' });
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



router.post('/add-law-firm-details', authenticateToken, async (req, res) => {
    const {
        lawFirmDetails,
        professionalDetails,
        bankAccountDetails
    } = req.body;

    try {
        // Validate required fields
        if (!lawFirmDetails || !lawFirmDetails.lawFirmName || !lawFirmDetails.contactInfo || !lawFirmDetails.contactInfo.email) {
            return res.status(400).json({ message: 'Law firm name and contact email are required.' });
        }

        // Call PostgreSQL model function
        const newLawFirmDetails = await ImageForm.createImageForm({
            lawFirmDetails,
            professionalDetails,
            bankAccountDetails,
            createdBy: req.user.id
        });

        res.status(201).json({ message: 'Law firm details added successfully', lawFirmDetails: newLawFirmDetails });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to add law firm details. Please try again later.' });
    }
});

// API to get law firm details
router.get('/get-all-law-firms', authenticateToken, async (req, res) => {
    try {
        // Query PostgreSQL to get all law firms
        const query = `
            SELECT id, law_firm_name, operating_since, years_of_experience, specialization,
                   email, mobile, address_line1, address_line2, city, state, postal_code,
                   lawyer_type, case_solved_count, case_based_bill_rate, time_based_bill_rate,
                   payment_method, card_number, expiration_date, cvv, save_card,
                   account_number, bank_name, ifsc_code, upi_id, created_at, created_by
            FROM image_forms
            ORDER BY created_at DESC;
        `;
        const result = await pool.query(query);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'No law firms found.' });
        }

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching law firms:', error);
        res.status(500).json({ message: 'Failed to fetch law firms. Please try again later.' });
    }
});

// ✅ API to Update Law Firm Details
router.put('/update-law-firm-details', authenticateToken, async (req, res) => {
    try {
        const { lawFirmDetails = {}, professionalDetails = {}, bankAccountDetails = {} } = req.body;

        // Ensure required fields exist
        if (!lawFirmDetails || !lawFirmDetails.lawFirmName || !lawFirmDetails.contactInfo || !lawFirmDetails.contactInfo.email) {
            return res.status(400).json({ message: 'Law firm name and contact email are required.' });
        }

        // Ensure bank account details exist before accessing properties
        bankAccountDetails.cardDetails = bankAccountDetails.cardDetails || { cardNumber: "", expirationDate: "", cvv: "", saveCard: false };
        bankAccountDetails.bankDetails = bankAccountDetails.bankDetails || { accountNumber: "", bankName: "", ifscCode: "" };
        bankAccountDetails.upiId = bankAccountDetails.upiId || "";

        // Query to update law firm details
        const query = `
            UPDATE image_forms
            SET law_firm_name = $1, operating_since = $2, years_of_experience = $3, specialization = $4,
                email = $5, mobile = $6, address_line1 = $7, address_line2 = $8, city = $9, state = $10, postal_code = $11,
                lawyer_type = $12, case_solved_count = $13, case_based_bill_rate = $14, time_based_bill_rate = $15,
                payment_method = $16, card_number = $17, expiration_date = $18, cvv = $19, save_card = $20,
                account_number = $21, bank_name = $22, ifsc_code = $23, upi_id = $24
            WHERE created_by = $25
            RETURNING *;
        `;

        const values = [
            lawFirmDetails.lawFirmName, lawFirmDetails.operatingSince, lawFirmDetails.yearsOfExperience, lawFirmDetails.specialization,
            lawFirmDetails.contactInfo.email, lawFirmDetails.contactInfo.mobile, lawFirmDetails.contactInfo.address.line1,
            lawFirmDetails.contactInfo.address.line2, lawFirmDetails.contactInfo.address.city, lawFirmDetails.contactInfo.address.state,
            lawFirmDetails.contactInfo.address.postalCode, professionalDetails.lawyerType, professionalDetails.caseDetails.caseSolvedCount,
            professionalDetails.caseDetails.caseBasedBillRate, professionalDetails.caseDetails.timeBasedBillRate,
            bankAccountDetails.paymentMethod, bankAccountDetails.cardDetails.cardNumber, bankAccountDetails.cardDetails.expirationDate,
            bankAccountDetails.cardDetails.cvv, bankAccountDetails.cardDetails.saveCard, bankAccountDetails.bankDetails.accountNumber,
            bankAccountDetails.bankDetails.bankName, bankAccountDetails.bankDetails.ifscCode, bankAccountDetails.upiId,
            req.user.id // Ensures the logged-in user can only update their own law firm details
        ];

        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Law firm details not found' });
        }

        res.status(200).json({ message: 'Law firm details updated successfully', updatedDetails: result.rows[0] });
    } catch (error) {
        console.error('Error updating law firm details:', error);
        res.status(500).json({ message: 'Failed to update law firm details. Please try again later.' });
    }
});

// ✅ Create a new ImageForm
router.post('/create-image-form', authenticateToken, async (req, res) => {
    try {
        const newImageForm = await ImageForm.createImageForm({ ...req.body, createdBy: req.user.id });
        res.status(201).json({ message: 'ImageForm created successfully', imageForm: newImageForm });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to create ImageForm. Please try again later.' });
    }
});

// ✅ Get all ImageForms created by the logged-in user
router.get('/get-image-forms', authenticateToken, async (req, res) => {
    try {
        const imageForms = await ImageForm.getImageFormsByUser(req.user.id);
        res.status(200).json(imageForms);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to retrieve ImageForms. Please try again later.' });
    }
});

// ✅ Get ImageForm by ID
router.get('/get-image-form/:id', authenticateToken, async (req, res) => {
    try {
        const imageForm = await ImageForm.getImageFormById(req.params.id);
        if (!imageForm) {
            return res.status(404).json({ message: 'ImageForm not found' });
        }
        res.status(200).json(imageForm);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to retrieve ImageForm. Please try again later.' });
    }
});

// ✅ Delete an ImageForm
router.delete('/delete-image-form/:id', authenticateToken, async (req, res) => {
    try {
        const deletedForm = await ImageForm.deleteImageForm(req.params.id, req.user.id);
        if (!deletedForm) {
            return res.status(404).json({ message: 'ImageForm not found or access denied.' });
        }
        res.status(200).json({ message: 'ImageForm deleted successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete ImageForm. Please try again later.' });
    }
});

// ✅ API to Get All Cases for Logged-in User
router.get('/get-cases', authenticateToken, async (req, res) => {
    try {
        // Fetch all cases created by the logged-in user
        const cases = await Case.getCasesByUser(req.user.id);

        res.status(200).json(cases);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to retrieve cases. Please try again later.' });
    }
});

// ✅ API to Get a Single Case by ID
router.get('/get-case/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Find the case and ensure it belongs to the logged-in user
        const caseDetail = await Case.findCaseById(id);

        if (!caseDetail) {
            return res.status(404).json({ message: 'Case not found or you do not have permission to view it.' });
        }

        res.status(200).json(caseDetail);
    } catch (error) {
        console.error(error);

        if (error.code === '22P02') { // Invalid UUID error in PostgreSQL
            return res.status(400).json({ message: 'Invalid case ID format.' });
        }

        res.status(500).json({ message: 'Failed to retrieve the case. Please try again later.' });
    }
});

// ✅ API to Add a New Case
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
        // Create and save new case in PostgreSQL
        const newCase = await Case.createCase({
            title,
            startingDate,
            caseType,
            client,
            oppositeClient,
            caseWitness,
            caseDescription,
            documents,
            createdBy: req.user.id, // Associate the logged-in user
        });

        res.status(201).json({ message: 'Case added successfully', case: newCase });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to add case. Please try again later.' });
    }
});

// ✅ API to Delete a Case
router.delete('/delete-case/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        // Delete the case only if the logged-in user created it
        const deletedCase = await Case.deleteCase(id, req.user.id);

        if (!deletedCase) {
            return res.status(404).json({ message: 'Case not found or access denied.' });
        }

        res.status(200).json({ message: 'Case deleted successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete case. Please try again later.' });
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
        // Save new client details in PostgreSQL
        const newClient = await Client.createClient({
            name,
            dateOfBirth,
            gender,
            email,
            mobile,
            address,
            profilePhoto,
            createdBy: req.user.id, // Associate the logged-in user
        });

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
        const clients = await Client.getClientsByUser(req.user.id);

        if (!clients || clients.length === 0) {
            return res.status(200).json([]); // Return an empty array if no clients are found
        }

        res.status(200).json(clients);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to retrieve client details. Please try again later.' });
    }
});

// API to delete a client
router.delete('/delete-client/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        // Ensure the client belongs to the logged-in user before deleting
        const deletedClient = await Client.deleteClient(id, req.user.id);

        if (!deletedClient) {
            return res.status(404).json({ message: 'Client not found or access denied.' });
        }

        res.status(200).json({ message: 'Client deleted successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete client. Please try again later.' });
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
router.put('/update-case-timer/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { timer, isRunning } = req.body;

    if (typeof timer !== 'number' || typeof isRunning !== 'boolean') {
        return res.status(400).json({ message: 'Invalid timer or isRunning value.' });
    }

    try {
        const updatedCase = await Case.findOneAndUpdate(
            { _id: id, createdBy: req.user.id },
            { timer, isRunning },
            { new: true }
        );

        if (!updatedCase) {
            return res.status(404).json({ message: 'Case not found or access denied.' });
        }

        res.status(200).json({ message: 'Timer updated successfully', case: updatedCase });
    } catch (error) {
        console.error('Error updating timer:', error);
        res.status(500).json({ message: 'Failed to update timer. Please try again later.' });
    }
});


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



