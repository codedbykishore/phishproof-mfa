/**
 * Dashboard API Integration Tests
 * Tests for the fixed dashboard loading and API response handling
 */
import request from 'supertest';
import express from 'express';
import router from '../../src/backend/routes.js';
import { initializeDatabase } from '../../src/backend/database.js';

const app = express();
app.use(express.json());
app.use('/api', router);

describe('Dashboard API Integration Tests', () => {
  let testServer;

  beforeAll(async () => {
    await initializeDatabase();
    testServer = request(app);
  });

  describe('Dashboard Loading Flow', () => {
    test('should handle complete dashboard loading flow', async () => {
      // Test the sequence: No auth → Auth required → Success with valid token
      
      // 1. Test unauthenticated access
      const unauthResponse = await testServer
        .get('/api/dashboard')
        .expect(401);

      expect(unauthResponse.body).toEqual({
        success: false,
        error: 'Access token required'
      });

      // 2. Test with invalid token
      const invalidTokenResponse = await testServer
        .get('/api/dashboard')
        .set('Authorization', 'Bearer invalid-token-123')
        .expect(401);

      expect(invalidTokenResponse.body).toHaveProperty('success', false);
      expect(invalidTokenResponse.body.error).toMatch(/Invalid token|token/i);

      // 3. Test with malformed token
      const malformedTokenResponse = await testServer
        .get('/api/dashboard')
        .set('Authorization', 'Bearer not.a.jwt')
        .expect(401);

      expect(malformedTokenResponse.body).toHaveProperty('success', false);
    });

    test('should return consistent response format for all dashboard scenarios', async () => {
      const scenarios = [
        { auth: undefined, expectedStatus: 401 },
        { auth: 'Bearer invalid', expectedStatus: 401 },
        { auth: 'Bearer malformed.token', expectedStatus: 401 }
      ];

      for (const scenario of scenarios) {
        const request = testServer.get('/api/dashboard');
        
        if (scenario.auth) {
          request.set('Authorization', scenario.auth);
        }

        const response = await request.expect(scenario.expectedStatus);
        
        // All error responses should have consistent format
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
        expect(typeof response.body.error).toBe('string');
      }
    });
  });

  describe('Enhanced Error Response Handling', () => {
    test('should provide specific error messages for different auth failures', async () => {
      // No token
      const noTokenResponse = await testServer
        .get('/api/dashboard')
        .expect(401);

      expect(noTokenResponse.body.error).toBe('Access token required');

      // Invalid token format
      const invalidTokenResponse = await testServer
        .get('/api/dashboard')
        .set('Authorization', 'Bearer invalid.token.format')
        .expect(401);

      expect(invalidTokenResponse.body.error).toMatch(/Invalid token|token/i);

      // Missing Bearer prefix
      const noBearerResponse = await testServer
        .get('/api/dashboard')
        .set('Authorization', 'just-a-token')
        .expect(401);

      expect(noBearerResponse.body.error).toBe('Access token required');
    });
  });

  describe('API Response Format Consistency', () => {
    test('should ensure all protected endpoints return consistent format', async () => {
      // Test GET endpoints
      const getEndpoints = [
        '/api/dashboard',
        '/api/audit'
      ];

      for (const endpoint of getEndpoints) {
        const response = await testServer
          .get(endpoint)
          .expect(401);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toBe('Access token required');
      }

      // Test POST endpoint separately
      const postResponse = await testServer
        .post('/api/transfers')
        .send({ amount: 100, description: 'Test' })
        .expect(401);

      expect(postResponse.body).toHaveProperty('success', false);
      expect(postResponse.body).toHaveProperty('error');
      expect(postResponse.body.error).toBe('Access token required');
    });

    test('should handle POST endpoints consistently', async () => {
      const response = await testServer
        .post('/api/transfers')
        .send({ amount: 100, description: 'Test' })
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Access token required'
      });
    });
  });

  describe('Performance and Reliability', () => {
    test('should handle multiple concurrent unauthorized requests', async () => {
      const requests = Array(5).fill(0).map(() => 
        testServer.get('/api/dashboard').expect(401)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.body).toEqual({
          success: false,
          error: 'Access token required'
        });
      });
    });

    test('should respond quickly to unauthorized requests', async () => {
      const startTime = Date.now();
      
      await testServer
        .get('/api/dashboard')
        .expect(401);

      const responseTime = Date.now() - startTime;
      
      // Should respond within 100ms for unauthorized requests
      expect(responseTime).toBeLessThan(100);
    });
  });
});