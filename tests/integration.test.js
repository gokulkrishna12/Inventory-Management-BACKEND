const request = require('supertest');
const app = require('../server'); 
const mongoose = require('mongoose');

// We will store our tokens here after the login test
let adminToken = '';
let staffToken = '';
let testProductId = '';

// Setup & Teardown for the Database
beforeAll(async () => {
    // Connect to a local test database so we don't wipe your real production data
    await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/enterprise_test_db');
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});

describe('Enterprise Hub Integration Tests', () => {

    // 1. Test Login & Token Generation
    it('1. Should login as Admin and return a JWT token', async () => {
        // Assuming your DB has a seeded admin. Adjust credentials if needed.
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@gk.com', password: 'password123' });

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('token');
        adminToken = res.body.token; // Save token for future admin tests
    });

    it('Should login as Staff and return a JWT token', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'staff@gk.com', password: 'password123' });

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('token');
        staffToken = res.body.token; // Save token for future staff tests
    });

    // Setup: Create a dummy product to test the DELETE route
    it('Setup: Should create a dummy product', async () => {
        const res = await request(app)
            .post('/api/products')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Test Item', price: 10, quantity: 5 });
        
        expect(res.statusCode).toBe(201);
        testProductId = res.body.data._id;
    });

    // 2. Staff Blocked from Admin Routes (RBAC Test)
    it('2. Should strictly block Staff from executing an Admin-only DELETE', async () => {
        const res = await request(app)
            .delete(`/api/products/${testProductId}`)
            .set('Authorization', `Bearer ${staffToken}`); // Using STAFF token

        expect(res.statusCode).toBe(403); 
        expect(res.body.message).toMatch(/Not authorized to access this route/i);
    });

    // 3. Admin-only DELETE (Success Test)
    it('3. Should allow Admin to DELETE a product', async () => {
        const res = await request(app)
            .delete(`/api/products/${testProductId}`)
            .set('Authorization', `Bearer ${adminToken}`); // Using ADMIN token

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    // 4. CSV Upload Over 5MB Rejected
    it('4. Should reject a CSV file larger than the 5MB Multer limit', async () => {
        // Create a massive 6MB dummy buffer in RAM
        const massiveBuffer = Buffer.alloc(6 * 1024 * 1024, 'a'); 

        const res = await request(app)
            .post('/api/csv/import-stock')
            .set('Authorization', `Bearer ${adminToken}`)
            .attach('file', massiveBuffer, 'massive.csv');

        // Multer throws a 500 or 400 depending on exact Express error handler setup for 'File too large'
        expect(res.statusCode).toBeGreaterThanOrEqual(400); 
    });

    // 5. Rate Limiting after 100 requests
    it('5. Should block traffic with a 429 after 100 rapid requests', async () => {
        let lastRes;
        
        // Loop 101 requests instantly
        for (let i = 0; i < 101; i++) {
            lastRes = await request(app).get('/api/products');
        }

        // The 101st request should trigger the express-rate-limit block
        expect(lastRes.statusCode).toBe(429);
        expect(lastRes.text).toMatch(/Too many requests/i);
    }, 10000); // Increased jest timeout for this specific loop
});