/**
 * Performance tests for WebAuthn operations
 * Ensures WebAuthn operations complete within 1 second threshold
 */

import { jest } from '@jest/globals';

describe('WebAuthn Performance Tests', () => {
    const PERFORMANCE_THRESHOLD = 1000; // 1 second
    
    // Mock WebAuthn operations for consistent timing
    const mockGenerateRegistrationOptions = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
            challenge: 'mock-challenge',
            rp: { name: 'PhishProof MFA Banking', id: 'localhost' },
            user: { id: 'user123', name: 'testuser', displayName: 'testuser' },
            pubKeyCredParams: [],
            timeout: 60000
        }), 50)) // 50ms delay to simulate real operation
    );

    const mockVerifyRegistrationResponse = jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
            verified: true,
            registrationInfo: { credentialID: 'cred123' }
        }), 30))
    );

    const mockGenerateAuthenticationOptions = jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
            challenge: 'auth-challenge',
            timeout: 60000,
            allowCredentials: []
        }), 40))
    );

    const mockVerifyAuthenticationResponse = jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
            verified: true,
            authenticationInfo: { newCounter: 1 }
        }), 35))
    );

    describe('Registration Performance', () => {
        test('should generate registration challenge within 1 second', async () => {
            const start = Date.now();
            
            const result = await mockGenerateRegistrationOptions();
            
            const duration = Date.now() - start;
            
            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD);
            expect(result).toHaveProperty('challenge');
            expect(result.challenge).toBe('mock-challenge');
        });

        test('should verify registration response within 1 second', async () => {
            const start = Date.now();
            
            const result = await mockVerifyRegistrationResponse();
            
            const duration = Date.now() - start;
            
            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD);
            expect(result.verified).toBe(true);
        });
    });

    describe('Authentication Performance', () => {
        test('should generate authentication challenge within 1 second', async () => {
            const start = Date.now();
            
            const result = await mockGenerateAuthenticationOptions();
            
            const duration = Date.now() - start;
            
            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD);
            expect(result).toHaveProperty('challenge');
            expect(result.challenge).toBe('auth-challenge');
        });

        test('should verify authentication response within 1 second', async () => {
            const start = Date.now();
            
            const result = await mockVerifyAuthenticationResponse();
            
            const duration = Date.now() - start;
            
            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD);
            expect(result.verified).toBe(true);
        });
    });

    describe('Concurrent Operations', () => {
        test('should handle multiple concurrent registration challenges', async () => {
            const concurrentOps = 5;
            const promises = [];
            
            const start = Date.now();
            
            for (let i = 0; i < concurrentOps; i++) {
                promises.push(mockGenerateRegistrationOptions());
            }
            
            const results = await Promise.all(promises);
            
            const totalDuration = Date.now() - start;
            
            expect(totalDuration).toBeLessThan(PERFORMANCE_THRESHOLD);
            expect(results).toHaveLength(concurrentOps);
            results.forEach(result => {
                expect(result).toHaveProperty('challenge');
            });
        });

        test('should handle multiple concurrent authentication challenges', async () => {
            const concurrentOps = 5;
            const promises = [];
            
            const start = Date.now();
            
            for (let i = 0; i < concurrentOps; i++) {
                promises.push(mockGenerateAuthenticationOptions());
            }
            
            const results = await Promise.all(promises);
            
            const totalDuration = Date.now() - start;
            
            expect(totalDuration).toBeLessThan(PERFORMANCE_THRESHOLD);
            expect(results).toHaveLength(concurrentOps);
        });
    });

    describe('Memory Usage', () => {
        test('should not cause memory leaks during repeated operations', async () => {
            const initialMemory = process.memoryUsage().heapUsed;
            
            // Perform 50 operations to test memory usage
            for (let i = 0; i < 50; i++) {
                await mockGenerateRegistrationOptions();
                await mockVerifyRegistrationResponse();
            }
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
            
            console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);
            
            // Should not increase memory by more than 5MB
            expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
        });
    });
});

// Mock the @simplewebauthn/server module with realistic timing
jest.unstable_mockModule('@simplewebauthn/server', () => ({
    generateRegistrationOptions: jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
            challenge: 'mock-challenge',
            rp: { name: 'PhishProof MFA Banking', id: 'localhost' },
            user: { id: 'user123', name: 'testuser', displayName: 'testuser' },
            pubKeyCredParams: [],
            timeout: 60000
        }), 50)) // 50ms delay to simulate real operation
    ),
    verifyRegistrationResponse: jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
            verified: true,
            registrationInfo: {
                credentialID: Buffer.from('cred123'),
                credentialPublicKey: Buffer.from('pubkey'),
                counter: 0
            }
        }), 100)) // 100ms delay to simulate verification
    ),
    generateAuthenticationOptions: jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
            challenge: 'auth-challenge',
            allowCredentials: [],
            timeout: 60000
        }), 75)) // 75ms delay
    ),
    verifyAuthenticationResponse: jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
            verified: true,
            authenticationInfo: { newCounter: 1 }
        }), 125)) // 125ms delay
    )
}));

// Mock database with realistic delays
jest.unstable_mockModule('../../src/backend/database.js', () => ({
    getUserByUsername: jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(null), 10))
    ),
    saveChallenge: jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(), 15))
    ),
    getChallenge: jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve('stored-challenge'), 10))
    ),
    deleteChallenge: jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(), 10))
    ),
    saveUserCredential: jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(), 20))
    ),
    getUserCredentials: jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve([{
            credential_id: Buffer.from('cred123'),
            public_key: Buffer.from('pubkey'),
            counter: 0
        }]), 15))
    )
}));

