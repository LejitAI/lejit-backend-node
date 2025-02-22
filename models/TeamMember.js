// models/TeamMember.js
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

/**
 * Create a new team member.
 * (See previous code for expected input format.)
 */
const createTeamMember = async (teamMemberData) => {
  const {
    personalDetails,
    professionalDetails,
    bankAccountDetails,
    password,
    createdBy
  } = teamMemberData;

  // Destructure personal details
  const {
    name,
    dateOfBirth,
    gender,
    yearsOfExperience,
    mobile,
    email,
    address
  } = personalDetails;
  const { line1, line2, city, state, country, postalCode } = address || {};

  // Destructure professional details
  const {
    lawyerType,
    governmentID,
    degreeType,
    degreeInstitution,
    specialization
  } = professionalDetails || {};

  // Destructure bank account details
  const {
    paymentMethod,
    cardDetails,
    bankDetails,
    upiId
  } = bankAccountDetails || {};
  const { cardNumber, expirationDate, cvv, saveCard } = cardDetails || {};
  const { accountNumber, bankName, ifscCode } = bankDetails || {};

  try {
    // Hash the password before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const query = `
      INSERT INTO team_members
      (name, date_of_birth, gender, years_of_experience, mobile, email,
       address_line1, address_line2, address_city, address_state, address_country, address_postal_code,
       lawyer_type, government_id, degree_type, degree_institution, specialization,
       payment_method, card_number, expiration_date, cvv, save_card,
       account_number, bank_name, ifsc_code, upi_id,
       password, created_by)
      VALUES
      ($1, $2, $3, $4, $5, $6,
       $7, $8, $9, $10, $11, $12,
       $13, $14, $15, $16, $17,
       $18, $19, $20, $21, $22,
       $23, $24, $25, $26,
       $27, $28)
      RETURNING *;
    `;
    const values = [
      name,
      dateOfBirth,
      gender,
      yearsOfExperience,
      mobile,
      email,
      line1,
      line2,
      city,
      state,
      country,
      postalCode,
      lawyerType,
      governmentID,
      degreeType,
      degreeInstitution,
      specialization,
      paymentMethod,
      cardNumber,
      expirationDate,
      cvv,
      saveCard,
      accountNumber,
      bankName,
      ifscCode,
      upiId,
      hashedPassword,
      createdBy
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (err) {
    throw new Error(`Error creating team member: ${err.message}`);
  }
};

/**
 * Find a team member by email.
 * This mimics: TeamMember.findOne({ 'personalDetails.email': email }).select('-password')
 */
const findTeamMemberByEmail = async (email) => {
  try {
    // Exclude the password field (using SELECT with specific columns)
    const query = `
      SELECT id, name, date_of_birth, gender, years_of_experience, mobile, email,
             address_line1, address_line2, address_city, address_state, address_country, address_postal_code,
             lawyer_type, government_id, degree_type, degree_institution, specialization,
             payment_method, card_number, expiration_date, cvv, save_card,
             account_number, bank_name, ifsc_code, upi_id, created_by, created_at
      FROM team_members
      WHERE email = $1;
    `;
    const result = await pool.query(query, [email]);
    return result.rows[0];
  } catch (err) {
    throw new Error(`Error finding team member by email: ${err.message}`);
  }
};

/**
 * Find a team member by the user ID that created them.
 */
const findTeamMemberByCreatedBy = async (createdBy) => {
  try {
    // Again, exclude the password field.
    const query = `
      SELECT id, name, date_of_birth, gender, years_of_experience, mobile, email,
             address_line1, address_line2, address_city, address_state, address_country, address_postal_code,
             lawyer_type, government_id, degree_type, degree_institution, specialization,
             payment_method, card_number, expiration_date, cvv, save_card,
             account_number, bank_name, ifsc_code, upi_id, created_by, created_at
      FROM team_members
      WHERE created_by = $1;
    `;
    const result = await pool.query(query, [createdBy]);
    // If there might be multiple team members, you could return result.rows;
    return result.rows[0];
  } catch (err) {
    throw new Error(`Error finding team member by creator: ${err.message}`);
  }
};

module.exports = {
  createTeamMember,
  findTeamMemberByEmail,
  findTeamMemberByCreatedBy,
  // Additional functions (update, delete, etc.) can be added as needed.
};
