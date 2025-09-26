import jwt from 'jsonwebtoken';
import { findUserById } from './database.js';

// JWT configuration
const JWT_CONFIG = {
  secret:
    process.env.JWT_SECRET || 'phishproof-mfa-secret-key-change-in-production',
  expiresIn: '30m', // 30 minutes
  issuer: 'phishproof-mfa',
  audience: 'phishproof-mfa-users',
};

// Generate JWT token for authenticated user
function generateToken(userId, username) {
  try {
    const payload = {
      userId,
      username,
      iat: Math.floor(Date.now() / 1000),
      iss: JWT_CONFIG.issuer,
      aud: JWT_CONFIG.audience,
    };

    const token = jwt.sign(payload, JWT_CONFIG.secret, {
      expiresIn: JWT_CONFIG.expiresIn,
    });

    return { success: true, token };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Verify JWT token and extract user information
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_CONFIG.secret, {
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
    });

    return { success: true, payload: decoded };
  } catch (error) {
    let errorMessage = 'Invalid token';
    if (error.name === 'TokenExpiredError') {
      errorMessage = 'Token expired';
    } else if (error.name === 'JsonWebTokenError') {
      errorMessage = 'Invalid token format';
    }

    return { success: false, error: errorMessage };
  }
}

// Authentication middleware for Express routes
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required',
    });
  }

  const verification = verifyToken(token);
  if (!verification.success) {
    return res.status(401).json({
      success: false,
      error: verification.error,
    });
  }

  // Check if user still exists in database
  const userResult = findUserById(verification.payload.userId);
  if (!userResult.success) {
    return res.status(401).json({
      success: false,
      error: 'User not found',
    });
  }

  // Attach user info to request
  req.user = {
    id: verification.payload.userId,
    username: verification.payload.username,
    fullUser: userResult.user,
  };

  next();
}

// Optional authentication middleware (doesn't fail if no token)
function optionalAuthenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    const verification = verifyToken(token);
    if (verification.success) {
      const userResult = findUserById(verification.payload.userId);
      if (userResult.success) {
        req.user = {
          id: verification.payload.userId,
          username: verification.payload.username,
          fullUser: userResult.user,
        };
      }
    }
  }

  next();
}

// Refresh token (extend session)
function refreshToken(token) {
  try {
    // Verify existing token
    const verification = verifyToken(token);
    if (!verification.success) {
      return verification; // Return the error
    }

    // Generate new token with fresh expiration
    const payload = verification.payload;
    const newToken = jwt.sign(
      {
        userId: payload.userId,
        username: payload.username,
        iat: Math.floor(Date.now() / 1000),
        iss: JWT_CONFIG.issuer,
        aud: JWT_CONFIG.audience,
      },
      JWT_CONFIG.secret,
      {
        expiresIn: JWT_CONFIG.expiresIn,
      }
    );

    return { success: true, token: newToken };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get token expiration time
function getTokenExpiration(token) {
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
      return { success: true, expiration: new Date(decoded.exp * 1000) };
    }
    return { success: false, error: 'Invalid token' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Check if token is close to expiration (within 5 minutes)
function isTokenNearExpiration(token) {
  const expiration = getTokenExpiration(token);
  if (!expiration.success) {
    return false;
  }

  const now = new Date();
  const timeUntilExpiration = expiration.expiration - now;
  const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds

  return timeUntilExpiration <= fiveMinutes;
}

export {
  generateToken,
  verifyToken,
  authenticateToken,
  optionalAuthenticateToken,
  refreshToken,
  getTokenExpiration,
  isTokenNearExpiration,
  JWT_CONFIG,
};
