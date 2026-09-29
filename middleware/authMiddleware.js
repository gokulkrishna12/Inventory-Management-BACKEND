// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { catchAsync } = require('./errorMiddleware');

// 1. Protect routes - Check if token is valid
exports.protect = catchAsync(async (req, res, next) => {
    let token;

    // Check if header exists and starts with 'Bearer'
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1]; // Extract the token
    }

    if (!token) {
        res.status(401);
        throw new Error('Not authorized, no token provided');
    }

    try {
        // Verify token using your secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find the user in DB and attach them to the request object (minus the password)
        req.user = await User.findById(decoded.id).select('-password');
        next();
    } catch (error) {
        res.status(401);
        throw new Error('Not authorized, token failed');
    }
});

// 2. Role-Based Access Control (RBAC) - Check if user has required role
exports.authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            res.status(403);
            throw new Error(`Role: ${req.user.role} is not authorized to access this route`);
        }
        next();
    };
};