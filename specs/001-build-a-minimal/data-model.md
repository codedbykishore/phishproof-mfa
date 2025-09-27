# Data Model: Build a Minimal Banking Prototype with Phishing-Resistant MFA

## User Entity
- **id**: TEXT (WebAuthn credential ID, primary key)
- **username**: TEXT (optional display name)
- **balance**: REAL (current account balance in rupees)
- **created_at**: DATETIME
- **last_login**: DATETIME

**Validation Rules**:
- id: Required, unique, matches WebAuthn credential ID format
- balance: >= 0, defaults to 5000.00
- created_at: Auto-generated timestamp
- last_login: Updated on successful authentication

## Transaction Entity
- **id**: INTEGER (auto-increment primary key)
- **user_id**: TEXT (foreign key to User.id)
- **type**: TEXT ('credit', 'debit')
- **amount**: REAL (> 0)
- **description**: TEXT
- **timestamp**: DATETIME
- **balance_after**: REAL (account balance after transaction)

**Validation Rules**:
- user_id: Must reference existing User
- type: Must be 'credit' or 'debit'
- amount: Must be positive number
- balance_after: Must be >= 0 for debit transactions

**Relationships**:
- Transaction belongs to User (many-to-one)
- User has many Transactions (ordered by timestamp DESC)

## AuditEvent Entity
- **id**: INTEGER (auto-increment primary key)
- **user_id**: TEXT (foreign key to User.id, nullable for registration events)
- **event_type**: TEXT ('registration', 'login_success', 'login_failure', 'transfer')
- **event_data**: TEXT (JSON string with event details)
- **timestamp**: DATETIME
- **ip_address**: TEXT (client IP for security tracking)
- **user_agent**: TEXT (browser/client info)

**Validation Rules**:
- event_type: Must be one of defined types
- event_data: Valid JSON string
- timestamp: Auto-generated, indexed for queries

**Retention Policy**: Events older than 24 hours are automatically deleted

## Database Schema

```sql
-- Users table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT,
    balance REAL NOT NULL DEFAULT 5000.00 CHECK (balance >= 0),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

-- Transactions table (Enhanced)
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('credit', 'debit', 'transfer_out', 'transfer_in')),
    amount REAL NOT NULL CHECK (amount > 0),
    description TEXT,
    recipient_user_id TEXT, -- For user-to-user transfers
    recipient_username TEXT, -- Stored for display purposes
    confirmation_method TEXT CHECK (confirmation_method IN ('webauthn', 'password')), -- How transfer was confirmed
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    balance_after REAL NOT NULL CHECK (balance_after >= 0),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (recipient_user_id) REFERENCES users(id)
);

-- Audit events table (Enhanced)
CREATE TABLE audit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    event_type TEXT NOT NULL CHECK (event_type IN ('registration', 'login_success', 'login_failure', 'transfer', 'user_transfer', 'session_warning', 'logout')),
    event_data TEXT NOT NULL, -- JSON string with enhanced detail
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT,
    severity TEXT CHECK (severity IN ('info', 'warning', 'error')) DEFAULT 'info',
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX idx_transactions_user_timestamp ON transactions(user_id, timestamp DESC);
CREATE INDEX idx_audit_events_timestamp ON audit_events(timestamp DESC);
CREATE INDEX idx_audit_events_user ON audit_events(user_id);
```

## State Transitions

### User States
- **Unregistered**: No WebAuthn credential, cannot access app
- **Registered**: Has WebAuthn credential, can authenticate
- **Authenticated**: Active session, can perform transactions

### Session States
- **Anonymous**: No user context, show login/register options with warning if already logged in
- **Authenticated**: User logged in, show personalized dashboard with welcome message
- **Transfer Confirmation**: WebAuthn/passkey required for transfer operations above threshold
- **Auto-Logout Warning**: Countdown display before session expiry
- **Expired**: Session timeout after 30 minutes, return to anonymous state

### Transfer Types
- **Self Transfer**: Simple balance deduction (existing functionality)
- **User-to-User Transfer**: Transfer between registered users with recipient validation
- **Confirmed Transfer**: Transfers requiring WebAuthn confirmation for security

## Enhanced Data Flow

### Balance and Transaction Management

**User-to-User Transfer Flow:**
1. **Sender Validation**: Check sender has sufficient balance for transfer amount
2. **Recipient Validation**: Verify recipient user exists and is active
3. **WebAuthn Confirmation**: For transfers above threshold (e.g., ₹1000), require WebAuthn confirmation
4. **Dual Balance Update**: 
   - Sender balance: `balance = current_balance - transfer_amount`
   - Recipient balance: `balance = current_balance + transfer_amount`
5. **Dual Transaction Records**:
   - Sender transaction: type='transfer_out', amount=transfer_amount, recipient_user_id, balance_after=new_sender_balance
   - Recipient transaction: type='transfer_in', amount=transfer_amount, recipient_user_id=sender_id, balance_after=new_recipient_balance
6. **Dashboard Updates**: Real-time balance display updates for both users (if logged in)
7. **Audit Events**: Detailed logging with sender/recipient info, amounts, confirmation method

**Basic Transfer Flow (Existing):**
1. **Balance Check**: Verify user has sufficient balance
2. **Single Balance Update**: `balance = current_balance - transfer_amount`
3. **Single Transaction Record**: type='debit', amount=transfer_amount, balance_after=new_balance
4. **Dashboard Update**: Real-time balance display update
5. **Audit Event**: Transfer completion logged

**Dashboard Balance Display:**
- **Real-time Updates**: Balance reflects immediately after successful transfers
- **Transaction History**: Shows all transaction types with clear indicators:
  - 'debit': Basic transfer out (red/negative)
  - 'transfer_out': Money sent to another user (red/negative with recipient name)
  - 'transfer_in': Money received from another user (green/positive with sender name)
  - 'credit': Money added to account (green/positive)

### Transaction Display Rules

**Transaction List Format:**
```
₹500 sent to @johndoe - Coffee payment
Type: transfer_out | Balance after: ₹4,500 | 2025-09-27 14:30:15

₹200 received from @alicesmith - Rent split
Type: transfer_in | Balance after: ₹4,700 | 2025-09-27 14:25:10

₹100 - ATM withdrawal
Type: debit | Balance after: ₹4,600 | 2025-09-27 14:20:05
```

**Balance Consistency Rules:**
- All balance updates must be atomic (succeed or fail completely)
- User-to-user transfers require both sender debit AND recipient credit to succeed
- If any part of user-to-user transfer fails, no balance changes occur
- Dashboard balance always matches the latest transaction's balance_after value

1. **Registration**: WebAuthn credential created → User record inserted → Audit event logged → Redirect to login (not dashboard)
2. **Authentication**: Password verified → WebAuthn assertion verified → Session created → Welcome message displayed → User.last_login updated → Audit event logged
3. **User Search**: Query users for transfer recipients → Return masked usernames for privacy
4. **User Transfer**: Recipient validated → WebAuthn confirmation (for high-value transfers) → Both users' balances updated → Transaction records created → Detailed audit events logged
5. **Session Management**: Periodic expiry checks → Auto-logout warnings → Graceful session cleanup → User notification
6. **Enhanced Audit**: Detailed event tracking → Transfer recipient information → Security event categorization → 24-hour retention policy</content>
<parameter name="filePath">/home/kinux/projects/phishproof-mfa/specs/001-build-a-minimal/data-model.md
