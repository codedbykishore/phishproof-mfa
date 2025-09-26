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

-- Transactions table
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
    amount REAL NOT NULL CHECK (amount > 0),
    description TEXT,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    balance_after REAL NOT NULL CHECK (balance_after >= 0),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Audit events table
CREATE TABLE audit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    event_type TEXT NOT NULL CHECK (event_type IN ('registration', 'login_success', 'login_failure', 'transfer')),
    event_data TEXT NOT NULL, -- JSON string
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT,
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
- **Anonymous**: No user context, show login/register options
- **Authenticated**: User logged in, show dashboard and transaction features
- **Expired**: Session timeout after 30 minutes, return to anonymous state

## Data Flow

1. **Registration**: WebAuthn credential created → User record inserted → Audit event logged
2. **Authentication**: WebAuthn assertion verified → Session created → User.last_login updated → Audit event logged
3. **Transaction**: Balance validated → Transaction inserted → User balance updated → Audit event logged
4. **Session Expiry**: Automatic cleanup after 30 minutes of inactivity</content>
<parameter name="filePath">/home/kinux/projects/phishproof-mfa/specs/001-build-a-minimal/data-model.md
