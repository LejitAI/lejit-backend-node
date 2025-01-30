const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.PG_DATABASE, // Database name
    process.env.PG_USER,     // Username
    process.env.PG_PASSWORD, // Password
    {
        host: process.env.PG_HOST,
        port: process.env.PG_PORT,
        dialect: 'postgres',
        logging: false,       // Disable SQL query logging
    }
);

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('PostgreSQL connected');
    } catch (error) {
        console.error('Error connecting to PostgreSQL:', error.message);
        process.exit(1);
    }
};

module.exports = { sequelize, connectDB };
