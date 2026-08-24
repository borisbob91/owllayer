# Security Fix Validator — Skill de Vérification des Correctifs de Sécurité

> **Date** : 25 Mars 2026  
> **Objectif** : Vérifier automatiquement que chaque correctif de sécurité implémenté respecte les standards définis et n'introduit pas de régressions  
> **Scope** : Tous les correctifs des Phases 1, 2 et 3 du `SECURITY_BENCHMARK_AUDIT.md`

---

## 1. Comment Utiliser ce Skill

### 1.1 Avant de Commencer un Correctif

```bash
# 1. Créer une issue pour le correctif
issues/issue_SEC_01_api_key_store.md
issues/issue_SEC_02_auth_recheck.md
issues/issue_SEC_03_ssrf_protection.md
# etc. (voir Section 4 — Liste des Correctifs)

# 2. Lancer le skill AVANT de coder
owllayer-skill validate-security-fix --issue issue_SEC_01
```

### 1.2 Après avoir Implémenté un Correctif

```bash
# 1. Builder le package modifié
pnpm --filter @owllayer/server build

# 2. Lancer les tests existants
pnpm test

# 3. Lancer le skill de validation
owllayer-skill validate-security-fix --issue issue_SEC_01 --check-all

# 4. Si validation passe → PR avec référence à l'issue
```

---

## 2. Checklist de Validation — Par Type de Correctif

### 2.1 API Key Store (Issue SEC_01)

**Fichiers attendus :**
- `packages/server/src/auth/ApiKeyStore.ts` (nouveau)
- `packages/server/src/middleware/auth.ts` (modifié)
- `packages/server/src/persistence/SQLiteStore.ts` (si utilisé)

**Validation :**

```markdown
## Checklist SEC_01 — API Key Store

### Architecture
- [ ] `ApiKeyStore` est une classe séparée (pas dans `auth.ts`)
- [ ] Interface `IApiKeyStore` définie (pour mocks/tests)
- [ ] Store utilise SQLite (ou MongoDB) — PAS en mémoire uniquement

### Sécurité
- [ ] API keys hashées avant stockage (SHA-256 minimum)
- [ ] Méthode `validateKey(key: string)` compare les hashes
- [ ] Méthode `revokeKey(key: string)` marque comme révoquée (pas de suppression)
- [ ] Champ `expiresAt` optionnel pour expiration automatique

### Intégration
- [ ] `AuthMiddleware` utilise `ApiKeyStore` (pas de `Set<string>`)
- [ ] Méthode `addKey()` appelle `ApiKeyStore.addKey()`
- [ ] Validation asynchrone (`async/await`)

### Tests
- [ ] Test : ajout d'une clé → validée
- [ ] Test : révocation d'une clé → rejetée
- [ ] Test : clé expirée → rejetée
- [ ] Test : hash identique pour même clé (déterministe)

### Logging
- [ ] Log : "API key added: {name}" (sans la clé !)
- [ ] Log : "API key revoked: {name}"
- [ ] Log : "API key validation failed: {hash_prefix}" (8 premiers caractères)

### Documentation
- [ ] JSDoc sur `ApiKeyStore` class
- [ ] JSDoc sur méthodes publiques
- [ ] Exemple d'usage dans le commentaire
```

**Commandes de test :**
```bash
# Test unitaire
pnpm --filter @owllayer/server test -- ApiKeyStore

# Test d'intégration
pnpm --filter @owllayer/server test -- auth.integration

# Build check
pnpm --filter @owllayer/server build && echo "✅ Build OK" || echo "❌ Build FAILED"
```

---

### 2.2 Re-vérification Authentification (Issue SEC_02)

**Fichiers attendus :**
- `packages/server/src/core/SessionManager.ts` (modifié)
- `packages/server/src/auth/ApiKeyStore.ts` (déjà existant)

**Validation :**

