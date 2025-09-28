/**
 * @fileoverview WebAuthn server-side utilities for phishing-resistant authentication
 * Handles WebAuthn credential registration and authentication flows using the
 * SimpleWebAuthn library for secure passkey-based authentication.
 * 
 * @author PhishProof MFA Banking
 * @version 1.0.0
 */

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { randomBytes, randomUUID } from 'crypto';

/**
 * WebAuthn relying party configuration
 * @constant {Object}
 */
const WEBAUTHN_CONFIG = {
  rpName: 'PhishProof MFA Banking',
  rpID: process.env.WEBAUTHN_RP_ID || (process.env.NODE_ENV === 'production' ? 'phishproof-mfa.koyeb.app' : 'localhost'),
  origin: process.env.WEBAUTHN_ORIGIN || (process.env.NODE_ENV === 'production' ? 'https://phishproof-mfa.koyeb.app' : 'http://localhost:3000'),
  expectedOrigin: process.env.WEBAUTHN_ORIGIN || (process.env.NODE_ENV === 'production' ? 'https://phishproof-mfa.koyeb.app' : 'http://localhost:3000'),
};

/**
 * Converts a buffer to base64url string format
 * @param {Buffer|Uint8Array} buffer - The buffer to convert
 * @returns {string} Base64url encoded string
 */
function bufferToBase64URLString(buffer) {
  return Buffer.from(buffer).toString('base64url');
}

/**
 * In-memory storage for WebAuthn challenges
 * @type {Map<string, Object>}
 * @description Stores registration and authentication challenges temporarily.
 * In production, use Redis or database for scalability.
 */
const challenges = new Map();

/**
 * Generates a WebAuthn registration challenge for a new user
 * @param {string} username - The username for registration
 * @param {string} password - The user's password (for hybrid auth)
 * @returns {Promise<Object>} Registration challenge response
 * @property {boolean} success - Whether the operation succeeded
 * @property {string} [challenge] - The challenge string if successful
 * @property {Object} [options] - WebAuthn registration options if successful
 * @property {string} [error] - Error message if failed
 */
