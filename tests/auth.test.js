// tests/auth.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server'); // Import your express app
const User = require('../models/User');

let mongoServer;

// 1. SETUP: Before any tests run, create a fake MongoDB in memory
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
});

// 2. CLEANUP: After all tests finish, wipe the DB and close connections
afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
});

// 3. ISOLATION: Clear the users collection before EACH individual test
beforeEach(async () => {
    await User.deleteMany();
});

// --- THE ACTUAL TESTS ---
describe('Auth API Endpoints', () => {

    it('should register a new user successfully and return a token', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Jest Tester',
                email: 'jest@test.com',
                password: 'password123',
                role: 'admin'
            });

        // We expect the server to say "201 Created"
        expect(res.statusCode).toEqual(201);
        expect(res.body.success).toBeTruthy();
        expect(res.body.token).toBeDefined(); // Token must exist!
    });

    it('should login an existing user', async () => {
        // First, register a user in the fake DB
        await request(app).post('/api/auth/register').send({
            name: 'Jest Tester',
            email: 'jest@test.com',
            password: 'password123',
            role: 'admin'
        });

        // Now, try to log in as that user
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'jest@test.com',
                password: 'password123'
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body.token).toBeDefined();
    });

    it('should block login with wrong password', async () => {
        // Register the user
        await request(app).post('/api/auth/register').send({
            name: 'Jest Tester',
            email: 'jest@test.com',
            password: 'password123'
        });

        // Try to login with WRONG password
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'jest@test.com',
                password: 'wrongpassword'
            });

        // We expect the server to kick us out with "401 Unauthorized"
        expect(res.statusCode).toEqual(401);
        expect(res.body.success).toBeFalsy();
    });
});