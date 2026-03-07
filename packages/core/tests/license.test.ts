/**
 * 🧪 Tests unitaires pour DomOSLicense
 * 
 * Teste le système de licence cryptographique sans API key
 * @author DomOS Team
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  sha256,
  sha512,
  hmacSha256,
  base64UrlEncode,
  base64UrlDecode,
  generateAppFingerprint,
  generateActivationChallenge,
  disperseLicense,
  reconstituteLicense,
  generateLicense,
  generateIntegrationCode,
  DomOSLicenseManager,
  FRAGMENT_COUNT,
  DOMOS_LICENSE_VERSION,
  type LicensePayload,
  type AppFingerprint,
  type DispersedLicense,
} from '../src/license/DomOSLicense';

// ============================================================================
// TESTS DES UTILITAIRES CRYPTOGRAPHIQUES
// ============================================================================

describe('Crypto Utilities', () => {
  describe('sha256', () => {
    it('génère un hash SHA-256 valide', async () => {
      const hash = await sha256('hello world');
      expect(hash).toHaveLength(64); // 256 bits = 64 hex chars
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('produit le même hash pour la même entrée', async () => {
      const hash1 = await sha256('test');
      const hash2 = await sha256('test');
      expect(hash1).toBe(hash2);
    });

    it('produit des hashs différents pour des entrées différentes', async () => {
      const hash1 = await sha256('test1');
      const hash2 = await sha256('test2');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('sha512', () => {
    it('génère un hash SHA-512 valide', async () => {
      const hash = await sha512('hello world');
      expect(hash).toHaveLength(128); // 512 bits = 128 hex chars
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('hmacSha256', () => {
    it('génère un HMAC valide', async () => {
      const hmac = await hmacSha256('data', 'secret-key');
      expect(hmac).toHaveLength(64);
      expect(hmac).toMatch(/^[a-f0-9]+$/);
    });

    it('produit des HMACs différents avec des clés différentes', async () => {
      const hmac1 = await hmacSha256('data', 'key1');
      const hmac2 = await hmacSha256('data', 'key2');
      expect(hmac1).not.toBe(hmac2);
    });
  });

  describe('base64Url', () => {
    it('encode et décode correctement', () => {
      const original = 'Hello, World! 123';
      const encoded = base64UrlEncode(original);
      const decoded = base64UrlDecode(encoded);
      expect(decoded).toBe(original);
    });

    it('utilise le format URL-safe', () => {
      const encoded = base64UrlEncode('test+/=data');
      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
      expect(encoded).not.toContain('=');
    });
  });
});

// ============================================================================
// TESTS DU FINGERPRINTING
// ============================================================================

describe('App Fingerprinting', () => {
  describe('generateAppFingerprint', () => {
    it('génère un fingerprint avec tous les champs requis', async () => {
      const fingerprint = await generateAppFingerprint({
        bundleId: 'com.test.app',
        platform: 'web',
        appVersion: '1.0.0',
      });

      expect(fingerprint).toHaveProperty('bundleHash');
      expect(fingerprint).toHaveProperty('platform', 'web');
      expect(fingerprint).toHaveProperty('appVersion', '1.0.0');
      expect(fingerprint).toHaveProperty('generatedAt');
      expect(fingerprint).toHaveProperty('envHash');
    });

    it('génère un bundleHash unique par bundleId', async () => {
      const fp1 = await generateAppFingerprint({
        bundleId: 'com.app.one',
        platform: 'ios',
        appVersion: '1.0.0',
      });

      const fp2 = await generateAppFingerprint({
        bundleId: 'com.app.two',
        platform: 'ios',
        appVersion: '1.0.0',
      });

      expect(fp1.bundleHash).not.toBe(fp2.bundleHash);
    });

    it('génère le même bundleHash pour le même bundleId', async () => {
      const fp1 = await generateAppFingerprint({
        bundleId: 'com.test.app',
        platform: 'android',
        appVersion: '1.0.0',
      });

      const fp2 = await generateAppFingerprint({
        bundleId: 'com.test.app',
        platform: 'android',
        appVersion: '2.0.0', // Version différente
      });

      // Le bundleHash est basé uniquement sur le bundleId
      expect(fp1.bundleHash).toBe(fp2.bundleHash);
    });

    it('supporte toutes les plateformes', async () => {
      const platforms: Array<'web' | 'ios' | 'android' | 'desktop'> = [
        'web', 'ios', 'android', 'desktop'
      ];

      for (const platform of platforms) {
        const fp = await generateAppFingerprint({
          bundleId: 'com.test.app',
          platform,
          appVersion: '1.0.0',
        });
        expect(fp.platform).toBe(platform);
      }
    });
  });

  describe('generateActivationChallenge', () => {
    it('génère un challenge encodé en base64Url', async () => {
      const fingerprint = await generateAppFingerprint({
        bundleId: 'com.test.app',
        platform: 'web',
        appVersion: '1.0.0',
      });

      const challenge = await generateActivationChallenge(fingerprint);
      expect(typeof challenge).toBe('string');
      expect(challenge.length).toBeGreaterThan(0);
      
      // Doit être décodable
      const decoded = base64UrlDecode(challenge);
      const parsed = JSON.parse(decoded);
      expect(parsed).toHaveProperty('d');
      expect(parsed).toHaveProperty('h');
    });

    it('inclut un nonce unique à chaque génération', async () => {
      const fingerprint = await generateAppFingerprint({
        bundleId: 'com.test.app',
        platform: 'web',
        appVersion: '1.0.0',
      });

      const challenge1 = await generateActivationChallenge(fingerprint);
      const challenge2 = await generateActivationChallenge(fingerprint);

      // Les challenges doivent être différents grâce au nonce
      expect(challenge1).not.toBe(challenge2);
    });
  });
});

// ============================================================================
// TESTS DE LA DISPERSION DE LICENCE
// ============================================================================

describe('License Dispersion', () => {
  let testFingerprint: AppFingerprint;
  const testLicenseData = JSON.stringify({
    appId: 'test-app-123',
    organization: 'Test Org',
    tier: 'pro',
    features: ['voice', 'analytics'],
    expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 an
  });

  beforeEach(async () => {
    testFingerprint = await generateAppFingerprint({
      bundleId: 'com.test.dispersion',
      platform: 'web',
      appVersion: '1.0.0',
    });
  });

  describe('disperseLicense', () => {
    it('disperse une licence en fragments', async () => {
      const { dispersed, salt } = await disperseLicense(testLicenseData, testFingerprint);

      expect(dispersed.fragments).toHaveLength(FRAGMENT_COUNT);
      expect(dispersed.signature).toBeTruthy();
      expect(dispersed.meta.totalFragments).toBe(FRAGMENT_COUNT);
      expect(dispersed.meta.algorithm).toBe('domos-disperse-v1');
      expect(dispersed.meta.version).toBe(DOMOS_LICENSE_VERSION);
      expect(salt).toBeTruthy();
      expect(salt.length).toBe(64); // 32 bytes en hex
    });

    it('chaque fragment a les propriétés requises', async () => {
      const { dispersed } = await disperseLicense(testLicenseData, testFingerprint);

      for (const fragment of dispersed.fragments) {
        expect(fragment).toHaveProperty('index');
        expect(fragment).toHaveProperty('data');
        expect(fragment).toHaveProperty('checksum');
        expect(typeof fragment.index).toBe('number');
        expect(fragment.data.length).toBeGreaterThan(0);
        expect(fragment.checksum).toHaveLength(16);
      }
    });

    it('génère des sels différents à chaque appel', async () => {
      const result1 = await disperseLicense(testLicenseData, testFingerprint);
      const result2 = await disperseLicense(testLicenseData, testFingerprint);

      expect(result1.salt).not.toBe(result2.salt);
    });

    it('disperse les index de manière non-linéaire', async () => {
      const { dispersed } = await disperseLicense(testLicenseData, testFingerprint);
      
      const indices = dispersed.fragments.map(f => f.index);
      const sortedIndices = [...indices].sort((a, b) => a - b);
      
      // Les indices ne doivent pas être dans l'ordre naturel
      // (grâce à la dispersion avec PRIME_DISPERSAL)
      expect(indices).not.toEqual(sortedIndices);
    });
  });

  describe('reconstituteLicense', () => {
    it('reconstitue correctement une licence dispersée', async () => {
      const { dispersed, salt } = await disperseLicense(testLicenseData, testFingerprint);
      const reconstituted = await reconstituteLicense(dispersed, testFingerprint, salt);

      expect(reconstituted).toBe(testLicenseData);
    });

    it('échoue avec un fingerprint différent', async () => {
      const { dispersed, salt } = await disperseLicense(testLicenseData, testFingerprint);

      const differentFingerprint = await generateAppFingerprint({
        bundleId: 'com.different.app',
        platform: 'web',
        appVersion: '1.0.0',
      });

      const result = await reconstituteLicense(dispersed, differentFingerprint, salt);
      expect(result).toBeNull();
    });

    it('échoue avec un sel incorrect', async () => {
      const { dispersed } = await disperseLicense(testLicenseData, testFingerprint);

      const wrongSalt = 'a'.repeat(64);
      const result = await reconstituteLicense(dispersed, testFingerprint, wrongSalt);
      expect(result).toBeNull();
    });

    it('échoue si un fragment est manquant', async () => {
      const { dispersed, salt } = await disperseLicense(testLicenseData, testFingerprint);

      const corruptedDispersed: DispersedLicense = {
        ...dispersed,
        fragments: dispersed.fragments.slice(0, -1), // Enlever le dernier fragment
      };

      const result = await reconstituteLicense(corruptedDispersed, testFingerprint, salt);
      expect(result).toBeNull();
    });

    it('échoue si un fragment est corrompu', async () => {
      const { dispersed, salt } = await disperseLicense(testLicenseData, testFingerprint);

      const corruptedDispersed: DispersedLicense = {
        ...dispersed,
        fragments: dispersed.fragments.map((f, i) => 
          i === 0 ? { ...f, data: 'corrupted' + f.data } : f
        ),
      };

      const result = await reconstituteLicense(corruptedDispersed, testFingerprint, salt);
      expect(result).toBeNull();
    });

    it('échoue si la signature est invalide', async () => {
      const { dispersed, salt } = await disperseLicense(testLicenseData, testFingerprint);

      const corruptedDispersed: DispersedLicense = {
        ...dispersed,
        signature: 'invalid_signature',
      };

      const result = await reconstituteLicense(corruptedDispersed, testFingerprint, salt);
      expect(result).toBeNull();
    });
  });
});

// ============================================================================
// TESTS DU LICENSE MANAGER
// ============================================================================

describe('DomOSLicenseManager', () => {
  let manager: DomOSLicenseManager;
  let fingerprint: AppFingerprint;
  let validPayload: LicensePayload;

  beforeEach(async () => {
    fingerprint = await generateAppFingerprint({
      bundleId: 'com.test.manager',
      platform: 'web',
      appVersion: '1.0.0',
    });

    manager = new DomOSLicenseManager(fingerprint);

    validPayload = {
      appId: 'app-123',
      organization: 'Test Org',
      tier: 'pro',
      allowedDomains: ['*.test.com'],
      allowedBundleIds: ['com.test.manager'],
      features: ['voice', 'analytics', 'self-driving'],
      limits: {
        maxSessions: 1000,
        maxRequestsPerDay: 10000,
        maxVoiceMinutesPerMonth: 5000,
      },
      issuedAt: Date.now(),
      expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 an
      minSdkVersion: '1.0.0',
    };
  });

  describe('setLicense', () => {
    it('configure une licence dispersée', async () => {
      const { dispersed, salt } = await generateLicense(validPayload, fingerprint);
      
      manager.setLicense(dispersed, salt);
      
      const result = await manager.validateLocal();
      expect(result.valid).toBe(true);
      expect(result.payload?.appId).toBe('app-123');
    });
  });

  describe('setLicenseFromFragments', () => {
    it('configure depuis des fragments individuels', async () => {
      const { dispersed, salt } = await generateLicense(validPayload, fingerprint);
      
      manager.setLicenseFromFragments(
        dispersed.fragments,
        dispersed.signature,
        salt,
        dispersed.meta
      );
      
      const result = await manager.validateLocal();
      expect(result.valid).toBe(true);
    });
  });

  describe('validateLocal', () => {
    it('retourne une erreur si pas de licence configurée', async () => {
      const result = await manager.validateLocal();
      expect(result.valid).toBe(false);
      expect(result.error).toBe('LICENSE_NOT_SET');
    });

    it('valide une licence valide', async () => {
      const { dispersed, salt } = await generateLicense(validPayload, fingerprint);
      manager.setLicense(dispersed, salt);

      const result = await manager.validateLocal();
      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
    });

    it('rejette une licence expirée', async () => {
      const expiredPayload: LicensePayload = {
        ...validPayload,
        expiresAt: Date.now() - 1000, // Expirée
      };

      const { dispersed, salt } = await generateLicense(expiredPayload, fingerprint);
      manager.setLicense(dispersed, salt);

      const result = await manager.validateLocal();
      expect(result.valid).toBe(false);
      expect(result.error).toBe('LICENSE_EXPIRED');
    });

    it('avertit si la licence expire bientôt', async () => {
      const soonExpiringPayload: LicensePayload = {
        ...validPayload,
        expiresAt: Date.now() + 3 * 24 * 60 * 60 * 1000, // 3 jours
      };

      const { dispersed, salt } = await generateLicense(soonExpiringPayload, fingerprint);
      manager.setLicense(dispersed, salt);

      const result = await manager.validateLocal();
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('LICENSE_EXPIRING_SOON');
    });

    it('utilise le cache pour les validations répétées', async () => {
      const { dispersed, salt } = await generateLicense(validPayload, fingerprint);
      manager.setLicense(dispersed, salt);

      // Première validation
      const result1 = await manager.validateLocal();
      expect(result1.valid).toBe(true);

      // Deuxième validation (devrait utiliser le cache)
      const result2 = await manager.validateLocal();
      expect(result2.valid).toBe(true);
    });
  });

  describe('validateRemote', () => {
    it('utilise la validation locale en cas d\'erreur réseau', async () => {
      const { dispersed, salt } = await generateLicense(validPayload, fingerprint);
      manager.setLicense(dispersed, salt);

      // Mock fetch pour simuler une erreur réseau
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await manager.validateRemote('https://api.domos.test');
      
      // Doit retourner la validation locale
      expect(result.valid).toBe(true);

      global.fetch = originalFetch;
    });

    it('échoue si la validation locale échoue d\'abord', async () => {
      // Pas de licence configurée
      const result = await manager.validateRemote('https://api.domos.test');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('LICENSE_NOT_SET');
    });
  });

  describe('getPayload', () => {
    it('retourne le payload si la licence est valide', async () => {
      const { dispersed, salt } = await generateLicense(validPayload, fingerprint);
      manager.setLicense(dispersed, salt);

      const payload = await manager.getPayload();
      expect(payload).not.toBeNull();
      expect(payload?.appId).toBe('app-123');
      expect(payload?.tier).toBe('pro');
    });

    it('retourne null si la licence est invalide', async () => {
      const payload = await manager.getPayload();
      expect(payload).toBeNull();
    });
  });

  describe('hasFeature', () => {
    it('vérifie si une feature est activée', async () => {
      const { dispersed, salt } = await generateLicense(validPayload, fingerprint);
      manager.setLicense(dispersed, salt);

      expect(await manager.hasFeature('voice')).toBe(true);
      expect(await manager.hasFeature('analytics')).toBe(true);
      expect(await manager.hasFeature('non-existent')).toBe(false);
    });

    it('retourne true pour toutes les features si "*" est présent', async () => {
      const wildcardPayload: LicensePayload = {
        ...validPayload,
        features: ['*'],
      };

      const { dispersed, salt } = await generateLicense(wildcardPayload, fingerprint);
      manager.setLicense(dispersed, salt);

      expect(await manager.hasFeature('any-feature')).toBe(true);
      expect(await manager.hasFeature('another-one')).toBe(true);
    });

    it('retourne false si pas de licence', async () => {
      expect(await manager.hasFeature('voice')).toBe(false);
    });
  });

  describe('checkLimit', () => {
    it('vérifie si une limite n\'est pas dépassée', async () => {
      const { dispersed, salt } = await generateLicense(validPayload, fingerprint);
      manager.setLicense(dispersed, salt);

      expect(await manager.checkLimit('maxSessions', 500)).toBe(true);
      expect(await manager.checkLimit('maxSessions', 1500)).toBe(false);
      expect(await manager.checkLimit('maxRequestsPerDay', 5000)).toBe(true);
      expect(await manager.checkLimit('maxRequestsPerDay', 15000)).toBe(false);
    });

    it('retourne false si pas de licence', async () => {
      expect(await manager.checkLimit('maxSessions', 1)).toBe(false);
    });
  });
});

// ============================================================================
// TESTS DE LA GÉNÉRATION DE CODE
// ============================================================================

describe('Code Generation', () => {
  let dispersed: DispersedLicense;
  let salt: string;

  beforeEach(async () => {
    const fingerprint = await generateAppFingerprint({
      bundleId: 'com.test.codegen',
      platform: 'web',
      appVersion: '1.0.0',
    });

    const payload: LicensePayload = {
      appId: 'test-123',
      organization: 'Test',
      tier: 'pro',
      allowedDomains: [],
      allowedBundleIds: [],
      features: ['*'],
      limits: {
        maxSessions: 100,
        maxRequestsPerDay: 1000,
        maxVoiceMinutesPerMonth: 100,
      },
      issuedAt: Date.now(),
      expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
      minSdkVersion: '1.0.0',
    };

    const result = await generateLicense(payload, fingerprint);
    dispersed = result.dispersed;
    salt = result.salt;
  });

  describe('generateIntegrationCode', () => {
    it('génère du code TypeScript valide', () => {
      const code = generateIntegrationCode(dispersed, salt, 'typescript');
      
      expect(code).toContain('export const APP_CONFIG');
      expect(code).toContain('DomOSLicenseManager');
      expect(code).toContain('setLicenseFromFragments');
      expect(code).toContain(dispersed.signature);
      expect(code).toContain(salt);
    });

    it('génère du code Dart valide', () => {
      const code = generateIntegrationCode(dispersed, salt, 'dart');
      
      expect(code).toContain('class AppConfig');
      expect(code).toContain('DomOSLicenseManager');
      expect(code).toContain('LicenseFragment');
      expect(code).toContain(dispersed.signature);
    });

    it('génère du code Kotlin valide', () => {
      const code = generateIntegrationCode(dispersed, salt, 'kotlin');
      
      expect(code).toContain('object AppConfig');
      expect(code).toContain('DomOSLicenseManager');
      expect(code).toContain('listOf(');
      expect(code).toContain(dispersed.signature);
    });

    it('génère du code Swift valide', () => {
      const code = generateIntegrationCode(dispersed, salt, 'swift');
      
      expect(code).toContain('struct AppConfig');
      expect(code).toContain('DomOSLicenseManager');
      expect(code).toContain('fragments:');
      expect(code).toContain(dispersed.signature);
    });

    it('inclut tous les fragments', () => {
      const code = generateIntegrationCode(dispersed, salt, 'typescript');
      
      // Vérifier que tous les 7 fragments sont présents
      expect(code).toContain('_l1');
      expect(code).toContain('_l2');
      expect(code).toContain('_l3');
      expect(code).toContain('_l4');
      expect(code).toContain('_l5');
      expect(code).toContain('_l6');
      expect(code).toContain('_l7');
    });

    it('lance une erreur pour un langage non supporté', () => {
      expect(() => {
        generateIntegrationCode(dispersed, salt, 'python' as any);
      }).toThrow('Unsupported language: python');
    });
  });
});

// ============================================================================
// TESTS D'INTÉGRATION (Flux complet)
// ============================================================================

describe('Integration: Full License Flow', () => {
  it('génère et valide une licence complète', async () => {
    // 1. Générer le fingerprint de l'app
    const fingerprint = await generateAppFingerprint({
      bundleId: 'com.mycompany.myapp',
      platform: 'android',
      appVersion: '2.1.0',
    });

    // 2. Créer le payload de licence
    const payload: LicensePayload = {
      appId: 'prod-app-456',
      organization: 'My Company Inc.',
      tier: 'enterprise',
      allowedDomains: ['*.mycompany.com'],
      allowedBundleIds: ['com.mycompany.myapp', 'com.mycompany.myapp.dev'],
      features: ['voice', 'analytics', 'self-driving', 'custom-branding'],
      limits: {
        maxSessions: 10000,
        maxRequestsPerDay: 100000,
        maxVoiceMinutesPerMonth: 50000,
      },
      issuedAt: Date.now(),
      expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
      minSdkVersion: '2.0.0',
    };

    // 3. Générer la licence dispersée
    const { dispersed, salt } = await generateLicense(payload, fingerprint);

    // 4. Simuler l'intégration client (les fragments seraient dispersés)
    const manager = new DomOSLicenseManager(fingerprint);
    manager.setLicense(dispersed, salt);

    // 5. Valider
    const result = await manager.validateLocal();
    expect(result.valid).toBe(true);
    expect(result.payload?.organization).toBe('My Company Inc.');
    expect(result.payload?.tier).toBe('enterprise');

    // 6. Vérifier les features
    expect(await manager.hasFeature('voice')).toBe(true);
    expect(await manager.hasFeature('admin-panel')).toBe(false);

    // 7. Vérifier les limites
    expect(await manager.checkLimit('maxSessions', 5000)).toBe(true);
    expect(await manager.checkLimit('maxSessions', 15000)).toBe(false);
  });

  it('échoue avec un bundle ID non autorisé', async () => {
    // Fingerprint de l'app autorisée
    const authorizedFingerprint = await generateAppFingerprint({
      bundleId: 'com.authorized.app',
      platform: 'ios',
      appVersion: '1.0.0',
    });

    // Licence générée pour l'app autorisée
    const payload: LicensePayload = {
      appId: 'app-123',
      organization: 'Test',
      tier: 'pro',
      allowedDomains: [],
      allowedBundleIds: ['com.authorized.app'],
      features: ['*'],
      limits: {
        maxSessions: 100,
        maxRequestsPerDay: 1000,
        maxVoiceMinutesPerMonth: 100,
      },
      issuedAt: Date.now(),
      expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
      minSdkVersion: '1.0.0',
    };

    const { dispersed, salt } = await generateLicense(payload, authorizedFingerprint);

    // Tentative d'utilisation avec un fingerprint non autorisé
    const unauthorizedFingerprint = await generateAppFingerprint({
      bundleId: 'com.pirate.app',
      platform: 'ios',
      appVersion: '1.0.0',
    });

    const manager = new DomOSLicenseManager(unauthorizedFingerprint);
    
    // La reconstitution devrait échouer car le fingerprint est différent
    const licenseJson = await reconstituteLicense(dispersed, unauthorizedFingerprint, salt);
    expect(licenseJson).toBeNull();
  });
});
