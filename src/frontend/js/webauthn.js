/**
 * WebAuthn Client Utilities
 * Handles browser-side WebAuthn operations for registration and authentication
 */

// Use the global SimpleWebAuthnBrowser object from CDN
const { startRegistration, startAuthentication } = window.SimpleWebAuthnBrowser;

/**
 * Register a new passkey for a user
 * @param {Object} options - Registration options from server
 * @returns {Promise<Object>} Registration response
 */
export async function registerPasskey(options) {
    try {
        // Start the registration process
        const registrationResponse = await startRegistration({ optionsJSON: options });

        return {
            success: true,
            credential: registrationResponse,
        };
    } catch (error) {
        console.error('Passkey registration failed:', error);
        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * Authenticate with an existing passkey
 * @param {Object} options - Authentication options from server
 * @returns {Promise<Object>} Authentication response
 */
export async function authenticatePasskey(options) {
    try {
        // Start the authentication process
        const authenticationResponse = await startAuthentication({ optionsJSON: options });

        return {
            success: true,
            credential: authenticationResponse,
        };
    } catch (error) {
        console.error('Passkey authentication failed:', error);
        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * Check if WebAuthn is supported in this browser
 * @returns {boolean} True if WebAuthn is supported
 */
export function isWebAuthnSupported() {
    return window.PublicKeyCredential &&
           typeof window.PublicKeyCredential === 'function' &&
           navigator.credentials &&
           typeof navigator.credentials.create === 'function' &&
           typeof navigator.credentials.get === 'function';
}

/**
 * Check if the current context is secure (HTTPS or localhost)
 * @returns {boolean} True if the context is secure
 */
export function isSecureContext() {
    return window.location.protocol === 'https:' ||
           window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1';
}

/**
 * Get browser support information
 * @returns {Object} Support information
 */
export function getWebAuthnSupportInfo() {
    return {
        isSupported: isWebAuthnSupported(),
        isSecureContext: isSecureContext(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
    };
}