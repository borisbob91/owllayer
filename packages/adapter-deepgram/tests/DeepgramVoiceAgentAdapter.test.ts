// ============================================================
// DeepgramVoiceAgentAdapter / DeepgramVoiceAgentSession (S6-S10, T080)
// Poignee de main Welcome/Settings/SettingsApplied, contenu de Settings
// (fournisseurs, credentials tiers, contexte), evenements, fonctions,
// annulation, UpdateThink, KeepAlive, erreurs fatales et fermeture.
// ============================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LiveSessionConfig } from '@owllayer/core';
import { FakeDeepgramWebSocket, lastFakeDeepgramSocket, resetFakeDeepgramSockets } from './helpers/fakeDeepgramSocket.js';
import { DeepgramVoiceAgentAdapter } from '../src/DeepgramVoiceAgentAdapter.js';
import type { DeepgramVoiceAgentSession } from '../src/DeepgramVoiceAgentSession.js';
import type { DeepgramVoiceAgentOptions } from '../src/settings.js';

vi.mock('ws', () => ({ default: FakeDeepgramWebSocket }));

type Frame = Record<string, unknown>;

function jsonFrames(socket: FakeDeepgramWebSocket): Frame[] {
  return socket.sent.filter((frame): frame is string => typeof frame === 'string').map((frame) => JSON.parse(frame));
}

function createConfig(overrides: Partial<LiveSessionConfig> = {}) {
  const callbacks = {
    onAudioOutput: vi.fn(),
    onTextOutput: vi.fn(),
    onToolCall: vi.fn(),
    onTranscript: vi.fn(),
    onError: vi.fn(),
    onClose: vi.fn(),
    onInterrupted: vi.fn(),
    onWaitingForInput: vi.fn(),
    onToolCallCancelled: vi.fn(),
  };
  const config: LiveSessionConfig = { systemPrompt: 'Tu es un assistant.', tools: [], ...callbacks, ...overrides };
  return { config, ...callbacks };
}

async function startSession(options: Partial<DeepgramVoiceAgentOptions> = {}, configOverrides: Partial<LiveSessionConfig> = {}) {
  const adapter = new DeepgramVoiceAgentAdapter({ apiKey: 'k', ...options } as DeepgramVoiceAgentOptions);
  const handles = createConfig(configOverrides);
  const pending = adapter.createSession(handles.config);
  const socket = lastFakeDeepgramSocket();
  socket.open();
  socket.serverSend({ type: 'Welcome', request_id: 'req-1' });
  const settings = jsonFrames(socket)[0] as { agent: Record<string, any>; audio: Record<string, any> };
  socket.serverSend({ type: 'SettingsApplied' });
  const session = (await pending) as DeepgramVoiceAgentSession;
  socket.sent.length = 0;
  return { adapter, session, socket, settings, ...handles };
}

