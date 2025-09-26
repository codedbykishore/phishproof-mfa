import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize database connection
const dbPath =
  process.env.NODE_ENV === 'test'
    ? ':memory:'
    : path.join(__dirname, '../../data/phishproof-mfa.db');

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Database schema
const SCHEMA = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT,
    balance REAL NOT NULL DEFAULT 5000.00 CHECK (balance >= 0),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
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
CREATE TABLE IF NOT EXISTS audit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    event_type TEXT NOT NULL CHECK (event_type IN ('registration', 'login_success', 'login_failure', 'transfer')),
    event_data TEXT NOT NULL,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_timestamp ON transactions(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp ON audit_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_user ON audit_events(user_id);
`;

// Initialize database
function initializeDatabase() {
  db.exec(SCHEMA);
}

// User model functions
const userQueries = {
  // Create a new user
  get create() {
    return db.prepare(`
      INSERT INTO users (id, username, balance)
      VALUES (?, ?, ?)
    `);
  },

  // Find user by ID
  get findById() {
    return db.prepare(`
      SELECT id, username, balance, created_at, last_login
      FROM users
      WHERE id = ?
    `);
  },

  // Find user by username
  get findByUsername() {
    return db.prepare(`
      SELECT id, username, balance, created_at, last_login
      FROM users
      WHERE username = ?
    `);
  },

  // Update user balance
  get updateBalance() {
    return db.prepare(`
      UPDATE users
      SET balance = ?
      WHERE id = ?
    `);
  },

  // Update last login timestamp
  get updateLastLogin() {
    return db.prepare(`
      UPDATE users
      SET last_login = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
  },

  // Get all users (for admin purposes)
  get findAll() {
    return db.prepare(`
      SELECT id, username, balance, created_at, last_login
      FROM users
      ORDER BY created_at DESC
    `);
  },
};

// Transaction model functions
const transactionQueries = {
  // Create a new transaction
  get create() {
    return db.prepare(`
      INSERT INTO transactions (user_id, type, amount, description, balance_after)
      VALUES (?, ?, ?, ?, ?)
    `);
  },

  // Find transactions by user ID
  get findByUserId() {
    return db.prepare(`
      SELECT id, user_id, type, amount, description, timestamp, balance_after
      FROM transactions
      WHERE user_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
  },

  // Get user's current balance
  get getBalance() {
    return db.prepare(`
      SELECT balance FROM users WHERE id = ?
    `);
  },
};

// Audit event model functions
const auditQueries = {
  // Create a new audit event
  get create() {
    return db.prepare(`
      INSERT INTO audit_events (user_id, event_type, event_data, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `);
  },

  // Find audit events by user ID
  get findByUserId() {
    return db.prepare(`
      SELECT id, user_id, event_type, event_data, timestamp, ip_address, user_agent
      FROM audit_events
      WHERE user_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
  },

  // Find all audit events (for admin purposes)
  get findAll() {
    return db.prepare(`
      SELECT id, user_id, event_type, event_data, timestamp, ip_address, user_agent
      FROM audit_events
      ORDER BY timestamp DESC
      LIMIT ?
    `);
  },

  // Clean up old audit events (older than 24 hours)
  get cleanupOldEvents() {
    return db.prepare(`
      DELETE FROM audit_events
      WHERE timestamp < datetime('now', '-1 day')
    `);
  },
};

// User model wrapper functions
function createUser(id, username = null, initialBalance = 5000.0) {
  try {
    const result = userQueries.create.run(id, username, initialBalance);
    return { success: true, userId: id, changes: result.changes };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function findUserById(id) {
  try {
    const user = userQueries.findById.get(id);
    return user
      ? { success: true, user }
      : { success: false, error: 'User not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function findUserByUsername(username) {
  try {
    const user = userQueries.findByUsername.get(username);
    return user
      ? { success: true, user }
      : { success: false, error: 'User not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function updateUserBalance(id, newBalance) {
  try {
    const result = userQueries.updateBalance.run(newBalance, id);
    return { success: result.changes > 0, changes: result.changes };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function updateUserLastLogin(id) {
  try {
    const result = userQueries.updateLastLogin.run(id);
    return { success: result.changes > 0, changes: result.changes };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function getAllUsers() {
  try {
    const users = userQueries.findAll.all();
    return { success: true, users };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Transaction model wrapper functions
function createTransaction(userId, type, amount, description, balanceAfter) {
  try {
    const result = transactionQueries.create.run(
      userId,
      type,
      amount,
      description,
      balanceAfter
    );
    return {
      success: true,
      transactionId: result.lastInsertRowid,
      changes: result.changes,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function getUserTransactions(userId, limit = 50) {
  try {
    const transactions = transactionQueries.findByUserId.all(userId, limit);
    return { success: true, transactions };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function getUserBalance(userId) {
  try {
    const result = transactionQueries.getBalance.get(userId);
    return result
      ? { success: true, balance: result.balance }
      : { success: false, error: 'User not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Audit event model wrapper functions
function createAuditEvent(
  userId,
  eventType,
  eventData,
  ipAddress = null,
  userAgent = null
) {
  try {
    const result = auditQueries.create.run(
      userId,
      eventType,
      JSON.stringify(eventData),
      ipAddress,
      userAgent
    );
    return {
      success: true,
      eventId: result.lastInsertRowid,
      changes: result.changes,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function getUserAuditEvents(userId, limit = 50) {
  try {
    const events = auditQueries.findByUserId.all(userId, limit);
    // Parse JSON event_data
    const parsedEvents = events.map((event) => ({
      ...event,
      event_data: JSON.parse(event.event_data),
    }));
    return { success: true, events: parsedEvents };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function getAllAuditEvents(limit = 100) {
  try {
    const events = auditQueries.findAll.all(limit);
    // Parse JSON event_data
    const parsedEvents = events.map((event) => ({
      ...event,
      event_data: JSON.parse(event.event_data),
    }));
    return { success: true, events: parsedEvents };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function cleanupOldAuditEvents() {
  try {
    const result = auditQueries.cleanupOldEvents.run();
    return { success: true, deletedCount: result.changes };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Initialize database on module load
initializeDatabase();

export {
  // Database instance (for advanced operations)
  db,

  // User functions
  createUser,
  findUserById,
  findUserByUsername,
  updateUserBalance,
  updateUserLastLogin,
  getAllUsers,

  // Transaction functions
  createTransaction,
  getUserTransactions,
  getUserBalance,

  // Audit functions
  createAuditEvent,
  getUserAuditEvents,
  getAllAuditEvents,
  cleanupOldAuditEvents,

  // Database management
  initializeDatabase,
};
