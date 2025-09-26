const request = require('supertest');
const express = require('express');

// Create a test Express app since the actual server doesn't exist yet
const app = express();
app.use(express.json());

// These routes don't exist yet, so tests will fail as expected
describe('Passkey Authentication Flow Integration Tests', () => {
  let registeredUserId;

  beforeAll(async () => {
    // Setup: Register a user first (this will fail because endpoints don't exist)
    const challengeResponse = await request(app)
      .post('/api/webauthn/register/challenge')
      .send({ username: 'authtestuser' })
      .expect(200);

    const challenge = challengeResponse.body.challenge;

    const mockCredential = {
      id: 'auth-test-credential-id',
      rawId: Buffer.from('auth-test-credential-id').toString('base64url'),
      type: 'public-key',
      response: {
        clientDataJSON: Buffer.from(
          JSON.stringify({
            type: 'webauthn.create',
            challenge: challenge,
            origin: 'http://localhost:3000',
          })
        ).toString('base64url'),
        attestationObject: Buffer.from('auth-test-attestation-object').toString(
          'base64url'
        ),
      },
    };

    const verifyResponse = await request(app)
      .post('/api/webauthn/register/verify')
      .send({
        credential: mockCredential,
        challenge: challenge,
      })
      .expect(200);

    registeredUserId = verifyResponse.body.userId;
  });

  it('should complete full passkey authentication flow', async () => {
    // Step 1: Generate authentication challenge
    const challengeResponse = await request(app)
      .post('/api/webauthn/auth/challenge')
      .send({ userId: registeredUserId })
      .expect(200);

    expect(challengeResponse.body).toHaveProperty('challenge');
    expect(challengeResponse.body).toHaveProperty('allowCredentials');
    expect(challengeResponse.body.allowCredentials).toBeInstanceOf(Array);

    const challenge = challengeResponse.body.challenge;

    // Step 2: Simulate WebAuthn assertion (mock response)
    const mockAssertion = {
      id: 'auth-test-credential-id',
      rawId: Buffer.from('auth-test-credential-id').toString('base64url'),
      type: 'public-key',
      response: {
        clientDataJSON: Buffer.from(
          JSON.stringify({
            type: 'webauthn.get',
            challenge: challenge,
            origin: 'http://localhost:3000',
          })
        ).toString('base64url'),
        authenticatorData: Buffer.from('auth-test-authenticator-data').toString(
          'base64url'
        ),
        signature: Buffer.from('auth-test-signature').toString('base64url'),
        userHandle: Buffer.from(registeredUserId).toString('base64url'),
      },
    };

    // Step 3: Verify authentication
    const verifyResponse = await request(app)
      .post('/api/webauthn/auth/verify')
      .send({
        credential: mockAssertion,
        challenge: challenge,
      })
      .expect(200);

    expect(verifyResponse.body).toHaveProperty('success', true);
    expect(verifyResponse.body).toHaveProperty('token');
    expect(verifyResponse.body).toHaveProperty('user');
    expect(verifyResponse.body).toHaveProperty('expiresAt');

    expect(typeof verifyResponse.body.token).toBe('string');
    expect(verifyResponse.body.user).toHaveProperty('id', registeredUserId);
    expect(verifyResponse.body.user).toHaveProperty('username');
    expect(verifyResponse.body.user).toHaveProperty('balance');
  });

  it('should allow authenticated user to access dashboard', async () => {
    // First authenticate
    const challengeResponse = await request(app)
      .post('/api/webauthn/auth/challenge')
      .send({ userId: registeredUserId })
      .expect(200);

    const challenge = challengeResponse.body.challenge;

    const mockAssertion = {
      id: 'auth-test-credential-id',
      rawId: Buffer.from('auth-test-credential-id').toString('base64url'),
      type: 'public-key',
      response: {
        clientDataJSON: Buffer.from(
          JSON.stringify({
            type: 'webauthn.get',
            challenge: challenge,
            origin: 'http://localhost:3000',
          })
        ).toString('base64url'),
        authenticatorData: Buffer.from('dashboard-authenticator-data').toString(
          'base64url'
        ),
        signature: Buffer.from('dashboard-signature').toString('base64url'),
        userHandle: Buffer.from(registeredUserId).toString('base64url'),
      },
    };

    const authResponse = await request(app)
      .post('/api/webauthn/auth/verify')
      .send({
        credential: mockAssertion,
        challenge: challenge,
      })
      .expect(200);

    const token = authResponse.body.token;

    // Now access dashboard with token
    const dashboardResponse = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(dashboardResponse.body).toHaveProperty('user');
    expect(dashboardResponse.body).toHaveProperty('recentTransactions');
    expect(dashboardResponse.body.user.id).toBe(registeredUserId);
  });

  it('should handle authentication failure gracefully', async () => {
    const challengeResponse = await request(app)
      .post('/api/webauthn/auth/challenge')
      .send({ userId: registeredUserId })
      .expect(200);

    const challenge = challengeResponse.body.challenge;

    // Attempt verification with invalid credential
    const verifyResponse = await request(app)
      .post('/api/webauthn/auth/verify')
      .send({
        credential: { invalid: 'assertion' },
        challenge: challenge,
      })
      .expect(401);

    expect(verifyResponse.body).toHaveProperty('success', false);
    expect(verifyResponse.body).toHaveProperty('error');
  });

  it('should reject authentication for non-existent user', async () => {
    const challengeResponse = await request(app)
      .post('/api/webauthn/auth/challenge')
      .send({ userId: 'non-existent-user-id' })
      .expect(404);

    expect(challengeResponse.body).toHaveProperty('error');
  });

  it('should maintain session state for authenticated user', async () => {
    // Authenticate user
    const challengeResponse = await request(app)
      .post('/api/webauthn/auth/challenge')
      .send({ userId: registeredUserId })
      .expect(200);

    const challenge = challengeResponse.body.challenge;

    const mockAssertion = {
      id: 'auth-test-credential-id',
      rawId: Buffer.from('auth-test-credential-id').toString('base64url'),
      type: 'public-key',
      response: {
        clientDataJSON: Buffer.from(
          JSON.stringify({
            type: 'webauthn.get',
            challenge: challenge,
            origin: 'http://localhost:3000',
          })
        ).toString('base64url'),
        authenticatorData: Buffer.from('session-authenticator-data').toString(
          'base64url'
        ),
        signature: Buffer.from('session-signature').toString('base64url'),
        userHandle: Buffer.from(registeredUserId).toString('base64url'),
      },
    };

    const authResponse = await request(app)
      .post('/api/webauthn/auth/verify')
      .send({
        credential: mockAssertion,
        challenge: challenge,
      })
      .expect(200);

    const token = authResponse.body.token;

    // Multiple dashboard requests should work with same token
    await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Audit endpoint should also work
    await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
