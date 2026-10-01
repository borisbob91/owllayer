import { describe, it, expect, vi } from 'vitest';
import type { ToolDeclaration } from '@owllayer/core';
import { GoogleLiveAdapter } from '../src/GoogleLiveAdapter.js';

// Faux client Live : chaque connect() garde sa config, ses callbacks et une fausse session
function mockLive() {
  const connections: Array<{ config: any; callbacks: any; session: any }> = [];
  const connect = vi.fn(async ({ config, callbacks }: any) => {
    const session = {
      close: vi.fn(),
      sendRealtimeInput: vi.fn(async () => {}),
      sendClientContent: vi.fn(async () => {}),
      sendToolResponse: vi.fn(async () => {}),
    };
    connections.push({ config, callbacks, session });
    return session;
  });
  const live = new GoogleLiveAdapter({ apiKey: 'test-key' });
  (live as any).client = { live: { connect } };
  return { live, connections, connect };
}

const tool = (name: string): ToolDeclaration => ({ name, description: `Tool ${name}`, risk: 'none' });
const names = (config: any) => (config.tools?.[0]?.functionDeclarations ?? []).map((d: any) => d.name);
const flush = () => new Promise((r) => setTimeout(r, 0));
const audioPart = { serverContent: { modelTurn: { parts: [{ inlineData: { data: 'AAAA', mimeType: 'audio/pcm' } }] } } };

async function openSession(initialTools: ToolDeclaration[] = [tool('add_to_cart')], extra: Record<string, unknown> = {}) {
  const mock = mockLive();
  const session = await mock.live.createSession({ systemPrompt: 'test', tools: initialTools, ...extra });
  return { ...mock, session, first: mock.connections[0] };
}

