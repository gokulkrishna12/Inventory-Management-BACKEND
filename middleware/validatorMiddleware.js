// middleware/validatorMiddleware.js
const { validationResult } = require('express-validator');

// This middleware checks if any of the express-validator rules failed
exports.validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400);
        // Formats all validation errors into a single string for your global error handler
        throw new Error(errors.array().map(err => err.msg).join(', '));
    }
    next();
};