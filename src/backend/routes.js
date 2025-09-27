import express from 'express';
import {
  generateRegistrationChallenge,
  verifyRegistrationCredential,
  generateAuthenticationChallenge,
  verifyAuthenticationCredential,
} from './webauthn.js';
import {
  createUser,
  findUserById,
  findUserByUsername,
  createTransaction,
  getUserTransactions,
  getUserBalance,
  createAuditEvent,
  getUserAuditEvents,
  updateUserLastLogin,
} from './database.js';
import { generateToken, authenticateToken } from './auth.js';

const router = express.Router();

console.log('Routes module loaded');

// WebAuthn Registration Challenge Endpoint
// POST /api/webauthn/register/challenge
router.post('/webauthn/register/challenge', async (req, res) => {
  try {
    console.log('Registration challenge endpoint called');
    const { username } = req.body;

    // Validate input
    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      console.log('Invalid username:', username);
      return res.status(400).json({
        success: false,
        error: 'Valid username is required',
      });
    }

    // Check if user already exists
    const existingUser = findUserByUsername(username.trim());
    if (existingUser.success) {
      console.log('User already exists:', username);
      return res.status(409).json({
        success: false,
        error: 'Username already exists',
      });
    }

    console.log('Generating registration challenge for:', username.trim());
    // Generate registration challenge
    const challengeResult = await generateRegistrationChallenge(username.trim());

    if (!challengeResult.success) {
      console.log('Challenge generation failed:', challengeResult.error);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate registration challenge',
      });
    }

    // Log audit event
    createAuditEvent(null, 'registration_challenge', {
      username: username.trim(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      success: true,
      ...challengeResult.options,
    });
  } catch (error) {
    console.error('Registration challenge error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// WebAuthn Registration Verify Endpoint
// POST /api/webauthn/register/verify
router.post('/webauthn/register/verify', async (req, res) => {
  try {
    const { credential, challenge } = req.body;

    // Validate input
    if (!credential || typeof credential !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Valid credential object is required',
      });
    }

    if (!challenge || typeof challenge !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Challenge is required',
      });
    }

    // Verify the registration credential
    const verificationResult = await verifyRegistrationCredential(credential, challenge);

    if (!verificationResult.success) {
      // Log failed registration attempt
      createAuditEvent(null, 'registration_failed', {
        error: verificationResult.error,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      return res.status(400).json({
        success: false,
        error: verificationResult.error || 'Registration verification failed',
      });
    }

    // Create the user account
    const userResult = createUser(
      verificationResult.userID,
      verificationResult.username,
      verificationResult.credentialId,
      verificationResult.credentialPublicKey
    );

    if (!userResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create user account',
      });
    }

    // Log successful registration
    createAuditEvent(verificationResult.userID, 'registration', {
      username: verificationResult.username,
      credentialId: verificationResult.credentialId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      success: true,
      userId: verificationResult.userID,
      message: 'Registration successful',
    });
  } catch (error) {
    console.error('Registration verify error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// WebAuthn Authentication Challenge Endpoint
// POST /api/webauthn/auth/challenge
router.post('/webauthn/auth/challenge', async (req, res) => {
  try {
    const { userId } = req.body;

    // Validate input
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid userId is required',
      });
    }

    // Find the user
    const userResult = findUserById(userId.trim());
    if (!userResult.success) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Generate authentication challenge
    const challengeResult = await generateAuthenticationChallenge(userId.trim());

    if (!challengeResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate authentication challenge',
      });
    }

    // Log audit event
    createAuditEvent(userId.trim(), 'authentication_challenge', {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      success: true,
      ...challengeResult.options,
    });
  } catch (error) {
    console.error('Authentication challenge error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// WebAuthn Authentication Verify Endpoint
// POST /api/webauthn/auth/verify
router.post('/webauthn/auth/verify', async (req, res) => {
  try {
    const { credential, challenge } = req.body;

    // Validate input
    if (!credential || typeof credential !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Valid credential object is required',
      });
    }

    if (!challenge || typeof challenge !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Challenge is required',
      });
    }

    // Verify the authentication credential
    const verificationResult = await verifyAuthenticationCredential(credential, challenge);

    if (!verificationResult.success) {
      // Log failed authentication attempt
      createAuditEvent(null, 'authentication_failed', {
        error: verificationResult.error,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      return res.status(401).json({
        success: false,
        error: verificationResult.error || 'Authentication verification failed',
      });
    }

    // Update user's last login
    updateUserLastLogin(verificationResult.userId);

    // Generate JWT token
    const tokenResult = generateToken(verificationResult.userId);

    if (!tokenResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate authentication token',
      });
    }

    // Get user details for response
    const userResult = findUserById(verificationResult.userId);
    if (!userResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve user details',
      });
    }

    // Log successful authentication
    createAuditEvent(verificationResult.userId, 'authentication_success', {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      success: true,
      token: tokenResult.token,
      user: {
        id: userResult.user.id,
        username: userResult.user.username,
        balance: userResult.user.balance,
      },
      expiresAt: tokenResult.expiresAt,
    });
  } catch (error) {
    console.error('Authentication verify error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Dashboard Endpoint
// GET /api/dashboard
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user details
    const userResult = findUserById(userId);
    if (!userResult.success) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Get recent transactions (last 10)
    const transactionsResult = getUserTransactions(userId, 10);
    if (!transactionsResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve transactions',
      });
    }

    res.json({
      user: {
        id: userResult.user.id,
        username: userResult.user.username,
        balance: userResult.user.balance,
        lastLogin: userResult.user.lastLogin,
      },
      recentTransactions: transactionsResult.transactions,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Transfer Endpoint
// POST /api/transfers
router.post('/transfers', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, description } = req.body;

    // Validate input
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount (positive number) is required',
      });
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Description is required',
      });
    }

    // Get current user balance
    const balanceResult = getUserBalance(userId);
    if (!balanceResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to check balance',
      });
    }

    // Check sufficient balance
    if (balanceResult.balance < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
      });
    }

    // Create the transaction
    const transactionResult = createTransaction(userId, 'debit', amount, description.trim());
    if (!transactionResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create transaction',
      });
    }

    // Get updated balance
    const newBalanceResult = getUserBalance(userId);
    if (!newBalanceResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get updated balance',
      });
    }

    // Log audit event
    createAuditEvent(userId, 'transfer', {
      amount: amount,
      description: description.trim(),
      transactionId: transactionResult.transaction.id,
      balanceBefore: balanceResult.balance,
      balanceAfter: newBalanceResult.balance,
    });

    res.json({
      success: true,
      transaction: transactionResult.transaction,
      newBalance: newBalanceResult.balance,
    });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Audit Endpoint
// GET /api/audit
router.get('/audit', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be a number between 1 and 100',
      });
    }

    // Get user audit events
    const auditResult = getUserAuditEvents(userId, limit);
    if (!auditResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve audit events',
      });
    }

    res.json({
      events: auditResult.events,
    });
  } catch (error) {
    console.error('Audit error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;