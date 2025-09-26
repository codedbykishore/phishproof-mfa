const request = require('supertest');
const express = require('express');

// Create a test Express app since the actual server doesn't exist yet
const app = express();
app.use(express.json());

describe('Dashboard Display Integration Tests', () => {
  let authToken;
  let testUserId;

  beforeAll(async () => {
    // Setup: Register and authenticate a user (this will fail because endpoints don't exist)
    const challengeResponse = await request(app)
      .post('/api/webauthn/register/challenge')
      .send({ username: 'dashboarduser' })
      .expect(200);

    const challenge = challengeResponse.body.challenge;

    const mockCredential = {
      id: 'dashboard-credential-id',
      rawId: Buffer.from('dashboard-credential-id').toString('base64url'),
      type: 'public-key',
      response: {
        clientDataJSON: Buffer.from(
          JSON.stringify({
            type: 'webauthn.create',
            challenge: challenge,
            origin: 'http://localhost:3000',
          })
        ).toString('base64url'),
        attestationObject: Buffer.from('dashboard-attestation-object').toString(
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

    testUserId = verifyResponse.body.userId;

    // Authenticate the user
    const authChallengeResponse = await request(app)
      .post('/api/webauthn/auth/challenge')
      .send({ userId: testUserId })
      .expect(200);

    const authChallenge = authChallengeResponse.body.challenge;

    const mockAssertion = {
      id: 'dashboard-credential-id',
      rawId: Buffer.from('dashboard-credential-id').toString('base64url'),
      type: 'public-key',
      response: {
        clientDataJSON: Buffer.from(
          JSON.stringify({
            type: 'webauthn.get',
            challenge: authChallenge,
            origin: 'http://localhost:3000',
          })
        ).toString('base64url'),
        authenticatorData: Buffer.from('dashboard-auth-data').toString(
          'base64url'
        ),
        signature: Buffer.from('dashboard-auth-signature').toString(
          'base64url'
        ),
        userHandle: Buffer.from(testUserId).toString('base64url'),
      },
    };

    const authResponse = await request(app)
      .post('/api/webauthn/auth/verify')
      .send({
        credential: mockAssertion,
        challenge: authChallenge,
      })
      .expect(200);

    authToken = authResponse.body.token;
  });

  it('should display user dashboard with correct information', async () => {
    const response = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('user');
    expect(response.body).toHaveProperty('recentTransactions');

    expect(response.body.user).toHaveProperty('id', testUserId);
    expect(response.body.user).toHaveProperty('username', 'dashboarduser');
    expect(response.body.user).toHaveProperty('balance');
    expect(response.body.user).toHaveProperty('lastLogin');
    expect(typeof response.body.user.balance).toBe('number');
    expect(response.body.user.balance).toBeGreaterThanOrEqual(0);

    expect(Array.isArray(response.body.recentTransactions)).toBe(true);
  });

  it('should show recent transactions in correct order', async () => {
    // First create some transactions
    await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        amount: 100.0,
        description: 'First transaction',
      })
      .expect(200);

    await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        amount: 200.0,
        description: 'Second transaction',
      })
      .expect(200);

    // Check dashboard shows transactions
    const response = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.recentTransactions.length).toBeGreaterThanOrEqual(2);

    // Transactions should be ordered by timestamp (most recent first)
    if (response.body.recentTransactions.length >= 2) {
      const firstTransaction = response.body.recentTransactions[0];
      const secondTransaction = response.body.recentTransactions[1];

      expect(new Date(firstTransaction.timestamp)).toBeGreaterThanOrEqual(
        new Date(secondTransaction.timestamp)
      );

      expect(firstTransaction).toHaveProperty('id');
      expect(firstTransaction).toHaveProperty('type', 'debit');
      expect(firstTransaction).toHaveProperty('amount');
      expect(firstTransaction).toHaveProperty('description');
      expect(firstTransaction).toHaveProperty('timestamp');
      expect(firstTransaction).toHaveProperty('balanceAfter');
    }
  });

  it('should update balance correctly after transactions', async () => {
    const initialResponse = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const initialBalance = initialResponse.body.user.balance;

    // Make a transfer
    const transferResponse = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        amount: 50.0,
        description: 'Balance test transaction',
      })
      .expect(200);

    const expectedBalance = initialBalance - 50.0;
    expect(transferResponse.body.newBalance).toBe(expectedBalance);

    // Check dashboard reflects new balance
    const updatedResponse = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(updatedResponse.body.user.balance).toBe(expectedBalance);
  });

  it('should handle empty transaction history', async () => {
    // Create a new user for this test
    const challengeResponse = await request(app)
      .post('/api/webauthn/register/challenge')
      .send({ username: 'emptyuser' })
      .expect(200);

    const challenge = challengeResponse.body.challenge;

    const mockCredential = {
      id: 'empty-credential-id',
      rawId: Buffer.from('empty-credential-id').toString('base64url'),
      type: 'public-key',
      response: {
        clientDataJSON: Buffer.from(
          JSON.stringify({
            type: 'webauthn.create',
            challenge: challenge,
            origin: 'http://localhost:3000',
          })
        ).toString('base64url'),
        attestationObject: Buffer.from('empty-attestation-object').toString(
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

    const emptyUserId = verifyResponse.body.userId;

    // Authenticate the new user
    const authChallengeResponse = await request(app)
      .post('/api/webauthn/auth/challenge')
      .send({ userId: emptyUserId })
      .expect(200);

    const authChallenge = authChallengeResponse.body.challenge;

    const mockAssertion = {
      id: 'empty-credential-id',
      rawId: Buffer.from('empty-credential-id').toString('base64url'),
      type: 'public-key',
      response: {
        clientDataJSON: Buffer.from(
          JSON.stringify({
            type: 'webauthn.get',
            challenge: authChallenge,
            origin: 'http://localhost:3000',
          })
        ).toString('base64url'),
        authenticatorData: Buffer.from('empty-auth-data').toString('base64url'),
        signature: Buffer.from('empty-auth-signature').toString('base64url'),
        userHandle: Buffer.from(emptyUserId).toString('base64url'),
      },
    };

    const authResponse = await request(app)
      .post('/api/webauthn/auth/verify')
      .send({
        credential: mockAssertion,
        challenge: authChallenge,
      })
      .expect(200);

    const emptyUserToken = authResponse.body.token;

    // Check dashboard for user with no transactions
    const response = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${emptyUserToken}`)
      .expect(200);

    expect(response.body.recentTransactions).toEqual([]);
    expect(response.body.user.balance).toBe(5000.0); // Default balance
  });
});
