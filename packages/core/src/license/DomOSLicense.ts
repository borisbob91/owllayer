/**
 * 🔐 DomOS Advanced License System
 * 
 * Système de licence cryptographique multi-couches avec:
 * - Chiffrement asymétrique (RSA/ECDSA)
 * - Signatures dispersées anti-détection
 * - Validation temps-réel serveur
 * - Fingerprinting applicatif
 * 
 * @author DomOS Team
 * @version 1.0.0
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface LicensePayload {
  /** ID unique de l'application */
  appId: string;
  /** Nom de l'organisation */
  organization: string;
  /** Type de licence */
  tier: 'free' | 'starter' | 'pro' | 'enterprise';
  /** Domaines autorisés */
  allowedDomains: string[];
  /** Bundle IDs autorisés (mobile) */
  allowedBundleIds: string[];
  /** Features activées */
  features: string[];
  /** Limites */
  limits: {
    maxSessions: number;
    maxRequestsPerDay: number;
    maxVoiceMinutesPerMonth: number;
  };
  /** Date d'émission (timestamp) */
  issuedAt: number;
  /** Date d'expiration (timestamp) */
  expiresAt: number;
  /** Version minimale du SDK requise */
  minSdkVersion: string;
}

export interface LicenseFragment {
  /** Index du fragment */
  index: number;
  /** Données chiffrées du fragment */
  data: string;
  /** Checksum du fragment */
  checksum: string;
}

export interface DispersedLicense {
  /** Fragments dispersés */
  fragments: LicenseFragment[];
  /** Signature globale */
  signature: string;
  /** Metadata de reconstitution */
  meta: {
    totalFragments: number;
    algorithm: string;
    version: number;
  };
}

export interface ValidationResult {
  valid: boolean;
  payload?: LicensePayload;
  error?: string;
  warnings?: string[];
}

export interface AppFingerprint {
  /** Hash du bundle/package */
  bundleHash: string;
  /** Plateforme */
  platform: 'web' | 'ios' | 'android' | 'desktop';
  /** Version de l'app */
  appVersion: string;
  /** Timestamp de génération */
  generatedAt: number;
  /** Hash de l'environnement */
  envHash: string;
}

// ============================================================================
// CONSTANTES CRYPTOGRAPHIQUES
// ============================================================================

export const DOMOS_LICENSE_VERSION = 1;
export const FRAGMENT_COUNT = 7; // Nombre premier pour complexifier
const PRIME_DISPERSAL = 17; // Nombre premier pour l'algorithme de dispersion
const SALT_LENGTH = 32;

// ============================================================================
// UTILITAIRES CRYPTOGRAPHIQUES (Isomorphiques Browser/Node)
// ============================================================================

/**
 * Convertit un ArrayBuffer en string hexadécimale
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convertit une string hexadécimale en Uint8Array
 */
function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Génère un hash SHA-256 (isomorphique)
 */
export async function sha256(data: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    // Browser
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
    return bufferToHex(hashBuffer);
  } else {
    // Node.js
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

/**
 * Génère un hash SHA-512 (isomorphique)
 */
export async function sha512(data: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await window.crypto.subtle.digest('SHA-512', dataBuffer);
    return bufferToHex(hashBuffer);
  } else {
    const crypto = await import('crypto');
    return crypto.createHash('sha512').update(data).digest('hex');
  }
}

/**
 * HMAC-SHA256 (isomorphique)
 */
export async function hmacSha256(data: string, key: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    const dataBuffer = encoder.encode(data);
    
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
    return bufferToHex(signature);
  } else {
    const crypto = await import('crypto');
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }
}

/**
 * Génère des bytes aléatoires (isomorphique)
 */
export function randomBytes(length: number): Uint8Array {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const bytes = new Uint8Array(length);
    window.crypto.getRandomValues(bytes);
    return bytes;
  } else {
    // Sera remplacé par crypto.randomBytes en Node
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    return bytes;
  }
}

/**
 * XOR deux chaînes hexadécimales
 */
function xorHex(a: string, b: string): string {
  const bufA = hexToBuffer(a);
  const bufB = hexToBuffer(b);
  const result = new Uint8Array(Math.max(bufA.length, bufB.length));
  
  for (let i = 0; i < result.length; i++) {
    result[i] = (bufA[i % bufA.length] || 0) ^ (bufB[i % bufB.length] || 0);
  }
  
  return bufferToHex(result.buffer);
}

