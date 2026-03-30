// Benchmark : Fastify vs Serveur Natif
// Compare les performances des deux approches

import autocannon from 'autocannon';
import Fastify from 'fastify';
import { domosPlugin } from '../src/adapters/fastify/FastifyAdapter.js';
import { DomOSServer } from '../src/core/DomOSServer.js';

// Mock LLM pour les tests de performance
const mockLLM = {
  name: 'mock',
  chat: async () => ({ role: 'assistant' as const, content: 'mock' }),
  getCapabilities: () => ({
    provider: 'mock',
    providerName: 'Mock',
    models: [],
  }),
};

async function benchmarkNativeServer() {
  console.log('\n🔵 Benchmark : Serveur Natif DomOSServer...\n');

  const server = new DomOSServer({
    llm: mockLLM as any,
    port: 9100,
    admin: {
      username: 'admin',
      password: 'test123456',
    },
  });

  server.listen();

  // Attendre que le serveur démarre
  await new Promise(resolve => setTimeout(resolve, 1000));

  const result = await autocannon({
    url: 'http://localhost:9100/admin/status',
    connections: 100,
    duration: 10,
    headers: {
      'Authorization': 'Basic ' + Buffer.from('admin:test123456').toString('base64'),
    },
  });

  server.stop();

  return {
    name: 'Native Server',
    requestsPerSecond: result.requests.mean,
    latencyP50: result.latency.p50,
    latencyP99: result.latency.p99,
    throughput: result.throughput.mean,
  };
}

async function benchmarkFastifyServer() {
  console.log('\n🟢 Benchmark : Serveur Fastify + DomOS...\n');

  const app = Fastify({ logger: false });

  await app.register(domosPlugin, {
    llm: mockLLM as any,
    port: 9101,
    admin: {
      username: 'admin',
      password: 'test123456',
    },
  });

  // Route de test
  app.get('/test/ping', async () => ({ pong: Date.now() }));

  await app.listen({ port: 9101, host: '0.0.0.0' });

  const result = await autocannon({
    url: 'http://localhost:9101/test/ping',
    connections: 100,
    duration: 10,
  });

  await app.close();

  return {
    name: 'Fastify + DomOS',
    requestsPerSecond: result.requests.mean,
    latencyP50: result.latency.p50,
    latencyP99: result.latency.p99,
    throughput: result.throughput.mean,
  };
}

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║  DomOS Server - Benchmark Comparatif                  ║
║  Native vs Fastify                                    ║
╚═══════════════════════════════════════════════════════╝
  `);

  const nativeResults = await benchmarkNativeServer();
  await new Promise(resolve => setTimeout(resolve, 2000));
  const fastifyResults = await benchmarkFastifyServer();

  console.log('\n📊 Résultats :\n');
  console.table([nativeResults, fastifyResults]);

  console.log('\n📈 Delta Performance :\n');

  const reqDelta = ((fastifyResults.requestsPerSecond - nativeResults.requestsPerSecond) / nativeResults.requestsPerSecond * 100).toFixed(2);
  const latP50Delta = ((fastifyResults.latencyP50 - nativeResults.latencyP50) / nativeResults.latencyP50 * 100).toFixed(2);
  const latP99Delta = ((fastifyResults.latencyP99 - nativeResults.latencyP99) / nativeResults.latencyP99 * 100).toFixed(2);

  console.log(`Requests/sec : ${reqDelta > 0 ? '+' : ''}${reqDelta}%`);
  console.log(`Latence P50  : ${latP50Delta > 0 ? '+' : ''}${latP50Delta}%`);
  console.log(`Latence P99  : ${latP99Delta > 0 ? '+' : ''}${latP99Delta}%`);

  if (parseFloat(reqDelta) >= 30) {
    console.log('\n✅ Fastify apporte un gain significatif (≥30%)');
  } else if (parseFloat(reqDelta) > 0) {
    console.log('\n⚠️  Fastify est plus rapide mais gain < 30%');
  } else {
    console.log('\n❌ Serveur natif plus performant — Fastify non justifié');
  }
}

main().catch(console.error);
