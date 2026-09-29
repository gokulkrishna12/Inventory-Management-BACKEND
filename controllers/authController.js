const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { catchAsync } = require('../middleware/errorMiddleware');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

exports.register = catchAsync(async (req, res) => {
    // We are pulling the ACTUAL NAME the user types in the form now.
    const { name, email, password, role } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    // Saves the exact name to the DB. No more user1, user2 nonsense.
    const user = await User.create({
        name,
        email,
        password,
        role: role || 'user'
    });

    res.status(201).json({
        success: true,
        data: { _id: user._id, name: user.name, email: user.email, role: user.role },
        token: generateToken(user._id, user.role)
    });
});

exports.login = catchAsync(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        res.status(200).json({
            success: true,
            data: { _id: user._id, name: user.name, email: user.email, role: user.role },
            token: generateToken(user._id, user.role)
        });
    } else {
        res.status(401);
        throw new Error('Invalid email or password');
    }
});