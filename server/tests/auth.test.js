```javascript
const request = require('supertest');

// MOCK the database before requiring app
jest.mock('../config/db', () => ({
  initDb: jest.fn(),
  pool: {
    query: jest.fn()
  }
}));

const { app, pool } = require('../server');
// Mocking middleware if needed, but for now assuming real JWT logic works 
// if we sign correctly.

describe('Auth API (Mocked)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

  describe('GET /api/health', () => {
    it('returns 200 via mock DB', async () => {
      // Mock successful query
      pool.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });
      
      const res = await request(app).get('/api/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('returns 500 on DB error', async () => {
        pool.query.mockRejectedValue(new Error('DB connection failed'));
        const res = await request(app).get('/api/health');
        expect(res.statusCode).toBe(500);
    });
  });

  describe('POST /api/auth/register', () => {
      it('registers a user successfully', async () => {
          // 1. check if user exists (return empty)
          pool.query.mockResolvedValueOnce({ rows: [] });
          
          // 2. insert user (return new user)
          pool.query.mockResolvedValueOnce({ 
              rows: [{ id: 1, name: 'Test', email: 'test@test.com', avatar: null }] 
          });

          const res = await request(app)
            .post('/api/auth/register')
            .send({ name: 'Test', email: 'test@test.com', password: 'password123' });
          
          expect(res.statusCode).toBe(200);
          expect(res.body).toHaveProperty('token');
          expect(res.body.user).toHaveProperty('email', 'test@test.com');
      });
  });
});
```
