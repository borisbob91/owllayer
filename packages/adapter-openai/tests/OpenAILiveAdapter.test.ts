import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { OpenAILiveAdapter } from '../src/OpenAILiveAdapter.js';

const sockets: FakeWebSocket[] = [];

class FakeWebSocket extends EventEmitter {
  sent: any[] = [];
  constructor(public url: string, public options: { headers: Record<string, string> }) {
    super();
    sockets.push(this);
    setTimeout(() => this.emit('open'), 0);
  }
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  close() {}
  /** Simuler un evenement serveur OpenAI Realtime */
  receive(event: Record<string, unknown>) {
    this.emit('message', JSON.stringify(event));
  }
}

vi.mock('ws', () => ({ default: FakeWebSocket }));

async function openSession(
  options: Partial<ConstructorParameters<typeof OpenAILiveAdapter>[0]> = {},
  config: Record<string, unknown> = {}
) {
  const adapter = new OpenAILiveAdapter({ apiKey: 'test-key', ...options });
  const session = await adapter.createSession({
    systemPrompt: 'Tu es un assistant.',
    tools: [{ name: 'add_to_cart', description: 'Ajouter au panier', risk: 'low' }],
    ...config,
  } as any);
  const socket = sockets[sockets.length - 1];
  return { adapter, session, socket };
}

function pcm16Base64(samples: number[]): string {
  return Buffer.from(new Int16Array(samples).buffer).toString('base64');
}

function decodePcm16(base64: string): number[] {
  const bytes = Buffer.from(base64, 'base64');
  return Array.from(new Int16Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length)));
}

