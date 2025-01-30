const { pool } = require('../config/db'); // PostgreSQL connection

const createImageForm = async (imageFormData) => {
    const {
        lawFirmDetails = {},
        professionalDetails = {},
        bankAccountDetails = {},
        createdBy
    } = imageFormData;

    // Ensure caseDetails exists before accessing properties
    professionalDetails.caseDetails = professionalDetails.caseDetails || { 
        caseSolvedCount: 0, 
        caseBasedBillRate: "", 
        timeBasedBillRate: "" 
    };

    bankAccountDetails.cardDetails = bankAccountDetails.cardDetails || { 
        cardNumber: "", expirationDate: "", cvv: "", saveCard: false 
    };

    bankAccountDetails.bankDetails = bankAccountDetails.bankDetails || { 
        accountNumber: "", bankName: "", ifscCode: "" 
    };

    bankAccountDetails.upiId = bankAccountDetails.upiId || "";

    try {
        const query = `
            INSERT INTO image_forms (
                law_firm_name, operating_since, years_of_experience, specialization,
                email, mobile, address_line1, address_line2, city, state, postal_code,
                lawyer_type, case_solved_count, case_based_bill_rate, time_based_bill_rate,
                payment_method, card_number, expiration_date, cvv, save_card,
                account_number, bank_name, ifsc_code, upi_id, created_by
            ) VALUES (
                $1, $2, $3, $4,
                $5, $6, $7, $8, $9, $10, $11,
                $12, $13, $14, $15,
                $16, $17, $18, $19, $20,
                $21, $22, $23, $24, $25
            ) RETURNING *;
        `;

        const values = [
            lawFirmDetails.lawFirmName, lawFirmDetails.operatingSince, lawFirmDetails.yearsOfExperience, lawFirmDetails.specialization,
            lawFirmDetails.contactInfo.email, lawFirmDetails.contactInfo.mobile, lawFirmDetails.contactInfo.address.line1, lawFirmDetails.contactInfo.address.line2,
            lawFirmDetails.contactInfo.address.city, lawFirmDetails.contactInfo.address.state, lawFirmDetails.contactInfo.address.postalCode,
            professionalDetails.lawyerType, professionalDetails.caseDetails.caseSolvedCount,
            professionalDetails.caseDetails.caseBasedBillRate, professionalDetails.caseDetails.timeBasedBillRate,
            bankAccountDetails.paymentMethod, bankAccountDetails.cardDetails.cardNumber, bankAccountDetails.cardDetails.expirationDate,
            bankAccountDetails.cardDetails.cvv, bankAccountDetails.cardDetails.saveCard,
            bankAccountDetails.bankDetails.accountNumber, bankAccountDetails.bankDetails.bankName, bankAccountDetails.bankDetails.ifscCode,
            bankAccountDetails.upiId, createdBy
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        throw new Error(`Error creating ImageForm: ${err.message}`);
    }
};


// ✅ Get all ImageForms created by a user
const getImageFormsByUser = async (userId) => {
    try {
        const query = 'SELECT * FROM image_forms WHERE created_by = $1 ORDER BY created_at DESC';
        const result = await pool.query(query, [userId]);

        return result.rows;
    } catch (err) {
        throw new Error(`Error retrieving ImageForms: ${err.message}`);
    }
};

// ✅ Get ImageForm by ID
const getImageFormById = async (id) => {
    try {
        const query = 'SELECT * FROM image_forms WHERE id = $1';
        const result = await pool.query(query, [id]);

        return result.rows[0];
    } catch (err) {
        throw new Error(`Error finding ImageForm: ${err.message}`);
    }
};

// ✅ Delete an ImageForm by ID
const deleteImageForm = async (id, userId) => {
    try {
        const query = 'DELETE FROM image_forms WHERE id = $1 AND created_by = $2 RETURNING *';
        const result = await pool.query(query, [id, userId]);

        return result.rowCount > 0 ? result.rows[0] : null;
    } catch (err) {
        throw new Error(`Error deleting ImageForm: ${err.message}`);
    }
};

module.exports = {
    createImageForm,
    getImageFormsByUser,
    getImageFormById,
    deleteImageForm
};
