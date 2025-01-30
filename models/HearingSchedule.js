const { pool } = require('../config/db'); // PostgreSQL connection

// ✅ Create a new hearing schedule
const createHearingSchedule = async (hearingData) => {
    const { userId, caseId, caseName, date, time } = hearingData;

    try {
        const query = `
            INSERT INTO hearing_schedules (
                user_id, case_id, case_name, date, time
            ) VALUES (
                $1, $2, $3, $4, $5
            ) RETURNING *;
        `;

        const values = [userId, caseId, caseName, date, time];

        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        throw new Error(`Error creating hearing schedule: ${err.message}`);
    }
};

// ✅ Get a hearing schedule by ID
const getHearingScheduleById = async (id) => {
    try {
        const query = 'SELECT * FROM hearing_schedules WHERE id = $1';
        const result = await pool.query(query, [id]);

        return result.rows[0];
    } catch (err) {
        throw new Error(`Error finding hearing schedule: ${err.message}`);
    }
};

// ✅ Get all hearing schedules for a user
const getHearingSchedulesByUser = async (userId) => {
    try {
        const query = 'SELECT * FROM hearing_schedules WHERE user_id = $1 ORDER BY date ASC';
        const result = await pool.query(query, [userId]);

        return result.rows;
    } catch (err) {
        throw new Error(`Error retrieving hearing schedules: ${err.message}`);
    }
};

// ✅ Delete a hearing schedule by ID
const deleteHearingSchedule = async (id) => {
    try {
        const query = 'DELETE FROM hearing_schedules WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [id]);

        return result.rowCount > 0 ? result.rows[0] : null;
    } catch (err) {
        throw new Error(`Error deleting hearing schedule: ${err.message}`);
    }
};

module.exports = {
    createHearingSchedule,
    getHearingScheduleById,
    getHearingSchedulesByUser,
    deleteHearingSchedule
};
