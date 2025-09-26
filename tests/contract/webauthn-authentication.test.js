// Mock the database and webauthn functions for testing
jest.mock('../../src/backend/database.js', () => ({
  findUserById: jest.fn(),
  createAuditEvent: jest.fn(),
  updateUserLastLogin: jest.fn(),
}));

jest.mock('../../src/backend/webauthn.js', () => ({
  generateAuthenticationChallenge: jest.fn(),
  verifyAuthenticationCredential: jest.fn(),
}));

jest.mock('../../src/backend/auth.js', () => ({
  generateToken: jest.fn(),
  authenticateToken: jest.fn(),
}));

import request from 'supertest';
import express from 'express';

// Create a test Express app since the actual server doesn't exist yet
const app = express();
app.use(express.json());

import { findUserById, createAuditEvent, updateUserLastLogin } from '../../src/backend/database.js';
import { generateAuthenticationChallenge, verifyAuthenticationCredential } from '../../src/backend/webauthn.js';
import { generateToken, authenticateToken } from '../../src/backend/auth.js';

// Set up default mock behaviors
findUserById.mockReturnValue({
  success: true,
  user: {
    id: 'test-credential-id',
    username: 'testuser',
    balance: 5000,
  }
});
createAuditEvent.mockReturnValue({ success: true });
updateUserLastLogin.mockReturnValue({ success: true });
generateAuthenticationChallenge.mockReturnValue({
  success: true,
  options: {
    challenge: 'mock-auth-challenge-base64url',
    allowCredentials: [
      {
        type: 'public-key',
        id: 'test-credential-id',
      }
    ],
    timeout: 60000,
    userVerification: 'required',
  }
});
verifyAuthenticationCredential.mockReturnValue({
  success: true,
  userId: 'test-credential-id'
});
generateToken.mockReturnValue({
  success: true,
  token: 'mock-jwt-token',
  expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
});

// Import the routes after mocking
const routes = require('../../src/backend/routes.js');
app.use('/api', routes);

describe('WebAuthn Authentication Endpoints Contract Tests', () => {
  describe('POST /api/webauthn/auth/challenge', () => {
    it('should generate authentication challenge for valid user', async () => {
      const response = await request(app)
        .post('/api/webauthn/auth/challenge')
        .send({ userId: 'test-credential-id' })
        .expect(200);

      expect(response.body).toHaveProperty('challenge');
      expect(response.body).toHaveProperty('allowCredentials');
      expect(response.body).toHaveProperty('timeout');
      expect(response.body).toHaveProperty('userVerification');

      expect(typeof response.body.challenge).toBe('string');
      expect(Array.isArray(response.body.allowCredentials)).toBe(true);
      expect(response.body.allowCredentials.length).toBeGreaterThan(0);
      expect(response.body.allowCredentials[0]).toHaveProperty(
        'type',
        'public-key'
      );
      expect(response.body.allowCredentials[0]).toHaveProperty('id');
    });

    it('should reject challenge generation for non-existent user', async () => {
      findUserById.mockReturnValueOnce({ success: false, error: 'User not found' });

      const response = await request(app)
        .post('/api/webauthn/auth/challenge')
        .send({ userId: 'non-existent-user' })
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/not found/i);
    });

    it('should reject challenge generation without userId', async () => {
      const response = await request(app)
        .post('/api/webauthn/auth/challenge')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/webauthn/auth/verify', () => {
    it('should verify authentication with valid credential', async () => {
      const mockCredential = {
        id: 'mock-credential-id',
        rawId: 'bW9jay1jcmVkZW50aWFsLWlk',
        type: 'public-key',
        response: {
          clientDataJSON:
            'eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoiIiwiZXh0ZW5zaW9ucyI6W119',
          authenticatorData:
            'SZYN5YgOjGh0NBcPZHZgW4_kBMed9GdBhVNGrV8uKJNMAAAAAKIg71NW9yJZ0CjV5E5GYKJwGAAAAAAAAAAA',
          signature:
            'MEUCIQDYXB8q8tZvNkcwA8qTzYNb4K9syQvBJl4zxZXqLQHgAIgF7n0K2cjzQS8aL2K_8UhF8WVsEG8aL2K_8UhF8WVsEG8',
          userHandle: 'dXNlci1oYW5kbGU',
        },
      };

      const response = await request(app)
        .post('/api/webauthn/auth/verify')
        .send({
          credential: mockCredential,
          challenge: 'mock-challenge',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('expiresAt');

      expect(typeof response.body.token).toBe('string');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('username');
      expect(response.body.user).toHaveProperty('balance');
      expect(typeof response.body.user.balance).toBe('number');
    });

    it('should reject authentication with invalid credential', async () => {
      verifyAuthenticationCredential.mockReturnValueOnce({
        success: false,
        error: 'Invalid credential'
      });

      const response = await request(app)
        .post('/api/webauthn/auth/verify')
        .send({
          credential: { invalid: 'data' },
          challenge: 'mock-challenge',
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject authentication without required fields', async () => {
      const response = await request(app)
        .post('/api/webauthn/auth/verify')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });
});
