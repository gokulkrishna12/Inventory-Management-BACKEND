const Product = require('../models/Product');
const StockTransaction = require('../models/StockTransaction');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const { catchAsync } = require('../middleware/errorMiddleware');

// @desc    Fetch low stock products (NEW)
// @route   GET /api/products/low-stock
exports.getLowStockProducts = catchAsync(async (req, res) => {
    // Default threshold is 10, or you can pass ?threshold=5 in the URL
    const threshold = Number(req.query.threshold) || 10;

    const products = await Product.find({ quantity: { $lte: threshold } })
        .populate('category', 'name')
        .populate('supplier', 'name contactEmail')
        .sort('quantity'); // Sorts lowest stock first

    res.status(200).json({
        success: true,
        count: products.length,
        data: products
    });
});

// @desc    Fetch all products (Search, Filter, Sort, Pagination)
// @route   GET /api/products
exports.getProducts = catchAsync(async (req, res) => {
    const keyword = req.query.search ? { name: { $regex: req.query.search, $options: 'i' } } : {};
    const categoryFilter = req.query.category ? { category: req.query.category } : {};
    const query = { ...keyword, ...categoryFilter };
    const sortBy = req.query.sort ? req.query.sort.split(',').join(' ') : '-createdAt';
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const products = await Product.find(query)
        .populate('category', 'name')
        .populate('supplier', 'name contactEmail')
        .sort(sortBy)
        .skip(skip)
        .limit(limit);

    const total = await Product.countDocuments(query);

    res.status(200).json({
        success: true,
        count: products.length,
        pagination: { totalItems: total, currentPage: page, totalPages: Math.ceil(total / limit) },
        data: products
    });
});

// @desc    Fetch single product by ID
// @route   GET /api/products/:id
exports.getProductById = catchAsync(async (req, res) => {
    const product = await Product.findById(req.params.id)
        .populate('category')
        .populate('supplier');

    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }

    res.status(200).json({ success: true, data: product });
});

// @desc    Create a new product & Log initial stock
// @route   POST /api/products
exports.createProduct = catchAsync(async (req, res) => {
    const { name, category, price, quantity, supplier } = req.body;

    const product = new Product({ name, category, price, quantity, supplier });
    const savedProduct = await product.save();

    if (quantity > 0) {
        await StockTransaction.create({
            product: savedProduct._id,
            user: req.user._id,
            type: 'IN',
            quantityChanged: quantity,
            description: 'Initial stock setup'
        });
    }

    res.status(201).json({ success: true, message: 'Product created successfully', data: savedProduct });
});

// @desc    Update a product by ID & Log stock changes
// @route   PUT /api/products/:id
exports.updateProduct = catchAsync(async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }

    const oldQuantity = product.quantity;
    const newQuantity = req.body.quantity !== undefined ? req.body.quantity : oldQuantity;
    const difference = newQuantity - oldQuantity;

    Object.assign(product, req.body);
    const updatedProduct = await product.save();

    if (difference !== 0) {
        await StockTransaction.create({
            product: product._id,
            user: req.user._id,
            type: difference > 0 ? 'IN' : 'OUT',
            quantityChanged: Math.abs(difference),
            description: `Stock manually updated by ${req.user.role}`
        });
    }

    res.status(200).json({ success: true, message: 'Product updated successfully', data: updatedProduct });
});

// @desc    Delete a product by ID
// @route   DELETE /api/products/:id
exports.deleteProduct = catchAsync(async (req, res) => {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);

    if (!deletedProduct) {
        res.status(404);
        throw new Error('Product not found');
    }

    res.status(200).json({ success: true, message: 'Product deleted successfully', data: deletedProduct });
});

// ==========================================
// POS SELL FEATURE: Deduct stock & log audit
// ==========================================
exports.sellProduct = async (req, res) => {
    try {
        const { quantitySold } = req.body;
        const productId = req.params.id;

        // 1. Find the product
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // 2. Prevent Negative Stock (Safety Check)
        if (product.quantity < quantitySold) {
            return res.status(400).json({ message: `Only ${product.quantity} items left in stock!` });
        }

        // 3. Deduct the stock and save
        product.quantity -= quantitySold;
        await product.save();

        // 4. Create the Audit Trail (Stock Transaction)
        // Note: I matched 'quantityChanged' to your database schema used above
        await StockTransaction.create({
            product: productId,
            user: req.user._id,
            type: 'OUT',
            quantityChanged: quantitySold,
            description: 'Staff POS Sale'
        });

        res.status(200).json({ message: 'Sale successful!', product });
    } catch (error) {
        console.error('Error processing sale:', error);
        res.status(500).json({ message: 'Server error processing sale.' });
    }
};

// ==========================================
// ADMIN FEATURE: View Sales & Stock History
// ==========================================
exports.getTransactionHistory = async (req, res) => {
    try {
        const transactions = await StockTransaction.find()
            .populate('product', 'name price')
            .populate('user', 'name email') // Gets the employee's name/email
            .sort({ createdAt: -1 }) // Newest first
            .limit(50); // Show latest 50 logs

        res.status(200).json({ success: true, data: transactions });
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ message: 'Server error fetching history' });
    }
};