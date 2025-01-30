require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: 'lejit-db.cpdjy8wolrm9.ap-southeast-1.rds.amazonaws.com',
    database: 'legit_ai',
    user: 'Postgresadmin',
    password: 'MdP*asSwfnmHYD78aD',
    port: 5432,
    ssl: {
        rejectUnauthorized: false, // Required for AWS RDS
    },
});


// console.log(process.env.password);

const connectDB = async () => {
    try {
        // console.log(process.env.user);
        await pool.connect();
        console.log('PostgreSQL connected');
    } catch (err) {
        // console.log(process.env.password);
        console.error('Error connecting to PostgreSQL:', err.message);
        process.exit(1);
    }
};

module.exports = {
    connectDB,
    pool, // Export pool for querying the database
};
