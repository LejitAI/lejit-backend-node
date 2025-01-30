const { pool } = require('../config/db'); // PostgreSQL connection
const bcrypt = require('bcryptjs');

// ✅ Create a new team member
const createTeamMember = async (teamMemberData) => {
    const {
        name,
        dateOfBirth,
        gender,
        yearsOfExperience,
        mobile,
        email,
        address,
        professionalDetails,
        bankAccountDetails,
        password,
        createdBy
    } = teamMemberData;

    try {
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const query = `
            INSERT INTO team_members (
                name, date_of_birth, gender, years_of_experience, mobile, email, 
                address_line1, address_line2, city, state, country, postal_code,
                lawyer_type, government_id, degree_type, degree_institution, specialization,
                payment_method, card_number, expiration_date, cvv, save_card, account_number, bank_name, ifsc_code, upi_id,
                password, created_by
            ) VALUES (
                $1, $2, $3, $4, $5, $6, 
                $7, $8, $9, $10, $11, $12,
                $13, $14, $15, $16, $17,
                $18, $19, $20, $21, $22, $23, $24, $25, $26,
                $27, $28
            )
            RETURNING *;
        `;

        const values = [
            name, dateOfBirth, gender, yearsOfExperience, mobile, email,
            address.line1, address.line2, address.city, address.state, address.country, address.postalCode,
            professionalDetails.lawyerType, professionalDetails.governmentID, professionalDetails.degreeType, 
            professionalDetails.degreeInstitution, professionalDetails.specialization,
            bankAccountDetails.paymentMethod, bankAccountDetails.cardDetails.cardNumber, 
            bankAccountDetails.cardDetails.expirationDate, bankAccountDetails.cardDetails.cvv, 
            bankAccountDetails.cardDetails.saveCard, bankAccountDetails.bankDetails.accountNumber, 
            bankAccountDetails.bankDetails.bankName, bankAccountDetails.bankDetails.ifscCode, 
            bankAccountDetails.upiId,
            hashedPassword, createdBy
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        throw new Error(`Error creating team member: ${err.message}`);
    }
};

// ✅ Find a team member by email
const findTeamMemberByEmail = async (email) => {
    try {
        const query = 'SELECT * FROM team_members WHERE email = $1';
        const result = await pool.query(query, [email]);

        return result.rows[0];
    } catch (err) {
        throw new Error(`Error finding team member: ${err.message}`);
    }
};

// ✅ Get all team members created by a user
const getTeamMembersByUser = async (userId) => {
    try {
        const query = 'SELECT * FROM team_members WHERE created_by = $1 ORDER BY created_at DESC';
        const result = await pool.query(query, [userId]);

        return result.rows;
    } catch (err) {
        throw new Error(`Error retrieving team members: ${err.message}`);
    }
};

// ✅ Delete a team member
const deleteTeamMember = async (id, userId) => {
    try {
        const query = 'DELETE FROM team_members WHERE id = $1 AND created_by = $2 RETURNING *';
        const result = await pool.query(query, [id, userId]);

        return result.rowCount > 0 ? result.rows[0] : null;
    } catch (err) {
        throw new Error(`Error deleting team member: ${err.message}`);
    }
};

module.exports = {
    createTeamMember,
    findTeamMemberByEmail,
    getTeamMembersByUser,
    deleteTeamMember,
};
