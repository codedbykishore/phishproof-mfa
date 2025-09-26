import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import crypto from 'crypto';

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

// In-memory storage for challenges (in production, use Redis or database)
const challenges = new Map();

// Generate registration challenge for new user
function generateRegistrationChallenge(username) {
  try {
    const options = generateRegistrationOptions({
      rpName: WEBAUTHN_CONFIG.rpName,
      rpID: WEBAUTHN_CONFIG.rpID,
      userID: Buffer.from(crypto.randomUUID(), 'utf-8'),
      userName: username,
      userDisplayName: username,
      attestationType: 'direct',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'required',
      },
      supportedAlgorithmIDs: [-7, -257], // ES256, RS256
      timeout: 60000,
    });

    // Store challenge for verification
    challenges.set(options.challenge, {
      type: 'registration',
      userID: options.user.id,
      username,
      timestamp: Date.now(),
    });

    // Clean up old challenges (older than 5 minutes)
    cleanupOldChallenges();

    return {
      success: true,
      challenge: options.challenge,
      options: {
        challenge: options.challenge,
        rp: {
          name: WEBAUTHN_CONFIG.rpName,
          id: WEBAUTHN_CONFIG.rpID,
        },
        user: {
          id: options.user.id,
          name: username,
          displayName: username,
        },
        pubKeyCredParams: options.pubKeyCredParams,
        authenticatorSelection: options.authenticatorSelection,
        timeout: options.timeout,
        attestation: options.attestation,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Verify registration response
function verifyRegistrationCredential(credential, challenge) {
  try {
    // Get stored challenge data
    const challengeData = challenges.get(challenge);
    if (!challengeData || challengeData.type !== 'registration') {
      return { success: false, error: 'Invalid or expired challenge' };
    }

    // Verify the credential
    const verification = verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: WEBAUTHN_CONFIG.expectedOrigin,
      expectedRPID: WEBAUTHN_CONFIG.rpID,
      requireUserVerification: true,
    });

    if (!verification.verified) {
      return { success: false, error: 'Credential verification failed' };
    }

    // Remove used challenge
    challenges.delete(challenge);

    return {
      success: true,
      verified: verification.verified,
      registrationInfo: verification.registrationInfo,
      userID: challengeData.userID,
      username: challengeData.username,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Generate authentication challenge for existing user
function generateAuthenticationChallenge(userId) {
  try {
    const options = generateAuthenticationOptions({
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
function verifyAuthenticationCredential(
  credential,
  challenge,
  expectedCredentialId
) {
  try {
    // Get stored challenge data
    const challengeData = challenges.get(challenge);
    if (!challengeData || challengeData.type !== 'authentication') {
      return { success: false, error: 'Invalid or expired challenge' };
    }

    // Verify the credential
    const verification = verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: WEBAUTHN_CONFIG.expectedOrigin,
      expectedRPID: WEBAUTHN_CONFIG.rpID,
      authenticator: {
        credentialID: expectedCredentialId,
        credentialPublicKey: Buffer.from(expectedCredentialId, 'base64url'),
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
