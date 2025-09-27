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
   - Personalized welcome message with username
   - Initial balance of ₹5,000
   - Empty transaction history (no transactions yet)
   - Current timestamp in "Last Login" field
   - Red "Logout" button with warning indicator

### 4. Test Security Features
1. Hover over the red "Logout" button:
   - Should display security warning about session termination
   - Warning should remind about proper account security
2. Test session awareness:
   - Notice personalized elements specific to your registration
   - Observe security indicators throughout the interface

### 5. Make a Transfer (Basic)
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

### 6. Test User-to-User Transfers
1. In the Transactions tab, look for "User-to-User Transfer" section
2. Enter a recipient username in the search field
3. Select amount (e.g., ₹300) and add a note (e.g., "Lunch payment")
4. Click "Send Money"
5. **If amount is high-value (≥₹1000)**: Browser will prompt for WebAuthn confirmation
6. **Observe dual balance updates**:
   - Your balance decreases by transfer amount (e.g., ₹5000 → ₹4700)
   - Dashboard updates immediately showing new balance
   - Your transaction history shows: "₹300 sent to @recipient - Lunch payment (transfer_out)"
   - Recipient's balance increases by transfer amount (if you have access to their account)
   - Recipient's transaction history shows: "₹300 received from @yourusername - Lunch payment (transfer_in)"
7. **Check transaction details**:
   - Both sender and recipient get separate transaction records
   - Balance_after field shows correct balance for each user
   - Confirmation method shows "webauthn" or "password" based on transfer value

### 7. Test Basic Transfers (Existing Feature)
1. Use the original transfer form for non-user transfers
2. Enter amount (e.g., ₹100) and description (e.g., "ATM withdrawal")  
3. Click "Make Transfer"
4. **Observe single balance update**:
   - Your balance decreases: ₹4700 → ₹4600
   - Transaction shows: "₹100 - ATM withdrawal (debit)"
   - Only your account is affected (no recipient)

### 8. Check Enhanced Audit Logs
1. Click on the "Audit/Logs" tab
2. Verify the comprehensive audit trail shows:
   - Registration event with timestamp and authenticator info
   - Login success events with session details
   - Transfer events with detailed sender/recipient information:
     * "User transfer: ₹300 from @yourusername to @recipient (webauthn confirmed)"
     * "Balance change: ₹5000 → ₹4700 (sender)"
     * "Balance change: ₹2000 → ₹2300 (recipient)"
   - Basic transfer events: "Debit: ₹100 - ATM withdrawal"
   - WebAuthn authentication events for transfer confirmations
   - Session management events (login, logout, timeout warnings)
   - Security warnings and user interaction logs
3. Test audit log filtering:
   - Filter by event type (authentication, transfers, security)
   - Filter by date range  
   - Search for specific transaction amounts or descriptions
   - Verify balance changes are accurately tracked for both parties

### 9. Test Authentication Flow
1. Click the red "Logout" button:
   - Should show security warning popup
   - Confirm logout to end session
2. Return to login screen and click "Login with Passkey"
3. Your browser should prompt for passkey authentication
4. Select your previously created passkey
5. Verify successful login with personalized welcome message and correct balance

### 10. Test Error Scenarios
1. **Insufficient balance test**:
   - Try to transfer more money than your balance (e.g., ₹10,000 when you have ₹4,600)
   - Should show red error: "Insufficient balance. Available: ₹4,600, Required: ₹10,000"
   - Balance should remain unchanged
   - Error audit event should be logged
2. **Invalid user-to-user transfer**:
   - Enter non-existent recipient username
   - Should show "User not found" error
   - No WebAuthn prompt should appear
   - No balance changes should occur
3. **Transfer confirmation cancellation**:
   - Start a high-value transfer (≥₹1000)  
   - Cancel the WebAuthn prompt
   - Should show "Transfer cancelled by user"
   - No partial transaction should be recorded
   - Both sender and recipient balances remain unchanged

## Expected Behavior Verification

✅ **Passkey Registration**: Browser prompts for credential creation, success indicator appears
✅ **Personalized Dashboard**: Shows welcome message with username and security indicators
✅ **User-to-User Transfers**: WebAuthn confirmation required for high-value transfers
✅ **Enhanced Security**: Red logout button with warnings, session awareness
✅ **Comprehensive Audit**: Detailed logs with filtering and search capabilities
✅ **Transfer Operations**: Both basic and user-to-user transfers work correctly
✅ **Authentication Flow**: Seamless passkey login with personalization
✅ **Error Handling**: Clear failure indicators for invalid operations with details
✅ **Session Management**: 30-minute timeout with proper warning system

## Security Validation

The demo proves WebAuthn's phishing resistance and enhanced security because:
- No passwords are used or stored anywhere
- Authentication happens directly between browser and authenticator
- No phishing site can capture or replay credentials
- Each authentication is cryptographically unique
- User-to-user transfers require additional WebAuthn confirmation
- Comprehensive audit logs prove all WebAuthn operations
- Personalized security warnings prevent accidental logouts
- Session management with proper timeout and warning systems

## Troubleshooting

- **"WebAuthn not supported"**: Update your browser to a recent version
- **Registration fails**: Check browser console for errors, ensure HTTPS
- **Login fails**: Verify you're using the same browser/device where you registered
- **User search empty**: Ensure other demo users exist, or register additional test accounts
- **Transfer confirmation hangs**: Check WebAuthn prompt isn't hidden behind other windows
- **Session expired**: Log in again with your passkey, check audit logs for session events
- **Audit filtering broken**: Clear filters and try different search terms

## Demo Completion Criteria

The demo is successful when judges can:
1. Register and login using only WebAuthn (no passwords)
2. See personalized dashboard with welcome message and security indicators
3. Perform both basic and user-to-user transfers with appropriate confirmations
4. Observe comprehensive audit logging with filtering capabilities
5. Experience enhanced security features like logout warnings
6. Understand the phishing-resistant nature of the authentication system
7. Test error scenarios and see proper handling with detailed feedback
1. Register a passkey without entering any passwords
2. View a realistic banking dashboard
3. Perform transfers that update the balance
4. See comprehensive audit logs proving WebAuthn success
5. Experience the phishing-resistant authentication flow
