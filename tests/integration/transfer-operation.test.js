const request = require('supertest');
const express = require('express');

// Create a test Express app since the actual server doesn't exist yet
const app = express();
app.use(express.json());

describe('Transfer Operations Integration Tests', () => {
  let authToken;
  let testUserId;

  beforeAll(async () => {
    // Setup: Register and authenticate a user (this will fail because endpoints don't exist)
    const challengeResponse = await request(app)
      .post('/api/webauthn/register/challenge')
      .send({ username: 'transferuser' })
      .expect(200);

    const challenge = challengeResponse.body.challenge;

    const mockCredential = {
      id: 'transfer-credential-id',
      rawId: Buffer.from('transfer-credential-id').toString('base64url'),
      type: 'public-key',
      response: {
        clientDataJSON: Buffer.from(
          JSON.stringify({
            type: 'webauthn.create',
            challenge: challenge,
            origin: 'http://localhost:3000',
          })
        ).toString('base64url'),
        attestationObject: Buffer.from('transfer-attestation-object').toString(
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
      id: 'transfer-credential-id',
      rawId: Buffer.from('transfer-credential-id').toString('base64url'),
      type: 'public-key',
      response: {
        clientDataJSON: Buffer.from(
          JSON.stringify({
            type: 'webauthn.get',
            challenge: authChallenge,
            origin: 'http://localhost:3000',
          })
        ).toString('base64url'),
        authenticatorData:
          Buffer.from('transfer-auth-data').toString('base64url'),
        signature: Buffer.from('transfer-auth-signature').toString('base64url'),
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

  it('should successfully create a transfer with sufficient balance', async () => {
    const transferData = {
      amount: 500.0,
      description: 'Test transfer',
    };

    const response = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${authToken}`)
      .send(transferData)
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('transaction');
    expect(response.body).toHaveProperty('newBalance');

    expect(response.body.transaction).toHaveProperty('id');
    expect(response.body.transaction).toHaveProperty('type', 'debit');
    expect(response.body.transaction).toHaveProperty('amount', 500.0);
    expect(response.body.transaction).toHaveProperty(
      'description',
      'Test transfer'
    );
    expect(response.body.transaction).toHaveProperty('timestamp');
    expect(response.body.transaction).toHaveProperty('balanceAfter');

    expect(typeof response.body.newBalance).toBe('number');
    expect(response.body.newBalance).toBeLessThan(5000.0); // Initial balance minus transfer
  });

  it('should reject transfer with insufficient balance', async () => {
    const transferData = {
      amount: 10000.0, // More than available balance
      description: 'Oversized transfer',
    };

    const response = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${authToken}`)
      .send(transferData)
      .expect(400);

    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toMatch(/balance|insufficient/i);
  });

  it('should reject transfer with invalid amount', async () => {
    const testCases = [
      { amount: 0, description: 'Zero amount' },
      { amount: -100, description: 'Negative amount' },
      { amount: 0.001, description: 'Too small amount' },
    ];

    for (const testCase of testCases) {
      const response = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testCase)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    }
  });

  it('should reject transfer without required fields', async () => {
    const testCases = [
      { amount: 100.0 }, // Missing description
      { description: 'Test' }, // Missing amount
      {}, // Missing both
    ];

    for (const testCase of testCases) {
      const response = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testCase)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    }
  });

  it('should update balance correctly across multiple transfers', async () => {
    // Get initial balance
    const initialResponse = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const initialBalance = initialResponse.body.user.balance;

    // Make multiple transfers
    const transfers = [
      { amount: 100.0, description: 'First transfer' },
      { amount: 200.0, description: 'Second transfer' },
      { amount: 50.0, description: 'Third transfer' },
    ];

    let expectedBalance = initialBalance;

    for (const transfer of transfers) {
      const response = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transfer)
        .expect(200);

      expectedBalance -= transfer.amount;
      expect(response.body.newBalance).toBe(expectedBalance);
    }

    // Verify final balance
    const finalResponse = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(finalResponse.body.user.balance).toBe(expectedBalance);
  });

  it('should record transfers in transaction history', async () => {
    const transferData = {
      amount: 150.0,
      description: 'History test transfer',
    };

    const transferResponse = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${authToken}`)
      .send(transferData)
      .expect(200);

    const transactionId = transferResponse.body.transaction.id;

    // Check that transaction appears in dashboard
    const dashboardResponse = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const transaction = dashboardResponse.body.recentTransactions.find(
      (t) => t.id === transactionId
    );

    expect(transaction).toBeDefined();
    expect(transaction.type).toBe('debit');
    expect(transaction.amount).toBe(150.0);
    expect(transaction.description).toBe('History test transfer');
    expect(transaction.balanceAfter).toBe(transferResponse.body.newBalance);
  });

  it('should handle concurrent transfers safely', async () => {
    // This test would verify that concurrent transfers don't cause race conditions
    // For now, it will fail because the endpoints don't exist yet
    const transferData = {
      amount: 25.0,
      description: 'Concurrent transfer test',
    };

    // Make multiple concurrent transfers
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        request(app)
          .post('/api/transfers')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            amount: transferData.amount,
            description: `${transferData.description} ${i + 1}`,
          })
      );
    }

    const responses = await Promise.all(promises);

    // All should succeed
    responses.forEach((response) => {
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    // Check final balance is correct
    const dashboardResponse = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // Should have 5 transactions of 25 each = 125 total deduction
    expect(
      dashboardResponse.body.recentTransactions.length
    ).toBeGreaterThanOrEqual(5);
  });
});
