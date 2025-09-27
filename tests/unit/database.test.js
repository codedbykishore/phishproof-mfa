import { describe, it, expect, beforeAll } from '@jest/globals';
import { initializeDatabase, createUser, findUserByUsername, findUserById } from '../../src/backend/database.js';
import { randomUUID } from 'crypto';

describe('Database Functions', () => {
  beforeAll(() => {
    initializeDatabase();
  });

  describe('User Management', () => {
    it('should create user successfully', () => {
      const userId = randomUUID();
      const result = createUser(
        userId,
        'testuser',
        '$2a$12$hash',
        'credentialid',
        'publickey',
        0
      );
      
      expect(result.success).toBe(true);
      expect(result.userId).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.changes).toBe(1);
    });

    it('should find user by username', () => {
      const userId = randomUUID();
      const username = 'findbyusername';
      
      // Create user first
      const createResult = createUser(
        userId,
        username,
        '$2a$12$hash',
        'credentialid',
        'publickey',
        0
      );
      expect(createResult.success).toBe(true);

      // Find user
      const findResult = findUserByUsername(username);
      expect(findResult.success).toBe(true);
      expect(findResult.user.username).toBe(username);
      expect(findResult.user.id).toBe(userId);
    });

    it('should find user by ID', () => {
      const userId = randomUUID();
      const username = 'findbyid';
      
      // Create user first
      const createResult = createUser(
        userId,
        username,
        '$2a$12$hash',
        'credentialid',
        'publickey',
        0
      );
      expect(createResult.success).toBe(true);

      // Find user by ID
      const findResult = findUserById(userId);
      expect(findResult.success).toBe(true);
      expect(findResult.user.id).toBe(userId);
      expect(findResult.user.username).toBe(username);
    });

    it('should return error for non-existent user', () => {
      const result = findUserByUsername('nonexistentuser');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});