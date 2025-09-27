import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { randomBytes, randomUUID } from 'crypto';

// WebAuthn configuration
const WEBAUTHN_CONFIG = {
  rpName: 'PhishProof MFA Banking',
  rpID: process.env.NODE_ENV === 'production' ? 'your-domain.com' : 'localhost',
  origin:
    process.env.NODE_ENV === 'production'
      ? 'https://your-domain.com'
      : 'http://localhost:3000',
  expectedOrigin:
    process.env.NODE_ENV === 'production'
      ? 'https://your-domain.com'
      : 'http://localhost:3000',
};

// Helper function to convert buffer to base64url
function bufferToBase64URLString(buffer) {
  return Buffer.from(buffer).toString('base64url');
}

// In-memory storage for challenges (in production, use Redis or database)
const challenges = new Map();

// Generate registration challenge for new user
async function generateRegistrationChallenge(username) {
  try {
    console.log('Generating registration challenge for username:', username);
    console.log('WEBAUTHN_CONFIG:', WEBAUTHN_CONFIG);

    // Generate a unique user ID
    const userId = randomBytes(16);

    console.log('About to call generateRegistrationOptions');
    const options = await generateRegistrationOptions({
      rpName: WEBAUTHN_CONFIG.rpName,
      rpID: WEBAUTHN_CONFIG.rpID,
      userID: userId,
      userName: username,
      userDisplayName: username,
      authenticatorSelection: {
        userVerification: 'required',
        residentKey: 'required',
      },
    });
    console.log('generateRegistrationOptions completed');

    console.log('Generated options successfully:', options.challenge);

    // Store challenge for verification
    challenges.set(options.challenge, {
      type: 'registration',
      userID: options.user.id,
      username,
      timestamp: Date.now(),
    });

    // Clean up old challenges (older than 5 minutes)
    // cleanupOldChallenges();

    return {
      success: true,
      challenge: options.challenge,
      options: options,
    };
  } catch (error) {
    console.error('Error in generateRegistrationChallenge:', error);
    return { success: false, error: error.message };
  }
}

// Verify registration response
async function verifyRegistrationCredential(credential, challenge) {
  try {
    console.log('Verifying registration for challenge:', challenge);
    
    // Get stored challenge data
    const challengeData = challenges.get(challenge);
    console.log('Challenge data found:', !!challengeData);
    if (challengeData) {
      console.log('Challenge data:', challengeData);
    }
    
    if (!challengeData || challengeData.type !== 'registration') {
      console.log('Invalid challenge');
      return { success: false, error: 'Invalid or expired challenge' };
    }

    // Verify the credential
    console.log('Calling verifyRegistrationResponse');
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: WEBAUTHN_CONFIG.expectedOrigin,
      expectedRPID: WEBAUTHN_CONFIG.rpID,
      requireUserVerification: true,
    });
    console.log('Verification result:', verification);

    if (!verification.verified) {
      console.log('Verification failed');
      return { success: false, error: 'Credential verification failed' };
    }

    // Check if registrationInfo exists
    if (!verification.registrationInfo) {
      console.log('Registration info missing');
      return { success: false, error: 'Registration info missing' };
    }

    // Remove used challenge
    challenges.delete(challenge);

    console.log('Returning success');
    // Convert public key to base64url
    const publicKeyBuffer = verification.registrationInfo.credential.publicKey;
    console.log('Public key buffer:', publicKeyBuffer);
    let credentialPublicKey;
    try {
      if (Array.isArray(publicKeyBuffer)) {
        credentialPublicKey = bufferToBase64URLString(publicKeyBuffer[0]);
      } else {
        credentialPublicKey = bufferToBase64URLString(publicKeyBuffer);
      }
      console.log('Credential public key:', credentialPublicKey);
    } catch (error) {
      console.log('Error converting public key:', error);
      return { success: false, error: 'Failed to process credential public key' };
    }
    
    return {
      success: true,
      verified: verification.verified,
      registrationInfo: verification.registrationInfo,
      userID: challengeData.userID,
      username: challengeData.username,
      credentialId: verification.registrationInfo.credential.id,
      credentialPublicKey: credentialPublicKey,
    };
  } catch (error) {
    console.log('Exception in verifyRegistrationCredential:', error);
    return { success: false, error: error.message };
  }
}

// Generate authentication challenge for existing user
async function generateAuthenticationChallenge(userId) {
  try {
    const options = await generateAuthenticationOptions({
      rpID: WEBAUTHN_CONFIG.rpID,
      userVerification: 'required',
      timeout: 60000,
      allowCredentials: [], // Allow any credential for this user
    });

    // Store challenge for verification
    challenges.set(options.challenge, {
      type: 'authentication',
      userId,
      timestamp: Date.now(),
    });

    // Clean up old challenges
    cleanupOldChallenges();

    return {
      success: true,
      challenge: options.challenge,
      options: {
        challenge: options.challenge,
        rpId: WEBAUTHN_CONFIG.rpID,
        timeout: options.timeout,
        userVerification: options.userVerification,
        allowCredentials: options.allowCredentials,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Verify authentication response
async function verifyAuthenticationCredential(credential, challenge) {
  try {
    // Get stored challenge data
    const challengeData = challenges.get(challenge);
    if (!challengeData || challengeData.type !== 'authentication') {
      return { success: false, error: 'Invalid or expired challenge' };
    }

    // Import database functions here to avoid circular imports
    const { findUserById } = await import('./database.js');

    // Look up user's credential from database
    const userResult = findUserById(challengeData.userId);
    if (!userResult.success) {
      return { success: false, error: 'User not found' };
    }

    const user = userResult.user;
    if (!user.credential_id || !user.credential_public_key) {
      return { success: false, error: 'User has no registered credential' };
    }

    // Verify the credential
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: WEBAUTHN_CONFIG.expectedOrigin,
      expectedRPID: WEBAUTHN_CONFIG.rpID,
      authenticator: {
        credentialID: Buffer.from(user.credential_id, 'base64url'),
        credentialPublicKey: Buffer.from(user.credential_public_key, 'base64url'),
      },
      requireUserVerification: true,
    });

    if (!verification.verified) {
      return { success: false, error: 'Authentication verification failed' };
    }

    // Remove used challenge
    challenges.delete(challenge);

    return {
      success: true,
      verified: verification.verified,
      authenticationInfo: verification.authenticationInfo,
      userId: challengeData.userId,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Clean up old challenges (older than 5 minutes)
function cleanupOldChallenges() {
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutes

  for (const [challenge, data] of challenges.entries()) {
    if (now - data.timestamp > maxAge) {
      challenges.delete(challenge);
    }
  }
}

// Get challenge info (for debugging)
function getChallengeInfo(challenge) {
  return challenges.get(challenge) || null;
}

// Clear all challenges (for testing)
function clearAllChallenges() {
  challenges.clear();
}

export {
  generateRegistrationChallenge,
  verifyRegistrationCredential,
  generateAuthenticationChallenge,
  verifyAuthenticationCredential,
  getChallengeInfo,
  clearAllChallenges,
  WEBAUTHN_CONFIG,
};
