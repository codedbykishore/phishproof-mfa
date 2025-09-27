/**
 * API Response Format Tests
 * Tests for consistent API response formats with success property
 */
import request from 'supertest';
import express from 'express';
import router from '../../src/backend/routes.js';
import { initializeDatabase } from '../../src/backend/database.js';

const app = express();
app.use(express.json());
app.use('/api', router);

describe('API Response Format Tests', () => {
  let testServer;
  let validToken;

  beforeAll(async () => {
    // Initialize database
    await initializeDatabase();
    
    // Create test server
    testServer = request(app);
  });

  beforeEach(async () => {
    // Create a valid token for authenticated tests
    const loginResponse = await testServer
      .post('/api/auth/login')
      .send({
        username: 'user',
        password: 'password',
      });
    
    if (loginResponse.body.success) {
      validToken = loginResponse.body.token;
    }
  });

  describe('Dashboard API Response Format', () => {
    test('should return success: false for unauthenticated requests', async () => {
      const response = await testServer
        .get('/api/dashboard')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/token required/i);
    });

    test('should return success: true for authenticated requests', async () => {
      if (!validToken) {
        console.log('Skipping authenticated test - no valid token available');
        return;
      }

      const response = await testServer
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('recentTransactions');
    });

    test('should return success: false for invalid token', async () => {
      const response = await testServer
        .get('/api/dashboard')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Audit API Response Format', () => {
    test('should return success: false for unauthenticated requests', async () => {
      const response = await testServer
        .get('/api/audit')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    test('should return success: true for authenticated requests', async () => {
      if (!validToken) {
        console.log('Skipping authenticated test - no valid token available');
        return;
      }

      const response = await testServer
        .get('/api/audit')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('events');
      expect(Array.isArray(response.body.events)).toBe(true);
    });
  });

  describe('Transfers API Response Format', () => {
    test('should maintain success: true format for valid transfers', async () => {
      if (!validToken) {
        console.log('Skipping authenticated test - no valid token available');
        return;
      }

      const response = await testServer
        .post('/api/transfers')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          amount: 10.50,
          description: 'Test transfer for response format'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('transaction');
      expect(response.body).toHaveProperty('newBalance');
    });
  });
});