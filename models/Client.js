// models/Client.js
const { pool } = require('../config/db');

/**
 * Create a new client record.
 *
 * Expected input object structure:
 * {
 *   name: 'John Doe',
 *   dateOfBirth: '1990-01-01',  // in YYYY-MM-DD format
 *   gender: 'Male',
 *   email: 'john.doe@example.com',
 *   mobile: '1234567890',
 *   address: '123 Main St, Anytown, USA',
 *   profilePhoto: 'https://example.com/path/to/photo.jpg', // optional
 *   createdBy: 1  // the ID of the user who created this client record
 * }
 */
const createClient = async (clientData) => {
  const { name, dateOfBirth, gender, email, mobile, address, profilePhoto, createdBy } = clientData;
  const query = `
    INSERT INTO clients (name, date_of_birth, gender, email, mobile, address, profile_photo, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `;
  const values = [name, dateOfBirth, gender, email, mobile, address, profilePhoto, createdBy];
  
  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (err) {
    throw new Error(`Error creating client: ${err.message}`);
  }
};

/**
 * Retrieve a client record by its ID.
 */
const getClientById = async (id) => {
  const query = `SELECT * FROM clients WHERE id = $1;`;
  try {
    const result = await pool.query(query, [id]);
    return result.rows[0];
  } catch (err) {
    throw new Error(`Error retrieving client: ${err.message}`);
  }
};

module.exports = {
  createClient,
  getClientById,
};
