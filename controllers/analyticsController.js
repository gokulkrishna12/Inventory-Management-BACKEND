// controllers/analyticsController.js
const Product = require('../models/Product');
const { catchAsync } = require('../middleware/errorMiddleware');

// @desc    Get dashboard analytics (Total items, total value, stock by category)
// @route   GET /api/analytics/summary
exports.getDashboardSummary = catchAsync(async (req, res) => {
    // 1. Overview Stats: Total Items, Total Quantity, Total Value
    const summary = await Product.aggregate([
        {
            $group: {
                _id: null,
                totalItems: { $sum: 1 },
                totalQuantity: { $sum: '$quantity' },
                totalValue: { $sum: { $multiply: ['$price', '$quantity'] } }
            }
        }
    ]);

    // 2. Category Stats: For generating Pie/Bar Charts on the frontend
    const categoryStats = await Product.aggregate([
        {
            $group: {
                _id: '$category',
                count: { $sum: 1 },
                stock: { $sum: '$quantity' },
                value: { $sum: { $multiply: ['$price', '$quantity'] } }
            }
        },
        {
            $lookup: {
                from: 'categories', // Joins the Category collection
                localField: '_id',
                foreignField: '_id',
                as: 'categoryDetails'
            }
        },
        {
            $unwind: {
                path: '$categoryDetails',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                _id: 1,
                categoryName: { $ifNull: ['$categoryDetails.name', 'Uncategorized'] },
                count: 1,
                stock: 1,
                value: 1
            }
        }
    ]);

    res.status(200).json({
        success: true,
        data: {
            overview: summary.length > 0 ? summary[0] : { totalItems: 0, totalQuantity: 0, totalValue: 0 },
            categoryStats
        }
    });
});