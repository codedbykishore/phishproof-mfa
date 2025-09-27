import { describe, it, expect } from '@jest/globals';
import { generateToken, verifyToken } from '../../src/backend/auth.js';
import { hashPassword, verifyPassword } from '../../src/backend/database.js';

describe('Authentication Functions', () => {
  describe('Password Hashing', () => {
    it('should hash password successfully', async () => {
      const result = await hashPassword('testpassword123');
      expect(result.success).toBe(true);
      expect(result.hash).toBeDefined();
      expect(typeof result.hash).toBe('string');
      expect(result.hash.length).toBeGreaterThan(10);
    });

    it('should hash empty password (bcrypt allows it)', async () => {
      const result = await hashPassword('');
      expect(result.success).toBe(true);
      expect(result.hash).toBeDefined();
    });
  });

  describe('Password Verification', () => {
    it('should verify correct password', async () => {
      const password = 'testpassword123';
      const hashResult = await hashPassword(password);
      expect(hashResult.success).toBe(true);

      const verifyResult = await verifyPassword(password, hashResult.hash);
      expect(verifyResult.success).toBe(true);
      expect(verifyResult.isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testpassword123';
      const wrongPassword = 'wrongpassword';
      const hashResult = await hashPassword(password);
      expect(hashResult.success).toBe(true);

      const verifyResult = await verifyPassword(wrongPassword, hashResult.hash);
      expect(verifyResult.success).toBe(true);
      expect(verifyResult.isValid).toBe(false);
    });
  });

  describe('JWT Token Management', () => {
    it('should generate valid token', () => {
      const result = generateToken('user123', 'testuser');
      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
    });

    it('should verify valid token', () => {
      const tokenResult = generateToken('user123', 'testuser');
      expect(tokenResult.success).toBe(true);

      const verifyResult = verifyToken(tokenResult.token);
      expect(verifyResult.success).toBe(true);
      expect(verifyResult.payload.userId).toBe('user123');
      expect(verifyResult.payload.username).toBe('testuser');
    });

    it('should reject invalid token', () => {
      const result = verifyToken('invalid.token.here');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});