import { describe, it, expect, beforeEach } from 'vitest';
import { SessionGraph } from '../src/memory/SessionGraph.js';

describe('SessionGraph', () => {
  let graph: SessionGraph;

  beforeEach(() => {
    graph = new SessionGraph('sess_test');
  });

  it('enregistre les pages visitees', () => {
    graph.recordContextChange('/home');
    graph.recordContextChange('/products');
    graph.recordContextChange('/cart');

    const history = graph.getPageHistory();
    expect(history).toHaveLength(3);
    expect(history[0].url).toBe('/home');
    expect(history[2].url).toBe('/cart');
  });

  it('ne compte pas une nouvelle page tant que l URL ne change pas', () => {
    // Modale ou updateContext sur la meme page : plusieurs CONTEXT_UPDATE, une seule page
    graph.recordContextChange('/home');
    graph.recordContextChange('/home');
    graph.recordContextChange('/home');
    graph.recordContextChange('/cart');
    graph.recordContextChange('/cart');
    graph.recordContextChange('/home');

    expect(graph.getPageHistory().map((page) => page.url)).toEqual(['/home', '/cart', '/home']);
    expect(graph.getSummary().pagesVisited).toBe(3);
  });

  it('enregistre les appels de tools', () => {
    graph.recordToolCall('search');
    graph.recordToolCall('search');
    graph.recordToolCall('add_to_cart');

    const top = graph.getTopTools();
    expect(top[0]).toEqual({ name: 'search', count: 2 });
    expect(top[1]).toEqual({ name: 'add_to_cart', count: 1 });
  });

  it('suit les metriques', () => {
    graph.recordMessage();
    graph.recordMessage();
    graph.recordToolCall('search');
    graph.recordTokens(100, 50);
    graph.recordError();

    const metrics = graph.getMetrics();
    expect(metrics.totalMessages).toBe(2);
    expect(metrics.totalToolCalls).toBe(1);
    expect(metrics.totalTokensIn).toBe(100);
    expect(metrics.totalTokensOut).toBe(50);
    expect(metrics.errors).toBe(1);
  });

  it('genere un resume', () => {
    graph.recordContextChange('/home');
    graph.recordToolCall('search');
    graph.recordMessage();

    const summary = graph.getSummary();
    expect(summary.sessionId).toBe('sess_test');
    expect(summary.pagesVisited).toBe(1);
    expect(summary.topTools).toHaveLength(1);
  });
});
