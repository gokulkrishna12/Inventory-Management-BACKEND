// controllers/authController.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { catchAsync } = require('../middleware/errorMiddleware');

// FIXED: Now we pass the role into the token so React can read it!
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register new user
// @route   POST /api/auth/register
exports.register = catchAsync(async (req, res) => {
    const { name, email, password, role } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    const user = await User.create({ name, email, password, role });

    res.status(201).json({
        success: true,
        data: { _id: user._id, name: user.name, email: user.email, role: user.role },
        token: generateToken(user._id, user.role) // FIXED
    });
});

// @desc    Login user & get token
// @route   POST /api/auth/login
exports.login = catchAsync(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        res.status(200).json({
            success: true,
            data: { _id: user._id, name: user.name, email: user.email, role: user.role },
            token: generateToken(user._id, user.role) // FIXED
        });
    } else {
        res.status(401);
        throw new Error('Invalid email or password');
    }
});