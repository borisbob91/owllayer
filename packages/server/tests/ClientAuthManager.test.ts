// ============================================================
// Tests unitaires pour ClientAuthManager (Issue #03)
// Tests d'authentification API keys et limites de connexion
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ClientAuthManager } from "../src/auth/ClientAuthManager.js";
import type { ClientAuthOptions } from "../src/auth/types.js";
import type { IncomingMessage } from "http";

// Helper pour créer des mock requests
function createMockRequest(apiKey?: string): IncomingMessage {
  return {
    headers: {
      authorization: apiKey ? `Bearer ${apiKey}` : undefined,
    },
    url: "/test",
  } as IncomingMessage;
}

describe("ClientAuthManager", () => {
  let manager: ClientAuthManager;

  beforeEach(() => {
    manager = new ClientAuthManager({
      requireApiKey: true,
      maxConnectionsPerKey: 3,
    });
  });

  describe("constructor", () => {
    it("should initialize with default options", () => {
      const defaultManager = new ClientAuthManager();
      expect(defaultManager).toBeDefined();
    });

    it("should initialize with custom options", () => {
      const customManager = new ClientAuthManager({
        requireApiKey: false,
        maxConnectionsPerKey: 10,
        enableApiKeyManagement: true,
      });
      expect(customManager).toBeDefined();
    });
  });

  describe("authenticate", () => {
    it("should authenticate valid API key", async () => {
      manager.addKey("pk_test_valid123");
      const req = createMockRequest("pk_test_valid123");

      const result = await manager.authenticate(req);

      expect(result.authenticated).toBe(true);
      expect(result.apiKey).toBe("pk_test_valid123");
    });

    it("should reject invalid API key", async () => {
      const req = createMockRequest("pk_invalid_key");

      const result = await manager.authenticate(req);

      expect(result.authenticated).toBe(false);
      expect(result.apiKey).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    it("should reject request without API key when required", async () => {
      const req = createMockRequest();

      const result = await manager.authenticate(req);

      expect(result.authenticated).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should allow request without API key when not required", async () => {
      const permissiveManager = new ClientAuthManager({
        requireApiKey: false,
      });
      const req = createMockRequest();

      const result = await permissiveManager.authenticate(req);

      expect(result.authenticated).toBe(true);
    });
  });

  describe("API key management", () => {
    it("should add API key successfully", () => {
      manager.addKey("pk_new_key123");
      const keys = manager.getKeys();

      expect(keys).toContain("pk_new_key123");
    });

    it("should remove API key successfully", () => {
      manager.addKey("pk_to_remove");
      expect(manager.getKeys()).toContain("pk_to_remove");

      manager.removeKey("pk_to_remove");
      expect(manager.getKeys()).not.toContain("pk_to_remove");
    });

    it("should retrieve all API keys", () => {
      manager.addKey("pk_key1");
      manager.addKey("pk_key2");
      manager.addKey("pk_key3");

      const keys = manager.getKeys();

      expect(keys).toHaveLength(3);
      expect(keys).toContain("pk_key1");
      expect(keys).toContain("pk_key2");
      expect(keys).toContain("pk_key3");
    });

    it("should use custom validator if provided", async () => {
      const customValidator = vi.fn(async (key: string) => {
        return key.startsWith("custom_");
      });

      manager.setValidator(customValidator);

      const validReq = createMockRequest("custom_valid");
      const invalidReq = createMockRequest("pk_invalid");

      const validResult = await manager.authenticate(validReq);
      const invalidResult = await manager.authenticate(invalidReq);

      expect(validResult.authenticated).toBe(true);
      expect(invalidResult.authenticated).toBe(false);
      expect(customValidator).toHaveBeenCalledTimes(2);
    });
  });

  describe("connection tracking", () => {
    it("should register connection successfully", () => {
      manager.addKey("pk_test_conn");

      const result = manager.registerConnection("pk_test_conn");

      expect(result.allowed).toBe(true);
    });

    it("should enforce max connections limit", () => {
      manager.addKey("pk_limited");

      // Enregistrer 3 connexions (max)
      expect(manager.registerConnection("pk_limited").allowed).toBe(true);
      expect(manager.registerConnection("pk_limited").allowed).toBe(true);
      expect(manager.registerConnection("pk_limited").allowed).toBe(true);

      // 4ème devrait être refusée
      const result = manager.registerConnection("pk_limited");

      expect(result.allowed).toBe(false);
      expect(result.message).toContain("Max connections");
    });

    it("should release connection and allow new one", () => {
      manager.addKey("pk_release_test");

      // Remplir les 3 slots
      manager.registerConnection("pk_release_test");
      manager.registerConnection("pk_release_test");
      manager.registerConnection("pk_release_test");

      // 4ème refusée
      expect(manager.registerConnection("pk_release_test").allowed).toBe(false);

      // Libérer une connexion
      manager.releaseConnection("pk_release_test");

      // Maintenant devrait être acceptée
      expect(manager.registerConnection("pk_release_test").allowed).toBe(true);
    });

    it("should handle multiple releases gracefully", () => {
      manager.addKey("pk_multi_release");

      manager.registerConnection("pk_multi_release");

      // Devrait pouvoir releaser plusieurs fois sans erreur
      expect(() => {
        manager.releaseConnection("pk_multi_release");
        manager.releaseConnection("pk_multi_release");
        manager.releaseConnection("pk_multi_release");
      }).not.toThrow();
    });

    it("should track connections independently per key", () => {
      manager.addKey("pk_key_a");
      manager.addKey("pk_key_b");

      // Remplir key_a
      manager.registerConnection("pk_key_a");
      manager.registerConnection("pk_key_a");
      manager.registerConnection("pk_key_a");

      // key_a devrait être full
      expect(manager.registerConnection("pk_key_a").allowed).toBe(false);

      // key_b devrait toujours avoir de la place
      expect(manager.registerConnection("pk_key_b").allowed).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle connection tracking for unknown key", () => {
      const result = manager.registerConnection("pk_unknown_key");

      // Devrait accepter (pas de limite si clé inconnue)
      expect(result.allowed).toBe(true);
    });

    it("should handle release for unknown key", () => {
      expect(() => {
        manager.releaseConnection("pk_unknown_key");
      }).not.toThrow();
    });

    it("should handle empty API key list", () => {
      const emptyManager = new ClientAuthManager({ requireApiKey: true });
      const keys = emptyManager.getKeys();

      expect(keys).toHaveLength(0);
    });

    it("should handle duplicate API key additions", () => {
      manager.addKey("pk_duplicate");
      manager.addKey("pk_duplicate");

      const keys = manager.getKeys();

      // Devrait ignorer les doublons
      expect(keys.filter((k) => k === "pk_duplicate").length).toBe(1);
    });
  });

  describe("integration with connection lifecycle", () => {
    it("should simulate full connection lifecycle", async () => {
      const apiKey = "pk_lifecycle_test";
      manager.addKey(apiKey);

      // 1. Authenticate
      const req = createMockRequest(apiKey);
      const authResult = await manager.authenticate(req);
      expect(authResult.authenticated).toBe(true);

      // 2. Register connection
      const registerResult = manager.registerConnection(apiKey);
      expect(registerResult.allowed).toBe(true);

      // 3. Use connection (simulated)
      await new Promise((resolve) => setTimeout(resolve, 10));

      // 4. Release connection
      manager.releaseConnection(apiKey);

      // 5. Should be able to connect again
      const secondRegister = manager.registerConnection(apiKey);
      expect(secondRegister.allowed).toBe(true);
    });

    it("should handle concurrent connections correctly", () => {
      const apiKey = "pk_concurrent";
      manager.addKey(apiKey);

      const results = [
        manager.registerConnection(apiKey),
        manager.registerConnection(apiKey),
        manager.registerConnection(apiKey),
        manager.registerConnection(apiKey), // Devrait échouer
      ];

      expect(results[0].allowed).toBe(true);
      expect(results[1].allowed).toBe(true);
      expect(results[2].allowed).toBe(true);
      expect(results[3].allowed).toBe(false);

      // Libérer toutes
      manager.releaseConnection(apiKey);
      manager.releaseConnection(apiKey);
      manager.releaseConnection(apiKey);

      // Devrait pouvoir en enregistrer 3 nouvelles
      expect(manager.registerConnection(apiKey).allowed).toBe(true);
      expect(manager.registerConnection(apiKey).allowed).toBe(true);
      expect(manager.registerConnection(apiKey).allowed).toBe(true);
    });
  });

  describe("requireApiKey option", () => {
    it("should enforce API key when requireApiKey is true", async () => {
      const strictManager = new ClientAuthManager({ requireApiKey: true });
      const req = createMockRequest();

      const result = await strictManager.authenticate(req);

      expect(result.authenticated).toBe(false);
    });

    it("should allow anonymous access when requireApiKey is false", async () => {
      const openManager = new ClientAuthManager({ requireApiKey: false });
      const req = createMockRequest();

      const result = await openManager.authenticate(req);

      expect(result.authenticated).toBe(true);
    });
  });

  describe("maxConnectionsPerKey option", () => {
    it("should respect custom max connections", () => {
      const customManager = new ClientAuthManager({
        maxConnectionsPerKey: 1, // Seulement 1 connexion
      });
      const apiKey = "pk_single_conn";
      customManager.addKey(apiKey);

      expect(customManager.registerConnection(apiKey).allowed).toBe(true);
      expect(customManager.registerConnection(apiKey).allowed).toBe(false); // 2ème refusée
    });

    it("should use default max connections (10)", () => {
      const defaultManager = new ClientAuthManager({ requireApiKey: true });
      const apiKey = "pk_default_max";
      defaultManager.addKey(apiKey);

      // Devrait accepter 10 connexions
      for (let i = 0; i < 10; i++) {
        expect(defaultManager.registerConnection(apiKey).allowed).toBe(true);
      }

      // 11ème refusée
      expect(defaultManager.registerConnection(apiKey).allowed).toBe(false);
    });
  });
});
