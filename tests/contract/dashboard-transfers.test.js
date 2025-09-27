import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import app from '../../server.js';
import { generateToken } from '../../src/backend/auth.js';
import { createUser, initializeDatabase } from '../../src/backend/database.js';
import { randomUUID } from 'crypto';

describe('Dashboard and Transfer API Contract Tests', () => {
  let testUserId;
  let validToken;
  let authHeaders;

  beforeAll(async () => {
    // Initialize test database (uses :memory: for tests)
    initializeDatabase();
    
    // Create a test user
    testUserId = randomUUID();
    const testUser = createUser(
      testUserId,
      'testuser',
      '$2a$12$test.hash', // bcrypt hash
      'test-credential-id',
      'test-public-key',
      0
    );
    
    expect(testUser.success).toBe(true);
    
    // Generate valid JWT token
    const tokenResult = generateToken(testUserId, 'testuser');
    expect(tokenResult.success).toBe(true);
    validToken = tokenResult.token;
    authHeaders = { Authorization: `Bearer ${validToken}` };
  });

  describe('Authentication Required', () => {
    it('should reject dashboard access without token', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Access token required');
    });

    it('should reject transfer without token', async () => {
      const transferData = {
        amount: 100.50,
        description: 'Test transfer',
      };

      const response = await request(app)
        .post('/api/transfers')
        .send(transferData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Access token required');
    });

    it('should reject audit access without token', async () => {
      const response = await request(app)
        .get('/api/audit')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Access token required');
    });
  });

  describe('GET /api/dashboard', () => {
    it('should return dashboard data with valid token', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .set(authHeaders)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('recentTransactions');
      expect(response.body.user).toHaveProperty('id', testUserId);
      expect(response.body.user).toHaveProperty('username', 'testuser');
      expect(response.body.user).toHaveProperty('balance');
      expect(Array.isArray(response.body.recentTransactions)).toBe(true);
    });

    it('should reject dashboard access with invalid token', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .set({ Authorization: 'Bearer invalid-token' })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/transfers', () => {
    it('should create transfer with valid data and token', async () => {
      const transferData = {
        amount: 100.50,
        description: 'Test transfer',
      };

      const response = await request(app)
        .post('/api/transfers')
        .set(authHeaders)
        .send(transferData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('transaction');
      expect(response.body).toHaveProperty('newBalance');
      expect(response.body.transaction.amount).toBe(transferData.amount);
      expect(response.body.transaction.description).toBe(transferData.description);
    });

    it('should reject transfer with insufficient balance', async () => {
      const transferData = {
        amount: 100000, // More than default balance
        description: 'Large test transfer',
      };

      const response = await request(app)
        .post('/api/transfers')
        .set(authHeaders)
        .send(transferData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Insufficient balance');
    });

    it('should reject transfer with invalid amount', async () => {
      const transferData = {
        amount: -50,
        description: 'Invalid transfer',
      };

      const response = await request(app)
        .post('/api/transfers')
        .set(authHeaders)
        .send(transferData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('amount');
    });

    it('should reject transfer without required fields', async () => {
      const response = await request(app)
        .post('/api/transfers')
        .set(authHeaders)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/audit', () => {
    it('should return audit events with valid token', async () => {
      const response = await request(app)
        .get('/api/audit')
        .set(authHeaders)
        .expect(200);

      expect(response.body).toHaveProperty('events');
      expect(Array.isArray(response.body.events)).toBe(true);
    });

    it('should support limit parameter', async () => {
      const response = await request(app)
        .get('/api/audit?limit=10')
        .set(authHeaders)
        .expect(200);

      expect(response.body).toHaveProperty('events');
      expect(Array.isArray(response.body.events)).toBe(true);
      expect(response.body.events.length).toBeLessThanOrEqual(10);
    });

    it('should reject invalid limit parameter', async () => {
      const response = await request(app)
        .get('/api/audit?limit=150') // Above max limit of 100
        .set(authHeaders)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Limit');
    });
  });
});
