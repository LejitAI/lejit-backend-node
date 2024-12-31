const sequelize = require('../config/db');
const User = require('./User');
const TeamMember = require('./TeamMember');
const Case = require('./Case');
const Client = require('./Client');
const Appointment = require('./Appointment');
const LawFirmDetails = require('./LawFirmDetails');
const Settings = require('./Settings');

// User relationships
User.hasMany(TeamMember, { foreignKey: 'createdBy' });
User.hasMany(Case, { foreignKey: 'createdBy' });
User.hasMany(Client, { foreignKey: 'createdBy' });
User.hasMany(Appointment, { foreignKey: 'lawFirmId' });
User.hasOne(LawFirmDetails, { foreignKey: 'createdBy' });

// TeamMember relationships
TeamMember.belongsTo(User, { foreignKey: 'createdBy' });
TeamMember.hasMany(Appointment, { foreignKey: 'lawyerId' });

// Client relationships
Client.belongsTo(User, { foreignKey: 'createdBy' });
Client.hasMany(Appointment, { foreignKey: 'clientId' });

// Appointment relationships
Appointment.belongsTo(Client, { foreignKey: 'clientId' });
Appointment.belongsTo(TeamMember, { foreignKey: 'lawyerId' });
Appointment.belongsTo(User, { foreignKey: 'lawFirmId' });

module.exports = {
  sequelize,
  User,
  TeamMember,
  Case,
  Client,
  Appointment,
  LawFirmDetails,
  Settings
};
