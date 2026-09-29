// models/productModel.js
import mongoose from 'mongoose';

const productSchema = mongoose.Schema(
    {
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
        description: { type: String },
        imageUrl: { type: String }
    },
    { timestamps: true }
);

export default mongoose.model('Product', productSchema);