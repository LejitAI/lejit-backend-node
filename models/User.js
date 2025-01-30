const bcrypt = require('bcryptjs');
const { pool } = require('../config/db'); // Import your PostgreSQL connection

// Create a new user
const createUser = async (userData) => {
    const { role, username, email, password, company_name, law_firm_name, validated } = userData;

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const query = `
            INSERT INTO users (role, username, email, password, company_name, law_firm_name, validated)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;
        const values = [role, username, email, hashedPassword, company_name, law_firm_name, validated];
        const result = await pool.query(query, values);

        return result.rows[0];
    } catch (err) {
        throw new Error(`Error creating user: ${err.message}`);
    }
};

// Find a user by email
const findUserByEmail = async (email) => {
    try {
        const query = `SELECT * FROM users WHERE email = $1`;
        const result = await pool.query(query, [email]);

        return result.rows[0];
    } catch (err) {
        throw new Error(`Error finding user: ${err.message}`);
    }
};

// Match password
const matchPassword = async (enteredPassword, storedPassword) => {
    try {
        return await bcrypt.compare(enteredPassword, storedPassword);
    } catch (err) {
        throw new Error(`Error comparing passwords: ${err.message}`);
    }
};

// Update a user
const updateUser = async (id, updateData) => {
    try {
        const fields = Object.keys(updateData)
            .map((key, index) => `${key} = $${index + 1}`)
            .join(', ');
        const values = Object.values(updateData);

        const query = `
            UPDATE users
            SET ${fields}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${values.length + 1}
            RETURNING *;
        `;
        const result = await pool.query(query, [...values, id]);

        return result.rows[0];
    } catch (err) {
        throw new Error(`Error updating user: ${err.message}`);
    }
};

// Export the functions
module.exports = {
    createUser,
    findUserByEmail,
    matchPassword,
    updateUser,
};
