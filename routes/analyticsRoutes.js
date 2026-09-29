// routes/analyticsRoutes.js
const express = require('express');
const router = express.Router();
const { getDashboardSummary } = require('../controllers/analyticsController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Secure the analytics route so only logged-in staff/admins can see company stats
router.route('/summary')
    .get(protect, authorizeRoles('admin', 'staff'), getDashboardSummary);

module.exports = router;