/**
 * Dashboard UX Features Integration Tests
 * Tests for T051 & T052: Enhanced dashboard personalization and security features
 */

import { describe, test, expect } from '@jest/globals';
import request from 'supertest';
import app from '../../server.js';

describe('Enhanced Dashboard UX Features Tests', () => {
    describe('T051: Dashboard Personalization API Support', () => {
        test('should have dashboard endpoint that requires authentication', async () => {
            const response = await request(app)
                .get('/api/dashboard');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBeDefined();
            expect(typeof response.body.error).toBe('string');
        });

        test('should reject invalid authentication tokens', async () => {
            const response = await request(app)
                .get('/api/dashboard')
                .set('Authorization', 'Bearer invalid_token_xyz');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBeDefined();
        });

        test('should validate authentication header format', async () => {
            const response = await request(app)
                .get('/api/dashboard')
                .set('Authorization', 'InvalidFormat token');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    describe('T052: Security Modal API Support', () => {
        test('should provide consistent error response structure for security features', async () => {
            const response = await request(app)
                .get('/api/dashboard');

            // Verify response structure supports security modal requirements
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('error');
            expect(typeof response.body.success).toBe('boolean');
            expect(typeof response.body.error).toBe('string');
            expect(response.body.success).toBe(false);
        });

        test('should handle missing authorization header securely', async () => {
            const response = await request(app)
                .get('/api/dashboard');

            expect(response.status).toBe(401);
            expect(response.body.error).not.toContain('undefined');
            expect(response.body.error).not.toContain('null');
        });
    });

    describe('Enhanced Authentication Flow', () => {
        test('should validate login endpoint exists for enhanced features', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'testuser',
                    password: 'testpass'
                });

            // Endpoint should exist (not 404) - response can be 401 or 200
            expect(response.status).not.toBe(404);
            expect(response.body).toBeDefined();
        });

        test('should provide proper error messages for invalid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'invaliduser',
                    password: 'wrongpassword'
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBeDefined();
            expect(typeof response.body.error).toBe('string');
            expect(response.body.error.length).toBeGreaterThan(0);
        });
    });

    describe('API Structure for Enhanced UX', () => {
        test('should maintain consistent API response format', async () => {
            const dashboardResponse = await request(app).get('/api/dashboard');
            const auditResponse = await request(app).get('/api/audit');

            // Both should have consistent error response structure
            expect(dashboardResponse.body).toHaveProperty('success');
            expect(auditResponse.body).toHaveProperty('success');
            expect(dashboardResponse.body).toHaveProperty('error');
            expect(auditResponse.body).toHaveProperty('error');
        });
    });
});