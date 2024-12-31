const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Appointment = sequelize.define('Appointment', {
  clientId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  lawyerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  lawFirmId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  appointmentDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  appointmentTime: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  caseNotes: {
    type: DataTypes.TEXT,
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Confirmed', 'Rejected'),
    defaultValue: 'Pending',
  }
}, {
  timestamps: true,
});

module.exports = Appointment;
