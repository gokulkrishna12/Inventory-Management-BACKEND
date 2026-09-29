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
  getTransactionHistory
} = require('../controllers/productController.js');

const { protect, authorizeRoles } = require('../middleware/authMiddleware.js');

// CRITICAL: Specific named routes must come BEFORE dynamic routes like /:id
router.route('/low-stock')
  .get(protect, getLowStockProducts);

// FIXED: Removed authorizeRoles('admin') so both Admins AND Users can hit this route.
// The controller will automatically filter the data based on who is asking.
router.get('/transactions/history', protect, getTransactionHistory);

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