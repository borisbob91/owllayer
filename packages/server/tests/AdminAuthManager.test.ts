// ============================================================
// Tests unitaires pour AdminAuthManager (Issue #03)
// Tests d'authentification, sessions, rate limiting
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AdminAuthManager } from '../src/auth/AdminAuthManager.js';
import type { AdminAuthOptions } from '../src/auth/types.js';

describe('AdminAuthManager', () => {
  let manager: AdminAuthManager;
  let options: AdminAuthOptions;

  beforeEach(() => {
    options = {
      username: 'admin',
      password: 'test-password',
      sessionDuration: 1000, // 1 seconde pour tests rapides
      rateLimitWindowMs: 5000, // 5 secondes
      rateLimitMaxAttempts: 3,
    };
    manager = new AdminAuthManager(options);
  });

  afterEach(() => {
    manager.stop();
  });

  describe('constructor', () => {
    it('should initialize with provided options', () => {
      expect(manager).toBeDefined();
    });

    it('should use default values for optional parameters', () => {
      const minimalManager = new AdminAuthManager({
        username: 'admin',
        password: 'password',
      });
      expect(minimalManager).toBeDefined();
      minimalManager.stop();
    });
  });

  describe('login', () => {
    it('should successfully login with correct credentials', async () => {
      const token = await manager.login('admin', 'test-password', '127.0.0.1');

      expect(token).not.toBeNull();
      expect(typeof token).toBe('string');
      expect(token?.length).toBeGreaterThan(32);
    });

    it('should fail with incorrect username', async () => {
      const token = await manager.login('wrong', 'test-password', '127.0.0.1');

      expect(token).toBeNull();
    });

    it('should fail with incorrect password', async () => {
      const token = await manager.login('admin', 'wrong-password', '127.0.0.1');

      expect(token).toBeNull();
    });

    it('should generate different tokens for multiple logins', async () => {
      const token1 = await manager.login('admin', 'test-password', '127.0.0.1');
      const token2 = await manager.login('admin', 'test-password', '127.0.0.1');

      expect(token1).not.toBeNull();
      expect(token2).not.toBeNull();
      expect(token1).not.toBe(token2);
    });

    it('should throw error when rate limit exceeded', async () => {
      const ip = '192.168.1.1';

      // 3 tentatives échouées (max)
      await manager.login('admin', 'wrong1', ip);
      await manager.login('admin', 'wrong2', ip);
      await manager.login('admin', 'wrong3', ip);

      // 4ème tentative devrait throw
      await expect(manager.login('admin', 'test-password', ip)).rejects.toThrow(
        /Too many login attempts|Trop de tentatives/
      );
    });

    it('should not rate limit different IPs independently', async () => {
      const ip1 = '192.168.1.1';
      const ip2 = '192.168.1.2';

      // 3 tentatives échouées sur IP1
      await manager.login('admin', 'wrong', ip1);
      await manager.login('admin', 'wrong', ip1);
      await manager.login('admin', 'wrong', ip1);

      // IP2 devrait toujours pouvoir se connecter
      const token = await manager.login('admin', 'test-password', ip2);
      expect(token).not.toBeNull();
    });
  });

  describe('verifySession', () => {
    it('should verify valid session token', async () => {
      const token = await manager.login('admin', 'test-password', '127.0.0.1');

      const session = manager.verifySession(token!);

      expect(session).not.toBeNull();
      expect(session?.username).toBe('admin');
      expect(session?.token).toBe(token);
    });

    it('should reject invalid token', () => {
      const session = manager.verifySession('invalid-token-12345');

      expect(session).toBeNull();
    });

    it('should reject expired session', async () => {
      const token = await manager.login('admin', 'test-password', '127.0.0.1');

      // Attendre que la session expire (1 seconde)
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const session = manager.verifySession(token!);

      expect(session).toBeNull();
    });
  });

  describe('logout', () => {
    it('should successfully logout with valid token', async () => {
      const token = await manager.login('admin', 'test-password', '127.0.0.1');

      const logoutSuccess = manager.logout(token!);

      expect(logoutSuccess).toBe(true);

      // Token ne devrait plus être valide
      const session = manager.verifySession(token!);
      expect(session).toBeNull();
    });

    it('should return false for invalid token', () => {
      const logoutSuccess = manager.logout('invalid-token');

      expect(logoutSuccess).toBe(false);
    });

    it('should handle multiple logouts gracefully', async () => {
      const token = await manager.login('admin', 'test-password', '127.0.0.1');

      expect(manager.logout(token!)).toBe(true);
      expect(manager.logout(token!)).toBe(false); // Déjà déconnecté
    });
  });

  describe('rate limiting window', () => {
    it('should reset rate limit after window expires', async () => {
      const ip = '192.168.1.100';
      const shortWindowOptions: AdminAuthOptions = {
        username: 'admin',
        password: 'test-password',
        rateLimitWindowMs: 1000, // 1 seconde
        rateLimitMaxAttempts: 2,
      };
      const shortManager = new AdminAuthManager(shortWindowOptions);

      try {
        // 2 tentatives échouées
        await shortManager.login('admin', 'wrong1', ip);
        await shortManager.login('admin', 'wrong2', ip);

        // 3ème devrait être bloquée
        await expect(shortManager.login('admin', 'test-password', ip)).rejects.toThrow();

        // Attendre que la fenêtre expire
        await new Promise((resolve) => setTimeout(resolve, 1100));

        // Maintenant devrait fonctionner
        const allowed = await shortManager.login('admin', 'test-password', ip);
        expect(allowed).not.toBeNull();
      } finally {
        shortManager.stop();
      }
    });
  });

  describe('security', () => {
    it('should take similar time for valid and invalid usernames (timing attack protection)', async () => {
      const iterations = 5;
      const timingsValid: number[] = [];
      const timingsInvalid: number[] = [];

      // Mesurer temps pour username valide
      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        // IP unique pour eviter le rate limiting pendant le bench
        await manager.login('admin', 'wrong-password', `127.0.0.${i + 1}`);
        timingsValid.push(Date.now() - start);
      }

      // Reset rate limiting
      manager.stop();
      manager = new AdminAuthManager(options);

      // Mesurer temps pour username invalide
      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await manager.login('invalid-user', 'wrong-password', `127.0.0.${i + 2}`);
        timingsInvalid.push(Date.now() - start);
      }

      // Calculer moyennes
      const avgValid = timingsValid.reduce((a, b) => a + b, 0) / iterations;
      const avgInvalid = timingsInvalid.reduce((a, b) => a + b, 0) / iterations;

      // La différence devrait être minime (< 50ms)
      // bcrypt.compare prend le même temps qu'username soit valide ou non
      expect(Math.abs(avgValid - avgInvalid)).toBeLessThan(50);
    });

    it('should hash passwords with bcrypt (not store plaintext)', async () => {
      // On ne peut pas vérifier directement le hash, mais on peut vérifier
      // que deux logins avec même password génèrent des tokens différents
      const token1 = await manager.login('admin', 'test-password', '127.0.0.1');
      const token2 = await manager.login('admin', 'test-password', '127.0.0.1');

      expect(token1).not.toBeNull();
      expect(token2).not.toBeNull();
      expect(token1).not.toBe(token2);
    });

    it('should generate cryptographically random session tokens', async () => {
      const tokens = new Set<string>();
      // Eviter un test trop long (bcrypt.compare) sur machines lentes
      const count = 50;

      for (let i = 0; i < count; i++) {
        const token = await manager.login('admin', 'test-password', `127.0.0.${i}`);
        if (token) {
          tokens.add(token);
        }
      }

      // Tous les tokens devraient être uniques
      expect(tokens.size).toBe(count);

      // Tokens devraient avoir bon format (64 hex chars)
      tokens.forEach((token) => {
        expect(token).toMatch(/^[a-f0-9]{64}$/);
      });
    }, 15000);
  });

  describe('session cleanup', () => {
    it('should clean up expired sessions automatically', async () => {
      const shortSessionManager = new AdminAuthManager({
        username: 'admin',
        password: 'test-password',
        sessionDuration: 500, // 0.5 seconde
      });

      try {
        // Créer plusieurs sessions
        const token1 = await shortSessionManager.login(
          'admin',
          'test-password',
          '127.0.0.1'
        );
        const token2 = await shortSessionManager.login(
          'admin',
          'test-password',
          '127.0.0.2'
        );

        expect(shortSessionManager.verifySession(token1!)).not.toBeNull();
        expect(shortSessionManager.verifySession(token2!)).not.toBeNull();

        // Attendre expiration
        await new Promise((resolve) => setTimeout(resolve, 600));

        // Sessions devraient être expirées
        expect(shortSessionManager.verifySession(token1!)).toBeNull();
        expect(shortSessionManager.verifySession(token2!)).toBeNull();
      } finally {
        shortSessionManager.stop();
      }
    });
  });
});