```markdown
## Checklist SEC_02 — Re-vérification Auth

### Architecture
- [ ] Méthode `validateSession(sessionId: string)` ajoutée à `SessionManager`
- [ ] Cache d'authentification avec TTL (60s par défaut)
- [ ] Méthode appelée dans `handleMessage()` avant traitement

### Sécurité
- [ ] Re-vérification toutes les 60s (configurable)
- [ ] Si API key révoquée → session détruite immédiatement
- [ ] Si session détruite → WebSocket fermé avec code 4001
- [ ] Message d'erreur : "Session revoked" (pas de détail technique)

### Performance
- [ ] Cache pour éviter de requêter DB à chaque message
- [ ] TTL du cache : 60s (compromis sécurité/perf)
- [ ] Requête DB asynchrone (non bloquante)

### Intégration
- [ ] `handleMessage()` appelle `validateSession()` en premier
- [ ] `handleToolCall()` appelle `validateSession()` en premier
- [ ] Si validation échoue → retour immédiat, pas de traitement

### Logging
- [ ] Log : "Session re-validation failed: {sessionId}"
- [ ] Log : "Session closed: API key revoked"
- [ ] Log level : WARN (pas ERROR — c'est un comportement normal)

### Tests
- [ ] Test : session valide → message traité
- [ ] Test : session révoquée → message rejeté + WebSocket fermé
- [ ] Test : cache hit → pas de requête DB
- [ ] Test : cache expired → requête DB
```

**Commandes de test :**
```bash
# Test unitaire
pnpm --filter @owllayer/server test -- SessionManager

# Test d'intégration (WebSocket + auth)
pnpm --filter @owllayer/server test -- session.auth.integration

# Simulation de révocation
node tests/scripts/revoke_session_test.js
```

---

### 2.3 SSRF Protection (Issue SEC_03)

**Fichiers attendus :**
- `packages/server/src/middleware/ssrf.ts` (nouveau)
- `packages/server/src/middleware/auth.ts` (si URL dans auth)
- Tools utilisant `fetch()` (modifiés)

**Validation :**

```markdown
## Checklist SEC_03 — SSRF Protection

### Architecture
- [ ] Fonction `validateUrl(url: string): boolean` exportée
- [ ] Fonction `isPrivateIP(ip: string): boolean` exportée
- [ ] Middleware `SSRFProtection` appliqué avant exécution de tool

### Sécurité — IPs Privées Bloquées
- [ ] `10.0.0.0/8` (Classe A privée)
- [ ] `172.16.0.0/12` (Classe B privée)
- [ ] `192.168.0.0/16` (Classe C privée)
- [ ] `169.254.0.0/16` (Link-local, AWS metadata)
- [ ] `127.0.0.0/8` (localhost)
- [ ] `0.0.0.0/8` (toutes interfaces)
- [ ] `::1/128` (IPv6 localhost)
- [ ] `fc00::/7` (IPv6 private)

### Sécurité — DNS Rebinding Protection
- [ ] Résolution DNS AVANT validation IP
- [ ] Vérification que hostname ne résout pas vers IP privée
- [ ] Timeout DNS : 2s max (anti-DoS)

### Intégration
- [ ] Tous les tools utilisant `fetch()` appellent `validateUrl()`
- [ ] Si URL invalide → erreur : "URL non autorisée"
- [ ] Pas de détail technique dans l'erreur (pas d'IP révélée)

### Logging
- [ ] Log : "SSRF attempt blocked: {url}" (sans résoudre l'IP)
- [ ] Log level : WARN
- [ ] Inclure sessionId et apiKey dans le log

### Tests
- [ ] Test : URL publique (https://example.com) → validée
- [ ] Test : URL privée (http://192.168.1.1) → bloquée
- [ ] Test : AWS metadata (http://169.254.169.254) → bloquée
- [ ] Test : localhost (http://localhost:6379) → bloquée
- [ ] Test : DNS rebinding (fake.example.com → 127.0.0.1) → bloquée
```

**Code de validation attendu :**