describe('DeepgramVoiceAgentAdapter', () => {
  beforeEach(() => resetFakeDeepgramSockets());
  afterEach(() => vi.useRealTimers());

  describe('construction', () => {
    it('rejects an empty API key with AUTH_FAILED before any socket', () => {
      expect(() => new DeepgramVoiceAgentAdapter({ apiKey: '' })).toThrow(expect.objectContaining({ code: 'AUTH_FAILED' }));
      expect(FakeDeepgramWebSocket.instances).toHaveLength(0);
    });

    it('rejects a managed think provider credential without think.endpointUrl', () => {
      expect(
        () => new DeepgramVoiceAgentAdapter({ apiKey: 'k', thinkProviderCredential: { kind: 'api-key', apiKey: 'sk-openai' } }),
      ).toThrow(expect.objectContaining({ code: 'INVALID_SETTINGS' }));
    });

    it('requires speak.model and speak.voice for a third-party voice such as OpenAI', () => {
      const base = { apiKey: 'k', speakProviderCredential: { kind: 'api-key' as const, apiKey: 'sk-openai' } };
      expect(
        () => new DeepgramVoiceAgentAdapter({ ...base, speak: { provider: 'open_ai', model: 'tts-1', endpointUrl: 'https://api.openai.com/v1/audio/speech' } }),
      ).toThrow(expect.objectContaining({ code: 'INVALID_SETTINGS' }));
      expect(
        () => new DeepgramVoiceAgentAdapter({ ...base, speak: { provider: 'open_ai', voice: 'alloy', endpointUrl: 'https://api.openai.com/v1/audio/speech' } }),
      ).toThrow(expect.objectContaining({ code: 'INVALID_SETTINGS' }));
    });

    it('enforces the catalog credential policy (groq needs its own key)', () => {
      expect(
        () => new DeepgramVoiceAgentAdapter({ apiKey: 'k', think: { provider: 'groq', model: 'llama-3.3-70b', endpointUrl: 'https://api.groq.com/openai/v1/chat/completions' } }),
      ).toThrow(expect.objectContaining({ code: 'PROVIDER_CREDENTIAL_REQUIRED' }));
    });

    it('exposes the realtime capabilities with the configured think model', () => {
      const capabilities = new DeepgramVoiceAgentAdapter({ apiKey: 'sk-secret' }).getCapabilities();
      expect(capabilities.provider).toBe('deepgram-voice-agent');
      expect(capabilities.currentModel).toBe('gpt-5.4-mini');
      expect(capabilities.currentVoice).toBe('aura-2-agathe-fr');
      expect(JSON.stringify(capabilities)).not.toContain('sk-secret');
    });
  });

  describe('handshake (S7)', () => {
    it('connects to the agent endpoint with the key only in the Authorization header', async () => {
      const adapter = new DeepgramVoiceAgentAdapter({ apiKey: 'sk-very-secret' });
      void adapter.createSession(createConfig().config).catch(() => {});
      const socket = lastFakeDeepgramSocket();

      expect(socket.url).toBe('wss://agent.deepgram.com/v1/agent/converse');
      expect(socket.options.headers).toEqual({ Authorization: 'Token sk-very-secret' });
    });

    it('sends nothing before Welcome, then exactly one Settings, and resolves only on SettingsApplied', async () => {
      const adapter = new DeepgramVoiceAgentAdapter({ apiKey: 'k' });
      let resolved = false;
      const pending = adapter.createSession(createConfig().config).then((session) => {
        resolved = true;
        return session;
      });
      const socket = lastFakeDeepgramSocket();
      socket.open();
      expect(socket.sent).toHaveLength(0);

      socket.serverSend({ type: 'Welcome', request_id: 'r' });
      expect(jsonFrames(socket).map((frame) => frame.type)).toEqual(['Settings']);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(resolved).toBe(false);

      socket.serverSend({ type: 'SettingsApplied' });
      const session = await pending;
      expect(resolved).toBe(true);
      expect(session.isActive).toBe(true);
      session.close();
    });

    it('ignores SettingsApplied before Welcome and a repeated Welcome: one Settings, active only after it', async () => {
      const adapter = new DeepgramVoiceAgentAdapter({ apiKey: 'k' });
      let resolved = false;
      const pending = adapter.createSession(createConfig().config).then((session) => {
        resolved = true;
        return session;
      });
      const socket = lastFakeDeepgramSocket();
      socket.open();

      socket.serverSend({ type: 'SettingsApplied' });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(resolved).toBe(false);
      expect(socket.sent).toHaveLength(0);

      socket.serverSend({ type: 'Welcome' });
      socket.serverSend({ type: 'Welcome' });
      expect(jsonFrames(socket).map((frame) => frame.type)).toEqual(['Settings']);

      socket.serverSend({ type: 'SettingsApplied' });
      const session = await pending;
      expect(session.isActive).toBe(true);
      session.close();
    });

    it('rejects with TIMEOUT when SettingsApplied never arrives, releasing the socket and timers without onError', async () => {
      vi.useFakeTimers();
      const adapter = new DeepgramVoiceAgentAdapter({ apiKey: 'k', limits: { handshakeTimeoutMs: 1000 } });
      const { config, onError } = createConfig();
      let failure: unknown;
      void adapter.createSession(config).catch((error: unknown) => {
        failure = error;
      });
      const socket = lastFakeDeepgramSocket();
      socket.open();
      socket.serverSend({ type: 'Welcome' });

      await vi.advanceTimersByTimeAsync(1000);

      expect(failure).toMatchObject({ provider: 'deepgram', code: 'TIMEOUT' });
      expect(socket.closed).toBe(true);
      expect(onError).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    });

    it('rejects with TIMEOUT when the socket never opens', async () => {
      vi.useFakeTimers();
      const adapter = new DeepgramVoiceAgentAdapter({ apiKey: 'k', limits: { openTimeoutMs: 500 } });
      let failure: unknown;
      void adapter.createSession(createConfig().config).catch((error: unknown) => {
        failure = error;
      });

      await vi.advanceTimersByTimeAsync(500);

      expect(failure).toMatchObject({ code: 'TIMEOUT' });
      expect(vi.getTimerCount()).toBe(0);
    });

    it('rejects with PROVIDER_UNAVAILABLE on a provider Error during the handshake, never exposing its description', async () => {
      const adapter = new DeepgramVoiceAgentAdapter({ apiKey: 'k' });
      const { config, onError } = createConfig();
      const pending = adapter.createSession(config);
      const socket = lastFakeDeepgramSocket();
      socket.open();
      socket.serverSend({ type: 'Welcome' });
      socket.serverSend({ type: 'Error', code: 'INVALID_SETTINGS', description: 'secret detail sk-xyz' });

      await expect(pending).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
      await pending.catch((error: Error) => expect(error.message).not.toContain('sk-xyz'));
      expect(socket.closed).toBe(true);
      expect(onError).not.toHaveBeenCalled();
    });

    it('rejects with AUTH_FAILED when Deepgram refuses the key at the handshake (HTTP 401)', async () => {
      const adapter = new DeepgramVoiceAgentAdapter({ apiKey: 'k' });
      const pending = adapter.createSession(createConfig().config);
      const socket = lastFakeDeepgramSocket();
      socket.serverError(new Error('Unexpected server response: 401'));
      socket.serverClose(1006, '');

      await expect(pending).rejects.toMatchObject({ code: 'AUTH_FAILED', statusCode: 401 });
    });

    it('rejects with REMOTE_CLOSED when Deepgram closes during the handshake', async () => {
      const adapter = new DeepgramVoiceAgentAdapter({ apiKey: 'k' });
      const pending = adapter.createSession(createConfig().config);
      const socket = lastFakeDeepgramSocket();
      socket.open();
      socket.serverClose(1006, '');

      await expect(pending).rejects.toMatchObject({ code: 'REMOTE_CLOSED' });
    });
  });

  describe('Settings content', () => {
    it('describes audio formats, language, listen, think, speak and functions', async () => {
      const { settings, session } = await startSession(
        {},
        {
          systemPrompt: 'Sois bref.',
          tools: [
            { name: 'open_cart', description: 'Open the cart.', risk: 'low' },
            { name: 'pay', description: 'Pay.', risk: 'critical' },
          ],
        },
      );

      expect(settings).toEqual({
        type: 'Settings',
        audio: {
          input: { encoding: 'linear16', sample_rate: 16000 },
          output: { encoding: 'linear16', sample_rate: 24000, container: 'none' },
        },
        agent: {
          language: 'fr',
          listen: { provider: { type: 'deepgram', version: 'v1', model: 'nova-3' } },
          think: {
            provider: { type: 'open_ai', model: 'gpt-5.4-mini' },
            prompt: 'Sois bref.',
            functions: [
              { name: 'open_cart', description: 'Open the cart.', parameters: { type: 'object', properties: {} } },
              { name: 'pay', description: 'Pay.', parameters: { type: 'object', properties: {} }, defer_until_eot: true },
            ],
          },
          speak: { provider: { type: 'deepgram', model: 'aura-2-agathe-fr' } },
        },
      });
      session.close();
    });

    it('uses Flux (listen v2) for English and sends keyterms, temperature and greeting when configured', async () => {
      const { settings, session } = await startSession({
        language: 'en',
        listen: { keyterms: ['OwlLayer'] },
        think: { provider: 'anthropic', model: 'claude-haiku-4-5', temperature: 0.4 },
        greeting: 'Hello!',
      });

      expect(settings.agent.language).toBe('en');
      expect(settings.agent.listen).toEqual({
        provider: { type: 'deepgram', version: 'v2', model: 'flux-general-en', keyterms: ['OwlLayer'] },
      });
      expect(settings.agent.think.provider).toEqual({ type: 'anthropic', model: 'claude-haiku-4-5', temperature: 0.4 });
      expect(settings.agent.speak.provider).toEqual({ type: 'deepgram', model: 'aura-2-thalia-en' });
      expect(settings.agent.greeting).toBe('Hello!');
      session.close();
    });

    it('prefers the session language over the configured one', async () => {
      const { settings, session } = await startSession({ language: 'fr' }, { language: 'en' });
      expect(settings.agent.language).toBe('en');
      expect(settings.agent.speak.provider.model).toBe('aura-2-thalia-en');
      session.close();
    });

    it('maps conversationHistory to History messages, without system messages, keeping the last maxHistoryMessages', async () => {
      const { settings, session } = await startSession(
        { limits: { maxHistoryMessages: 2 } },
        {
          conversationHistory: [
            { role: 'user', content: 'premier' },
            { role: 'assistant', content: 'reponse' },
            { role: 'system', content: 'ignored' },
            { role: 'user', content: 'dernier' },
          ],
        },
      );

      expect(settings.agent.context).toEqual({
        messages: [
          { type: 'History', role: 'assistant', content: 'reponse' },
          { type: 'History', role: 'user', content: 'dernier' },
        ],
      });
      session.close();
    });

    it('uses a session voice only when it is an Aura voice of the session language', async () => {
      const known = await startSession({}, { voice: 'aura-2-hector-fr' });
      expect(known.settings.agent.speak.provider.model).toBe('aura-2-hector-fr');
      known.session.close();

      const otherProvider = await startSession({}, { voice: 'Puck' });
      expect(otherProvider.settings.agent.speak.provider.model).toBe('aura-2-agathe-fr');
      otherProvider.session.close();

      const otherLanguage = await startSession({ speak: { voice: 'aura-2-hector-fr' } }, { voice: 'aura-2-thalia-en' });
      expect(otherLanguage.settings.agent.speak.provider.model).toBe('aura-2-hector-fr');
      otherLanguage.session.close();
    });

    it('sends a third-party think key only as documented endpoint headers', async () => {
      const groq = await startSession({
        think: { provider: 'groq', model: 'llama-3.3-70b', endpointUrl: 'https://api.groq.com/openai/v1/chat/completions' },
        thinkProviderCredential: { kind: 'api-key', apiKey: 'gsk-secret' },
      });
      expect(groq.settings.agent.think.provider).toEqual({ type: 'groq', model: 'llama-3.3-70b' });
      expect(groq.settings.agent.think.endpoint).toEqual({
        url: 'https://api.groq.com/openai/v1/chat/completions',
        headers: { authorization: 'Bearer gsk-secret' },
      });
      groq.session.close();

      const anthropic = await startSession({
        think: { provider: 'anthropic', model: 'claude-haiku-4-5', endpointUrl: 'https://api.anthropic.com/v1/messages' },
        thinkProviderCredential: { kind: 'api-key', apiKey: 'ak-secret' },
      });
      expect(anthropic.settings.agent.think.endpoint.headers).toEqual({ 'x-api-key': 'ak-secret', 'anthropic-version': '2023-06-01' });
      anthropic.session.close();

      const google = await startSession({
        think: { provider: 'google', model: 'gemini-2.0-flash-lite', endpointUrl: 'https://generativelanguage.googleapis.com/v1beta' },
        thinkProviderCredential: { kind: 'api-key', apiKey: 'gk-secret' },
      });
      expect(google.settings.agent.think.endpoint.headers).toEqual({ 'x-goog-api-key': 'gk-secret' });
      google.session.close();
    });

    it('sends AWS Bedrock credentials inside think.provider (iam, then sts with a session token)', async () => {
      const base = {
        think: { provider: 'aws_bedrock' as const, model: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0', endpointUrl: 'https://bedrock-runtime.us-east-2.amazonaws.com/' },
      };
      const iam = await startSession({
        ...base,
        thinkProviderCredential: { kind: 'aws', region: 'us-east-2', accessKeyId: 'AKIA1', secretAccessKey: 'shh' },
      });
      expect(iam.settings.agent.think.provider.credentials).toEqual({
        type: 'iam',
        region: 'us-east-2',
        access_key_id: 'AKIA1',
        secret_access_key: 'shh',
      });
      expect(iam.settings.agent.think.endpoint).toEqual({ url: 'https://bedrock-runtime.us-east-2.amazonaws.com/' });
      iam.session.close();

      const sts = await startSession({
        ...base,
        thinkProviderCredential: { kind: 'aws', region: 'us-east-2', accessKeyId: 'ASIA1', secretAccessKey: 'shh', sessionToken: 'tok' },
      });
      expect(sts.settings.agent.think.provider.credentials).toMatchObject({ type: 'sts', session_token: 'tok' });
      sts.session.close();
    });

    it('maps third-party speak providers to their documented fields and headers', async () => {
      const eleven = await startSession({
        speak: { provider: 'eleven_labs', model: 'eleven_turbo_v2_5', endpointUrl: 'wss://api.elevenlabs.io/v1/text-to-speech/voice-id/multi-stream-input'.replace('wss', 'https') },
        speakProviderCredential: { kind: 'api-key', apiKey: 'xi-secret' },
      });
      expect(eleven.settings.agent.speak).toEqual({
        provider: { type: 'eleven_labs', model_id: 'eleven_turbo_v2_5', language_code: 'fr' },
        endpoint: { url: 'https://api.elevenlabs.io/v1/text-to-speech/voice-id/multi-stream-input', headers: { 'xi-api-key': 'xi-secret' } },
      });
      eleven.session.close();

      const cartesia = await startSession({
        speak: { provider: 'cartesia', model: 'sonic-2', voice: 'voice-123', endpointUrl: 'https://api.cartesia.ai/tts/websocket' },
        speakProviderCredential: { kind: 'api-key', apiKey: 'ca-secret' },
      });
      expect(cartesia.settings.agent.speak).toEqual({
        provider: { type: 'cartesia', model_id: 'sonic-2', voice: { mode: 'id', id: 'voice-123' }, language: 'fr' },
        endpoint: { url: 'https://api.cartesia.ai/tts/websocket', headers: { 'x-api-key': 'ca-secret' } },
      });
      cartesia.session.close();

      const openai = await startSession({
        speak: { provider: 'open_ai', model: 'tts-1', voice: 'alloy', endpointUrl: 'https://api.openai.com/v1/audio/speech' },
        speakProviderCredential: { kind: 'api-key', apiKey: 'sk-openai' },
      });
      expect(openai.settings.agent.speak).toEqual({
        provider: { type: 'open_ai', model: 'tts-1', voice: 'alloy' },
        endpoint: { url: 'https://api.openai.com/v1/audio/speech', headers: { authorization: 'Bearer sk-openai' } },
      });
      openai.session.close();

      const polly = await startSession({
        speak: { provider: 'aws_polly', voice: 'Lea', model: 'neural', endpointUrl: 'https://polly.eu-west-3.amazonaws.com/v1/speech' },
        speakProviderCredential: { kind: 'aws', region: 'eu-west-3', accessKeyId: 'AKIA2', secretAccessKey: 'shh' },
      });
      expect(polly.settings.agent.speak).toEqual({
        provider: {
          type: 'aws_polly',
          voice: 'Lea',
          language_code: 'fr',
          engine: 'neural',
          credentials: { type: 'iam', region: 'eu-west-3', access_key_id: 'AKIA2', secret_access_key: 'shh' },
        },
        endpoint: { url: 'https://polly.eu-west-3.amazonaws.com/v1/speech' },
      });
      polly.session.close();
    });
  });

  describe('active session', () => {
    it('forwards input audio as binary frames, only while active', async () => {
      const { session, socket } = await startSession();

      await session.sendAudio(Buffer.from([1, 2, 3, 4]).toString('base64'));
      expect(socket.sent).toEqual([Buffer.from([1, 2, 3, 4])]);

      session.close();
      await session.sendAudio(Buffer.from([5, 6]).toString('base64'));
      expect(socket.sent.filter((frame) => Buffer.isBuffer(frame))).toHaveLength(1);
    });

    it('emits agent audio even-byte aligned with the 24 kHz PCM MIME type', async () => {
      const { session, socket, onAudioOutput } = await startSession();

      socket.serverSendBinary(Buffer.from([1, 2, 3]));
      socket.serverSendBinary(Buffer.from([4]));

      expect(onAudioOutput.mock.calls).toEqual([
        [Buffer.from([1, 2]).toString('base64'), 'audio/pcm;rate=24000'],
        [Buffer.from([3, 4]).toString('base64'), 'audio/pcm;rate=24000'],
      ]);
      session.close();
    });

    it('UserStartedSpeaking signals the barge-in and drops agent audio until AgentStartedSpeaking', async () => {
      const { session, socket, onAudioOutput, onInterrupted } = await startSession();

      socket.serverSendBinary(Buffer.from([1, 2, 3])); // l'octet 3 reste en attente
      socket.serverSend({ type: 'UserStartedSpeaking' });
      socket.serverSendBinary(Buffer.from([9, 9]));
      expect(onInterrupted).toHaveBeenCalledTimes(1);

      socket.serverSend({ type: 'AgentStartedSpeaking', total_latency: 1.2, tts_latency: 0.3 });
      socket.serverSendBinary(Buffer.from([7, 8]));

      expect(onAudioOutput.mock.calls.map((call) => Buffer.from(call[0], 'base64'))).toEqual([Buffer.from([1, 2]), Buffer.from([7, 8])]);
      session.close();
    });

    it('interrupt() drops in-flight agent audio locally, without sending anything to Deepgram', async () => {
      const { session, socket, onAudioOutput } = await startSession();

      await session.interrupt!();
      socket.serverSendBinary(Buffer.from([1, 2]));
      expect(onAudioOutput).not.toHaveBeenCalled();
      expect(socket.sent).toHaveLength(0);

      socket.serverSend({ type: 'AgentStartedSpeaking' });
      socket.serverSendBinary(Buffer.from([3, 4]));
      expect(onAudioOutput).toHaveBeenCalledTimes(1);
      session.close();
    });

    it('maps ConversationText and AgentAudioDone to transcripts, text output and waiting-for-input', async () => {
      const { session, socket, onTranscript, onTextOutput, onWaitingForInput } = await startSession();

      socket.serverSend({ type: 'ConversationText', role: 'user', content: 'Bonjour' });
      socket.serverSend({ type: 'ConversationText', role: 'assistant', content: 'Salut !' });
      socket.serverSend({ type: 'AgentAudioDone' });

      expect(onTranscript.mock.calls).toEqual([
        ['user', 'Bonjour'],
        ['agent', 'Salut !'],
      ]);
      expect(onTextOutput.mock.calls).toEqual([['Salut !', true]]);
      expect(onWaitingForInput).toHaveBeenCalledTimes(1);
      session.close();
    });

    it('turns FunctionCallRequest items into tool calls, in order, ignoring provider-side functions', async () => {
      const { session, socket, onToolCall, onError } = await startSession();
      const warnings: string[] = [];
      session.on('agent.warning', (payload) => warnings.push(payload.message));

      socket.serverSend({
        type: 'FunctionCallRequest',
        functions: [
          { id: 'fc-1', name: 'open_cart', arguments: '{"page":2}', client_side: true },
          { id: 'fc-2', name: 'server_fn', arguments: '{}', client_side: false },
          { id: 'fc-3', name: 'close_cart', arguments: '' },
        ],
      });

      expect(onToolCall.mock.calls).toEqual([
        [{ callId: 'fc-1', name: 'open_cart', args: { page: 2 } }],
        [{ callId: 'fc-3', name: 'close_cart', args: {} }],
      ]);
      expect(warnings).toEqual(['Ignored a server-side function call: server_fn.']);
      expect(onError).not.toHaveBeenCalled();
      session.close();
    });

    it('answers invalid JSON arguments with an error response and never runs the tool', async () => {
      const { session, socket, onToolCall, onError } = await startSession();

      socket.serverSend({ type: 'FunctionCallRequest', functions: [{ id: 'fc-1', name: 'pay', arguments: '{not json' }] });
      socket.serverSend({ type: 'FunctionCallRequest', functions: [{ id: 'fc-2', name: 'pay', arguments: '[1,2]' }] });

      expect(onToolCall).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
      expect(jsonFrames(socket)).toEqual([
        { type: 'FunctionCallResponse', id: 'fc-1', name: 'pay', content: '{"error":"Invalid JSON arguments."}' },
        { type: 'FunctionCallResponse', id: 'fc-2', name: 'pay', content: '{"error":"Invalid JSON arguments."}' },
      ]);
      session.close();
    });

    it('sends each tool result once as FunctionCallResponse, and nothing for an unknown call', async () => {
      const { session, socket } = await startSession();
      socket.serverSend({
        type: 'FunctionCallRequest',
        functions: [
          { id: 'fc-1', name: 'lookup', arguments: '{}' },
          { id: 'fc-2', name: 'greet', arguments: '{}' },
        ],
      });

      await session.sendToolResponse('fc-1', 'lookup', { found: true });
      await session.sendToolResponse('fc-2', 'greet', 'bonjour');
      await session.sendToolResponse('fc-1', 'lookup', { found: false });
      await session.sendToolResponse('fc-unknown', 'lookup', {});

      expect(jsonFrames(socket)).toEqual([
        { type: 'FunctionCallResponse', id: 'fc-1', name: 'lookup', content: '{"found":true}' },
        { type: 'FunctionCallResponse', id: 'fc-2', name: 'greet', content: 'bonjour' },
      ]);
      session.close();
    });

    it('holds the interim pending-approval response and sends only the final result', async () => {
      const { session, socket } = await startSession();
      socket.serverSend({ type: 'FunctionCallRequest', functions: [{ id: 'fc-1', name: 'refund', arguments: '{}' }] });

      await session.sendToolResponse('fc-1', 'refund', { status: 'pending_approval', message: 'Approval required' });
      expect(socket.sent).toHaveLength(0);

      await session.sendToolResponse('fc-1', 'refund', { refunded: true });
      expect(jsonFrames(socket)).toEqual([{ type: 'FunctionCallResponse', id: 'fc-1', name: 'refund', content: '{"refunded":true}' }]);
      session.close();
    });

    it('reports FunctionCallCancelled for pending calls only, then never answers them (S8)', async () => {
      const { session, socket, onToolCallCancelled } = await startSession();
      const cancelled: string[][] = [];
      session.on('agent.tool.cancelled', (payload) => cancelled.push(payload.callIds));
      socket.serverSend({
        type: 'FunctionCallRequest',
        functions: [
          { id: 'fc-1', name: 'refund', arguments: '{}' },
          { id: 'fc-2', name: 'lookup', arguments: '{}' },
        ],
      });

      socket.serverSend({ type: 'FunctionCallCancelled', functions: [{ id: 'fc-1', name: 'refund' }, { id: 'fc-9', name: 'x' }] });
      socket.serverSend({ type: 'FunctionCallCancelled', functions: [{ id: 'fc-9', name: 'x' }] });
      await session.sendToolResponse('fc-1', 'refund', { refunded: true });
      await session.sendToolResponse('fc-2', 'lookup', { ok: true });

      expect(onToolCallCancelled.mock.calls).toEqual([[['fc-1']]]);
      expect(cancelled).toEqual([['fc-1']]);
      expect(jsonFrames(socket)).toEqual([{ type: 'FunctionCallResponse', id: 'fc-2', name: 'lookup', content: '{"ok":true}' }]);
      session.close();
    });

    it('sends text as InjectUserMessage and endAudioTurn as ForceEndTurn', async () => {
      const { session, socket } = await startSession();

      await session.sendText('Quel temps fait-il ?');
      await session.endAudioTurn!();

      expect(jsonFrames(socket)).toEqual([{ type: 'InjectUserMessage', content: 'Quel temps fait-il ?' }, { type: 'ForceEndTurn' }]);
      session.close();
    });

    it('updateTools sends the full think object, one update at a time, the latest queued list winning', async () => {
      const { session, socket } = await startSession({}, { systemPrompt: 'Prompt.' });
      const tool = (name: string) => ({ name, description: name });

      session.updateTools!([tool('a')]);
      session.updateTools!([tool('b')]);
      session.updateTools!([tool('c')]);
      expect(jsonFrames(socket)).toEqual([
        {
          type: 'UpdateThink',
          think: {
            provider: { type: 'open_ai', model: 'gpt-5.4-mini' },
            prompt: 'Prompt.',
            functions: [{ name: 'a', description: 'a', parameters: { type: 'object', properties: {} } }],
          },
        },
      ]);

      socket.serverSend({ type: 'ThinkUpdated' });
      const frames = jsonFrames(socket) as Array<{ think: { functions: Array<{ name: string }> } }>;
      expect(frames.map((frame) => frame.think.functions.map((fn) => fn.name))).toEqual([['a'], ['c']]);

      socket.serverSend({ type: 'ThinkUpdated' });
      socket.serverSend({ type: 'ThinkUpdated' });
      expect(jsonFrames(socket)).toHaveLength(2);
      session.close();
    });

    it('does not block tool updates forever when ThinkUpdated never arrives', async () => {
      vi.useFakeTimers();
      const { session, socket } = await startSession({ limits: { acknowledgementTimeoutMs: 1000, keepAliveIntervalMs: 60_000 } });
      const warnings: string[] = [];
      session.on('agent.warning', (payload) => warnings.push(payload.message));

      session.updateTools!([{ name: 'a', description: 'a' }]);
      session.updateTools!([{ name: 'b', description: 'b' }]);
      await vi.advanceTimersByTimeAsync(1000);

      expect(warnings).toEqual(['Deepgram Voice Agent did not acknowledge the tool update.']);
      expect(jsonFrames(socket).filter((frame) => frame.type === 'UpdateThink')).toHaveLength(2);
      session.close();
      expect(vi.getTimerCount()).toBe(0);
    });

    it('sends KeepAlive at the configured interval only while active', async () => {
      vi.useFakeTimers();
      const adapter = new DeepgramVoiceAgentAdapter({ apiKey: 'k', limits: { keepAliveIntervalMs: 1000, handshakeTimeoutMs: 60_000 } });
      const pending = adapter.createSession(createConfig().config);
      const socket = lastFakeDeepgramSocket();
      socket.open();
      socket.serverSend({ type: 'Welcome' });
      await vi.advanceTimersByTimeAsync(3000);
      expect(jsonFrames(socket).map((frame) => frame.type)).toEqual(['Settings']);

      socket.serverSend({ type: 'SettingsApplied' });
      const session = await pending;
      await vi.advanceTimersByTimeAsync(2500);
      expect(jsonFrames(socket).map((frame) => frame.type)).toEqual(['Settings', 'KeepAlive', 'KeepAlive']);

      session.close();
      await vi.advanceTimersByTimeAsync(5000);
      expect(jsonFrames(socket)).toHaveLength(3);
      expect(vi.getTimerCount()).toBe(0);
    });

    it('reports a provider Warning as a redacted event without ending the session', async () => {
      const { session, socket, onError } = await startSession();
      const warnings: string[] = [];
      session.on('agent.warning', (payload) => warnings.push(payload.message));

      socket.serverSend({ type: 'Warning', code: 'SLOW', description: 'raw provider detail' });

      expect(warnings).toEqual(['Deepgram Voice Agent reported a warning (SLOW).']);
      expect(onError).not.toHaveBeenCalled();
      expect(session.isActive).toBe(true);
      session.close();
    });

    it('treats a provider Error as fatal: one onError, onClose, socket closed, no reconnection', async () => {
      const { session, socket, onError, onClose } = await startSession();

      socket.serverSend({ type: 'Error', code: 'E1', description: 'raw provider detail' });
      socket.serverClose(1011, '');

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0]![0]).toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
      expect((onError.mock.calls[0]![0] as Error).message).not.toContain('raw provider detail');
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(session.isActive).toBe(false);
      expect(socket.closed).toBe(true);
      expect(FakeDeepgramWebSocket.instances).toHaveLength(1);
    });

    it('reports a burst of provider errors only once', async () => {
      const { socket, onError, onClose } = await startSession();
      socket.suppressCloseEvent = true;

      socket.serverSend({ type: 'Error', code: 'E1' });
      socket.serverSend({ type: 'Error', code: 'E2' });

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('reports an unexpected close once as REMOTE_CLOSED and never reconnects (S10)', async () => {
      vi.useFakeTimers();
      const { session, socket, onError, onClose } = await startSession();

      socket.serverClose(1006, '');
      await vi.advanceTimersByTimeAsync(60_000);

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0]![0]).toMatchObject({ code: 'REMOTE_CLOSED' });
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(session.isActive).toBe(false);
      expect(FakeDeepgramWebSocket.instances).toHaveLength(1);
      expect(vi.getTimerCount()).toBe(0);
    });

    it('close() is idempotent, silent, and ignores every later provider message', async () => {
      const { session, socket, onError, onClose, onToolCall, onAudioOutput } = await startSession();

      session.close();
      session.close();
      socket.serverSend({ type: 'FunctionCallRequest', functions: [{ id: 'fc-1', name: 'x', arguments: '{}' }] });
      socket.serverSendBinary(Buffer.from([1, 2]));

      expect(socket.closed).toBe(true);
      expect(session.isActive).toBe(false);
      expect(session.state).toBe('closed');
      expect(onError).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
      expect(onToolCall).not.toHaveBeenCalled();
      expect(onAudioOutput).not.toHaveBeenCalled();
    });

    it('never exposes the API key or provider credentials in errors or events', async () => {
      const { session, socket, onError } = await startSession({
        think: { provider: 'groq', model: 'llama-3.3-70b', endpointUrl: 'https://api.groq.com/openai/v1/chat/completions' },
        thinkProviderCredential: { kind: 'api-key', apiKey: 'gsk-secret' },
      });
      const events: unknown[] = [];
      session.onAny((event) => events.push(event));

      socket.serverSend({ type: 'Warning', code: 'W' });
      socket.serverClose(1006, '');

      const serialized = JSON.stringify([events, onError.mock.calls.map((call) => (call[0] as Error).message)]);
      expect(serialized).not.toContain('gsk-secret');
      expect(serialized).not.toContain('Token k');
    });
  });
});
