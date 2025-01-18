const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to authenticate token
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401); // Unauthorized

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) return res.status(404).json({ message: 'User not found' });
        
        // Comment out the validation check below
        // if (!user.validated) return res.status(403).json({ message: 'User is not validated by admin' });

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