```typescript
// packages/server/src/middleware/ssrf.ts
const PRIVATE_IP_RANGES = [
  { start: '10.0.0.0', end: '10.255.255.255' },
  { start: '172.16.0.0', end: '172.31.255.255' },
  { start: '192.168.0.0', end: '192.168.255.255' },
  { start: '169.254.0.0', end: '169.254.255.255' },
  { start: '127.0.0.0', end: '127.255.255.255' },
  { start: '0.0.0.0', end: '0.255.255.255' },
];

function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
}

export function isPrivateIP(ip: string): boolean {
  const ipInt = ipToInt(ip);
  return PRIVATE_IP_RANGES.some(({ start, end }) => {
    return ipInt >= ipToInt(start) && ipInt <= ipToInt(end);
  });
}

export async function validateUrl(url: string): Promise<boolean> {
  const parsed = new URL(url);
  
  // Résoudre le hostname
  const ip = await dns.promises.lookup(parsed.hostname, { timeout: 2000 });
  
  // Vérifier que l'IP n'est pas privée
  if (isPrivateIP(ip.address)) {
    return false;
  }
  
  return true;
}
```

**Commandes de test :**
```bash
# Test unitaire
pnpm --filter @owllayer/server test -- ssrf

# Test d'intégration
pnpm --filter @owllayer/server test -- ssrf.integration

# Test de pénétration (simulation d'attaque)
node tests/scripts/ssrf_attack_simulation.js
```

---

### 2.4 Audit Logger (Issue SEC_04)

**Fichiers attendus :**
- `packages/server/src/audit/AuditLogger.ts` (nouveau)
- `packages/server/src/core/OwlLayerServer.ts` (modifié)
- `packages/server/src/core/ToolRouter.ts` (modifié)

**Validation :**

```markdown
## Checklist SEC_04 — Audit Logger

### Architecture
- [ ] Classe `AuditLogger` avec méthode `log(event: AuditLog)`
- [ ] Interface `AuditLog` définie (type-safe)
- [ ] Support d'écriture : fichier JSON + console (optionnel : HTTP vers SIEM)

### Champs Obligatoires (AuditLog)
- [ ] `timestamp: string` (ISO 8601)
- [ ] `eventType: 'TOOL_CALL' | 'AUTH_SUCCESS' | 'AUTH_FAILURE' | 'RATE_LIMIT' | 'SESSION_CREATED' | 'SESSION_CLOSED'`
- [ ] `sessionId: string`
- [ ] `apiKey: string` (hash, 8 premiers caractères)
- [ ] `ipAddress: string`
- [ ] `userId?: string` (optionnel)
- [ ] `toolName?: string` (si TOOL_CALL)
- [ ] `toolArgs?: Record<string, unknown>` (si TOOL_CALL, sans données sensibles)
- [ ] `result: 'SUCCESS' | 'FAILURE' | 'PENDING_APPROVAL'`
- [ ] `durationMs?: number` (si TOOL_CALL)
- [ ] `errorMessage?: string` (si FAILURE)

### Sécurité
- [ ] API key hashée (pas en clair dans les logs)
- [ ] Tool args filtrés (pas de passwords, tokens, etc.)
- [ ] Logs écrits dans un fichier séparé (`audit.log`)
- [ ] Rotation des logs (daily, retention 30 jours)

### Performance
- [ ] Écriture asynchrone (non bloquante)
- [ ] Buffer de logs (flush toutes les 5s ou 100 entrées)
- [ ] Pas d'impact sur la latence des tools (< 1ms overhead)

### Intégration
- [ ] `handleToolCall()` loggue avant et après exécution
- [ ] `authenticate()` loggue succès/échec
- [ ] `rateLimit.check()` loggue les dépassements
- [ ] `createSession()` loggue la création
- [ ] `closeSession()` loggue la fermeture

### Tests
- [ ] Test : log écrit dans `audit.log`
- [ ] Test : API key hashée dans le log
- [ ] Test : tool args filtrés (pas de données sensibles)
- [ ] Test : performance overhead < 1ms
```

**Commandes de test :**
```bash
# Test unitaire
pnpm --filter @owllayer/server test -- AuditLogger

# Test d'intégration
pnpm --filter @owllayer/server test -- audit.integration

# Vérification des logs
cat logs/audit.log | head -20

# Test de performance
node tests/scripts/audit_overhead_benchmark.js
```

---

### 2.5 Graceful Shutdown (Issue SEC_05)

**Fichiers attendus :**
- `packages/server/src/core/OwlLayerServer.ts` (modifié, méthode `shutdown()`)
- `apps/demo-server/src/server.ts` (modifié, handlers SIGINT/SIGTERM)

**Validation :**

