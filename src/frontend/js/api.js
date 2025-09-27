/**
 * API Client Functions
 * Handles HTTP requests to the backend API
 */

const API_BASE_URL = window.location.origin;

/**
 * Generic API request function
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {Object} options - Request options
 * @returns {Promise<Object>} Response data
 */
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}/api${endpoint}`;

    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
    };

    const requestOptions = { ...defaultOptions, ...options };

    // Add authorization header if token exists
    const token = localStorage.getItem('authToken');
    if (token) {
        requestOptions.headers.Authorization = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, requestOptions);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Network error' }));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`API request failed for ${endpoint}:`, error);
        throw error;
    }
}

/**
 * WebAuthn Registration API
 */

// Get registration challenge
export async function getRegistrationChallenge(username, password) {
    return apiRequest('/webauthn/register/challenge', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
}

// Verify registration
export async function verifyRegistration(credential, challenge) {
    return apiRequest('/webauthn/register/verify', {
        method: 'POST',
        body: JSON.stringify({ credential, challenge }),
    });
}

/**
 * WebAuthn Authentication API
 */

// Get authentication challenge
export async function getAuthenticationChallenge(identifier) {
    // identifier can be either username or userId
    const body = typeof identifier === 'string' && identifier.includes('-') 
        ? { userId: identifier }
        : { username: identifier };
    
    return apiRequest('/webauthn/auth/challenge', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

// Verify authentication
export async function verifyAuthentication(credential, challenge) {
    return apiRequest('/webauthn/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ credential, challenge }),
    });
}

/**
 * Password Authentication API
 */

// Login with password (first step of two-factor authentication)
export async function loginWithPassword(username, password) {
    return apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
}

/**
 * Dashboard API
 */

// Get dashboard data
export async function getDashboard() {
    return apiRequest('/dashboard');
}

/**
 * Transfers API
 */

// Create a transfer
export async function createTransfer(amount, description) {
    return apiRequest('/transfers', {
        method: 'POST',
        body: JSON.stringify({ amount, description }),
    });
}

// Create a user-to-user transfer
export async function createUserTransfer(recipientUsername, amount, description) {
    return apiRequest('/transfers/user', {
        method: 'POST',
        body: JSON.stringify({ recipientUsername, amount, description }),
    });
}

/**
 * Audit API
 */

// Get audit events
export async function getAuditEvents(limit = 50) {
    return apiRequest(`/audit?limit=${limit}`);
}

/**
 * Authentication helpers
 */

// Store authentication token
export function setAuthToken(token) {
    localStorage.setItem('authToken', token);
}

// Get authentication token
export function getAuthToken() {
    return localStorage.getItem('authToken');
}

// Clear authentication token
export function clearAuthToken() {
    localStorage.removeItem('authToken');
}

// Check if user is authenticated
export function isAuthenticated() {
    const token = getAuthToken();
    console.log('🔍 Checking authentication, token:', token ? `exists (${token.substring(0, 20)}...)` : 'missing');
    
    if (!token) {
        console.log('❌ No token found');
        return false;
    }

    try {
        // Basic JWT expiration check (without full decode)
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;
        const isValid = payload.exp > currentTime;
        console.log('🔐 Token validation:', { 
            isValid, 
            exp: payload.exp, 
            now: currentTime, 
            expiresIn: Math.round((payload.exp - currentTime) / 60) + ' minutes',
            username: payload.username || 'unknown'
        });
        
        if (!isValid) {
            console.log('⏰ Token expired, clearing...');
            clearAuthToken();
        }
        
        return isValid;
    } catch (error) {
        console.error('💥 Invalid token format:', error);
        clearAuthToken();
        return false;
    }
}

/**
 * Error handling
 */

// Format API errors for display
export function formatApiError(error) {
    if (error.message.includes('Network error')) {
        return 'Network connection failed. Please check your connection and try again.';
    }

    if (error.message.includes('401')) {
        return 'Authentication required. Please log in again.';
    }

    if (error.message.includes('403')) {
        return 'Access denied. You may not have permission for this action.';
    }

    if (error.message.includes('404')) {
        return 'The requested resource was not found.';
    }

    if (error.message.includes('500')) {
        return 'Server error. Please try again later.';
    }

    return error.message || 'An unexpected error occurred.';
}