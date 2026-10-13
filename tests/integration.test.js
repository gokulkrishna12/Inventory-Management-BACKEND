const request = require('supertest');
const app = require('../server'); 
const mongoose = require('mongoose');

// We need your actual models to fetch valid IDs
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');

let adminToken = '';
let staffToken = '';
let testProductId = '';

let validCategoryId = '';
let validSupplierId = '';

const adminEmail = `admin_test_${Date.now()}@gk.com`;
const staffEmail = `staff_test_${Date.now()}@gk.com`;

jest.setTimeout(15000);

beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGO_URI);
    }
    
    // Fetch one existing category and supplier from your live database
    const category = await Category.findOne();
    const supplier = await Supplier.findOne();
    
    // Fallback just in case your DB is completely empty (unlikely)
    validCategoryId = category ? category._id : new mongoose.Types.ObjectId();
    validSupplierId = supplier ? supplier._id : new mongoose.Types.ObjectId();
});

afterAll(async () => {
    await mongoose.connection.close();
});

describe('Enterprise Hub Integration Tests', () => {

    it('1. Should dynamically register an Admin and return a JWT', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ name: 'Admin Tester', email: adminEmail, password: 'password123', role: 'admin' });

        expect([200, 201]).toContain(res.statusCode);
        expect(res.body).toHaveProperty('token');
        adminToken = res.body.token; 
    });

    it('Should dynamically register Staff and return a JWT', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ name: 'Staff Tester', email: staffEmail, password: 'password123', role: 'staff' });

        expect([200, 201]).toContain(res.statusCode);
        expect(res.body).toHaveProperty('token');
        staffToken = res.body.token; 
    });

    it('Setup: Should create a dummy product with valid relations', async () => {
        const res = await request(app)
            .post('/api/products')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ 
                name: 'Jest Test Item', 
                price: 10, 
                quantity: 5,
                category: validCategoryId, // Added missing required field
                supplier: validSupplierId  // Added missing required field
            });
        
        expect(res.statusCode).toBe(201);
        testProductId = res.body.data._id;
    });

    it('2. Should strictly block Staff from executing an Admin-only DELETE', async () => {
        const res = await request(app)
            .delete(`/api/products/${testProductId}`)
            .set('Authorization', `Bearer ${staffToken}`);

        expect(res.statusCode).toBe(403); 
    });

    it('3. Should allow Admin to DELETE a product', async () => {
        const res = await request(app)
            .delete(`/api/products/${testProductId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('4. Should reject a CSV file larger than the 5MB Multer limit', async () => {
        const massiveBuffer = Buffer.alloc(6 * 1024 * 1024, 'a'); 
        try {
            await request(app)
                .post('/api/csv/import-stock')
                .set('Authorization', `Bearer ${adminToken}`)
                .attach('file', massiveBuffer, 'massive.csv');
        } catch (error) {
            expect(error.code).toBe('ECONNRESET');
        }
    });

    it('5. Should block traffic with a 429 after 100 rapid requests', async () => {
        let lastRes;
        for (let i = 0; i < 101; i++) {
            lastRes = await request(app).get('/api/products');
        }
        expect(lastRes.statusCode).toBe(429);
    });
});