```markdown
## Checklist SEC_05 — Graceful Shutdown

### Architecture
- [ ] Méthode `shutdown(timeout?: number): Promise<void>` sur `OwlLayerServer`
- [ ] Handlers `process.on('SIGINT')` et `process.on('SIGTERM')`
- [ ] Timeout de sécurité (10s par défaut)

### Étapes de Shutdown (dans l'ordre)
1. [ ] Arrêter d'accepter de nouvelles connexions (`transport.stop()`)
2. [ ] Fermer toutes les sessions actives (avec flush)
3. [ ] Sauvegarder les sessions en DB (si store configuré)
4. [ ] Arrêter rate limiters (`rateLimit.stop()`)
5. [ ] Fermer mémoire (`memoryManager.close()`)
6. [ ] Fermer HTTP server (`httpServer.close()`)
7. [ ] Fermer WebSocket server (`wss.close()`)

### Sécurité
- [ ] Sessions flushées AVANT fermeture WebSocket
- [ ] Pas de perte de données (conversation, mémoire agent)
- [ ] Timeout de sécurité : si shutdown > 10s → force close
- [ ] Code de sortie : 0 si succès, 1 si échec

### Logging
- [ ] Log : "SIGINT received — shutting down..."
- [ ] Log : "Closing X sessions..."
- [ ] Log : "Sessions saved to DB"
- [ ] Log : "Shutdown completed"
- [ ] Log level : INFO

### Tests
- [ ] Test : SIGINT → sessions flushées
- [ ] Test : SIGTERM → sessions flushées
- [ ] Test : timeout → force close (pas de crash)
- [ ] Test : sessions restaurées après restart
```

**Code attendu :**

```typescript
// packages/server/src/core/OwlLayerServer.ts
async shutdown(timeout: number = 10000): Promise<void> {
  log.info('Shutdown en cours...');
  const startTime = Date.now();
  
  try {
    // 1. Arrêter nouvelles connexions
    this.transport.stop();
    
    // 2. Fermer sessions avec flush
    const closePromises = this.sessions.getAll().map(s => 
      this.sessions.destroy(s.id)
    );
    await Promise.all(closePromises);
    log.info(`Sessions fermees: ${closePromises.length}`);
    
    // 3. Sauvegarder sessions en DB
    if (this.memoryManager) {
      await this.memoryManager.close();
      log.info('Memoire sauvegardee');
    }
    
    // 4. Arrêter rate limiters
    this.rateLimit.stop();
    
    // 5. HTTP server
    await new Promise<void>((resolve) => {
      this.httpServer?.close(() => resolve());
      setTimeout(resolve, timeout);
    });
    
    const duration = Date.now() - startTime;
    log.info(`Shutdown termine en ${duration}ms`);
  } catch (err) {
    log.error('Erreur shutdown:', err);
    throw err;
  }
}

// apps/demo-server/src/server.ts
process.on('SIGINT', async () => {
  log.info('SIGINT recu');
  try {
    await server.shutdown(10000);
    log.info('Shutdown termine');
    process.exit(0);
  } catch (err) {
    log.error('Erreur shutdown:', err);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  log.info('SIGTERM recu');
  await server.shutdown(10000);
  process.exit(0);
});
```

**Commandes de test :**
```bash
# Test manuel
node apps/demo-server/dist/server.js &
SERVER_PID=$!
kill -SIGINT $SERVER_PID
cat logs/server.log | grep "Shutdown"

# Test automatisé
pnpm --filter @owllayer/server test -- graceful.shutdown
```

---

## 3. Commandes Globales de Validation

### 3.1 Validation Complète d'un Correctif

```bash
# Script de validation complète
./scripts/validate-security-fix.sh --issue issue_SEC_01

# Ce que le script fait :
# 1. Vérifie que l'issue existe
# 2. Check les fichiers modifiés (git diff)
# 3. Lance les tests unitaires
# 4. Lance les tests d'intégration
# 5. Build le package
# 6. Vérifie les logs de sécurité
# 7. Génère un rapport
```

### 3.2 Validation de Non-Régression

```bash
# Tests existants — doivent TOUS passer
pnpm test

# Build de TOUS les packages — doit passer
pnpm build

# Test de charge — ne doit pas dégrader les performances
k6 run tests/load/websocket.k6.ts

# Comparaison avant/après
./scripts/compare_performance.sh
```

