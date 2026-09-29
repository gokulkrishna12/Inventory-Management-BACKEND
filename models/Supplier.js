// models/Supplier.js
const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Supplier name is required'],
        trim: true
    },
    contactEmail: {
        type: String,
        required: [true, 'Supplier email is required'],
        trim: true
    },
    contactPhone: { type: String },
    address: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Supplier', supplierSchema);