// routes/csvRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');

const { exportInventory, importBulkStock } = require('../controllers/csvController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Configure Multer to store the uploaded file in memory (RAM) temporarily
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// GET route for downloading the CSV (Staff and Admins)
router.get('/export', protect, authorizeRoles('admin', 'staff'), exportInventory);

// POST route for uploading a CSV (Strictly Admins only!)
router.post('/import-stock', protect, authorizeRoles('admin'), upload.single('file'), importBulkStock);

module.exports = router;