const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Case = sequelize.define('Case', {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  startingDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  caseType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  client: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  oppositeClient: {
    type: DataTypes.STRING,
  },
  caseWitness: {
    type: DataTypes.STRING,
  },
  caseDescription: {
    type: DataTypes.TEXT,
  },
  documents: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
  }
}, {
  timestamps: true,
});

module.exports = Case;
