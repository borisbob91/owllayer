/**
 * Serveur de test pour Issue #03
 * Démarre un serveur OwlLayer avec admin auth configuré
 */

import { OwlLayerServer } from './src/index.js';
import { OpenAILiveAdapter } from '@owllayer/adapter-openai';

const adapter = new OpenAILiveAdapter({
  apiKey: process.env.OPENAI_API_KEY || 'sk-test',
  model: 'gpt-4o-realtime-preview-2024-12-17',
});

const server = new OwlLayerServer({
  llm: adapter,
  port: 3000,

  // Configuration admin (Issue #03)
  admin: {
    username: 'admin',
    password: 'test-password', // ⚠️ En production, utiliser process.env.ADMIN_PASSWORD
    path: '/admin',
    sessionDuration: 24 * 60 * 60 * 1000, // 24h
    rateLimitWindowMs: 15 * 60 * 1000, // 15min
    rateLimitMaxAttempts: 5,
    allowedOrigins: [], // [] = allow all (dev), en prod: ['https://dashboard.example.com']
  },

  // Configuration client (Issue #03)
  client: {
    requireApiKey: true,
    enableApiKeyManagement: true,
    maxConnectionsPerKey: 10,
  },
});

// Ajouter une API key de test
server.addApiKey('pk_test_abc123');

server.start();

console.log('\n' + '='.repeat(60));
console.log('🚀 Serveur OwlLayer démarré (Issue #03 Test)');
console.log('='.repeat(60));
console.log('Port: 3000');
console.log('Admin: http://localhost:3000/admin');
console.log('\nAdmin Credentials:');
console.log('  Username: admin');
console.log('  Password: test-password');
console.log('\nClient API Key:');
console.log('  pk_test_abc123');
console.log('\nEndpoints disponibles:');
console.log('  POST   /admin/login       (public)');
console.log('  POST   /admin/logout      (protected)');
console.log('  GET    /admin/status      (protected)');
console.log('  GET    /admin/sessions    (protected)');
console.log('  GET    /admin/tools       (protected)');
console.log('  GET    /admin/client/keys (protected)');
console.log('='.repeat(60));
console.log('\n📝 Pour tester, lancer dans un autre terminal:');
console.log('  cd packages/server && tsx test-admin-auth.ts\n');
