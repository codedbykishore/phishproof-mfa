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
  updateUserBalance,
  createAuditEvent,
  getUserAuditEvents,
  updateUserLastLogin,
  hashPassword,
  verifyPassword,
} from './database.js';
import { generateToken, authenticateToken } from './auth.js';

const router = express.Router();

console.log('Routes module loaded');

// WebAuthn Registration Challenge Endpoint
// POST /api/webauthn/register/challenge
router.post('/webauthn/register/challenge', async (req, res) => {
  try {
    console.log('Registration challenge endpoint called');
    const { username, password } = req.body;

    // Validate input
    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      console.log('Invalid username:', username);
      return res.status(400).json({
        success: false,
        error: 'Valid username is required',
      });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long',
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
    const challengeResult = await generateRegistrationChallenge(username.trim(), password);

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

    // Hash the password
    const passwordHashResult = await hashPassword(verificationResult.password);
    if (!passwordHashResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to process password',
      });
    }

    // Create the user account
    const userResult = createUser(
      verificationResult.userID,
      verificationResult.username,
      passwordHashResult.hash,
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
      message: 'Registration successful. Please log in.',
      redirectTo: 'login',
    });
  } catch (error) {
    console.error('Registration verify error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Password Login Endpoint
// POST /api/auth/login
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid username is required',
      });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Password is required',
      });
    }

    // Find user by username
    const userResult = findUserByUsername(username.trim());
    if (!userResult.success) {
      // Log failed login attempt
      createAuditEvent(null, 'login_failure', {
        username: username.trim(),
        reason: 'user_not_found',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      });
    }

    const user = userResult.user;

    // Verify password
    const passwordResult = await verifyPassword(password, user.password_hash);
    if (!passwordResult.success || !passwordResult.isValid) {
      // Log failed login attempt
      createAuditEvent(user.id, 'login_failure', {
        username: username.trim(),
        reason: 'invalid_password',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      });
    }

    // Password verified, now generate WebAuthn challenge
    const challengeResult = await generateAuthenticationChallenge(user.id);

    if (!challengeResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate authentication challenge',
      });
    }

    // Log password verification success
    createAuditEvent(user.id, 'password_verified', {
      username: username.trim(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      success: true,
      userId: user.id,
      username: user.username,
      requiresWebAuthn: true,
      ...challengeResult.options,
    });
  } catch (error) {
    console.error('Password login error:', error);
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
    const { userId, username } = req.body;

    // Validate input - accept either userId or username
    if ((!userId && !username) || (userId && username)) {
      return res.status(400).json({
        success: false,
        error: 'Either userId or username is required (not both)',
      });
    }

    let targetUserId = userId;
    let userLookup;

    // If username provided, look up the user
    if (username) {
      if (typeof username !== 'string' || username.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Valid username is required',
        });
      }

      userLookup = findUserByUsername(username.trim());
      if (!userLookup.success) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }
      targetUserId = userLookup.user.id;
    } else {
      // If userId provided directly
      if (typeof userId !== 'string' || userId.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Valid userId is required',
        });
      }

      userLookup = findUserById(userId.trim());
      if (!userLookup.success) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }
      targetUserId = userId.trim();
    }

    // Generate authentication challenge
    const challengeResult = await generateAuthenticationChallenge(targetUserId);

    if (!challengeResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate authentication challenge',
      });
    }

    // Log audit event
    createAuditEvent(targetUserId, 'authentication_challenge', {
      username: userLookup.user.username,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      success: true,
      userId: targetUserId,
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
    console.log('WebAuthn auth verify endpoint called');
    const { credential, challenge } = req.body;
    
    console.log('Received credential:', JSON.stringify(credential, null, 2));
    console.log('Received challenge:', challenge);

    // Validate input
    if (!credential || typeof credential !== 'object') {
      console.log('Invalid credential object');
      return res.status(400).json({
        success: false,
        error: 'Valid credential object is required',
      });
    }

    if (!challenge || typeof challenge !== 'string') {
      console.log('Invalid challenge');
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
    const tokenUserResult = findUserById(verificationResult.userId);
    if (!tokenUserResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve user details',
      });
    }

    const tokenResult = generateToken(verificationResult.userId, tokenUserResult.user.username);

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

    // Log successful login (both password and WebAuthn verified)
    createAuditEvent(verificationResult.userId, 'login_success', {
      username: userResult.user.username,
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
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
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
      success: true,
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

    // Calculate new balance
    const newBalance = balanceResult.balance - amount;

    // Create the transaction
    const transactionResult = createTransaction(userId, 'debit', amount, description.trim(), newBalance);
    if (!transactionResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create transaction',
      });
    }

    // Update user's balance in the database
    const updateBalanceResult = updateUserBalance(userId, newBalance);
    if (!updateBalanceResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update balance',
      });
    }

    // Get the created transaction details
    const transactionDetails = {
      id: transactionResult.transactionId,
      user_id: userId,
      type: 'debit',
      amount: amount,
      description: description.trim(),
      timestamp: new Date().toISOString(),
      balance_after: newBalance,
    };

    // Log audit event
    createAuditEvent(userId, 'transfer', {
      amount: amount,
      description: description.trim(),
      transactionId: transactionResult.transactionId,
      balanceBefore: balanceResult.balance,
      balanceAfter: newBalance,
    });

    res.json({
      success: true,
      transaction: transactionDetails,
      newBalance: newBalance,
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
      success: true,
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