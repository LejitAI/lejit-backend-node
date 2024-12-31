//middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to authenticate token
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401); // Unauthorized

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id);

        if (!user) return res.status(404).json({ message: 'User not found' });
        
        // Store user info in request object
        req.user = {
            id: user.id,
            role: user.role,
            validated: user.validated
        };
        
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({ message: 'Invalid token' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Middleware to authorize admin
const authorizeAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied: Admin rights required' });
    }
    next();
};

module.exports = { authenticateToken, authorizeAdmin };
