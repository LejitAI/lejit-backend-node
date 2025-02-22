// models/ImageForm.js
const { pool } = require('../config/db');

/**
 * Creates a new image form record.
 *
 * Expected input (example):
 * {
 *   lawFirmDetails: {
 *     lawFirmName: 'Acme Law',
 *     operatingSince: '2005',
 *     yearsOfExperience: '15',
 *     specialization: 'Corporate Law',
 *     contactInfo: {
 *       email: 'contact@acmelaw.com',
 *       mobile: '1234567890',
 *       address: {
 *         line1: '123 Main St',
 *         line2: 'Suite 200',
 *         city: 'Metropolis',
 *         state: 'NY',
 *         postalCode: '10001'
 *       }
 *     }
 *   },
 *   professionalDetails: {
 *     lawyerType: 'Senior Partner',
 *     caseDetails: {
 *       caseSolvedCount: 50,
 *       caseBasedBillRate: '$5000',
 *       timeBasedBillRate: '$300/hr',
 *       previousCases: [
 *         { caseType: 'Civil', caseDescription: 'Lorem ipsum...' },
 *         { caseType: 'Criminal', caseDescription: 'Dolor sit amet...' }
 *       ]
 *     }
 *   },
 *   bankAccountDetails: {
 *     paymentMethod: 'Card',
 *     cardDetails: {
 *       cardNumber: '4111111111111111',
 *       expirationDate: '12/25',
 *       cvv: '123',
 *       saveCard: true
 *     },
 *     bankDetails: {
 *       accountNumber: '987654321',
 *       bankName: 'Bank of Example',
 *       ifscCode: 'IFSC0001'
 *     },
 *     upiId: 'example@upi'
 *   },
 *   createdBy: 1 // the user id that created this record
 * }
 */
const createImageForm = async (data) => {
  // Destructure law firm details
  const {
    lawFirmDetails: {
      lawFirmName,
      operatingSince,
      yearsOfExperience,
      specialization,
      contactInfo: {
        email,
        mobile,
        address: { line1, line2, city, state, postalCode } = {},
      } = {},
    } = {},
    professionalDetails: {
      lawyerType,
      caseDetails: {
        caseSolvedCount,
        caseBasedBillRate,
        timeBasedBillRate,
        previousCases,
      } = {},
    } = {},
    bankAccountDetails: {
      paymentMethod,
      cardDetails: { cardNumber, expirationDate, cvv, saveCard } = {},
      bankDetails: { accountNumber, bankName, ifscCode } = {},
      upiId,
    } = {},
    createdBy,
  } = data;

  const query = `
    INSERT INTO image_forms (
      law_firm_details_law_firm_name,
      law_firm_details_operating_since,
      law_firm_details_years_of_experience,
      law_firm_details_specialization,
      law_firm_details_contact_info_email,
      law_firm_details_contact_info_mobile,
      law_firm_details_contact_info_address_line1,
      law_firm_details_contact_info_address_line2,
      law_firm_details_contact_info_address_city,
      law_firm_details_contact_info_address_state,
      law_firm_details_contact_info_address_postal_code,
      professional_details_lawyer_type,
      professional_details_case_details_case_solved_count,
      professional_details_case_details_case_based_bill_rate,
      professional_details_case_details_time_based_bill_rate,
      professional_details_case_details_previous_cases,
      bank_account_details_payment_method,
      bank_account_details_card_details_card_number,
      bank_account_details_card_details_expiration_date,
      bank_account_details_card_details_cvv,
      bank_account_details_card_details_save_card,
      bank_account_details_bank_details_account_number,
      bank_account_details_bank_details_bank_name,
      bank_account_details_bank_details_ifsc_code,
      bank_account_details_upi_id,
      created_by
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
      $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
      $22, $23, $24, $25, $26
    )
    RETURNING *;
  `;
  const values = [
    lawFirmName,
    operatingSince,
    yearsOfExperience,
    specialization,
    email,
    mobile,
    line1,
    line2,
    city,
    state,
    postalCode,
    lawyerType,
    caseSolvedCount,
    caseBasedBillRate,
    timeBasedBillRate,
    JSON.stringify(previousCases || []), // store as JSON
    paymentMethod,
    cardNumber,
    expirationDate,
    cvv,
    saveCard,
    accountNumber,
    bankName,
    ifscCode,
    upiId,
    createdBy,
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (err) {
    throw new Error(`Error creating image form: ${err.message}`);
  }
};

module.exports = {
  createImageForm,
  // Additional functions (find, update, etc.) can be added as needed.
};
