import { describe, expect, it, vi } from 'vitest';
import { MessageType, OwlLayerClient, validateMessage } from '../src/index.js';

const makeClient = () => new OwlLayerClient({ endpoint: 'ws://localhost:3000/owllayer', apiKey: 'pk_test', autoReconnect: false });

const transcript = (data: Record<string, unknown>) => ({
  id: 'm1',
  type: MessageType.SYSTEM_EVENT,
  timestamp: Date.now(),
  payload: { kind: 'transcript', data },
});

describe('OwlLayerClient — transcription vocale', () => {
  it('emet transcript.delta pour un evenement systeme transcript', () => {
    const client = makeClient();
    const listener = vi.fn();
    client.onEvent('transcript.delta', listener);

    (client as any).handleMessage(transcript({ role: 'user', text: 'Ajoute le casque' }));
    (client as any).handleMessage(transcript({ role: 'agent', text: 'C\'est fait.' }));

    expect(listener).toHaveBeenNthCalledWith(1, { role: 'user', text: 'Ajoute le casque' }, expect.anything());
    expect(listener).toHaveBeenNthCalledWith(2, { role: 'agent', text: 'C\'est fait.' }, expect.anything());
  });

  it('ignore un role inconnu ou un texte vide', () => {
    const client = makeClient();
    const listener = vi.fn();
    client.onEvent('transcript.delta', listener);

    (client as any).handleMessage(transcript({ role: 'system', text: 'x' }));
    (client as any).handleMessage(transcript({ role: 'user', text: '' }));
    (client as any).handleMessage(transcript({ role: 'agent' }));

    expect(listener).not.toHaveBeenCalled();
  });

  it('le validateur AITP accepte le type transcript', () => {
    const result = validateMessage(transcript({ role: 'agent', text: 'Bonjour' }));
    expect(result.success).toBe(true);
  });
});
