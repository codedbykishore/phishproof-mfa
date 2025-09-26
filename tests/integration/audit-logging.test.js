const request = require('supertest');
const express = require('express');

// Create a test Express app since the actual server doesn't exist yet
const app = express();
app.use(express.json());

describe('Audit Logging Integration Tests', () => {
  let authToken;
  let testUserId;

  beforeAll(async () => {
    // Setup: Register and authenticate a user (this will fail because endpoints don't exist)
    const challengeResponse = await request(app)
      .post('/api/webauthn/register/challenge')
      .send({ username: 'audituser' })
      .expect(200);

    const challenge = challengeResponse.body.challenge;

    const mockCredential = {
      id: 'audit-credential-id',
      rawId: Buffer.from('audit-credential-id').toString('base64url'),
      type: 'public-key',
      response: {
        clientDataJSON: Buffer.from(
          JSON.stringify({
            type: 'webauthn.create',
            challenge: challenge,
            origin: 'http://localhost:3000',
          })
        ).toString('base64url'),
        attestationObject: Buffer.from('audit-attestation-object').toString(
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
      id: 'audit-credential-id',
      rawId: Buffer.from('audit-credential-id').toString('base64url'),
      type: 'public-key',
      response: {
        clientDataJSON: Buffer.from(
          JSON.stringify({
            type: 'webauthn.get',
            challenge: authChallenge,
            origin: 'http://localhost:3000',
          })
        ).toString('base64url'),
        authenticatorData: Buffer.from('audit-auth-data').toString('base64url'),
        signature: Buffer.from('audit-auth-signature').toString('base64url'),
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

  it('should log registration events', async () => {
    // Registration was already done in beforeAll, check audit log
    const auditResponse = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(auditResponse.body).toHaveProperty('events');
    expect(Array.isArray(auditResponse.body.events)).toBe(true);

    const registrationEvent = auditResponse.body.events.find(
      (event) => event.eventType === 'registration'
    );

    expect(registrationEvent).toBeDefined();
    expect(registrationEvent).toHaveProperty('timestamp');
    expect(registrationEvent).toHaveProperty('details');
    expect(new Date(registrationEvent.timestamp)).toBeInstanceOf(Date);
  });

  it('should log successful login events', async () => {
    // The authentication in beforeAll should have created a login event
    const auditResponse = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const loginEvent = auditResponse.body.events.find(
      (event) => event.eventType === 'login_success'
    );

    expect(loginEvent).toBeDefined();
    expect(loginEvent).toHaveProperty('timestamp');
    expect(loginEvent).toHaveProperty('details');
  });

  it('should log transfer events', async () => {
    // Make a transfer
    await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        amount: 100.0,
        description: 'Audit test transfer',
      })
      .expect(200);

    // Check audit log contains transfer event
    const auditResponse = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const transferEvent = auditResponse.body.events.find(
      (event) => event.eventType === 'transfer'
    );

    expect(transferEvent).toBeDefined();
    expect(transferEvent).toHaveProperty('timestamp');
    expect(transferEvent).toHaveProperty('details');
    expect(transferEvent.details).toHaveProperty('amount', 100.0);
    expect(transferEvent.details).toHaveProperty(
      'description',
      'Audit test transfer'
    );
  });

  it('should log failed authentication attempts', async () => {
    // Attempt authentication with wrong challenge
    await request(app)
      .post('/api/webauthn/auth/verify')
      .send({
        credential: { invalid: 'credential' },
        challenge: 'wrong-challenge',
      })
      .expect(401);

    // Check audit log contains failure event
    const auditResponse = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const failureEvent = auditResponse.body.events.find(
      (event) => event.eventType === 'login_failure'
    );

    expect(failureEvent).toBeDefined();
    expect(failureEvent).toHaveProperty('timestamp');
    expect(failureEvent).toHaveProperty('details');
  });

  it('should maintain chronological order of events', async () => {
    // Make multiple actions to generate events
    await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        amount: 50.0,
        description: 'First audit transfer',
      })
      .expect(200);

    await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay

    await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        amount: 75.0,
        description: 'Second audit transfer',
      })
      .expect(200);

    // Check audit log order
    const auditResponse = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const transferEvents = auditResponse.body.events.filter(
      (event) => event.eventType === 'transfer'
    );

    expect(transferEvents.length).toBeGreaterThanOrEqual(2);

    // Events should be in chronological order (most recent first)
    for (let i = 0; i < transferEvents.length - 1; i++) {
      const currentEvent = transferEvents[i];
      const nextEvent = transferEvents[i + 1];

      expect(new Date(currentEvent.timestamp)).toBeGreaterThanOrEqual(
        new Date(nextEvent.timestamp)
      );
    }
  });

  it('should support audit log pagination with limit parameter', async () => {
    // Generate multiple events
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 10.0,
          description: `Pagination test transfer ${i + 1}`,
        })
        .expect(200);
    }

    // Test limit parameter
    const limitedResponse = await request(app)
      .get('/api/audit?limit=3')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(limitedResponse.body.events.length).toBeLessThanOrEqual(3);

    // Test default limit
    const defaultResponse = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(defaultResponse.body.events.length).toBeLessThanOrEqual(50); // Default limit
  });

  it('should not expose sensitive information in audit logs', async () => {
    const auditResponse = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    auditResponse.body.events.forEach((event) => {
      // Ensure no sensitive data like passwords, tokens, or private keys
      expect(event.details).not.toHaveProperty('password');
      expect(event.details).not.toHaveProperty('token');
      expect(event.details).not.toHaveProperty('privateKey');
      expect(event.details).not.toHaveProperty('secret');

      // Event details should be sanitized
      if (typeof event.details === 'object') {
        Object.keys(event.details).forEach((key) => {
          const value = event.details[key];
          if (typeof value === 'string') {
            // Should not contain long random strings that might be secrets
            expect(value.length).toBeLessThan(1000);
          }
        });
      }
    });
  });

  it('should handle audit log access for different users separately', async () => {
    // Create another user
    const challengeResponse = await request(app)
      .post('/api/webauthn/register/challenge')
      .send({ username: 'audituser2' })
      .expect(200);

    const challenge = challengeResponse.body.challenge;

    const mockCredential = {
      id: 'audit-credential-id-2',
      rawId: Buffer.from('audit-credential-id-2').toString('base64url'),
      type: 'public-key',
      response: {
        clientDataJSON: Buffer.from(
          JSON.stringify({
            type: 'webauthn.create',
            challenge: challenge,
            origin: 'http://localhost:3000',
          })
        ).toString('base64url'),
        attestationObject: Buffer.from('audit-attestation-object-2').toString(
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

    const secondUserId = verifyResponse.body.userId;

    // Authenticate second user
    const authChallengeResponse = await request(app)
      .post('/api/webauthn/auth/challenge')
      .send({ userId: secondUserId })
      .expect(200);

    const authChallenge = authChallengeResponse.body.challenge;

    const mockAssertion = {
      id: 'audit-credential-id-2',
      rawId: Buffer.from('audit-credential-id-2').toString('base64url'),
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
          Buffer.from('audit-auth-data-2').toString('base64url'),
        signature: Buffer.from('audit-auth-signature-2').toString('base64url'),
        userHandle: Buffer.from(secondUserId).toString('base64url'),
      },
    };

    const authResponse = await request(app)
      .post('/api/webauthn/auth/verify')
      .send({
        credential: mockAssertion,
        challenge: authChallenge,
      })
      .expect(200);

    const secondUserToken = authResponse.body.token;

    // Each user should only see their own audit events
    const firstUserAudit = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const secondUserAudit = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${secondUserToken}`)
      .expect(200);

    // Events should be different (each user sees only their events)
    expect(firstUserAudit.body.events.length).not.toBe(
      secondUserAudit.body.events.length
    );
  });
});
