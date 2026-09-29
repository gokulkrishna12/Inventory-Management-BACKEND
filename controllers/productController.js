const Product = require('../models/Product');
const StockTransaction = require('../models/StockTransaction');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const { catchAsync } = require('../middleware/errorMiddleware');
const mongoose = require('mongoose');

// Helper function: Smart lookup or create Category by Name or ID
async function resolveCategory(catInput) {
    if (!catInput) return null;
    // If it's already a valid 24-char MongoDB ObjectId, use it directly
    if (mongoose.Types.ObjectId.isValid(catInput)) {
        return catInput;
    }
    // Otherwise, treat it as a name string. Search case-insensitively.
    let category = await Category.findOne({ name: { $regex: new RegExp(`^${catInput}$`, 'i') } });
    if (!category) {
        // Automatically create the category if it doesn't exist!
        category = await Category.create({ name: catInput, description: 'Auto-created via product form' });
    }
    return category._id;
}

// Helper function: Smart lookup or create Supplier by Name or ID
async function resolveSupplier(supInput) {
    if (!supInput) return null;
    if (mongoose.Types.ObjectId.isValid(supInput)) {
        return supInput;
    }
    let supplier = await Supplier.findOne({ name: { $regex: new RegExp(`^${supInput}$`, 'i') } });
    if (!supplier) {
        // Automatically create the supplier if it doesn't exist!
        supplier = await Supplier.create({
            name: supInput,
            contactEmail: `${supInput.toLowerCase().replace(/\s+/g, '')}@supplier.com`,
            contactPhone: '555-0100'
        });
    }
    return supplier._id;
}

// @desc    Fetch low stock products
exports.getLowStockProducts = catchAsync(async (req, res) => {
    const threshold = Number(req.query.threshold) || 10;
    const products = await Product.find({ quantity: { $lte: threshold } })
        .populate('category', 'name')
        .populate('supplier', 'name contactEmail')
        .sort('quantity');

    res.status(200).json({ success: true, count: products.length, data: products });
});

// @desc    Fetch all products
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

// @desc    Create a new product with Smart Lookup
exports.createProduct = catchAsync(async (req, res) => {
    let { name, category, price, quantity, supplier } = req.body;

    const categoryId = await resolveCategory(category);
    const supplierId = await resolveSupplier(supplier);

    const product = new Product({
        name,
        category: categoryId,
        price,
        quantity,
        supplier: supplierId
    });

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

// @desc    Update a product by ID with Smart Lookup
exports.updateProduct = catchAsync(async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }

    const oldQuantity = product.quantity;
    const newQuantity = req.body.quantity !== undefined ? req.body.quantity : oldQuantity;
    const difference = newQuantity - oldQuantity;

    if (req.body.category) {
        req.body.category = await resolveCategory(req.body.category);
    }
    if (req.body.supplier) {
        req.body.supplier = await resolveSupplier(req.body.supplier);
    }

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
exports.deleteProduct = catchAsync(async (req, res) => {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);

    if (!deletedProduct) {
        res.status(404);
        throw new Error('Product not found');
    }

    res.status(200).json({ success: true, message: 'Product deleted successfully', data: deletedProduct });
});

// @desc    POS Sell Feature
exports.sellProduct = async (req, res) => {
    try {
        const { quantitySold } = req.body;
        const productId = req.params.id;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        if (product.quantity < quantitySold) {
            return res.status(400).json({ message: `Only ${product.quantity} items left in stock!` });
        }

        product.quantity -= quantitySold;
        await product.save();

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

// @desc    Transaction History (Admin sees all, User sees ONLY their SALES/OUT)
exports.getTransactionHistory = async (req, res) => {
    try {
        let query = {};

        if (req.user.role !== 'admin') {
            // User ONLY sees their own items, and ONLY items they SOLD (OUT)
            query = { user: req.user._id, type: 'OUT' };
        }

        const transactions = await StockTransaction.find(query)
            .populate('product', 'name price')
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .limit(100);

        res.status(200).json({ success: true, data: transactions });
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ message: 'Server error fetching history' });
    }
};