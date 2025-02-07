const { pool } = require('../config/db'); // PostgreSQL connection
const bcrypt = require('bcryptjs');

// ✅ Create a new team member
const createTeamMember = async (teamMemberData) => {
    const { personalDetails, professionalDetails, bankAccountDetails, password, createdBy } = teamMemberData;

    try {
        const query = `
            INSERT INTO team_members (personal_details, professional_details, bank_account_details, password, created_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const values = [personalDetails, professionalDetails, bankAccountDetails, password, createdBy];
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
