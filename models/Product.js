// models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },
    category: {
      type: mongoose.Schema.Types.ObjectId, // Now references the Category model
      ref: 'Category',
      required: [true, 'Product category is required']
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative']
    },
    quantity: {
      type: Number,
      required: [true, 'Product quantity is required'],
      default: 0,
      min: [0, 'Quantity cannot be negative']
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId, // Now references the Supplier model
      ref: 'Supplier',
      required: [true, 'Supplier is required']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

const Product = mongoose.model('Product', productSchema);

module.exports = Product;