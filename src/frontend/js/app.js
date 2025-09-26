/**
 * PhishProof MFA Banking - Main Application
 * Single-page application with tab-based navigation and WebAuthn authentication
 */

import { registerPasskey, authenticatePasskey, isWebAuthnSupported, getWebAuthnSupportInfo } from './webauthn.js';
import {
    getRegistrationChallenge,
    verifyRegistration,
    getAuthenticationChallenge,
    verifyAuthentication,
    getDashboard,
    createTransfer,
    getAuditEvents,
    setAuthToken,
    getAuthToken,
    clearAuthToken,
    isAuthenticated,
    formatApiError,
} from './api.js';

// Application state
let currentUser = null;
let currentChallenge = null;

// DOM elements
let elements = {};

/**
 * Initialize the application
 */
function init() {
    // Cache DOM elements
    cacheElements();

    // Set up event listeners
    setupEventListeners();

    // Check WebAuthn support
    checkWebAuthnSupport();

    // Check if user is already authenticated
    if (isAuthenticated()) {
        switchToTab('dashboard');
        loadDashboard();
    } else {
        switchToTab('register');
    }

    // Set up periodic token refresh check
    setInterval(checkTokenExpiration, 60000); // Check every minute
}

/**
 * Cache frequently used DOM elements
 */
function cacheElements() {
    elements = {
        // Navigation
        tabButtons: document.querySelectorAll('.tab-button'),

        // Registration
        registerForm: document.getElementById('register-form'),
        registerUsername: document.getElementById('register-username'),
        registerBtn: document.getElementById('register-btn'),
        registerStatus: document.getElementById('register-status'),

        // Login
        loginForm: document.getElementById('login-form'),
        loginUsername: document.getElementById('login-username'),
        loginBtn: document.getElementById('login-btn'),
        loginStatus: document.getElementById('login-status'),

        // Dashboard
        dashboardContent: document.getElementById('dashboard-content'),
        userUsername: document.getElementById('user-username'),
        userBalance: document.getElementById('user-balance'),
        userLastLogin: document.getElementById('user-last-login'),
        transactionsList: document.getElementById('transactions-list'),
        dashboardStatus: document.getElementById('dashboard-status'),

        // Transfers
        transferForm: document.getElementById('transfer-form'),
        transferAmount: document.getElementById('transfer-amount'),
        transferDescription: document.getElementById('transfer-description'),
        transferBtn: document.getElementById('transfer-btn'),
        transferStatus: document.getElementById('transfer-status'),

        // Audit
        auditContent: document.getElementById('audit-content'),
        auditList: document.getElementById('audit-list'),
        refreshAuditBtn: document.getElementById('refresh-audit-btn'),
        auditStatus: document.getElementById('audit-status'),
    };
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Tab navigation
    elements.tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;
            switchToTab(tabName);
        });
    });

    // Registration form
    elements.registerForm.addEventListener('submit', handleRegistration);

    // Login form
    elements.loginForm.addEventListener('submit', handleLogin);

    // Transfer form
    elements.transferForm.addEventListener('submit', handleTransfer);

    // Audit refresh button
    elements.refreshAuditBtn.addEventListener('click', loadAuditLog);
}

/**
 * Check WebAuthn browser support
 */
function checkWebAuthnSupport() {
    const support = getWebAuthnSupportInfo();

    if (!support.isSupported) {
        showStatus('register-status', 'WebAuthn is not supported in this browser. Please use a modern browser like Chrome, Firefox, Safari, or Edge.', 'error');
        showStatus('login-status', 'WebAuthn is not supported in this browser.', 'error');
        disableAuthButtons();
        return;
    }

    if (!support.isSecureContext) {
        showStatus('register-status', 'WebAuthn requires a secure connection (HTTPS). This demo works on localhost.', 'warning');
        showStatus('login-status', 'WebAuthn requires a secure connection (HTTPS).', 'warning');
    }
}

/**
 * Disable authentication buttons when WebAuthn is not supported
 */
function disableAuthButtons() {
    elements.registerBtn.disabled = true;
    elements.loginBtn.disabled = true;
}

/**
 * Switch to a specific tab
 */
