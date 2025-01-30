const jwt = require('jsonwebtoken');
const { pool } = require('../config/db'); // Import PostgreSQL connection

// Middleware to authenticate token
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401); // Unauthorized

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch user from PostgreSQL database
        const query = 'SELECT id, username, email, role FROM users WHERE id = $1';
        const result = await pool.query(query, [decoded.id]);

        // Check if user exists
        const user = result.rows[0];
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Attach user to the request object
        req.user = user;
        next();
    } catch (error) {
        res.status(403).json({ message: 'Invalid token' });
    }
};

// Middleware to authorize admin
const authorizeAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    next();
};

module.exports = { authenticateToken, authorizeAdmin };
