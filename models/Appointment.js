const { pool } = require('../config/db'); // PostgreSQL connection

const createAppointment = async (appointmentData) => {
  const {
      clientId,
      lawyerId,
      lawFirmId,
      appointmentDate,
      appointmentTime,
      caseNotes,
      status
  } = appointmentData;

  try {
      const query = `
          INSERT INTO appointments (
              client_id, lawyer_id, law_firm_id, appointment_date, appointment_time, case_notes, status
          ) VALUES (
              $1, $2, $3, $4, $5, $6, $7
          ) RETURNING *;
      `;

      const values = [
          clientId, lawyerId, lawFirmId, appointmentDate, appointmentTime, caseNotes, status || 'Pending'
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
  } catch (err) {
      throw new Error(`Error creating appointment: ${err.message}`);
  }
};


// ✅ Get an appointment by ID
const getAppointmentById = async (id) => {
    try {
        const query = 'SELECT * FROM appointments WHERE id = $1';
        const result = await pool.query(query, [id]);

        return result.rows[0];
    } catch (err) {
        throw new Error(`Error finding appointment: ${err.message}`);
    }
};

// ✅ Get all appointments for a lawyer
const getAppointmentsByLawyer = async (lawyerId) => {
    try {
        const query = 'SELECT * FROM appointments WHERE lawyer_id = $1 ORDER BY appointment_date DESC';
        const result = await pool.query(query, [lawyerId]);

        return result.rows;
    } catch (err) {
        throw new Error(`Error retrieving appointments: ${err.message}`);
    }
};

// ✅ Get all appointments for a client
const getAppointmentsByClient = async (clientId) => {
    try {
        const query = 'SELECT * FROM appointments WHERE client_id = $1 ORDER BY appointment_date DESC';
        const result = await pool.query(query, [clientId]);

        return result.rows;
    } catch (err) {
        throw new Error(`Error retrieving appointments: ${err.message}`);
    }
};

// ✅ Update appointment status
const updateAppointmentStatus = async (id, status) => {
    try {
        const query = `
            UPDATE appointments
            SET status = $1
            WHERE id = $2
            RETURNING *;
        `;

        const result = await pool.query(query, [status, id]);
        return result.rows[0];
    } catch (err) {
        throw new Error(`Error updating appointment status: ${err.message}`);
    }
};

// ✅ Delete an appointment
const deleteAppointment = async (id) => {
    try {
        const query = 'DELETE FROM appointments WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [id]);

        return result.rowCount > 0 ? result.rows[0] : null;
    } catch (err) {
        throw new Error(`Error deleting appointment: ${err.message}`);
    }
};

module.exports = {
    createAppointment,
    getAppointmentById,
    getAppointmentsByLawyer,
    getAppointmentsByClient,
    updateAppointmentStatus,
    deleteAppointment,
};
