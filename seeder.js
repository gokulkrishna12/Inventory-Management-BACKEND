// seeder.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Import Models
const Product = require('./models/Product');
const Category = require('./models/Category');
const Supplier = require('./models/Supplier');

// Load environment variables so we can access MONGO_URI
dotenv.config();

const seedDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB for Seeding...');

        // 1. Clear out any old glitched data
        await Product.deleteMany();
        await Category.deleteMany();
        await Supplier.deleteMany();

        // 2. Create a Category
        const electronics = await Category.create({
            name: 'Electronics',
            description: 'Computers and tech gadgets'
        });

        // 3. Create a Supplier
        const techCorp = await Supplier.create({
            name: 'TechCorp International',
            contactEmail: 'sales@techcorp.com',
            contactPhone: '555-0199'
        });

        // 4. Create 3 Products linked to the Category and Supplier
        await Product.create([
            {
                name: 'MacBook Pro 16-inch',
                price: 2400,
                quantity: 15,
                category: electronics._id,
                supplier: techCorp._id
            },
            {
                name: 'Dell XPS 15',
                price: 1800,
                quantity: 8,
                category: electronics._id,
                supplier: techCorp._id
            },
            {
                name: 'Lenovo ThinkPad X1',
                price: 1500,
                quantity: 22,
                category: electronics._id,
                supplier: techCorp._id
            }
        ]);

        console.log('✅ Database Successfully Seeded with Test Data!');
        process.exit();
    } catch (error) {
        console.error('❌ Error Seeding Database:', error);
        process.exit(1);
    }
};

seedDatabase();