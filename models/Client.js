const { pool } = require('../config/db'); // PostgreSQL connection

// Create a new client
const createClient = async (clientData) => {
    const { name, dateOfBirth, gender, email, mobile, address, profilePhoto, createdBy } = clientData;

    try {
        const query = `
            INSERT INTO clients (name, date_of_birth, gender, email, mobile, address, profile_photo, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *;
        `;
        const values = [name, dateOfBirth, gender, email, mobile, address, profilePhoto, createdBy];

        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        throw new Error(`Error creating client: ${err.message}`);
    }
};

// Find a client by ID
const findClientById = async (id) => {
    try {
        const query = 'SELECT * FROM clients WHERE id = $1';
        const result = await pool.query(query, [id]);

        return result.rows[0];
    } catch (err) {
        throw new Error(`Error finding client: ${err.message}`);
    }
};

// Get all clients created by a specific user
const getClientsByUser = async (userId) => {
    try {
        const query = 'SELECT * FROM clients WHERE created_by = $1';
        const result = await pool.query(query, [userId]);

        return result.rows;
    } catch (err) {
        throw new Error(`Error retrieving clients: ${err.message}`);
    }
};

// Update a client
const updateClient = async (id, updateData) => {
    try {
        const fields = Object.keys(updateData)
            .map((key, index) => `${key} = $${index + 1}`)
            .join(', ');
        const values = Object.values(updateData);

        const query = `
            UPDATE clients
            SET ${fields}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${values.length + 1}
            RETURNING *;
        `;

        const result = await pool.query(query, [...values, id]);
        return result.rows[0];
    } catch (err) {
        throw new Error(`Error updating client: ${err.message}`);
    }
};

// Delete a client
const deleteClient = async (id) => {
    try {
        const query = 'DELETE FROM clients WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [id]);

        return result.rows[0];
    } catch (err) {
        throw new Error(`Error deleting client: ${err.message}`);
    }
};

module.exports = {
    createClient,
    findClientById,
    getClientsByUser,
    updateClient,
    deleteClient,
};