function switchToTab(tabName) {
    // Update tab buttons
    elements.tabButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab`);
    });

    // Load tab-specific data
    switch (tabName) {
        case 'dashboard':
            if (isAuthenticated()) {
                loadDashboard();
            } else {
                showStatus('dashboard-status', 'Please log in to view your dashboard.', 'info');
            }
            break;
        case 'transfers':
            if (!isAuthenticated()) {
                showStatus('transfer-status', 'Please log in to make transfers.', 'info');
            }
            break;
        case 'audit':
            if (isAuthenticated()) {
                loadAuditLog();
            } else {
                showStatus('audit-status', 'Please log in to view audit logs.', 'info');
            }
            break;
    }
}

/**
 * Handle user registration
 */
async function handleRegistration(event) {
    event.preventDefault();

    const username = elements.registerUsername.value.trim();

    if (!username) {
        showStatus('register-status', 'Please enter a username.', 'error');
        return;
    }

    try {
        setLoading(elements.registerBtn, true);

        // Step 1: Get registration challenge from server
        showStatus('register-status', 'Getting registration challenge...', 'info');
        const challengeResponse = await getRegistrationChallenge(username);

        if (!challengeResponse.success) {
            throw new Error(challengeResponse.error || 'Failed to get registration challenge');
        }

        currentChallenge = challengeResponse.challenge;

        // Step 2: Create passkey using WebAuthn
        showStatus('register-status', 'Creating your passkey... Please interact with your authenticator.', 'info');
        const { success, ...registrationOptions } = challengeResponse;
        const registrationResult = await registerPasskey(registrationOptions);

        if (!registrationResult.success) {
            throw new Error(registrationResult.error || 'Passkey registration failed');
        }

        // Step 3: Verify registration with server
        showStatus('register-status', 'Verifying registration...', 'info');
        const verificationResponse = await verifyRegistration(
            registrationResult.credential,
            currentChallenge
        );

        if (!verificationResponse.success) {
            throw new Error(verificationResponse.error || 'Registration verification failed');
        }

        // Success!
        showStatus('register-status', `Registration successful! Welcome, ${username}!`, 'success');

        // Store auth token
        if (verificationResponse.token) {
            setAuthToken(verificationResponse.token);
            currentUser = verificationResponse.user;
        }

        // Clear form and switch to dashboard
        elements.registerForm.reset();
        switchToTab('dashboard');

    } catch (error) {
        console.error('Registration failed:', error);
        showStatus('register-status', formatApiError(error), 'error');
    } finally {
        setLoading(elements.registerBtn, false);
    }
}

/**
 * Handle user login
 */
async function handleLogin(event) {
    event.preventDefault();

    const username = elements.loginUsername.value.trim();

    if (!username) {
        showStatus('login-status', 'Please enter your username.', 'error');
        return;
    }

    try {
        setLoading(elements.loginBtn, true);

        // For login, we need to get the user ID first
        // In a real app, this would be a separate endpoint, but for demo we'll use the username
        showStatus('login-status', 'Getting authentication challenge...', 'info');

        // This is a simplified flow - in reality, you'd look up the user first
        const challengeResponse = await getAuthenticationChallenge(username);

        if (!challengeResponse.success) {
            throw new Error(challengeResponse.error || 'Failed to get authentication challenge');
        }

        currentChallenge = challengeResponse.challenge;

        // Step 2: Authenticate with passkey
        showStatus('login-status', 'Authenticating with your passkey... Please interact with your authenticator.', 'info');
        const { success: authSuccess, ...authOptions } = challengeResponse;
        const authResult = await authenticatePasskey(authOptions);

        if (!authResult.success) {
            throw new Error(authResult.error || 'Passkey authentication failed');
        }

        // Step 3: Verify authentication with server
        showStatus('login-status', 'Verifying authentication...', 'info');
        const verificationResponse = await verifyAuthentication(
            authResult.credential,
            currentChallenge
        );

        if (!verificationResponse.success) {
            throw new Error(verificationResponse.error || 'Authentication verification failed');
        }

        // Success!
        showStatus('login-status', `Login successful! Welcome back, ${verificationResponse.user.username}!`, 'success');

        // Store auth token and user info
        setAuthToken(verificationResponse.token);
        currentUser = verificationResponse.user;

        // Clear form and switch to dashboard
        elements.loginForm.reset();
        switchToTab('dashboard');

    } catch (error) {
        console.error('Login failed:', error);
        showStatus('login-status', formatApiError(error), 'error');
    } finally {
        setLoading(elements.loginBtn, false);
    }
}

/**
 * Load dashboard data
 */
async function loadDashboard() {
    if (!isAuthenticated()) {
        showStatus('dashboard-status', 'Please log in to view your dashboard.', 'info');
        return;
    }

    try {
        showStatus('dashboard-status', 'Loading dashboard...', 'info');
        const response = await getDashboard();

        if (!response.success) {
            throw new Error(response.error || 'Failed to load dashboard');
        }

        // Update user info
        currentUser = response.user;
        elements.userUsername.textContent = currentUser.username || '-';
        elements.userBalance.textContent = (currentUser.balance || 0).toFixed(2);
        elements.userLastLogin.textContent = currentUser.lastLogin
            ? new Date(currentUser.lastLogin).toLocaleString()
            : '-';

        // Update transactions
        updateTransactionsList(response.recentTransactions || []);

        showStatus('dashboard-status', 'Dashboard loaded successfully.', 'success');

    } catch (error) {
        console.error('Failed to load dashboard:', error);
        showStatus('dashboard-status', formatApiError(error), 'error');
    }
}

/**
 * Update the transactions list in the dashboard
 */
function updateTransactionsList(transactions) {
    const container = elements.transactionsList;

    if (!transactions || transactions.length === 0) {
        container.innerHTML = '<p class="no-data">No transactions yet</p>';
        return;
    }

    const html = transactions.map(transaction => `
        <div class="transaction-item">
            <div class="transaction-info">
                <div class="transaction-amount ${transaction.type}">
                    ${transaction.type === 'debit' ? '-' : '+'}$${Math.abs(transaction.amount).toFixed(2)}
                </div>
                <div class="transaction-description">${transaction.description || 'No description'}</div>
                <div class="transaction-timestamp">${new Date(transaction.timestamp).toLocaleString()}</div>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

/**
 * Handle transfer creation
 */
async function handleTransfer(event) {
    event.preventDefault();

    if (!isAuthenticated()) {
        showStatus('transfer-status', 'Please log in to make transfers.', 'info');
        return;
    }

    const amount = parseFloat(elements.transferAmount.value);
    const description = elements.transferDescription.value.trim();

    if (!amount || amount <= 0) {
        showStatus('transfer-status', 'Please enter a valid amount greater than $0.00.', 'error');
        return;
    }

    if (!description) {
        showStatus('transfer-status', 'Please enter a description for the transfer.', 'error');
        return;
    }

    try {
        setLoading(elements.transferBtn, true);

        showStatus('transfer-status', 'Processing transfer...', 'info');
        const response = await createTransfer(amount, description);

        if (!response.success) {
            throw new Error(response.error || 'Transfer failed');
        }

        // Success!
        showStatus('transfer-status', `Transfer of $${amount.toFixed(2)} completed successfully!`, 'success');

        // Clear form
        elements.transferForm.reset();

        // Refresh dashboard to show updated balance and transaction
        loadDashboard();

    } catch (error) {
        console.error('Transfer failed:', error);
        showStatus('transfer-status', formatApiError(error), 'error');
    } finally {
        setLoading(elements.transferBtn, false);
    }
}

/**
 * Load audit log
 */
async function loadAuditLog() {
    if (!isAuthenticated()) {
        showStatus('audit-status', 'Please log in to view audit logs.', 'info');
        return;
    }

    try {
        showStatus('audit-status', 'Loading audit log...', 'info');
        const response = await getAuditEvents();

        if (!response.success) {
            throw new Error(response.error || 'Failed to load audit log');
        }

        updateAuditList(response.events || []);
        showStatus('audit-status', 'Audit log loaded successfully.', 'success');

    } catch (error) {
        console.error('Failed to load audit log:', error);
        showStatus('audit-status', formatApiError(error), 'error');
    }
}

/**
 * Update the audit events list
 */
function updateAuditList(events) {
    const container = elements.auditList;

    if (!events || events.length === 0) {
        container.innerHTML = '<p class="no-data">No audit events yet</p>';
        return;
    }

    const html = events.map(event => `
        <div class="audit-item">
            <div class="audit-event-type">${event.eventType || 'Unknown Event'}</div>
            <div class="audit-timestamp">${new Date(event.timestamp).toLocaleString()}</div>
            <div class="audit-details">${JSON.stringify(event.details || {}, null, 2)}</div>
        </div>
    `).join('');

    container.innerHTML = html;
}

/**
 * Check token expiration and auto-logout if needed
 */
function checkTokenExpiration() {
    if (!isAuthenticated()) {
        // User is not logged in, check if we should show login tab
        if (document.querySelector('#register-tab.active') || document.querySelector('#login-tab.active')) {
            return;
        }
        switchToTab('login');
        clearAuthToken();
        currentUser = null;
    }
}

/**
 * Show status message
 */
function showStatus(elementId, message, type = 'info') {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.textContent = message;
    element.className = `status-message ${type}`;

    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            element.textContent = '';
            element.className = 'status-message';
        }, 5000);
    }
}

/**
 * Set loading state for buttons
 */
function setLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = '<span class="spinner"></span> Loading...';
    } else {
        button.disabled = false;
        button.innerHTML = button.dataset.originalText || button.innerHTML.replace('<span class="spinner"></span> Loading...', '');
        button.dataset.originalText = button.innerHTML;
    }
}

/**
 * Logout user (clear token and reset state)
 */
function logout() {
    clearAuthToken();
    currentUser = null;
    currentChallenge = null;
    switchToTab('register');
    showStatus('register-status', 'You have been logged out.', 'info');
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Export for potential use in other modules
window.PhishProofMFA = {
    logout,
    isAuthenticated,
    getCurrentUser: () => currentUser,
};