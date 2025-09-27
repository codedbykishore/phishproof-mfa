import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import app from '../../server.js';
import { createUser, initializeDatabase, hashPassword } from '../../src/backend/database.js';
import { randomUUID } from 'crypto';

describe('Authentication API Integration Tests', () => {
  let testUserId;

  beforeAll(async () => {
    // Initialize test database
    initializeDatabase();
    
    // Create a test user with hashed password
    testUserId = randomUUID();
    const passwordResult = await hashPassword('password');
    
    const userResult = createUser(
      testUserId,
      'user',
      passwordResult.hash,
      'test-credential-id',
      'test-public-key',
      0
    );
    
    expect(userResult.success).toBe(true);
  });

  describe('POST /api/auth/login', () => {
    it('should return authentication challenge for valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'user',
          password: 'password'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('username', 'user');
      expect(response.body).toHaveProperty('requiresWebAuthn', true);
      expect(response.body).toHaveProperty('challenge');
      expect(response.body).toHaveProperty('allowCredentials');
      expect(Array.isArray(response.body.allowCredentials)).toBe(true);
      expect(response.body.allowCredentials.length).toBeGreaterThan(0);
    });

    it('should reject invalid username', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistentuser',
          password: 'password'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Invalid username or password');
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'user',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Invalid username or password');
    });

    it('should reject missing username', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'password'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Valid username is required');
    });

    it('should reject missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'user'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Password is required');
    });

    it('should reject empty username', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: '   ',
          password: 'password'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Valid username is required');
    });
  });

  describe('WebAuthn Registration Flow', () => {
    it('should generate registration challenge', async () => {
      const response = await request(app)
        .post('/api/webauthn/register/challenge')
        .send({
          username: 'newuser',
          password: 'newpassword'
        })
        .expect(200);

      expect(response.body).toHaveProperty('challenge');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('rp');
      expect(response.body).toHaveProperty('pubKeyCredParams');
      expect(typeof response.body.challenge).toBe('string');
      expect(response.body.challenge.length).toBeGreaterThan(10);
    });

    it('should reject registration challenge with missing data', async () => {
      const response = await request(app)
        .post('/api/webauthn/register/challenge')
        .send({
          username: 'newuser'
          // missing password
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });
});