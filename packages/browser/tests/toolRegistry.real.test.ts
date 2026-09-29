// Registre unique du SDK navigateur (#157) avec le vrai OwlLayerClient du core, sans mock.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OwlLayer } from '../src/index.js';
import { BrowserOwlLayerCore } from '../src/runtime/BrowserOwlLayerCore.js';

afterEach(() => {
  OwlLayer.destroy();
  document.body.innerHTML = '';
});

async function init() {
  await OwlLayer.init({ apiKey: 'pk_test', endpoint: 'ws://localhost:4001/owllayer', autoConnect: false });
}

describe('audit lot E — SDK navigateur sur le registre du core', () => {
  it('registerTool puis unregisterTool se voient dans le registre du client', async () => {
    await init();
    OwlLayer.registerTool('find', { description: 'Find', risk: 'none', handler: async () => 1 });
    OwlLayer.registerTool('pay', { description: 'Pay', risk: 'critical', handler: async () => 2 });
    expect(OwlLayer.getRegisteredTools().map((t: any) => t.name)).toEqual(['find', 'pay']);

    OwlLayer.unregisterTool('find');
    expect(OwlLayer.getRegisteredTools().map((t: any) => t.name)).toEqual(['pay']);
    await expect(OwlLayer.callTool('find', {})).rejects.toThrow("callTool: outil 'find' non enregistre");
  });

  it('callTool execute le handler et declenche onToolCall', async () => {
    await init();
    const seen: Array<[string, Record<string, unknown>]> = [];
    OwlLayer.onToolCall((name, args) => seen.push([name, args]));
    const handler = vi.fn(async (args: Record<string, unknown>) => ({ echoed: args }));
    OwlLayer.registerTool('echo', { description: 'Echo', risk: 'none', handler });

    await expect(OwlLayer.callTool('echo', { q: 'x' })).resolves.toEqual({ echoed: { q: 'x' } });
    expect(handler).toHaveBeenCalledWith({ q: 'x' });
    expect(seen).toEqual([['echo', { q: 'x' }]]);
  });

  it('un nouvel enregistrement du meme nom remplace le handler', async () => {
    await init();
    OwlLayer.registerTool('v', { description: 'v1', risk: 'none', handler: async () => 'one' });
    OwlLayer.registerTool('v', { description: 'v2', risk: 'none', handler: async () => 'two' });

    expect(OwlLayer.getRegisteredTools()).toHaveLength(1);
    await expect(OwlLayer.callTool('v', {})).resolves.toBe('two');
  });

  it('destroy puis init repartent d un registre vide', async () => {
    await init();
    OwlLayer.registerTool('a', { description: 'a', risk: 'none', handler: async () => 1 });
    OwlLayer.destroy();
    await init();

    expect(OwlLayer.getRegisteredTools()).toEqual([]);
  });

  it('callTool avant init est refuse', async () => {
    await expect(OwlLayer.callTool('any', {})).rejects.toThrow("callTool: outil 'any' non enregistre");
  });
});

describe('audit lot E — runtime core du SDK navigateur', () => {
  it('BrowserOwlLayerCore enregistre et retire les tools dans le client', async () => {
    const runtime = new BrowserOwlLayerCore();
    await runtime.init({ apiKey: 'pk_test', endpoint: 'ws://localhost:4001/owllayer', autoConnect: false });
    const seen: string[] = [];
    runtime.onToolCall((name) => seen.push(name));
    runtime.registerTool('a', { description: 'a', risk: 'none', handler: async (args) => args });
    runtime.registerTool('b', { description: 'b', risk: 'none', handler: async () => 'b' });
    const client = (runtime as any).client;

    expect(client.registeredTools.map((t: any) => t.name)).toEqual(['a', 'b']);
    await expect(client.callTool('a', { k: 1 })).resolves.toEqual({ k: 1 });
    expect(seen).toEqual(['a']);

    runtime.unregisterTool('a');
    expect(client.registeredTools.map((t: any) => t.name)).toEqual(['b']);
    runtime.destroy();
  });
});
