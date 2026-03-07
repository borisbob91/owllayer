/**
 * Script de test pour Issue #03 - Admin Authentication
 * Test les endpoints login, status, logout
 */

// Test configuration
const BASE_URL = 'http://localhost:3000';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'test-password';

let sessionToken: string | null = null;

// Helper: colored logs
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name: string) {
  console.log(`\n${'='.repeat(60)}`);
  log(`🧪 Test: ${name}`, 'cyan');
  console.log('='.repeat(60));
}

function logSuccess(message: string) {
  log(`✅ ${message}`, 'green');
}

function logError(message: string) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, 'blue');
}

// Test 1: Login avec username/password
async function testLogin() {
  logTest('Admin Login');

  try {
    const response = await fetch(`${BASE_URL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD,
      }),
    });

    const data = await response.json();

    if (response.status === 200 && data.success) {
      sessionToken = data.token;
      logSuccess(`Login réussi! Token: ${sessionToken?.substring(0, 16)}...`);
      logInfo(`Token complet: ${sessionToken}`);
      return true;
    } else {
      logError(`Login échoué: ${JSON.stringify(data)}`);
      return false;
    }
  } catch (error) {
    logError(`Erreur réseau: ${error}`);
    return false;
  }
}

// Test 2: Access /admin/status avec token
async function testStatus() {
  logTest('Admin Status (Protected)');

  if (!sessionToken) {
    logError('Pas de token de session - test skippé');
    return false;
  }

  try {
    const response = await fetch(`${BASE_URL}/admin/status`, {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    });

    const data = await response.json();

    if (response.status === 200) {
      logSuccess(`Status récupéré! Uptime: ${data.uptime}ms`);
      logInfo(`Données: ${JSON.stringify(data, null, 2)}`);
      return true;
    } else {
      logError(`Status échoué: ${JSON.stringify(data)}`);
      return false;
    }
  } catch (error) {
    logError(`Erreur réseau: ${error}`);
    return false;
  }
}

// Test 3: Access /admin/status SANS token (doit échouer)
async function testStatusUnauthorized() {
  logTest('Admin Status (Sans token - doit échouer)');

  try {
    const response = await fetch(`${BASE_URL}/admin/status`);
    const data = await response.json();

    if (response.status === 401) {
      logSuccess('Accès refusé comme prévu (401)');
      logInfo(`Message: ${data.error}`);
      return true;
    } else {
      logError(`Devrait retourner 401, mais a retourné ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Erreur réseau: ${error}`);
    return false;
  }
}

// Test 4: Login avec mauvais credentials (rate limiting test)
async function testInvalidLogin() {
  logTest('Login avec mauvais credentials (Rate Limiting)');

  const maxAttempts = 6; // Devrait être bloqué après 5
  let blockedAt = -1;

  for (let i = 1; i <= maxAttempts; i++) {
    logInfo(`Tentative ${i}/${maxAttempts}...`);

    try {
      const response = await fetch(`${BASE_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: ADMIN_USERNAME,
          password: 'wrong-password',
        }),
      });

      const data = await response.json();

      if (response.status === 429) {
        blockedAt = i;
        logSuccess(`Rate limit activé à la tentative ${i}!`);
        logInfo(`Message: ${data.error || data.message}`);
        break;
      } else if (response.status === 401) {
        log(`  → 401 Unauthorized: ${data.message}`, 'yellow');
      } else {
        logError(`Status inattendu: ${response.status}`);
      }
    } catch (error) {
      logError(`Erreur réseau: ${error}`);
      return false;
    }

    // Petit délai entre tentatives
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  if (blockedAt > 0 && blockedAt <= 6) {
    logSuccess(`Rate limiting fonctionne (bloqué à tentative ${blockedAt})`);
    return true;
  } else {
    logError('Rate limiting ne semble pas fonctionner');
    return false;
  }
}

// Test 5: Logout
async function testLogout() {
  logTest('Admin Logout');

  if (!sessionToken) {
    logError('Pas de token de session - test skippé');
    return false;
  }

  try {
    const response = await fetch(`${BASE_URL}/admin/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    });

    const data = await response.json();

    if (response.status === 200 && data.success) {
      logSuccess('Logout réussi!');
      sessionToken = null;
      return true;
    } else {
      logError(`Logout échoué: ${JSON.stringify(data)}`);
      return false;
    }
  } catch (error) {
    logError(`Erreur réseau: ${error}`);
    return false;
  }
}

// Test 6: Vérifier que le token est invalide après logout
async function testAfterLogout() {
  logTest('Access après logout (doit échouer)');

  // Utiliser l'ancien token qui devrait être invalidé
  const oldToken = sessionToken || 'invalid-token';

  try {
    const response = await fetch(`${BASE_URL}/admin/status`, {
      headers: {
        Authorization: `Bearer ${oldToken}`,
      },
    });

    const data = await response.json();

    if (response.status === 401) {
      logSuccess('Token invalidé après logout (401)');
      return true;
    } else {
      logError(
        `Le token devrait être invalidé mais a retourné ${response.status}`
      );
      return false;
    }
  } catch (error) {
    logError(`Erreur réseau: ${error}`);
    return false;
  }
}

// Runner principal
async function runTests() {
  log('\n' + '█'.repeat(60), 'magenta');
  log('  🚀 Tests Admin Authentication (Issue #03)', 'magenta');
  log('█'.repeat(60) + '\n', 'magenta');

  logInfo(`Base URL: ${BASE_URL}`);
  logInfo(`Admin: ${ADMIN_USERNAME}`);

  const results: { name: string; passed: boolean }[] = [];

  // Test 1
  results.push({ name: 'Login', passed: await testLogin() });

  // Attendre un peu
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Test 2
  results.push({ name: 'Status (Authorized)', passed: await testStatus() });

  // Test 3
  results.push({
    name: 'Status (Unauthorized)',
    passed: await testStatusUnauthorized(),
  });

  // Test 4 - Attention, va temporairement bloquer l'IP
  // logInfo('\n⏸️  Test 4 (Rate Limiting) désactivé pour ne pas bloquer l\'IP');
  // results.push({ name: 'Rate Limiting', passed: false });

  results.push({
    name: 'Rate Limiting',
    passed: await testInvalidLogin(),
  });

  // Attendre que le rate limit se réinitialise (15min en production)
  // En dev, on peut réduire la fenêtre
  logInfo(
    '\n⏳ Attendez 15 minutes ou redémarrez le serveur pour le prochain test...'
  );
  logInfo('Ou modifiez rateLimitWindowMs à 1000ms dans votre config pour tester');

  // Test 5
  results.push({ name: 'Logout', passed: await testLogout() });

  // Test 6
  results.push({
    name: 'Access après logout',
    passed: await testAfterLogout(),
  });

  // Résumé
  console.log('\n' + '='.repeat(60));
  log('📊 RÉSUMÉ DES TESTS', 'magenta');
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;

  results.forEach((result) => {
    if (result.passed) {
      logSuccess(`${result.name}`);
      passed++;
    } else {
      logError(`${result.name}`);
      failed++;
    }
  });

  console.log('='.repeat(60));
  log(`Total: ${passed} / ${results.length} tests passés`, 'cyan');

  if (failed === 0) {
    log('\n🎉 Tous les tests sont passés!\n', 'green');
  } else {
    log(`\n⚠️  ${failed} tests ont échoué\n`, 'red');
  }
}

// Lancer les tests
runTests().catch((error) => {
  logError(`Erreur fatale: ${error}`);
  process.exit(1);
});
