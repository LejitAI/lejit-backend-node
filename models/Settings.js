const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Settings = sequelize.define('Settings', {
  chatgptApiKey: {
    type: DataTypes.STRING,
  },
}, {
  timestamps: true,
});

module.exports = Settings;
