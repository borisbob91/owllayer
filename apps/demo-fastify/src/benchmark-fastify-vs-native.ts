// Benchmark : Fastify vs Serveur Natif
// Compare les performances des deux approches

import 'dotenv/config';
import autocannon from 'autocannon';
import Fastify from 'fastify';
import { domosPlugin } from '@domos/server/adapters/fastify';
import { DomOSServer } from '@domos/server';
import WebSocket from 'ws';

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
    client: {
      maxConnectionsPerKey: 200, // Benchmark avec 100 connexions/key
    },
    rateLimit: {
      disabled: true, // Désactiver rate limit pour benchmark
    },
  });

  // Ajouter l'API key AVANT de démarrer le serveur
  server.addApiKey('test-key');

  try {
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

    return {
      name: 'Native Server',
      requestsPerSecond: result.requests.mean,
      latencyP50: result.latency.p50,
      latencyP99: result.latency.p99,
      throughput: result.throughput.mean,
    };
  } finally {
    server.stop();
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

async function benchmarkFastifyServer() {
  console.log('\n🟢 Benchmark : Serveur Fastify + DomOS...\n');

  const app = Fastify({ logger: false });

  try {
    await app.register(domosPlugin, {
      llm: mockLLM as any,
      port: 9101,
      admin: {
        username: 'admin',
        password: 'test123456',
      },
      client: {
        maxConnectionsPerKey: 200, // Benchmark avec 100 connexions/key
      },
      rateLimit: {
        disabled: true, // Désactiver rate limit pour benchmark
      },
    });

    // Ajouter l'API key via app.domos.addApiKey()
    app.domos.addApiKey('test-key');

    // Route de test
    app.get('/test/ping', async () => ({ pong: Date.now() }));

    await app.listen({ port: 9101, host: '0.0.0.0' });

    const result = await autocannon({
      url: 'http://localhost:9101/test/ping',
      connections: 100,
      duration: 10,
    });

    return {
      name: 'Fastify + DomOS',
      requestsPerSecond: result.requests.mean,
      latencyP50: result.latency.p50,
      latencyP99: result.latency.p99,
      throughput: result.throughput.mean,
    };
  } finally {
    await app.close();
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// Benchmark WebSocket avec ADTP handshake
async function benchmarkWebSocketConnections(port: number, serverName: string, connections: number, duration: number) {
  console.log(`\n🔌 Benchmark WebSocket : ${serverName} (${connections} connexions, ${duration}s)...\n`);

  const startTime = Date.now();
  const latencies: number[] = [];
  let successfulConnections = 0;
  let successfulHandshakes = 0;
  let messagesSent = 0;
  let messagesReceived = 0;

  const connectAndTest = (): Promise<void> => {
    return new Promise((resolve) => {
      const connectStart = Date.now();
      // IMPORTANT: Le path par défaut de DomOSServer est /domos
      // L'API key doit être passée comme query param pendant la connexion
      const ws = new WebSocket(`ws://localhost:${port}/domos?apiKey=test-key`);

      const timeout = setTimeout(() => {
        ws.close();
        resolve();
      }, duration * 1000);

      ws.on('open', () => {
        successfulConnections++;
        const connectLatency = Date.now() - connectStart;
        latencies.push(connectLatency);

        // Envoyer HANDSHAKE_INIT avec le format ADTP correct
        const handshakeStart = Date.now();
        ws.send(JSON.stringify({
          type: 'HANDSHAKE_INIT',
          payload: {
            apiKey: 'test-key',
            userAgent: 'benchmark-client',
            viewport: '0x0',
            sdkVersion: '0.1.0',
            protocolVersion: '1.0.0'
          }
        }));
        messagesSent++;

        ws.on('message', (data: Buffer) => {
          try {
            const msg = JSON.parse(data.toString());
            messagesReceived++;
            
            if (msg.type === 'HANDSHAKE_ACK') {
              successfulHandshakes++;
              const handshakeLatency = Date.now() - handshakeStart;
              latencies.push(handshakeLatency);
              
              // Fermer après handshake réussi (suffisant pour le benchmark)
              ws.close();
            }
          } catch (e) {
            // Ignore parse errors
          }
        });
      });

      ws.on('error', () => {
        clearTimeout(timeout);
        resolve();
      });

      ws.on('close', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  };

  // Lancer les connexions en parallèle
  const promises: Promise<void>[] = [];
  for (let i = 0; i < connections; i++) {
    promises.push(connectAndTest());
    // Étaler les connexions
    if (i % 50 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  await Promise.all(promises);

  const totalDuration = (Date.now() - startTime) / 1000;
  
  // Calculer statistiques
  latencies.sort((a, b) => a - b);
  const p50Index = Math.floor(latencies.length * 0.5);
  const p99Index = Math.floor(latencies.length * 0.99);

  return {
    name: serverName,
    connections: successfulConnections,
    handshakes: successfulHandshakes,
    messagesSent,
    messagesReceived,
    connectionsPerSec: (successfulConnections / totalDuration).toFixed(2),
    latencyP50: latencies[p50Index] || 0,
    latencyP99: latencies[p99Index] || 0,
    duration: totalDuration.toFixed(2),
  };
}

async function benchmarkNativeWebSocket() {
  const server = new DomOSServer({
    llm: mockLLM as any,
    port: 9200,
    admin: {
      username: 'admin',
      password: 'test123456',
    },
    client: {
      maxConnectionsPerKey: 200, // Benchmark avec 100 connexions/key
    },
    rateLimit: {
      disabled: true, // Désactiver rate limit pour benchmark
    },
  });

  // Ajouter l'API key AVANT de démarrer le serveur
  server.addApiKey('test-key');

  try {
    server.listen();
    await new Promise(resolve => setTimeout(resolve, 1000));

    const result = await benchmarkWebSocketConnections(9200, 'Native Server', 100, 5);
    return result;
  } finally {
    server.stop();
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

async function benchmarkFastifyWebSocket() {
  const app = Fastify({ logger: false });

  try {
    await app.register(domosPlugin, {
      llm: mockLLM as any,
      port: 9201,
      admin: {
        username: 'admin',
        password: 'test123456',
      },
      client: {
        maxConnectionsPerKey: 200, // Benchmark avec 100 connexions/key
      },
      rateLimit: {
        disabled: true, // Désactiver rate limit pour benchmark
      },
    });

    // Ajouter l'API key via app.domos.addApiKey()
    app.domos.addApiKey('test-key');

    await app.listen({ port: 9201, host: '0.0.0.0' });
    await new Promise(resolve => setTimeout(resolve, 1000));

    const result = await benchmarkWebSocketConnections(9201, 'Fastify + DomOS', 100, 5);
    return result;
  } finally {
    await app.close();
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║  DomOS Server - Benchmark Comparatif                  ║
║  Native vs Fastify                                    ║
╚═══════════════════════════════════════════════════════╝
  `);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📡 PARTIE 1 : HTTP REST (Admin Routes)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const nativeResults = await benchmarkNativeServer();
  await new Promise(resolve => setTimeout(resolve, 2000));
  const fastifyResults = await benchmarkFastifyServer();

  console.log('\n📊 Résultats HTTP:\n');
  console.table([nativeResults, fastifyResults]);

  console.log('\n📈 Delta Performance HTTP:\n');

  const reqDelta = ((fastifyResults.requestsPerSecond - nativeResults.requestsPerSecond) / nativeResults.requestsPerSecond * 100).toFixed(2);
  const latP50Delta = ((fastifyResults.latencyP50 - nativeResults.latencyP50) / nativeResults.latencyP50 * 100).toFixed(2);
  const latP99Delta = ((fastifyResults.latencyP99 - nativeResults.latencyP99) / nativeResults.latencyP99 * 100).toFixed(2);

  console.log(`Requests/sec : ${reqDelta > 0 ? '+' : ''}${reqDelta}%`);
  console.log(`Latence P50  : ${latP50Delta > 0 ? '+' : ''}${latP50Delta}%`);
  console.log(`Latence P99  : ${latP99Delta > 0 ? '+' : ''}${latP99Delta}%`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔌 PARTIE 2 : WebSocket ADTP (Vraie charge)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await new Promise(resolve => setTimeout(resolve, 2000));
  const nativeWsResults = await benchmarkNativeWebSocket();
  await new Promise(resolve => setTimeout(resolve, 2000));
  const fastifyWsResults = await benchmarkFastifyWebSocket();

  console.log('\n📊 Résultats WebSocket:\n');
  console.table([nativeWsResults, fastifyWsResults]);

  console.log('\n📈 Delta Performance WebSocket:\n');

  const wsConnDelta = ((parseFloat(fastifyWsResults.connectionsPerSec) - parseFloat(nativeWsResults.connectionsPerSec)) / parseFloat(nativeWsResults.connectionsPerSec) * 100).toFixed(2);
  const wsHandshakeDelta = ((fastifyWsResults.handshakes - nativeWsResults.handshakes) / nativeWsResults.handshakes * 100).toFixed(2);
  const wsLatP50Delta = ((fastifyWsResults.latencyP50 - nativeWsResults.latencyP50) / nativeWsResults.latencyP50 * 100).toFixed(2);
  const wsLatP99Delta = ((fastifyWsResults.latencyP99 - nativeWsResults.latencyP99) / nativeWsResults.latencyP99 * 100).toFixed(2);

  console.log(`Connexions/sec    : ${wsConnDelta > 0 ? '+' : ''}${wsConnDelta}%`);
  console.log(`Handshakes réussis: ${wsHandshakeDelta > 0 ? '+' : ''}${wsHandshakeDelta}%`);
  console.log(`Latence P50       : ${wsLatP50Delta > 0 ? '+' : ''}${wsLatP50Delta}%`);
  console.log(`Latence P99       : ${wsLatP99Delta > 0 ? '+' : ''}${wsLatP99Delta}%`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 VERDICT FINAL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const httpGain = parseFloat(reqDelta);
  const wsGain = parseFloat(wsConnDelta);

  console.log(`HTTP REST gain    : ${reqDelta > 0 ? '+' : ''}${reqDelta}%`);
  console.log(`WebSocket gain    : ${wsConnDelta > 0 ? '+' : ''}${wsConnDelta}%`);

  if (httpGain >= 30 && wsGain >= 30) {
    console.log('\n✅✅ Fastify apporte un gain significatif sur HTTP ET WebSocket (≥30%)');
    console.log('👉 Migration recommandée après Sprint 5');
  } else if (httpGain >= 30 || wsGain >= 30) {
    console.log('\n⚠️  Fastify plus rapide sur une métrique mais pas les deux');
    console.log('👉 Évaluation supplémentaire nécessaire avec charge production réelle');
  } else {
    console.log('\n❌ Serveur natif équivalent ou meilleur — Fastify non justifié');
    console.log('👉 Garder le serveur natif actuel');
  }

  console.log('\n💡 Note: WebSocket = 90% du trafic réel DomOS. HTTP = 10% (admin).');
  console.log('   La performance WebSocket est le critère principal.\n');
  
  // Attendre un peu pour s'assurer que tous les ports sont libérés
  await new Promise(resolve => setTimeout(resolve, 1000));
}

main()
  .then(() => {
    console.log('✅ Benchmark terminé\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur pendant le benchmark:', error);
    process.exit(1);
  });
