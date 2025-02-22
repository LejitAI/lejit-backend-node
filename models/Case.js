// models/Case.js
const { pool } = require('../config/db');

/**
 * Create a new case record.
 *
 * Expected input object structure:
 * {
 *   title: 'Case Title',
 *   startingDate: '2025-02-22T00:00:00.000Z', // ISO 8601 date string
 *   caseType: 'Civil',
 *   client: 'Client Name',
 *   oppositeClient: 'Opposite Client Name',
 *   caseWitness: 'Witness Name',
 *   caseDescription: 'Detailed description of the case',
 *   documents: ['doc1.pdf', 'doc2.pdf'], // an array of document paths or URLs
 *   createdBy: 1,  // the ID of the user who created the case
 *   timer: 0,      // optional, defaults to 0
 *   isRunning: true, // optional, defaults to true
 *   startTime: '2025-02-22T00:00:00.000Z', // optional, defaults to now()
 *   status: 'ongoing' // optional, defaults to 'ongoing'
 * }
 */
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
    timer = 0,
    isRunning = true,
    startTime,
    status = 'ongoing'
  } = caseData;

  const query = `
    INSERT INTO cases (
      title, starting_date, case_type, client, opposite_client,
      case_witness, case_description, documents, created_by,
      created_at, timer, is_running, start_time, status
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9,
      now(), $10, $11, $12, $13
    )
    RETURNING *;
  `;
  // Use startTime if provided, otherwise let the DB default it.
  const values = [
    title,
    startingDate,
    caseType,
    client,
    oppositeClient,
    caseWitness,
    caseDescription,
    documents, // this should be an array of strings
    createdBy,
    timer,
    isRunning,
    startTime || new Date(), // if not provided, use current date/time
    status
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw new Error(`Error creating case: ${error.message}`);
  }
};

/**
 * Retrieve a case record by its ID.
 */
const getCaseById = async (id) => {
  const query = `SELECT * FROM cases WHERE id = $1;`;
  try {
    const result = await pool.query(query, [id]);
    return result.rows[0];
  } catch (error) {
    throw new Error(`Error retrieving case: ${error.message}`);
  }
};

module.exports = {
  createCase,
  getCaseById,
};