describe('GoogleLiveAdapter — mise a jour des tools (#175)', () => {
  it('expose updateTools', async () => {
    const { session, first } = await openSession();
    expect(typeof session.updateTools).toBe('function');
    expect(names(first.config)).toEqual(['add_to_cart']);
  });

  it('ouvre une nouvelle connexion avec les nouveaux tools et ferme l\'ancienne', async () => {
    const { session, connections, first } = await openSession();

    session.updateTools!([tool('add_to_cart'), tool('fill_checkout_form')]);
    await flush();

    expect(connections).toHaveLength(2);
    expect(first.session.close).toHaveBeenCalled();
    expect(names(connections[1].config)).toEqual(['add_to_cart', 'fill_checkout_form']);
    expect(connections[1].config.systemInstruction).toBe('test');
    expect(session.isActive).toBe(true);
  });

  it('rejoue l\'historique des transcriptions dans la nouvelle connexion', async () => {
    const { session, connections, first } = await openSession();
    first.callbacks.onmessage({ serverContent: { inputTranscription: { text: 'Go to ' } } });
    first.callbacks.onmessage({ serverContent: { inputTranscription: { text: 'checkout' } } });
    first.callbacks.onmessage({ serverContent: { outputTranscription: { text: 'Done, ' } } });
    first.callbacks.onmessage({ serverContent: { outputTranscription: { text: 'you are at checkout.' } } });
    first.callbacks.onmessage({ serverContent: { turnComplete: true } });
    await session.sendText('Fill the form');

    session.updateTools!([tool('fill_checkout_form')]);
    await flush();

    expect(connections[1].session.sendClientContent).toHaveBeenCalledWith({
      turns: [
        { role: 'user', parts: [{ text: 'Go to checkout' }] },
        { role: 'model', parts: [{ text: 'Done, you are at checkout.' }] },
        { role: 'user', parts: [{ text: 'Fill the form' }] },
      ],
      turnComplete: false,
    });
  });

  it('ne rejoue rien sans historique', async () => {
    const { session, connections } = await openSession();
    session.updateTools!([tool('b')]);
    await flush();
    expect(connections[1].session.sendClientContent).not.toHaveBeenCalled();
  });

  it('limite le nombre de tours rejoues', async () => {
    const { session, connections, first } = await openSession();
    for (let i = 0; i < 30; i++) {
      first.callbacks.onmessage({ serverContent: { inputTranscription: { text: `u${i}` } } });
      first.callbacks.onmessage({ serverContent: { outputTranscription: { text: `m${i}` } } });
      first.callbacks.onmessage({ serverContent: { turnComplete: true } });
    }

    session.updateTools!([tool('b')]);
    await flush();

    const { turns } = connections[1].session.sendClientContent.mock.calls[0][0];
    expect(turns).toHaveLength(40);
    expect(turns[0]).toEqual({ role: 'user', parts: [{ text: 'u10' }] });
    expect(turns[39]).toEqual({ role: 'model', parts: [{ text: 'm29' }] });
  });

  it('ne reconnecte pas si les tools sont identiques', async () => {
    const { session, connections } = await openSession();
    session.updateTools!([tool('add_to_cart')]);
    await flush();
    expect(connections).toHaveLength(1);
  });

  it('la meme liste renvoyee apres application ne reconnecte pas', async () => {
    const { session, connections } = await openSession();
    session.updateTools!([tool('b')]);
    await flush();
    session.updateTools!([tool('b')]);
    await flush();
    expect(connections).toHaveLength(2);
  });

  it('une liste deja en attente n\'est pas annulee par la meme liste', async () => {
    const { session, connections, first } = await openSession();
    first.callbacks.onmessage(audioPart);

    session.updateTools!([tool('b')]);
    session.updateTools!([tool('b')]);
    first.callbacks.onmessage({ serverContent: { turnComplete: true } });
    await flush();

    expect(connections).toHaveLength(2);
    expect(names(connections[1].config)).toEqual(['b']);
  });

  it('attend la fin de la reponse du modele', async () => {
    const { session, connections, first } = await openSession();
    first.callbacks.onmessage(audioPart);

    session.updateTools!([tool('b')]);
    await flush();
    expect(connections).toHaveLength(1);

    first.callbacks.onmessage({ serverContent: { turnComplete: true } });
    await flush();
    expect(connections).toHaveLength(2);
  });

  it('attend la fin du tour utilisateur', async () => {
    const { session, connections, first } = await openSession();
    first.callbacks.onmessage({ serverContent: { inputTranscription: { text: 'je veux' } } });

    session.updateTools!([tool('select_payment')]);
    await flush();
    expect(connections).toHaveLength(1);

    first.callbacks.onmessage({ serverContent: { turnComplete: true } });
    await flush();
    expect(connections).toHaveLength(2);
  });

  it('attend la reponse des tools en cours (navigation par la voix)', async () => {
    const { session, connections, first } = await openSession();
    first.callbacks.onmessage({ toolCall: { functionCalls: [{ id: 'c1', name: 'go_to_checkout', args: {} }] } });
    // Barge-in sans annulation : le tour du modele est fini, la reponse du tool reste attendue
    first.callbacks.onmessage({ serverContent: { interrupted: true } });

    session.updateTools!([tool('fill_checkout_form')]);
    await flush();
    expect(connections).toHaveLength(1);

    await session.sendToolResponse('c1', 'go_to_checkout', { success: true });
    expect(first.session.sendToolResponse).toHaveBeenCalled();
    first.callbacks.onmessage(audioPart);
    await flush();
    expect(connections).toHaveLength(1);

    first.callbacks.onmessage({ serverContent: { turnComplete: true } });
    await flush();
    expect(connections).toHaveLength(2);
    expect(names(connections[1].config)).toEqual(['fill_checkout_form']);
  });

  it('un appel annule ne bloque pas la mise a jour', async () => {
    const { session, connections, first } = await openSession();
    first.callbacks.onmessage({ toolCall: { functionCalls: [{ id: 'c1', name: 'a', args: {} }] } });
    first.callbacks.onmessage({ serverContent: { interrupted: true } });
    first.callbacks.onmessage({ toolCallCancellation: { ids: ['c1'] } });

    session.updateTools!([tool('b')]);
    await flush();
    expect(connections).toHaveLength(2);
  });

  it('les callbacks de l\'ancienne connexion sont ignores', async () => {
    const onClose = vi.fn();
    const onToolCall = vi.fn();
    const onError = vi.fn();
    const { session, connections, first } = await openSession([tool('a')], { onClose, onToolCall, onError });

    session.updateTools!([tool('b')]);
    await flush();
    first.callbacks.onclose({ code: 1000 });
    first.callbacks.onerror(new Error('old'));
    first.callbacks.onmessage({ toolCall: { functionCalls: [{ id: 'old', name: 'a', args: {} }] } });

    expect(onClose).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(onToolCall).not.toHaveBeenCalled();
    expect(session.isActive).toBe(true);

    connections[1].callbacks.onmessage({ toolCall: { functionCalls: [{ id: 'new', name: 'b', args: {} }] } });
    expect(onToolCall).toHaveBeenCalledWith(expect.objectContaining({ callId: 'new', name: 'b' }));
  });

  it('les envois pendant la reconnexion partent sur la nouvelle connexion', async () => {
    const { session, connections, first } = await openSession();

    session.updateTools!([tool('confirm_checkout')]);
    await session.sendAudio('AAAA');

    expect(first.session.sendRealtimeInput).not.toHaveBeenCalled();
    expect(connections[1].session.sendRealtimeInput).toHaveBeenCalledWith({
      audio: { mimeType: 'audio/pcm;rate=16000', data: 'AAAA' },
    });
  });

  it('un echec de reconnexion ferme la session et signale l\'erreur', async () => {
    const onError = vi.fn();
    const { session, connect } = await openSession([tool('a')], { onError });
    connect.mockRejectedValueOnce(new Error('connect refused'));

    session.updateTools!([tool('b')]);
    await flush();
    await flush();

    expect(session.isActive).toBe(false);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'connect refused' }));
  });

  it('close() pendant la reconnexion ferme la nouvelle connexion', async () => {
    const { session, connections } = await openSession();

    session.updateTools!([tool('b')]);
    session.close();
    await flush();

    expect(connections).toHaveLength(2);
    expect(connections[1].session.close).toHaveBeenCalled();
    expect(session.isActive).toBe(false);
  });
});
