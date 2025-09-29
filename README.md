# PhishProof MFA Banking

A minimal banking prototype demonstrating phishing-resistant authentication using WebAuthn (Passkeys). This application showcases how modern web standards can provide secure, passwordless authentication that resists phishing attacks.

Check out the live demo here: [https://phishproof-mfa.koyeb.app/](https://phishproof-mfa.koyeb.app/)

## 🚀 Features

- **Phishing-Resistant Authentication**: WebAuthn/Passkey-based registration and login
- **True Multi-Factor Authentication (MFA)**: WebAuthn provides three factors:
  - **Something you have** - Authenticator device/hardware
  - **Something you are** - Biometric (fingerprint, face) or PIN
  - **Something you know** - Credential possession (implicit)
- **Secure Banking Dashboard**: View account balance and transaction history
- **Transfer Operations**: Perform secure money transfers with balance validation
- **Audit Logging**: Complete security event tracking with timestamps
- **Single-Page Application**: Modern SPA with tab-based navigation
- **JWT Authentication**: Secure session management with 30-minute timeouts MFA Banking

A minimal banking prototype demonstrating phishing-resistant authentication using WebAuthn (Passkeys). This application showcases how modern web standards can provide secure, passwordless authentication that resists phishing attacks.

## 🚀 Features

- **Phishing-Resistant Authentication**: WebAuthn/Passkey-based registration and login
- **Secure Banking Dashboard**: View account balance and transaction history
- **Transfer Operations**: Perform secure money transfers
- **Audit Logging**: Complete security event tracking
- **Single-Page Application**: Modern SPA with tab-based navigation
- **JWT Authentication**: Secure session management with 30-minute timeouts

## 🛡️ Security Benefits

- **No Passwords**: Eliminates password-related vulnerabilities
- **Phishing Resistant**: WebAuthn credentials are bound to specific domains
- **Hardware-Backed**: Uses TPM, biometric sensors, or secure elements
- **Cryptographically Secure**: Based on public-key cryptography
- **Audit Trail**: Complete logging of all security events

## 🏗️ Architecture

### Backend (Node.js/Express)
- **WebAuthn Server**: `@simplewebauthn/server` for credential verification
- **Database**: SQLite with better-sqlite3 for data persistence
- **Authentication**: JWT tokens with automatic expiration
- **Security**: Helmet middleware for HTTP security headers

### Frontend (Vanilla JavaScript)
- **WebAuthn Client**: `@simplewebauthn/browser` for passkey operations
- **UI Framework**: Pure HTML/CSS/JavaScript with modern design
- **State Management**: Client-side application state
- **API Client**: RESTful API communication

## 📋 Prerequisites

- Node.js 18+ with ES modules support
- Modern web browser with WebAuthn support (Chrome, Firefox, Safari, Edge)
- HTTPS connection (or localhost for development)

## 🚀 Quick Start

1. **Clone and Install**:
   ```bash
   git clone <repository-url>
   cd phishproof-mfa
   npm install
   ```

2. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   This starts the full-stack application (frontend + backend) on port 3000

3. **Open in Browser**:
   Navigate to `http://localhost:3000`

4. **Register a Passkey**:
   - Click the "Register" tab
   - Enter a username
   - Click "Create Passkey & Register"
   - Follow your browser's passkey creation prompts

5. **Login and Explore**:
   - Use the "Login" tab to authenticate with your passkey
   - View your dashboard with account balance
   - Make transfers using the "Transfers" tab
   - Check security events in the "Audit Log" tab

## 🧪 Testing

### Contract Tests
```bash
npm run test:contract
```

### Integration Tests
```bash
npm run test:integration
```

### All Tests
```bash
npm test
```

## 📁 Project Structure

```
src/
├── backend/
│   ├── auth.js          # JWT authentication middleware
│   ├── database.js      # SQLite database models and queries
│   ├── routes.js        # API endpoints and route handlers
│   ├── server.js        # Express server configuration
│   └── webauthn.js      # WebAuthn server utilities
└── frontend/
    ├── index.html       # Main HTML structure
    ├── css/
    │   └── styles.css   # Application styles
    └── js/
        ├── api.js       # API client functions
        ├── app.js       # Main application logic
        └── webauthn.js  # WebAuthn client utilities

tests/
├── contract/            # API contract tests
├── integration/         # End-to-end integration tests
├── performance/         # Performance tests
└── unit/               # Unit tests

specs/001-build-a-minimal/  # Feature specifications and tasks
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start the full development server (frontend + backend on port 3000)
- `npm start` - Same as dev (alternative command)
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run test` - Run all tests

### Architecture Note

This app uses a **unified server approach**:
- **Single Port (3000)**: Both frontend and backend served together
- **Express.js**: Serves static frontend files AND handles API routes
- **No Separate Frontend Server**: Unlike typical Vite setups, everything runs on one server
- **Benefits**: Simpler deployment, no CORS issues, easier development

**Why not separate servers?**
- Vite dev server (5173) + Backend server (3000) = more complexity
- Our approach: One command, one port, everything works together

### Environment Variables

The application uses the following environment variables:

- `NODE_ENV` - Set to 'test' for test environment (uses in-memory database)

## 🌐 API Endpoints

### WebAuthn Authentication
- `POST /api/webauthn/register/challenge` - Get registration challenge
- `POST /api/webauthn/register/verify` - Verify registration
- `POST /api/webauthn/auth/challenge` - Get authentication challenge
- `POST /api/webauthn/auth/verify` - Verify authentication

### Banking Operations
- `GET /api/dashboard` - Get user dashboard data
- `POST /api/transfers` - Create a transfer
- `GET /api/audit` - Get audit events

## 🗄️ Database Schema

### Users Table
- `id` - Unique user identifier
- `username` - User's display name
- `credential_id` - WebAuthn credential ID
- `credential_public_key` - WebAuthn public key
- `balance` - Account balance (default: $5000)
- `created_at` - Account creation timestamp
- `last_login` - Last login timestamp

### Transactions Table
- `id` - Transaction ID
- `user_id` - Associated user
- `type` - 'credit' or 'debit'
- `amount` - Transaction amount
- `description` - Transaction description
- `timestamp` - Transaction timestamp
- `balance_after` - Balance after transaction

### Audit Events Table
- `id` - Event ID
- `user_id` - Associated user (null for registration attempts)
- `event_type` - Event type (registration, login_success, etc.)
- `event_data` - JSON event details
- `timestamp` - Event timestamp
- `ip_address` - Client IP address
- `user_agent` - Client user agent

## 🔒 Security Considerations

- **HTTPS Required**: WebAuthn only works over secure connections
- **Session Management**: JWT tokens expire after 30 minutes
- **Audit Logging**: All security events are logged for compliance
- **Input Validation**: All API inputs are validated
- **SQL Injection Protection**: Parameterized queries used throughout

## 🌟 Demo Scenarios

1. **New User Registration**:
   - Register with WebAuthn passkey
   - Automatic account creation with $5000 balance
   - Audit event logged

2. **Secure Login**:
   - Authenticate with passkey
   - JWT token issued for session
   - Dashboard access granted

3. **Banking Operations**:
   - View transaction history
   - Make transfers (balance validation)
   - Real-time balance updates

4. **Security Monitoring**:
   - View all audit events
   - Track authentication attempts
   - Monitor transfer activities

## 🤝 Contributing

1. Follow the existing code style and structure
2. Write tests for new features
3. Update documentation as needed
4. Ensure security best practices are maintained

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [WebAuthn Specification](https://www.w3.org/TR/webauthn-2/)
- [@simplewebauthn libraries](https://simplewebauthn.dev/)
- [FIDO Alliance](https://fidoalliance.org/) for WebAuthn standards

---

**Demo URL**: [Hosted application link when deployed]

**Security Benefit**: This application demonstrates how WebAuthn eliminates phishing attacks by binding credentials to specific domains, making stolen credentials useless on malicious sites.</content>
<parameter name="filePath">/home/kinux/projects/phishproof-mfa/README.md
