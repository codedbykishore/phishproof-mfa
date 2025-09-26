const express = require('express');
const {
  generateRegistrationChallenge,
  verifyRegistrationCredential,
  generateAuthenticationChallenge,
  verifyAuthenticationCredential,
} = require('./webauthn.js');
const {
  createUser,
  findUserById,
  findUserByUsername,
  createTransaction,
  getUserTransactions,
  getUserBalance,
  createAuditEvent,
  getUserAuditEvents,
  updateUserLastLogin,
} = require('./database.js');
const { generateToken, authenticateToken } = require('./auth.js');

const router = express.Router();

// WebAuthn Registration Challenge Endpoint
// POST /api/webauthn/register/challenge
router.post('/webauthn/register/challenge', async (req, res) => {
  try {
    const { username } = req.body;

    // Validate input
    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Username is required and must be a non-empty string',
      });
    }

    // Check if user already exists
    const existingUser = findUserByUsername(username.trim());
    if (existingUser.success) {
      return res.status(409).json({
        success: false,
        error: 'Username already exists',
      });
    }

    // Generate registration challenge
    const challengeResult = generateRegistrationChallenge(username.trim());

    if (!challengeResult.success) {
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
    const verificationResult = verifyRegistrationCredential(credential, challenge);

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
    const userResult = createUser(verificationResult.username, verificationResult.credentialId);

    if (!userResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create user account',
      });
    }

    // Log successful registration
    createAuditEvent(userResult.user.id, 'registration_success', {
      username: verificationResult.username,
      credentialId: verificationResult.credentialId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      success: true,
      userId: userResult.user.id,
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
    const challengeResult = generateAuthenticationChallenge(userId.trim());

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
    const verificationResult = verifyAuthenticationCredential(credential, challenge);

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

module.exports = router;