### 3.3 Security Scan

```bash
# Audit des dépendances
pnpm audit

# Analyse statique de code
pnpm --filter @owllayer/server lint

# Vérification des secrets (pas de clés dans le code)
npx git-secrets --scan
```

---

## 4. Liste des Correctifs — Issues à Créer

| Issue | Nom | Fichiers | Priorité | Statut |
|---|---|---|---|---|
| **SEC_01** | API Key Store (DB) | `auth/ApiKeyStore.ts`, `auth.ts` | 🔴 Critique | ⬜ À faire |
| **SEC_02** | Re-vérification Auth | `SessionManager.ts` | 🔴 Critique | ⬜ À faire |
| **SEC_03** | SSRF Protection | `middleware/ssrf.ts` | 🔴 Critique | ⬜ À faire |
| **SEC_04** | Audit Logger | `audit/AuditLogger.ts` | 🔴 Critique | ⬜ À faire |
| **SEC_05** | Graceful Shutdown | `OwlLayerServer.ts`, `server.ts` | 🔴 Critique | ⬜ À faire |
| **SEC_06** | Tool Sandbox (WASM) | `native/tool_sandbox.rs` | 🟠 Élevé | ⬜ À faire |
| **SEC_07** | Prompt Hardening | `prompt/HardenedPrompt.ts` | 🟠 Élevé | ⬜ À faire |
| **SEC_08** | Redis Rate Limiter | `rateLimit.ts` | 🟠 Élevé | ⬜ À faire |
| **SEC_09** | Session Timeout | `SessionManager.ts` | 🟠 Élevé | ⬜ À faire |
| **SEC_10** | Origin Validation | `auth.ts` | 🟠 Élevé | ⬜ À faire |

---

## 5. Template d'Issue — Correctif de Sécurité

```markdown
# Issue SEC_XX — [Nom du Correctif]

## Contexte
[Pourquoi ce correctif est nécessaire — référence au SECURITY_BENCHMARK_AUDIT.md]

## Fichiers à Modifier
- `packages/server/src/...` (nouveau)
- `packages/server/src/...` (modifié)

## Checklist de Validation
[Copier-coller la checklist depuis la Section 2]

## Tests à Implémenter
- [ ] Test unitaire : [description]
- [ ] Test d'intégration : [description]
- [ ] Test de performance : [description]

## Critères d'Acceptation
- [ ] Build passe sans erreur
- [ ] Tous les tests existants passent
- [ ] Nouveaux tests passent
- [ ] Logging implémenté
- [ ] Documentation JSDoc ajoutée

## Références
- `cahiers/SECURITY_BENCHMARK_AUDIT.md` — Section [X]
- CVE-XXXX-XXXX — [Description]
```

---

## 6. Rapport de Validation — Exemple

```markdown
# Rapport de Validation — SEC_01 (API Key Store)

**Date** : 25 Mars 2026  
**Validé par** : owllayer-skill  
**Issue** : issues/issue_SEC_01_api_key_store.md

## Résultats

### Build
```
✅ pnpm --filter @owllayer/server build — SUCCESS (3.2s)
```

### Tests Unitaires
```
✅ ApiKeyStore.addKey() — PASS (12ms)
✅ ApiKeyStore.validateKey() — PASS (8ms)
✅ ApiKeyStore.revokeKey() — PASS (7ms)
✅ ApiKeyStore.hashKey() — PASS (3ms)
```

### Tests d'Intégration
```
✅ Auth integration — PASS (45ms)
✅ Session creation with API key — PASS (23ms)
✅ Revoked key rejection — PASS (15ms)
```

### Performance
```
✅ Overhead validation : < 1ms (objectif : < 5ms)
✅ Throughput : 1000 req/s (objectif : 500 req/s)
```

### Logging
```
✅ audit.log créé
✅ API keys hashées dans les logs
✅ Events loggués : AUTH_SUCCESS, AUTH_FAILURE
```

### Code Quality
```
✅ tsc --noUnusedLocals — PASS
✅ ESLint — 0 errors, 0 warnings
✅ JSDoc — 100% des méthodes documentées
```

## Validation Finale

✅ **TOUS LES CHECKS PASSENT — CORRECTIF VALIDÉ**

Le correctif SEC_01 peut être mergé en production.

## Prochaine Étape
Implémenter SEC_02 (Re-vérification Auth)
```