async function generateRegistrationChallenge(username, password) {
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
        residentKey: 'preferred',
      },
    });
    console.log('generateRegistrationOptions completed');

    console.log('Generated options successfully:', options.challenge);

    // Store challenge for verification
    challenges.set(options.challenge, {
      type: 'registration',
      userID: options.user.id,
      username,
      password,
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

/**
 * Verifies a WebAuthn registration response from the client
 * @param {Object} credential - The registration credential from client
 * @param {string} challenge - The challenge string to verify against
 * @returns {Promise<Object>} Verification result
 * @property {boolean} success - Whether verification succeeded
 * @property {boolean} [verified] - Whether the credential was verified
 * @property {Object} [registrationInfo] - Registration information if successful
 * @property {string} [userID] - The user ID if successful
 * @property {string} [username] - The username if successful
 * @property {string} [password] - The password if successful
 * @property {string} [credentialId] - The credential ID if successful
 * @property {string} [credentialPublicKey] - The public key if successful
 * @property {string} [error] - Error message if failed
 */
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
      password: challengeData.password,
      credentialId: verification.registrationInfo.credential.id,
      credentialPublicKey: credentialPublicKey,
    };
  } catch (error) {
    console.log('Exception in verifyRegistrationCredential:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generates a WebAuthn authentication challenge for an existing user
 * @param {number} userId - The user's database ID
 * @returns {Promise<Object>} Authentication challenge response
 * @property {boolean} success - Whether the operation succeeded
 * @property {string} [challenge] - The challenge string if successful
 * @property {Object} [options] - WebAuthn authentication options if successful
 * @property {string} [error] - Error message if failed
 */
async function generateAuthenticationChallenge(userId) {
  try {
    // Import database functions here to avoid circular imports
    const { findUserById } = await import('./database.js');

    // Look up user's credential
    const userResult = findUserById(userId);
    if (!userResult.success) {
      return { success: false, error: 'User not found' };
    }

    const user = userResult.user;
    if (!user.credential_id) {
      return { success: false, error: 'User has no registered credential' };
    }

    const options = await generateAuthenticationOptions({
      rpID: WEBAUTHN_CONFIG.rpID,
      userVerification: 'required',
      timeout: 60000,
      allowCredentials: [{
        type: 'public-key',
        id: user.credential_id,
      }],
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
      options: options, // Return the full options object from generateAuthenticationOptions
    };
  } catch (error) {
    console.error('Error generating authentication challenge:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Verifies a WebAuthn authentication response from the client
 * @param {Object} credential - The authentication credential from client
 * @param {string} challenge - The challenge string to verify against
 * @returns {Promise<Object>} Verification result
 * @property {boolean} success - Whether verification succeeded
 * @property {boolean} [verified] - Whether the credential was verified
 * @property {Object} [authenticationInfo] - Authentication information if successful
 * @property {number} [userId] - The user ID if successful
 * @property {string} [error] - Error message if failed
 */
async function verifyAuthenticationCredential(credential, challenge) {
  try {
    console.log('Verifying authentication credential...');
    console.log('Challenge:', challenge);
    console.log('Credential structure:', {
      id: credential?.id,
      rawId: credential?.rawId ? 'present' : 'missing',
      response: credential?.response ? 'present' : 'missing',
      type: credential?.type
    });
    
    // Get stored challenge data
    const challengeData = challenges.get(challenge);
    console.log('Challenge data found:', challengeData ? 'yes' : 'no');
    if (!challengeData || challengeData.type !== 'authentication') {
      console.log('Invalid or expired challenge');
      return { success: false, error: 'Invalid or expired challenge' };
    }

    // Import database functions here to avoid circular imports
    const { findUserById } = await import('./database.js');

    // Look up user's credential from database
    console.log('Looking up user:', challengeData.userId);
    const userResult = findUserById(challengeData.userId);
    console.log('User lookup result:', userResult.success ? 'found' : 'not found');
    if (!userResult.success) {
      console.log('User not found in database');
      return { success: false, error: 'User not found' };
    }

    const user = userResult.user;
    console.log('User credential data:', {
      has_credential_id: !!user.credential_id,
      has_credential_public_key: !!user.credential_public_key,
      credential_id_length: user.credential_id?.length,
      credential_public_key_length: user.credential_public_key?.length
    });
    if (!user.credential_id || !user.credential_public_key) {
      console.log('User has no registered credential');
      return { success: false, error: 'User has no registered credential' };
    }

    // Verify the credential
    console.log('About to verify with config:', {
      expectedChallenge: challenge,
      expectedOrigin: WEBAUTHN_CONFIG.expectedOrigin,
      expectedRPID: WEBAUTHN_CONFIG.rpID,
      requireUserVerification: true
    });
    
    try {
      // Ensure we have the proper credential structure
      let credentialID, credentialPublicKey;
      try {
        credentialID = Buffer.from(user.credential_id, 'base64url');
        credentialPublicKey = Buffer.from(user.credential_public_key, 'base64url');
      } catch (bufferError) {
        console.error('Buffer conversion error:', bufferError);
        return { success: false, error: 'Invalid credential data format' };
      }
      
      console.log('Credential data ready for verification:', {
        credentialIDLength: credentialID.length,
        credentialPublicKeyLength: credentialPublicKey.length,
        storedCounter: parseInt(user.credential_counter) || 0
      });
      
      const verification = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge: challenge,
        expectedOrigin: WEBAUTHN_CONFIG.expectedOrigin,
        expectedRPID: WEBAUTHN_CONFIG.rpID,
        credential: {
          id: user.credential_id,
          publicKey: credentialPublicKey,
          counter: parseInt(user.credential_counter) || 0,
          transports: []
        },
        requireUserVerification: true,
      });
      console.log('Verification result:', verification);
      
      if (!verification.verified) {
        console.log('Authentication verification failed');
        return { success: false, error: 'Authentication verification failed' };
      }

      // Update the credential counter if verification included a new counter
      if (verification.authenticationInfo && verification.authenticationInfo.newCounter !== undefined) {
        const { updateUserCredentialCounter } = await import('./database.js');
        await updateUserCredentialCounter(challengeData.userId, verification.authenticationInfo.newCounter);
      }

      // Remove used challenge
      challenges.delete(challenge);

      console.log('Authentication successful for user:', challengeData.userId);
      return {
        success: true,
        verified: verification.verified,
        authenticationInfo: verification.authenticationInfo,
        userId: challengeData.userId,
      };
    } catch (verifyError) {
      console.error('Verification error:', verifyError);
      return { success: false, error: verifyError.message };
    }

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

/**
 * Cleans up old challenges that are older than 5 minutes
 * @description Removes expired challenges from memory to prevent memory leaks
 * @returns {void}
 */
function cleanupOldChallenges() {
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutes

  for (const [challenge, data] of challenges.entries()) {
    if (now - data.timestamp > maxAge) {
      challenges.delete(challenge);
    }
  }
}

/**
 * Gets challenge information for debugging purposes
 * @param {string} challenge - The challenge string to look up
 * @returns {Object|null} Challenge data or null if not found
 */
function getChallengeInfo(challenge) {
  return challenges.get(challenge) || null;
}

/**
 * Clears all stored challenges (primarily for testing)
 * @description Removes all challenges from memory storage
 * @returns {void}
 */
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
