const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const bcrypt = require('bcryptjs');

const TeamMember = sequelize.define('TeamMember', {
  name: {
    type: DataTypes.STRING,
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
  },
  gender: {
    type: DataTypes.STRING,
  },
  yearsOfExperience: {
    type: DataTypes.INTEGER,
  },
  mobile: {
    type: DataTypes.STRING,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  address: {
    type: DataTypes.JSONB,
  },
  lawyerType: {
    type: DataTypes.STRING,
  },
  governmentID: {
    type: DataTypes.STRING,
  },
  degreeType: {
    type: DataTypes.STRING,
  },
  degreeInstitution: {
    type: DataTypes.STRING,
  },
  specialization: {
    type: DataTypes.STRING,
  },
  bankAccountDetails: {
    type: DataTypes.JSONB,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
  }
}, {
  hooks: {
    beforeCreate: async (member) => {
      if (member.password) {
        member.password = await bcrypt.hash(member.password, 10);
      }
    }
  },
  timestamps: true,
});

module.exports = TeamMember;
