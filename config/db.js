const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.PG_DATABASE,
    process.env.PG_USER,
    process.env.PG_PASSWORD,
    {
        host: process.env.PG_HOST || 'localhost',
        dialect: 'postgres',
        logging: false,
    }
);

// Load models
const Case = require('../models/Case')(sequelize, Sequelize.DataTypes);
const Client = require('../models/Client')(sequelize, Sequelize.DataTypes);
const LawFirm = require('../models/LawFirm')(sequelize, Sequelize.DataTypes);
const Settings = require('../models/Settings')(sequelize, Sequelize.DataTypes);
const TeamMember = require('../models/TeamMember')(sequelize, Sequelize.DataTypes);
const User = require('../models/User')(sequelize, Sequelize.DataTypes);

const models = { Case, Client, LawFirm, Settings, TeamMember, User };

// Set up associations
Object.keys(models).forEach((modelName) => {
    if (models[modelName].associate) {
        models[modelName].associate(models);
    }
});

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('PostgreSQL connected');
        await sequelize.sync();
        console.log('Models synchronized');
    } catch (err) {
        console.error('Error connecting to the database:', err.message);
        process.exit(1);
    }
};

module.exports = { sequelize, connectDB, models };

