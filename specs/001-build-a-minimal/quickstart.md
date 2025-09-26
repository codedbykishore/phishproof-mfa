# Quickstart: Build a Minimal Banking Prototype with Phishing-Resistant MFA

## Prerequisites
- Node.js 18+ installed
- Modern web browser with WebAuthn support (Chrome 67+, Firefox 60+, Safari 14+, Edge 18+)
- Git for cloning the repository

## Demo Script

### 1. Access the Application
1. Open the hosted demo URL in a WebAuthn-compatible browser
2. You should see the login/register screen with two tabs

### 2. Register a Passkey
1. Click on the "Register" tab
2. Enter an optional username (or leave blank)
3. Click "Register Passkey"
4. Your browser will prompt you to create a passkey:
   - Choose a platform authenticator (device PIN/biometric) or security key
   - Follow the browser's passkey creation flow
5. Upon successful registration:
   - Green success indicator appears
   - Audit log shows "registration" event with timestamp
   - You are automatically switched to the authenticated state

### 3. Explore the Dashboard
1. After registration, you should see the Dashboard tab active
2. Verify the following:
   - Account holder name (defaults to "Demo User" if no username provided)
   - Initial balance of ₹5,000
   - Empty transaction history (no transactions yet)
   - Current timestamp in "Last Login" field

### 4. Make a Transfer
1. Click on the "Transactions" tab
2. Fill in the transfer form:
   - Amount: Enter a value less than your balance (e.g., ₹500)
   - Description: Enter a note (e.g., "Coffee purchase")
3. Click "Make Transfer"
4. Verify the following:
   - Green success indicator appears
   - Balance updates (decreases by transfer amount)
   - New transaction appears in the transaction list
   - Transaction shows debit type, amount, description, and timestamp

### 5. Check Audit Logs
1. Click on the "Audit/Logs" tab
2. Verify the audit trail shows:
   - Registration event with timestamp
   - Login success event with timestamp
   - Transfer event with transaction details and timestamp
3. All events should be properly timestamped and show success status

### 6. Test Authentication Flow
1. Close and reopen the browser (or use an incognito window)
2. Return to the demo URL
3. Click "Login with Passkey"
4. Your browser should prompt for passkey authentication
5. Select your previously created passkey
6. Verify successful login and return to dashboard

### 7. Test Error Scenarios
1. Try to transfer more money than your balance:
   - Should show red error indicator
   - Balance should not change
   - Error event should appear in audit log
2. Try invalid authentication:
   - Use incorrect passkey or cancel authentication
   - Should show red failure indicator
   - Login failure event should appear in audit log

## Expected Behavior Verification

✅ **Passkey Registration**: Browser prompts for credential creation, success indicator appears
✅ **Dashboard Display**: Shows correct balance, user info, and transaction history
✅ **Transfer Operations**: Balance updates correctly, transactions recorded
✅ **Audit Logging**: All security events timestamped and categorized
✅ **Authentication Flow**: Seamless passkey login without passwords
✅ **Error Handling**: Clear failure indicators for invalid operations
✅ **Session Management**: 30-minute session timeout (test by waiting)

## Security Validation

The demo proves WebAuthn's phishing resistance because:
- No passwords are used or stored anywhere
- Authentication happens directly between browser and authenticator
- No phishing site can capture or replay credentials
- Each authentication is cryptographically unique
- Audit logs prove successful WebAuthn operations

## Troubleshooting

- **"WebAuthn not supported"**: Update your browser to a recent version
- **Registration fails**: Check browser console for errors, ensure HTTPS
- **Login fails**: Verify you're using the same browser/device where you registered
- **Session expired**: Log in again with your passkey

## Demo Completion Criteria

The demo is successful when judges can:
1. Register a passkey without entering any passwords
2. View a realistic banking dashboard
3. Perform transfers that update the balance
4. See comprehensive audit logs proving WebAuthn success
5. Experience the phishing-resistant authentication flow