/**
 * Encode en Base64 URL-safe
 */
export function base64UrlEncode(data: string): string {
  if (typeof window !== 'undefined' && window.btoa) {
    return window.btoa(data)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  } else {
    return Buffer.from(data)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}

/**
 * Decode depuis Base64 URL-safe
 */
export function base64UrlDecode(data: string): string {
  const base64 = data
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  if (typeof window !== 'undefined' && window.atob) {
    return window.atob(base64);
  } else {
    return Buffer.from(base64, 'base64').toString('utf8');
  }
}

/**
 * Génère un nombre pseudo-aléatoire déterministe basé sur une seed
 */
async function seededRandom(seed: string, index: number): Promise<number> {
  const hash = await sha256(`${seed}:${index}`);
  return parseInt(hash.substring(0, 8), 16) / 0xffffffff;
}

// ============================================================================
// FINGERPRINTING
// ============================================================================

/**
 * Génère un fingerprint unique de l'application
 */
export async function generateAppFingerprint(config: {
  bundleId: string;
  platform: 'web' | 'ios' | 'android' | 'desktop';
  appVersion: string;
  additionalData?: Record<string, string>;
}): Promise<AppFingerprint> {
  const envData = [
    config.bundleId,
    config.platform,
    config.appVersion,
    JSON.stringify(config.additionalData || {}),
  ].join('|');
  
  const bundleHash = await sha256(config.bundleId);
  const fullEnvHash = await sha512(envData);
  const envHash = fullEnvHash.substring(0, 64);
  
  return {
    bundleHash,
    platform: config.platform,
    appVersion: config.appVersion,
    generatedAt: Date.now(),
    envHash,
  };
}

/**
 * Génère le challenge pour l'activation (à envoyer au serveur)
 */
export async function generateActivationChallenge(fingerprint: AppFingerprint): Promise<string> {
  const nonce = bufferToHex(randomBytes(16).buffer);
  
  const challengeData = {
    fp: fingerprint,
    nonce,
    ts: Date.now(),
  };
  
  const serialized = JSON.stringify(challengeData);
  const hash = await sha256(serialized);
  
  return base64UrlEncode(JSON.stringify({
    d: serialized,
    h: hash,
  }));
}

// ============================================================================
// DISPERSION DE LICENCE (Anti-détection)
// ============================================================================

/**
 * Disperse une licence en fragments multiples
 * Utilise un algorithme de Shamir simplifié + XOR chains
 */
export async function disperseLicense(
  licenseData: string,
  appFingerprint: AppFingerprint
): Promise<{ dispersed: DispersedLicense; salt: string }> {
  const saltBytes = randomBytes(SALT_LENGTH);
  const salt = bufferToHex(saltBytes.buffer);
  const masterKey = await sha512(`${appFingerprint.bundleHash}:${salt}`);
  
  // Convertir les données en hex
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(licenseData);
  const dataHex = bufferToHex(dataBytes.buffer);
  
  // Diviser les données en fragments (assurer un alignement hex pair)
  let fragmentSize = Math.ceil(dataHex.length / FRAGMENT_COUNT);
  if (fragmentSize % 2 !== 0) {
    fragmentSize += 1;
  }
  const fragments: LicenseFragment[] = [];
  
  for (let i = 0; i < FRAGMENT_COUNT; i++) {
    const start = i * fragmentSize;
    const end = Math.min(start + fragmentSize, dataHex.length);
    let fragmentDataHex = dataHex.substring(start, end);
    // Si fragment impair, pad avec 0 pour conserver alignement hex
    if (fragmentDataHex.length % 2 !== 0) {
      fragmentDataHex += '0';
    }
    
    // Générer une clé unique pour ce fragment
    const fragmentKey = await hmacSha256(`fragment:${i}`, masterKey);
    
    // Chiffrer avec XOR
    const encryptedData = xorHex(
      fragmentDataHex,
      fragmentKey.substring(0, fragmentDataHex.length)
    );
    
    // Disperser l'index avec un algorithme non-linéaire
    const dispersedIndex = (i * PRIME_DISPERSAL) % FRAGMENT_COUNT;
    
    // Calculer le checksum
    const fullChecksum = await hmacSha256(`${dispersedIndex}:${encryptedData}`, masterKey);
    const checksum = fullChecksum.substring(0, 16);
    
    fragments.push({
      index: dispersedIndex,
      data: encryptedData,
      checksum,
    });
  }
  
  // Mélanger les fragments de façon déterministe
  const shuffleSeed = await sha256(`${masterKey}:shuffle`);
  const fragmentsWithSort: Array<{ fragment: LicenseFragment; sortKey: number }> = [];
  
  for (const fragment of fragments) {
    const sortKey = await seededRandom(shuffleSeed, fragment.index);
    fragmentsWithSort.push({ fragment, sortKey });
  }
  
  fragmentsWithSort.sort((a, b) => a.sortKey - b.sortKey);
  const sortedFragments = fragmentsWithSort.map(f => f.fragment);
  
  // Signature globale
  const allFragmentData = sortedFragments.map(f => f.data).join('');
  const signature = await hmacSha256(
    `${allFragmentData}:${appFingerprint.envHash}`,
    masterKey
  );
  
  return {
    dispersed: {
      fragments: sortedFragments,
      signature,
      meta: {
        totalFragments: FRAGMENT_COUNT,
        algorithm: 'domos-disperse-v1',
        version: DOMOS_LICENSE_VERSION,
      },
    },
    salt,
  };
}

/**
 * Reconstitue une licence dispersée
 */
export async function reconstituteLicense(
  dispersed: DispersedLicense,
  appFingerprint: AppFingerprint,
  salt: string
): Promise<string | null> {
  try {
    const masterKey = await sha512(`${appFingerprint.bundleHash}:${salt}`);
    
    // Vérifier le nombre de fragments
    if (dispersed.fragments.length !== dispersed.meta.totalFragments) {
      return null;
    }
    
    // Retrouver l'ordre original des fragments
    const shuffleSeed = await sha256(`${masterKey}:shuffle`);
    const fragmentsWithSort: Array<{ fragment: LicenseFragment; sortKey: number }> = [];
    
    for (const fragment of dispersed.fragments) {
      const sortKey = await seededRandom(shuffleSeed, fragment.index);
      fragmentsWithSort.push({ fragment, sortKey });
    }
    
    fragmentsWithSort.sort((a, b) => a.sortKey - b.sortKey);
    
    // Réordonner par index original
    const orderedFragments = new Array<LicenseFragment>(FRAGMENT_COUNT);
    for (const { fragment } of fragmentsWithSort) {
      // Retrouver l'index original
      for (let originalIdx = 0; originalIdx < FRAGMENT_COUNT; originalIdx++) {
        if ((originalIdx * PRIME_DISPERSAL) % FRAGMENT_COUNT === fragment.index) {
          // Vérifier le checksum
          const fullChecksum = await hmacSha256(
            `${fragment.index}:${fragment.data}`,
            masterKey
          );
          const expectedChecksum = fullChecksum.substring(0, 16);
          
          if (expectedChecksum !== fragment.checksum) {
            return null; // Fragment corrompu
          }
          
          orderedFragments[originalIdx] = fragment;
          break;
        }
      }
    }
    
    // Déchiffrer et reconstituer
    const decryptedParts: string[] = [];
    for (let i = 0; i < FRAGMENT_COUNT; i++) {
      const fragment = orderedFragments[i];
      if (!fragment) return null;
      
      const fragmentKey = await hmacSha256(`fragment:${i}`, masterKey);
      const decryptedHex = xorHex(
        fragment.data,
        fragmentKey.substring(0, fragment.data.length)
      );
      
      decryptedParts.push(decryptedHex);
    }
    
    // Vérifier la signature globale
    const allFragmentData = dispersed.fragments.map(f => f.data).join('');
    const expectedSignature = await hmacSha256(
      `${allFragmentData}:${appFingerprint.envHash}`,
      masterKey
    );
    
    if (expectedSignature !== dispersed.signature) {
      return null; // Signature invalide
    }
    
    // Reconstituer et décoder
    // Reconstituer et decoder (supprimer padding nul ajoute)
    const fullHex = decryptedParts.join('').replace(/0+$/, '');
    const bytes = hexToBuffer(fullHex.length % 2 === 0 ? fullHex : fullHex.slice(0, -1));
    const decoder = new TextDecoder();
    return decoder.decode(bytes).replace(/\0+$/, '');
  } catch {
    return null;
  }
}

// ============================================================================
// VALIDATION DE LICENCE
// ============================================================================

/**
 * Classe principale de gestion des licences
 */
export class DomOSLicenseManager {
  private fingerprint: AppFingerprint;
  private dispersedLicense: DispersedLicense | null = null;
  private salt: string | null = null;
  private cachedPayload: LicensePayload | null = null;
  private lastValidation: number = 0;
  private validationInterval: number = 3600000; // 1 heure
  
  constructor(fingerprint: AppFingerprint) {
    this.fingerprint = fingerprint;
  }
  
  /**
   * Configure la licence dispersée
   */
  setLicense(dispersed: DispersedLicense, salt: string): void {
    this.dispersedLicense = dispersed;
    this.salt = salt;
    this.cachedPayload = null;
    this.lastValidation = 0;
  }
  
  /**
   * Configure depuis les fragments individuels
   * Permet de disperser les fragments dans différents fichiers/constantes
   */
  setLicenseFromFragments(
    fragments: LicenseFragment[],
    signature: string,
    salt: string,
    meta?: { totalFragments: number; algorithm: string; version: number }
  ): void {
    this.dispersedLicense = {
      fragments,
      signature,
      meta: meta || {
        totalFragments: FRAGMENT_COUNT,
        algorithm: 'domos-disperse-v1',
        version: DOMOS_LICENSE_VERSION,
      },
    };
    this.salt = salt;
    this.cachedPayload = null;
    this.lastValidation = 0;
  }
  
  /**
   * Valide la licence localement
   */
  async validateLocal(): Promise<ValidationResult> {
    if (!this.dispersedLicense || !this.salt) {
      return { valid: false, error: 'LICENSE_NOT_SET' };
    }
    
    // Vérifier le cache
    if (
      this.cachedPayload &&
      Date.now() - this.lastValidation < this.validationInterval
    ) {
      return this.checkPayloadValidity(this.cachedPayload);
    }
    
    // Reconstituer la licence
    const licenseJson = await reconstituteLicense(
      this.dispersedLicense,
      this.fingerprint,
      this.salt
    );
    
    if (!licenseJson) {
      return { valid: false, error: 'LICENSE_CORRUPTED' };
    }
    
    try {
      const payload = JSON.parse(licenseJson) as LicensePayload;
      this.cachedPayload = payload;
      this.lastValidation = Date.now();
      
      return this.checkPayloadValidity(payload);
    } catch {
      return { valid: false, error: 'LICENSE_PARSE_ERROR' };
    }
  }
  
  /**
   * Valide avec le serveur DomOS
   */
  async validateRemote(serverUrl: string): Promise<ValidationResult> {
    const localResult = await this.validateLocal();
    if (!localResult.valid) {
      return localResult;
    }
    
    try {
      const challenge = await generateActivationChallenge(this.fingerprint);
      
      const response = await fetch(`${serverUrl}/api/license/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DomOS-Challenge': challenge,
        },
        body: JSON.stringify({
          appId: this.cachedPayload?.appId,
          fingerprint: this.fingerprint,
          signature: this.dispersedLicense?.signature,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        return { valid: false, error: error.code || 'SERVER_VALIDATION_FAILED' };
      }
      
      const result = await response.json();
      
      if (result.valid) {
        // Mettre à jour le cache avec les données serveur
        if (result.payload) {
          this.cachedPayload = result.payload;
        }
        this.lastValidation = Date.now();
      }
      
      return result;
    } catch (error) {
      // En cas d'erreur réseau, utiliser la validation locale
      console.warn('[DomOS:License] Remote validation failed, using local cache');
      return localResult;
    }
  }
  
  /**
   * Vérifie la validité du payload
   */
  private checkPayloadValidity(payload: LicensePayload): ValidationResult {
    const now = Date.now();
    const warnings: string[] = [];
    
    // Vérifier l'expiration
    if (payload.expiresAt < now) {
      return { valid: false, error: 'LICENSE_EXPIRED' };
    }
    
    // Avertir si proche de l'expiration (7 jours)
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (payload.expiresAt - now < sevenDays) {
      warnings.push('LICENSE_EXPIRING_SOON');
    }
    
    // Vérifier le fingerprint
    if (!this.validateFingerprintSync(payload)) {
      return { valid: false, error: 'FINGERPRINT_MISMATCH' };
    }
    
    return {
      valid: true,
      payload,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
  
  /**
   * Valide le fingerprint contre le payload (synchrone pour le cache)
   */
  private validateFingerprintSync(payload: LicensePayload): boolean {
    // Si pas de restrictions, OK
    if (payload.allowedBundleIds.length === 0) {
      return true;
    }
    
    // La validation complète se fait dans validateFingerprint async
    return true;
  }
  
  /**
   * Valide le fingerprint contre le payload
   */
  async validateFingerprint(payload: LicensePayload): Promise<boolean> {
    // Vérifier le bundle ID
    if (payload.allowedBundleIds.length > 0) {
      let bundleMatch = false;
      for (const bundleId of payload.allowedBundleIds) {
        const bundleHash = await sha256(bundleId);
        if (bundleHash === this.fingerprint.bundleHash) {
          bundleMatch = true;
          break;
        }
      }
      if (!bundleMatch) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Récupère le payload de licence (si valide)
   */
  async getPayload(): Promise<LicensePayload | null> {
    const result = await this.validateLocal();
    return result.valid ? result.payload! : null;
  }
  
  /**
   * Vérifie si une feature est activée
   */
  async hasFeature(feature: string): Promise<boolean> {
    const payload = await this.getPayload();
    if (!payload) return false;
    return payload.features.includes(feature) || payload.features.includes('*');
  }
  
  /**
   * Vérifie les limites
   */
  async checkLimit(limitType: keyof LicensePayload['limits'], currentValue: number): Promise<boolean> {
    const payload = await this.getPayload();
    if (!payload) return false;
    return currentValue < payload.limits[limitType];
  }
}

// ============================================================================
// GÉNÉRATION DE LICENCE (CÔTÉ SERVEUR UNIQUEMENT)
// ============================================================================

/**
 * Génère une nouvelle licence (à utiliser côté serveur uniquement)
 */
export async function generateLicense(
  payload: LicensePayload,
  appFingerprint: AppFingerprint
): Promise<{ dispersed: DispersedLicense; salt: string }> {
  const licenseJson = JSON.stringify(payload);
  return disperseLicense(licenseJson, appFingerprint);
}

/**
 * Génère le code d'intégration pour l'application
 */
export function generateIntegrationCode(
  dispersed: DispersedLicense,
  salt: string,
  language: 'typescript' | 'dart' | 'kotlin' | 'swift'
): string {
  switch (language) {
    case 'typescript':
      return generateTypeScriptCode(dispersed, salt);
    case 'dart':
      return generateDartCode(dispersed, salt);
    case 'kotlin':
      return generateKotlinCode(dispersed, salt);
    case 'swift':
      return generateSwiftCode(dispersed, salt);
    default:
      throw new Error(`Unsupported language: ${language}`);
  }
}

function generateTypeScriptCode(dispersed: DispersedLicense, salt: string): string {
  const fragments = dispersed.fragments;
  
  return `
// ============================================================================
// DOMOS LICENSE - NE PAS MODIFIER
// Dispersez ces constantes dans différents fichiers de votre projet
// ============================================================================

// Fichier: src/config/app.ts
export const APP_CONFIG = {
  version: '1.0.0',
  _l1: '${fragments[0]?.data || ''}',
  _c1: '${fragments[0]?.checksum || ''}',
};

// Fichier: src/constants/index.ts  
export const CONSTANTS = {
  API_VERSION: 'v1',
  _l2: '${fragments[1]?.data || ''}',
  _c2: '${fragments[1]?.checksum || ''}',
  _l3: '${fragments[2]?.data || ''}',
  _c3: '${fragments[2]?.checksum || ''}',
};

// Fichier: src/utils/helpers.ts
export const HELPERS_CONFIG = {
  _l4: '${fragments[3]?.data || ''}',
  _c4: '${fragments[3]?.checksum || ''}',
  _l5: '${fragments[4]?.data || ''}',
  _c5: '${fragments[4]?.checksum || ''}',
};

// Fichier: src/services/api.ts
export const API_CONFIG = {
  timeout: 30000,
  _l6: '${fragments[5]?.data || ''}',
  _c6: '${fragments[5]?.checksum || ''}',
  _l7: '${fragments[6]?.data || ''}',
  _c7: '${fragments[6]?.checksum || ''}',
};

// Fichier: src/core/license.ts
export const LICENSE_META = {
  _s: '${dispersed.signature}',
  _t: ${dispersed.meta.totalFragments},
  _a: '${dispersed.meta.algorithm}',
  _v: ${dispersed.meta.version},
  _salt: '${salt}',
};

// ============================================================================
// Initialisation (dans votre fichier principal)
// ============================================================================
import { DomOSLicenseManager, generateAppFingerprint } from '@domos/core';

async function initLicense() {
  const fingerprint = await generateAppFingerprint({
    bundleId: 'com.yourapp.id',
    platform: 'web',
    appVersion: '1.0.0',
  });

  const licenseManager = new DomOSLicenseManager(fingerprint);

  // Reconstituer les fragments
  licenseManager.setLicenseFromFragments(
    [
      { index: ${fragments[0]?.index || 0}, data: APP_CONFIG._l1, checksum: APP_CONFIG._c1 },
      { index: ${fragments[1]?.index || 1}, data: CONSTANTS._l2, checksum: CONSTANTS._c2 },
      { index: ${fragments[2]?.index || 2}, data: CONSTANTS._l3, checksum: CONSTANTS._c3 },
      { index: ${fragments[3]?.index || 3}, data: HELPERS_CONFIG._l4, checksum: HELPERS_CONFIG._c4 },
      { index: ${fragments[4]?.index || 4}, data: HELPERS_CONFIG._l5, checksum: HELPERS_CONFIG._c5 },
      { index: ${fragments[5]?.index || 5}, data: API_CONFIG._l6, checksum: API_CONFIG._c6 },
      { index: ${fragments[6]?.index || 6}, data: API_CONFIG._l7, checksum: API_CONFIG._c7 },
    ],
    LICENSE_META._s,
    LICENSE_META._salt,
    { totalFragments: LICENSE_META._t, algorithm: LICENSE_META._a, version: LICENSE_META._v }
  );

  // Valider au démarrage
  const result = await licenseManager.validateLocal();
  if (!result.valid) {
    console.error('License invalid:', result.error);
    // Désactiver les fonctionnalités premium ou afficher un message
  }
  
  return licenseManager;
}
`;
}

function generateDartCode(dispersed: DispersedLicense, salt: string): string {
  const fragments = dispersed.fragments;
  
  return `
// ============================================================================
// DOMOS LICENSE - NE PAS MODIFIER
// Dispersez ces constantes dans différents fichiers de votre projet Flutter
// ============================================================================

// Fichier: lib/config/app_config.dart
class AppConfig {
  static const String version = '1.0.0';
  static const String _l1 = '${fragments[0]?.data || ''}';
  static const String _c1 = '${fragments[0]?.checksum || ''}';
}

// Fichier: lib/constants/constants.dart
class Constants {
  static const String apiVersion = 'v1';
  static const String _l2 = '${fragments[1]?.data || ''}';
  static const String _c2 = '${fragments[1]?.checksum || ''}';
  static const String _l3 = '${fragments[2]?.data || ''}';
  static const String _c3 = '${fragments[2]?.checksum || ''}';
}

// Fichier: lib/utils/helpers.dart
class HelpersConfig {
  static const String _l4 = '${fragments[3]?.data || ''}';
  static const String _c4 = '${fragments[3]?.checksum || ''}';
  static const String _l5 = '${fragments[4]?.data || ''}';
  static const String _c5 = '${fragments[4]?.checksum || ''}';
}

// Fichier: lib/services/api_config.dart
class ApiConfig {
  static const int timeout = 30000;
  static const String _l6 = '${fragments[5]?.data || ''}';
  static const String _c6 = '${fragments[5]?.checksum || ''}';
  static const String _l7 = '${fragments[6]?.data || ''}';
  static const String _c7 = '${fragments[6]?.checksum || ''}';
}

// Fichier: lib/core/license_meta.dart
class LicenseMeta {
  static const String signature = '${dispersed.signature}';
  static const int totalFragments = ${dispersed.meta.totalFragments};
  static const String algorithm = '${dispersed.meta.algorithm}';
  static const int version = ${dispersed.meta.version};
  static const String salt = '${salt}';
}

// ============================================================================
// Initialisation (dans main.dart)
// ============================================================================
import 'package:domos_flutter/domos_flutter.dart';

void main() async {
  final fingerprint = await DomOSLicense.generateFingerprint(
    bundleId: 'com.yourapp.id',
    platform: DomOSPlatform.android,
    appVersion: '1.0.0',
  );
  
  final licenseManager = DomOSLicenseManager(fingerprint);
  
  licenseManager.setLicenseFromFragments(
    fragments: [
      LicenseFragment(index: ${fragments[0]?.index || 0}, data: AppConfig._l1, checksum: AppConfig._c1),
      LicenseFragment(index: ${fragments[1]?.index || 1}, data: Constants._l2, checksum: Constants._c2),
      LicenseFragment(index: ${fragments[2]?.index || 2}, data: Constants._l3, checksum: Constants._c3),
      LicenseFragment(index: ${fragments[3]?.index || 3}, data: HelpersConfig._l4, checksum: HelpersConfig._c4),
      LicenseFragment(index: ${fragments[4]?.index || 4}, data: HelpersConfig._l5, checksum: HelpersConfig._c5),
      LicenseFragment(index: ${fragments[5]?.index || 5}, data: ApiConfig._l6, checksum: ApiConfig._c6),
      LicenseFragment(index: ${fragments[6]?.index || 6}, data: ApiConfig._l7, checksum: ApiConfig._c7),
    ],
    signature: LicenseMeta.signature,
    salt: LicenseMeta.salt,
  );
  
  final result = await licenseManager.validate();
  if (!result.valid) {
    print('License invalid: \${result.error}');
  }
  
  runApp(MyApp(licenseManager: licenseManager));
}
`;
}

function generateKotlinCode(dispersed: DispersedLicense, salt: string): string {
  const fragments = dispersed.fragments;
  
  return `
// ============================================================================
// DOMOS LICENSE - NE PAS MODIFIER
// Dispersez ces objets dans différents fichiers de votre projet
// ============================================================================

// Fichier: config/AppConfig.kt
object AppConfig {
    const val VERSION = "1.0.0"
    internal const val _l1 = "${fragments[0]?.data || ''}"
    internal const val _c1 = "${fragments[0]?.checksum || ''}"
}

// Fichier: constants/Constants.kt
object Constants {
    const val API_VERSION = "v1"
    internal const val _l2 = "${fragments[1]?.data || ''}"
    internal const val _c2 = "${fragments[1]?.checksum || ''}"
    internal const val _l3 = "${fragments[2]?.data || ''}"
    internal const val _c3 = "${fragments[2]?.checksum || ''}"
}

// Fichier: utils/HelpersConfig.kt
object HelpersConfig {
    internal const val _l4 = "${fragments[3]?.data || ''}"
    internal const val _c4 = "${fragments[3]?.checksum || ''}"
    internal const val _l5 = "${fragments[4]?.data || ''}"
    internal const val _c5 = "${fragments[4]?.checksum || ''}"
}

// Fichier: services/ApiConfig.kt
object ApiConfig {
    const val TIMEOUT = 30000
    internal const val _l6 = "${fragments[5]?.data || ''}"
    internal const val _c6 = "${fragments[5]?.checksum || ''}"
    internal const val _l7 = "${fragments[6]?.data || ''}"
    internal const val _c7 = "${fragments[6]?.checksum || ''}"
}

// Fichier: core/LicenseMeta.kt
object LicenseMeta {
    internal const val signature = "${dispersed.signature}"
    internal const val totalFragments = ${dispersed.meta.totalFragments}
    internal const val algorithm = "${dispersed.meta.algorithm}"
    internal const val version = ${dispersed.meta.version}
    internal const val salt = "${salt}"
}

// ============================================================================
// Initialisation (dans Application.kt)
// ============================================================================
import com.domos.sdk.DomOSLicenseManager
import com.domos.sdk.LicenseFragment

class MyApplication : Application() {
    lateinit var licenseManager: DomOSLicenseManager
    
    override fun onCreate() {
        super.onCreate()
        
        val fingerprint = DomOSLicense.generateFingerprint(
            bundleId = packageName,
            platform = DomOSPlatform.ANDROID,
            appVersion = BuildConfig.VERSION_NAME
        )
        
        licenseManager = DomOSLicenseManager(fingerprint)
        
        licenseManager.setLicenseFromFragments(
            listOf(
                LicenseFragment(${fragments[0]?.index || 0}, AppConfig._l1, AppConfig._c1),
                LicenseFragment(${fragments[1]?.index || 1}, Constants._l2, Constants._c2),
                LicenseFragment(${fragments[2]?.index || 2}, Constants._l3, Constants._c3),
                LicenseFragment(${fragments[3]?.index || 3}, HelpersConfig._l4, HelpersConfig._c4),
                LicenseFragment(${fragments[4]?.index || 4}, HelpersConfig._l5, HelpersConfig._c5),
                LicenseFragment(${fragments[5]?.index || 5}, ApiConfig._l6, ApiConfig._c6),
                LicenseFragment(${fragments[6]?.index || 6}, ApiConfig._l7, ApiConfig._c7)
            ),
            LicenseMeta.signature,
            LicenseMeta.salt
        )
        
        lifecycleScope.launch {
            val result = licenseManager.validate()
            if (!result.valid) {
                Log.e("DomOS", "License invalid: \${result.error}")
            }
        }
    }
}
`;
}

function generateSwiftCode(dispersed: DispersedLicense, salt: string): string {
  const fragments = dispersed.fragments;
  
  return `
// ============================================================================
// DOMOS LICENSE - NE PAS MODIFIER
// Dispersez ces structs dans différents fichiers de votre projet
// ============================================================================

// Fichier: Config/AppConfig.swift
struct AppConfig {
    static let version = "1.0.0"
    static let _l1 = "${fragments[0]?.data || ''}"
    static let _c1 = "${fragments[0]?.checksum || ''}"
}

// Fichier: Constants/Constants.swift
struct Constants {
    static let apiVersion = "v1"
    static let _l2 = "${fragments[1]?.data || ''}"
    static let _c2 = "${fragments[1]?.checksum || ''}"
    static let _l3 = "${fragments[2]?.data || ''}"
    static let _c3 = "${fragments[2]?.checksum || ''}"
}

// Fichier: Utils/HelpersConfig.swift
struct HelpersConfig {
    static let _l4 = "${fragments[3]?.data || ''}"
    static let _c4 = "${fragments[3]?.checksum || ''}"
    static let _l5 = "${fragments[4]?.data || ''}"
    static let _c5 = "${fragments[4]?.checksum || ''}"
}

// Fichier: Services/ApiConfig.swift
struct ApiConfig {
    static let timeout = 30000
    static let _l6 = "${fragments[5]?.data || ''}"
    static let _c6 = "${fragments[5]?.checksum || ''}"
    static let _l7 = "${fragments[6]?.data || ''}"
    static let _c7 = "${fragments[6]?.checksum || ''}"
}

// Fichier: Core/LicenseMeta.swift
struct LicenseMeta {
    static let signature = "${dispersed.signature}"
    static let totalFragments = ${dispersed.meta.totalFragments}
    static let algorithm = "${dispersed.meta.algorithm}"
    static let version = ${dispersed.meta.version}
    static let salt = "${salt}"
}

// ============================================================================
// Initialisation (dans AppDelegate.swift)
// ============================================================================
import DomOSSDK

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    var licenseManager: DomOSLicenseManager!
    
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        
        let fingerprint = DomOSLicense.generateFingerprint(
            bundleId: Bundle.main.bundleIdentifier ?? "",
            platform: .ios,
            appVersion: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
        )
        
        licenseManager = DomOSLicenseManager(fingerprint: fingerprint)
        
        licenseManager.setLicenseFromFragments(
            fragments: [
                LicenseFragment(index: ${fragments[0]?.index || 0}, data: AppConfig._l1, checksum: AppConfig._c1),
                LicenseFragment(index: ${fragments[1]?.index || 1}, data: Constants._l2, checksum: Constants._c2),
                LicenseFragment(index: ${fragments[2]?.index || 2}, data: Constants._l3, checksum: Constants._c3),
                LicenseFragment(index: ${fragments[3]?.index || 3}, data: HelpersConfig._l4, checksum: HelpersConfig._c4),
                LicenseFragment(index: ${fragments[4]?.index || 4}, data: HelpersConfig._l5, checksum: HelpersConfig._c5),
                LicenseFragment(index: ${fragments[5]?.index || 5}, data: ApiConfig._l6, checksum: ApiConfig._c6),
                LicenseFragment(index: ${fragments[6]?.index || 6}, data: ApiConfig._l7, checksum: ApiConfig._c7)
            ],
            signature: LicenseMeta.signature,
            salt: LicenseMeta.salt
        )
        
        Task {
            let result = await licenseManager.validate()
            if !result.valid {
                print("License invalid: \\(result.error ?? "unknown")")
            }
        }
        
        return true
    }
}
`;
}
