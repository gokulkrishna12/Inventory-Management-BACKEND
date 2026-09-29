// routes/authRoutes.js
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const { register, login } = require('../controllers/authController');
const { validateRequest } = require('../middleware/validatorMiddleware');

// Validation rules for registration
const registerValidation = [
    body('name', 'Name is required').not().isEmpty(),
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
    validateRequest // Catches errors and stops the request
];

// Validation rules for login
const loginValidation = [
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password is required').exists(),
    validateRequest
];

// Inject the validation arrays into the routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

module.exports = router;