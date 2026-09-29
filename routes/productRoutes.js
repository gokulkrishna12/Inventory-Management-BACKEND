const express = require('express');
const router = express.Router();

const {
  getProducts,
  getLowStockProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  sellProduct,
  getTransactionHistory // <-- Added this here
} = require('../controllers/productController.js');

const { protect, authorizeRoles } = require('../middleware/authMiddleware.js');

// CRITICAL: Specific named routes must come BEFORE dynamic routes like /:id
router.route('/low-stock')
  .get(protect, getLowStockProducts);

// NEW: Admin Audit History Route
router.get('/transactions/history', protect, authorizeRoles('admin'), getTransactionHistory);

router.route('/')
  .get(protect, getProducts)
  .post(protect, authorizeRoles('admin', 'staff'), createProduct);

// POS Route: Staff can process a sale
router.post('/:id/sell', protect, sellProduct);

// Dynamic ID routes must be at the very bottom
router.route('/:id')
  .get(protect, getProductById)
  .put(protect, authorizeRoles('admin', 'staff'), updateProduct)
  .delete(protect, authorizeRoles('admin'), deleteProduct);

module.exports = router;