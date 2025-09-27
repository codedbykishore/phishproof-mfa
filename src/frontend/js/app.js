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
    loginWithPassword,
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
    console.log('🚀 App initialization, checking authentication...');
    console.log('📦 localStorage authToken:', localStorage.getItem('authToken') ? 'exists' : 'missing');
    
    if (isAuthenticated()) {
        console.log('✅ User is authenticated, loading dashboard...');
        elements.logoutBtn.style.display = 'inline-block';
        switchToTab('dashboard');
        // Note: loadDashboard() will be called by switchToTab automatically
    } else {
        console.log('❌ User not authenticated, switching to register tab...');
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
        // Tabs
        tabButtons: document.querySelectorAll('.tab-button'),
        tabContents: document.querySelectorAll('.tab-content'),

        // Register
        registerForm: document.getElementById('register-form'),
        registerUsername: document.getElementById('register-username'),
        registerPassword: document.getElementById('register-password'),
        registerConfirmPassword: document.getElementById('register-confirm-password'),
        registerBtn: document.getElementById('register-btn'),
        registerStatus: document.getElementById('register-status'),

        // Login
        loginForm: document.getElementById('login-form'),
        loginUsername: document.getElementById('login-username'),
        loginPassword: document.getElementById('login-password'),
        loginBtn: document.getElementById('login-btn'),
        loginStatus: document.getElementById('login-status'),

        // Dashboard
        dashboardContent: document.getElementById('dashboard-content'),
        welcomeMessage: document.getElementById('welcome-message'),
        welcomeSubtitle: document.getElementById('welcome-subtitle'),
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

        // Logout
        logoutBtn: document.getElementById('logout-btn'),
        logoutModal: document.getElementById('logout-modal'),
        cancelLogout: document.getElementById('cancel-logout'),
        confirmLogout: document.getElementById('confirm-logout'),
    };
    
    // Verify critical elements are cached
    if (!elements.tabButtons || elements.tabButtons.length === 0) {
        console.error('❌ Critical error: No tab buttons found!');
    }
}/**
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

    // Logout button - show confirmation modal
    elements.logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showLogoutModal();
    });

    // Modal event listeners
    elements.cancelLogout.addEventListener('click', hideLogoutModal);
    elements.confirmLogout.addEventListener('click', () => {
        hideLogoutModal();
        logout();
    });

    // Close modal on background click
    elements.logoutModal.addEventListener('click', (e) => {
        if (e.target === elements.logoutModal) {
            hideLogoutModal();
        }
    });

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.logoutModal.classList.contains('show')) {
            hideLogoutModal();
        }
    });
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
                console.log('📊 Loading dashboard for authenticated user...');
                loadDashboard();
            } else {
                console.log('🔐 User not authenticated, showing login prompt...');
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
    const password = elements.registerPassword.value;
    const confirmPassword = elements.registerConfirmPassword.value;

    // Validation
    if (!username || username.length < 3) {
        showStatus('register-status', 'Username must be at least 3 characters long.', 'error');
        return;
    }

    if (!password || password.length < 8) {
        showStatus('register-status', 'Password must be at least 8 characters long.', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showStatus('register-status', 'Passwords do not match.', 'error');
        return;
    }

    try {
        setLoading(elements.registerBtn, true);

        // Step 1: Get registration challenge from server
        showStatus('register-status', 'Getting registration challenge...', 'info');
        const challengeResponse = await getRegistrationChallenge(username, password);

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
        showStatus('register-status', `Registration successful! Please log in with your credentials.`, 'success');

        // Clear form and switch to login page
        elements.registerForm.reset();
        switchToTab('login');

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
    const password = elements.loginPassword.value;

    if (!username) {
        showStatus('login-status', 'Please enter your username.', 'error');
        return;
    }

    if (!password) {
        showStatus('login-status', 'Please enter your password.', 'error');
        return;
    }

    try {
        setLoading(elements.loginBtn, true);

        // Step 1: Verify password with server (this also returns WebAuthn challenge)
        showStatus('login-status', 'Verifying password...', 'info');
        const passwordResponse = await loginWithPassword(username, password);

        if (!passwordResponse.success) {
            throw new Error(passwordResponse.error || 'Password verification failed');
        }

        // The password response already includes the WebAuthn challenge options
        currentChallenge = passwordResponse.challenge;

        // Extract WebAuthn options from the password response
        const webauthnOptions = {
            challenge: passwordResponse.challenge,
            allowCredentials: passwordResponse.allowCredentials,
            rpId: passwordResponse.rpId,
            timeout: passwordResponse.timeout,
            userVerification: passwordResponse.userVerification,
        };

        // Step 2: Authenticate with passkey using the extracted options
        showStatus('login-status', 'Authenticating with your passkey... Please interact with your authenticator.', 'info');
        const authResult = await authenticatePasskey(webauthnOptions);

        if (!authResult.success) {
            throw new Error(authResult.error || 'Passkey authentication failed');
        }

        // Step 3: Verify authentication with server
        showStatus('login-status', 'Verifying authentication...', 'info');
        console.log('About to verify authentication with:', {
            credential: authResult.credential,
            challenge: currentChallenge
        });
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

        // Show logout button
        elements.logoutBtn.style.display = 'inline-block';

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
        console.log('📊 Loading dashboard, token exists:', !!getAuthToken());
        
        const response = await getDashboard();
        console.log('📊 Dashboard API response:', response);

        if (!response.success) {
            // Check if it's an authentication error
            if (response.error && (
                response.error.includes('token') || 
                response.error.includes('unauthorized') ||
                response.error.includes('Access token required')
            )) {
                console.log('🔐 Authentication failed, clearing token and redirecting...');
                clearAuthToken();
                currentUser = null;
                elements.logoutBtn.style.display = 'none';
                switchToTab('login');
                showStatus('login-status', 'Your session has expired. Please log in again.', 'info');
                return;
            }
            
            throw new Error(response.error || 'Failed to load dashboard');
        }

        // Debug: Check if elements are properly cached
        console.log('🎯 Welcome elements check:', {
            welcomeMessage: elements.welcomeMessage,
            welcomeSubtitle: elements.welcomeSubtitle
        });

        // Update user info
        currentUser = response.user;
        
        // Update personalized welcome message with defensive checks
        const username = currentUser.username || 'User';
        const timeOfDay = getTimeOfDayGreeting();
        
        if (elements.welcomeMessage) {
            elements.welcomeMessage.textContent = `${timeOfDay}, ${username}!`;
        }
        
        if (elements.welcomeSubtitle) {
            elements.welcomeSubtitle.textContent = `Your secure banking dashboard • Last login: ${
                currentUser.lastLogin ? new Date(currentUser.lastLogin).toLocaleString() : 'First time'
            }`;
        }
        
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
            <div class="audit-details">${JSON.stringify(event.event_data || event.details || {}, null, 2)}</div>
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
 * Get time-appropriate greeting message
 */
function getTimeOfDayGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

/**
 * Show logout confirmation modal
 */
function showLogoutModal() {
    elements.logoutModal.classList.add('show');
    elements.confirmLogout.focus();
}

/**
 * Hide logout confirmation modal
 */
function hideLogoutModal() {
    elements.logoutModal.classList.remove('show');
}

/**
 * Logout user (clear token and reset state)
 */
function logout() {
    clearAuthToken();
    currentUser = null;
    currentChallenge = null;
    elements.logoutBtn.style.display = 'none';
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