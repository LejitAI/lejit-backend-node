const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LawFirmDetails = sequelize.define('LawFirmDetails', {
  lawFirmName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  operatingSince: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  yearsOfExperience: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  specialization: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  contactInfo: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  professionalDetails: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  bankAccountDetails: {
    type: DataTypes.JSONB,
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
  }
}, {
  timestamps: true,
});

module.exports = LawFirmDetails;