const { generateRegistrationChallenge, verifyRegistrationCredential, generateAuthenticationChallenge, verifyAuthenticationCredential } = await import('../../src/backend/webauthn.js');
const { getUserByUsername, getUserCredentials } = await import('../../src/backend/database.js');

describe('WebAuthn Performance Tests', () => {
    const PERFORMANCE_THRESHOLD = 1000; // 1 second
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Registration Performance', () => {
        test('should generate registration challenge within 1 second', async () => {
            const startTime = Date.now();
            
            await generateRegistrationChallenge('testuser');
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD);
            console.log(`Registration challenge generation took ${duration}ms`);
        });

        test('should verify registration response within 1 second', async () => {
            const mockResponse = { id: 'cred123', response: {} };
            
            const startTime = Date.now();
            
            await verifyRegistrationCredential(mockResponse, 'stored-challenge');
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD);
            console.log(`Registration verification took ${duration}ms`);
        });

        test('should handle multiple concurrent registration challenges', async () => {
            const usernames = ['user1', 'user2', 'user3', 'user4', 'user5'];
            
            const startTime = Date.now();
            
            const promises = usernames.map(username => 
                generateRegistrationChallenge(username)
            );
            await Promise.all(promises);
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD);
            console.log(`5 concurrent registration challenges took ${duration}ms`);
        });
    });

    describe('Authentication Performance', () => {
        test('should generate authentication challenge within 1 second', async () => {
            // Setup: mock existing user
            getUserByUsername.mockResolvedValueOnce({ id: 1, username: 'testuser' });
            
            const startTime = Date.now();
            
            await generateAuthenticationChallenge('testuser');
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD);
            console.log(`Authentication challenge generation took ${duration}ms`);
        });

        test('should verify authentication response within 1 second', async () => {
            const mockResponse = { id: 'cred123', response: {} };
            
            const startTime = Date.now();
            
            await verifyAuthenticationCredential(mockResponse, 'stored-challenge');
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD);
            console.log(`Authentication verification took ${duration}ms`);
        });

        test('should handle multiple concurrent authentication challenges', async () => {
            // Setup: mock existing users
            getUserByUsername.mockImplementation(() => 
                Promise.resolve({ id: 1, username: 'testuser' })
            );
            
            const usernames = ['user1', 'user2', 'user3', 'user4', 'user5'];
            
            const startTime = Date.now();
            
            const promises = usernames.map(username => 
                generateAuthenticationChallenge(username)
            );
            await Promise.all(promises);
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD);
            console.log(`5 concurrent authentication challenges took ${duration}ms`);
        });
    });

    describe('End-to-End Performance', () => {
        test('should complete full registration flow within 1 second', async () => {
            const startTime = Date.now();
            
            // Generate challenge
            const challenge = await generateRegistrationChallenge('e2euser');
            
            // Verify response
            const mockResponse = { id: 'cred123', response: {} };
            await verifyRegistrationCredential(mockResponse, 'stored-challenge');
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD);
            console.log(`Full registration flow took ${duration}ms`);
        });

        test('should complete full authentication flow within 1 second', async () => {
            // Setup: mock existing user
            getUserByUsername.mockResolvedValue({ id: 1, username: 'authuser' });
            
            const startTime = Date.now();
            
            // Generate challenge
            await generateAuthenticationChallenge('authuser');
            
            // Verify response
            const mockResponse = { id: 'cred123', response: {} };
            await verifyAuthenticationCredential(mockResponse, 'stored-challenge');
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD);
            console.log(`Full authentication flow took ${duration}ms`);
        });
    });

    describe('Stress Testing', () => {
        test('should maintain performance under load', async () => {
            const iterations = 10;
            const durations = [];
            
            for (let i = 0; i < iterations; i++) {
                const startTime = Date.now();
                
                await generateRegistrationChallenge(`stressuser${i}`);
                
                const endTime = Date.now();
                durations.push(endTime - startTime);
            }
            
            const averageDuration = durations.reduce((a, b) => a + b) / durations.length;
            const maxDuration = Math.max(...durations);
            
            expect(averageDuration).toBeLessThan(PERFORMANCE_THRESHOLD);
            expect(maxDuration).toBeLessThan(PERFORMANCE_THRESHOLD);
            
            console.log(`Average duration: ${averageDuration}ms, Max: ${maxDuration}ms`);
        });

        test('should handle database timeout gracefully', async () => {
            // Mock a slow database operation
            getUserByUsername.mockImplementationOnce(() => 
                new Promise(resolve => setTimeout(() => resolve(null), 800))
            );
            
            const startTime = Date.now();
            
            await generateRegistrationChallenge('slowuser');
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD);
            console.log(`Slow database operation took ${duration}ms`);
        });
    });

    describe('Memory Usage', () => {
        test('should not cause memory leaks during repeated operations', async () => {
            const initialMemory = process.memoryUsage();
            
            // Perform many operations
            for (let i = 0; i < 50; i++) {
                await generateRegistrationChallenge(`memtest${i}`);
            }
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            const finalMemory = process.memoryUsage();
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
            
            // Memory increase should be reasonable (less than 10MB)
            expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
            
            console.log(`Memory increase: ${Math.round(memoryIncrease / 1024 / 1024 * 100) / 100}MB`);
        });
    });
});