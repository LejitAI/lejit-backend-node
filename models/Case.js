const { pool } = require('../config/db'); // PostgreSQL connection

// Create a new case
const createCase = async (caseData) => {
    const {
        title,
        startingDate,
        caseType,
        client,
        oppositeClient,
        caseWitness,
        caseDescription,
        documents,
        createdBy,
        timer,
        isRunning
    } = caseData;

    try {
        const query = `
            INSERT INTO cases (title, starting_date, case_type, client, opposite_client, case_witness, case_description, documents, created_by, timer, is_running)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *;
        `;
        const values = [title, startingDate, caseType, client, oppositeClient, caseWitness, caseDescription, documents, createdBy, timer, isRunning];

        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        throw new Error(`Error creating case: ${err.message}`);
    }
};

// Get all cases created by a specific user
const getCasesByUser = async (userId) => {
    try {
        const query = 'SELECT * FROM cases WHERE created_by = $1 ORDER BY created_at DESC';
        const result = await pool.query(query, [userId]);

        return result.rows;
    } catch (err) {
        throw new Error(`Error retrieving cases: ${err.message}`);
    }
};

// Find a case by ID
const findCaseById = async (id) => {
    try {
        const query = 'SELECT * FROM cases WHERE id = $1';
        const result = await pool.query(query, [id]);

        return result.rows[0];
    } catch (err) {
        throw new Error(`Error finding case: ${err.message}`);
    }
};

// Update a case
const updateCase = async (id, userId, updateData) => {
    try {
        if (Object.keys(updateData).length === 0) {
            throw new Error('No fields to update.');
        }

        const fields = Object.keys(updateData)
            .map((key, index) => `${key} = $${index + 1}`)
            .join(', ');
        const values = Object.values(updateData);

        const query = `
            UPDATE cases
            SET ${fields}, created_at = CURRENT_TIMESTAMP
            WHERE id = $${values.length + 1} AND created_by = $${values.length + 2}
            RETURNING *;
        `;

        const result = await pool.query(query, [...values, id, userId]);
        return result.rowCount > 0 ? result.rows[0] : null;
    } catch (err) {
        throw new Error(`Error updating case: ${err.message}`);
    }
};

// Delete a case (Only if created by the user)
const deleteCase = async (id, userId) => {
    try {
        const query = 'DELETE FROM cases WHERE id = $1 AND created_by = $2 RETURNING *';
        const result = await pool.query(query, [id, userId]);

        return result.rowCount > 0 ? result.rows[0] : null;
    } catch (err) {
        throw new Error(`Error deleting case: ${err.message}`);
    }
};

module.exports = {
    createCase,
    getCasesByUser,
    findCaseById,
    updateCase,
    deleteCase,
};
