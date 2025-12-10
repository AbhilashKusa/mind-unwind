const request = require('supertest');
const { app, pool } = require('../server');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

// NOTE: We do NOT mock auth middleware here because we want to test the auth flow logic
// However, the routes use the middleware.
// If we want to test /login and /register, they are public.
// If we want to test /me, it requires auth. We can mock the middleware OR generate a valid token if we mock verify.
// Let's decide to mock the middleware ONLY for protected routes or rely on mocking jwt.verify.
// Since we mocked jsonwebtoken, verify will be mocked.

jest.mock('../middleware/auth', () => {
    const originalModule = jest.requireActual('../middleware/auth');
    return {
        ...originalModule,
        authenticateToken: (req, res, next) => {
            // For testing protected routes, we can just inject a user if header is present
            if (req.headers['authorization']) {
                req.user = { id: 1, email: 'test@example.com' };
                next();
            } else {
                res.sendStatus(401);
            }
        }
    };
});


describe('Auth Endpoints', () => {
    afterAll(async () => {
        await pool.end();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // --- REGISTER ---
    test('POST /api/auth/register should create user and return token', async () => {
        jest.spyOn(pool, 'query').mockResolvedValueOnce({
            rows: [{ id: 1, name: 'New User', email: 'test@example.com', avatar: null }]
        });
        bcrypt.hash.mockResolvedValue('hashed_pw');
        jwt.sign.mockReturnValue('fake_token');

        const res = await request(app).post('/api/auth/register').send({
            name: 'New User',
            email: 'test@example.com',
            password: 'password123'
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('token', 'fake_token');
        expect(res.body.user).toHaveProperty('email', 'test@example.com');
    });

    test('POST /api/auth/register should fail with short password', async () => {
        const res = await request(app).post('/api/auth/register').send({
            name: 'User',
            email: 'test@example.com',
            password: '123'
        });
        expect(res.statusCode).toEqual(400);
        expect(res.body.error).toMatch(/password/i);
    });

    // --- LOGIN ---
    test('POST /api/auth/login should return token on success', async () => {
        jest.spyOn(pool, 'query').mockResolvedValueOnce({
            rows: [{ id: 1, email: 'test@example.com', password_hash: 'hashed_pw' }]
        });
        bcrypt.compare.mockResolvedValue(true);
        jwt.sign.mockReturnValue('fake_token');

        const res = await request(app).post('/api/auth/login').send({
            email: 'test@example.com',
            password: 'password123'
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('token', 'fake_token');
    });

    test('POST /api/auth/login should fail on invalid password', async () => {
        jest.spyOn(pool, 'query').mockResolvedValueOnce({
            rows: [{ id: 1, email: 'test@example.com', password_hash: 'hashed_pw' }]
        });
        bcrypt.compare.mockResolvedValue(false);

        const res = await request(app).post('/api/auth/login').send({
            email: 'test@example.com',
            password: 'wrongpassword'
        });

        expect(res.statusCode).toEqual(403);
    });

    // --- PROFILE ---
    test('GET /api/auth/me should return user profile', async () => {
        // Since we mocked middleware to allow if auth header present
        jest.spyOn(pool, 'query').mockResolvedValueOnce({
            rows: [{ id: 1, name: 'Test User', email: 'test@example.com' }]
        });

        const res = await request(app).get('/api/auth/me')
            .set('Authorization', 'Bearer fake_token');

        expect(res.statusCode).toEqual(200);
        expect(res.body.name).toBe('Test User');
    });

    test('PUT /api/auth/me should update profile', async () => {
        bcrypt.hash.mockResolvedValue('new_hashed_pw');
        // UPDATE query usually returns updated row
        jest.spyOn(pool, 'query').mockResolvedValueOnce({
            rows: [{ id: 1, name: 'Updated Name', email: 'test@example.com' }]
        });

        const res = await request(app).put('/api/auth/me')
            .set('Authorization', 'Bearer fake_token')
            .send({ name: 'Updated Name', password: 'newpassword' });

        expect(res.statusCode).toEqual(200);
        expect(res.body.name).toBe('Updated Name');
    });
});
