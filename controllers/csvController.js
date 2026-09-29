// controllers/csvController.js
const Product = require('../models/Product');
const StockTransaction = require('../models/StockTransaction');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const { Parser } = require('json2csv');
const csv = require('csvtojson');
const { catchAsync } = require('../middleware/errorMiddleware');

// @desc    Export all products to a downloadable CSV file
// @route   GET /api/csv/export
exports.exportInventory = catchAsync(async (req, res) => {
    // 1. Fetch all products with category and supplier names
    const products = await Product.find()
        .populate('category', 'name')
        .populate('supplier', 'name');

    if (!products || products.length === 0) {
        res.status(404);
        throw new Error('No products found to export');
    }

    // 2. Format the data to look clean in Excel
    const formattedData = products.map(p => ({
        'Product ID': p._id.toString(),
        'Name': p.name,
        'Price': p.price,
        'Stock Quantity': p.quantity,
        'Category': p.category ? p.category.name : 'Uncategorized',
        'Supplier': p.supplier ? p.supplier.name : 'Unknown',
        'Last Updated': p.updatedAt.toISOString().split('T')[0]
    }));

    // 3. Convert JSON to CSV format
    const json2csvParser = new Parser();
    const csvData = json2csvParser.parse(formattedData);

    // 4. Send the file to the client
    res.header('Content-Type', 'text/csv');
    res.attachment('inventory_export.csv');
    return res.status(200).send(csvData);
});

// @desc    Import a CSV to bulk-update stock quantities
// @route   POST /api/csv/import-stock
exports.importBulkStock = catchAsync(async (req, res) => {
    // 1. Check if a file was uploaded via Multer
    if (!req.file) {
        res.status(400);
        throw new Error('Please upload a CSV file');
    }

    // 2. Convert the uploaded CSV buffer directly into a JSON array
    const jsonArray = await csv().fromString(req.file.buffer.toString());

    let updatedCount = 0;

    // 3. Loop through each row in the CSV
    // Expected CSV Headers: productId, newQuantity
    for (const row of jsonArray) {
        if (!row.productId || row.newQuantity === undefined) continue;

        const product = await Product.findById(row.productId);

        if (product) {
            const oldQuantity = product.quantity;
            const newQuantity = Number(row.newQuantity);
            const difference = newQuantity - oldQuantity;

            // Only update and log if the quantity actually changed
            if (difference !== 0) {
                product.quantity = newQuantity;
                await product.save();

                // AUDIT TRAIL: Automatically log the CSV bulk changes!
                await StockTransaction.create({
                    product: product._id,
                    user: req.user._id,
                    type: difference > 0 ? 'IN' : 'OUT',
                    quantityChanged: Math.abs(difference),
                    description: 'Bulk CSV Import Update'
                });

                updatedCount++;
            }
        }
    }

    res.status(200).json({
        success: true,
        message: `Successfully updated stock for ${updatedCount} products via CSV`
    });
});