describe('OpenAILiveAdapter (Realtime GA)', () => {
  beforeEach(() => {
    sockets.length = 0;
  });

  it('se connecte au modele GA par defaut sans en-tete beta', async () => {
    const { socket } = await openSession();
    expect(socket.url).toBe('wss://api.openai.com/v1/realtime?model=gpt-realtime-1.5');
    expect(socket.options.headers).toEqual({ Authorization: 'Bearer test-key' });
  });

  it('envoie un session.update au format GA', async () => {
    const { socket } = await openSession({ voice: 'marin' });
    const update = socket.sent[0];

    expect(update.type).toBe('session.update');
    expect(update.session).toMatchObject({
      type: 'realtime',
      instructions: 'Tu es un assistant.',
      output_modalities: ['audio'],
      audio: {
        input: {
          format: { type: 'audio/pcm', rate: 24000 },
          transcription: { model: 'whisper-1' },
          turn_detection: { type: 'server_vad', threshold: 0.5, prefix_padding_ms: 300, silence_duration_ms: 500 },
        },
        output: { format: { type: 'audio/pcm', rate: 24000 }, voice: 'marin' },
      },
    });
    expect(update.session.tools[0]).toMatchObject({ type: 'function', name: 'add_to_cart' });
    expect(update.session).not.toHaveProperty('input_audio_format');
    // gpt-realtime-1.5 ne raisonne pas : pas de reasoning.effort
    expect(update.session).not.toHaveProperty('reasoning');
  });

  it('envoie reasoning.effort low par defaut avec gpt-realtime-2', async () => {
    const { socket } = await openSession({ model: 'gpt-realtime-2' });
    expect(socket.sent[0].session.reasoning).toEqual({ effort: 'low' });
  });

  it('respecte un reasoningEffort explicite', async () => {
    const { socket } = await openSession({ model: 'gpt-realtime-2.1', reasoningEffort: 'medium' });
    expect(socket.sent[0].session.reasoning).toEqual({ effort: 'medium' });
  });

  it('reechantillonne l audio 16 kHz vers 24 kHz', async () => {
    const { session, socket } = await openSession();
    await session.sendAudio(pcm16Base64([0, 300, 600, 900]), 'audio/pcm;rate=16000');

    const append = socket.sent.find((e) => e.type === 'input_audio_buffer.append');
    expect(decodePcm16(append.audio)).toEqual([0, 200, 400, 600, 800, 900]);
  });

  it('transmet l audio 24 kHz sans le modifier', async () => {
    const { session, socket } = await openSession();
    const audio = pcm16Base64([1, 2, 3]);
    await session.sendAudio(audio, 'audio/pcm;rate=24000');

    const append = socket.sent.find((e) => e.type === 'input_audio_buffer.append');
    expect(append.audio).toBe(audio);
  });

  it('mappe les evenements GA audio, transcript et tool call', async () => {
    const onAudioOutput = vi.fn();
    const onTextOutput = vi.fn();
    const onToolCall = vi.fn();
    const { socket } = await openSession({}, { onAudioOutput, onTextOutput, onToolCall });

    socket.receive({ type: 'response.output_audio.delta', delta: 'AAAA' });
    socket.receive({ type: 'response.output_audio_transcript.delta', delta: 'Bonjour' });
    socket.receive({
      type: 'response.function_call_arguments.done',
      call_id: 'call_1',
      name: 'add_to_cart',
      arguments: '{"productId":"p1"}',
    });

    expect(onAudioOutput).toHaveBeenCalledWith('AAAA', 'audio/pcm;rate=24000');
    expect(onTextOutput).toHaveBeenCalledWith('Bonjour', false);
    expect(onToolCall).toHaveBeenCalledWith({ callId: 'call_1', name: 'add_to_cart', args: { productId: 'p1' } });
  });

  it('signale un barge-in quand l utilisateur parle pendant la reponse', async () => {
    const onInterrupted = vi.fn();
    const { socket } = await openSession({}, { onInterrupted });

    socket.receive({ type: 'input_audio_buffer.speech_started' });
    expect(onInterrupted).not.toHaveBeenCalled();

    socket.receive({ type: 'response.output_audio.delta', delta: 'AAAA' });
    socket.receive({ type: 'input_audio_buffer.speech_started' });
    expect(onInterrupted).toHaveBeenCalledTimes(1);
  });

  it('interrupt annule la reponse en cours uniquement', async () => {
    const { session, socket } = await openSession();

    await session.interrupt!();
    expect(socket.sent.some((e) => e.type === 'response.cancel')).toBe(false);

    socket.receive({ type: 'response.output_audio.delta', delta: 'AAAA' });
    await session.interrupt!();
    expect(socket.sent.filter((e) => e.type === 'response.cancel')).toHaveLength(1);
  });

  it('updateTools met a jour les tools de la session', async () => {
    const { session, socket } = await openSession();
    session.updateTools!([{ name: 'fill_address', description: 'Remplir l adresse', risk: 'none' }]);

    const update = socket.sent[socket.sent.length - 1];
    expect(update).toMatchObject({ type: 'session.update', session: { type: 'realtime' } });
    expect(update.session.tools.map((t: any) => t.name)).toEqual(['fill_address']);
  });

  it('endAudioTurn ne fait rien avec le VAD serveur', async () => {
    const { session, socket } = await openSession();
    const before = socket.sent.length;
    await session.endAudioTurn!();
    expect(socket.sent).toHaveLength(before);
  });

  it('endAudioTurn valide le buffer en push-to-talk', async () => {
    const { session, socket } = await openSession({ turnDetection: null });
    expect(socket.sent[0].session.audio.input.turn_detection).toBeNull();

    await session.endAudioTurn!();
    expect(socket.sent.slice(-2).map((e) => e.type)).toEqual(['input_audio_buffer.commit', 'response.create']);
  });

  it('expose les voix Realtime supportees uniquement', () => {
    const adapter = new OpenAILiveAdapter({ apiKey: 'test-key' });
    const voices = adapter.getCapabilities().voices!.map((v) => v.id);
    expect(voices).toContain('marin');
    expect(voices).not.toContain('nova');
    expect(adapter.getCapabilities().currentModel).toBe('gpt-realtime-1.5');
  });
});