---

## 7. Utilisation avec Qwen Code

### 7.1 Avant de Coder

```
@QwenCode

Je vais implémenter le correctif SEC_01 (API Key Store).

Peux-tu :
1. Vérifier que l'issue SEC_01 est correctement documentée
2. Lister les fichiers exacts à modifier
3. Me donner la checklist de validation complète

Référence : cahiers/SECURITY_BENCHMARK_AUDIT.md — Section 3.1
```

### 7.2 Après avoir Codé

```
@QwenCode

J'ai implémenté le correctif SEC_01.

Peux-tu :
1. Lancer `pnpm --filter @owllayer/server build`
2. Lancer les tests : `pnpm test -- ApiKeyStore`
3. Vérifier que tous les checks de la checklist passent
4. Générer un rapport de validation

Fichiers modifiés :
- packages/server/src/auth/ApiKeyStore.ts (nouveau)
- packages/server/src/middleware/auth.ts (modifié)
```

### 7.3 En Cas d'Échec

```
@QwenCode

Le test `ApiKeyStore.revokeKey()` échoue.

Peux-tu :
1. Analyser l'erreur
2. Identifier la cause racine
3. Proposer un fix sans modifier les autres fichiers
4. Re-lancer les tests après fix

Erreur : [coller l'erreur]
```

---

## 8. Automatisation — Script Shell

```bash
#!/bin/bash
# scripts/validate-security-fix.sh

ISSUE=$1

if [ -z "$ISSUE" ]; then
  echo "Usage: validate-security-fix.sh --issue issue_SEC_XX"
  exit 1
fi

echo "🔍 Validation du correctif $ISSUE"
echo ""

# 1. Vérifier que l'issue existe
if [ ! -f "issues/${ISSUE}.md" ]; then
  echo "❌ Issue $ISSUE non trouvée"
  exit 1
fi
echo "✅ Issue trouvée"

# 2. Build
echo ""
echo "🔨 Build en cours..."
pnpm --filter @owllayer/server build
if [ $? -ne 0 ]; then
  echo "❌ Build échoué"
  exit 1
fi
echo "✅ Build OK"

# 3. Tests
echo ""
echo "🧪 Tests en cours..."
pnpm --filter @owllayer/server test
if [ $? -ne 0 ]; then
  echo "❌ Tests échoués"
  exit 1
fi
echo "✅ Tests OK"

# 4. Lint
echo ""
echo "🔍 Lint en cours..."
pnpm --filter @owllayer/server lint
if [ $? -ne 0 ]; then
  echo "❌ Lint échoué"
  exit 1
fi
echo "✅ Lint OK"

# 5. Audit
echo ""
echo "🔒 Audit de sécurité..."
pnpm audit
if [ $? -ne 0 ]; then
  echo "⚠️  Vulnérabilités détectées dans les dépendances"
else
  echo "✅ Audit OK"
fi

echo ""
echo "✅✅✅ VALIDATION COMPLÈTE RÉUSSIE ✅✅✅"
echo ""
echo "Prochaine étape : Créer la PR avec référence à $ISSUE"
```

---

## 9. Résumé — Comment ce Skill vous Aide

| Étape | Sans Skill | Avec Skill |
|---|---|---|
| **Avant de coder** | Incertain des fichiers à modifier | Checklist précise avec fichiers attendus |
| **Pendant le codage** | Risque d'oublier des checks | Validation pas à pas |
| **Après le codage** | Tests manuels, oublis possibles | Script automatique + rapport |
| **Avant merge** | Review humaine seule | Review humaine + validation skill |
| **En prod** | Risque de régression | Non-régression vérifiée |

---

**Skill créé le 25 Mars 2026**  
**Utilisation** : `owllayer-skill validate-security-fix --issue issue_SEC_XX`  
**Mainteneur** : OwlLayer Security Team  
**Référence** : `cahiers/SECURITY_BENCHMARK_AUDIT.md`
