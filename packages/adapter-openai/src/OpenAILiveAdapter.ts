import OpenAI from 'openai';
import {
  createLogger,
  resolveSystemPrompt,
  type SystemPrompt,
  type ToolDeclaration,
} from '@domos/core';
import type { LiveAdapter, LiveSession, LiveSessionConfig, LLMToolCall, LLMAdapterCapabilities, VoiceInfo } from '@domos/server';
import { toOpenAIRealtimeTools } from './toolConverter.js';

const log = createLogger('DomOS:OpenAILive');

/**
 * Options pour le OpenAILiveAdapter.
 */
export interface OpenAILiveAdapterOptions {
  /** Cle API OpenAI */
  apiKey: string;

  /** Modele OpenAI Realtime (defaut: 'gpt-4o-realtime-preview') */
  model?: string;

  /** Voix par defaut (alloy, echo, fable, onyx, nova, shimmer) */
  voice?: string;

  /** Prompt systeme par defaut */
  systemPrompt?: SystemPrompt;

  /** Base URL custom (pour Azure, proxies, etc.) */
  baseURL?: string;
}

/**
 * OpenAILiveAdapter - Adaptateur OpenAI Realtime pour l'audio bidirectionnel.
 *
 * Utilise l'API Realtime d'OpenAI via WebSocket pour :
 * - Audio natif in/out (pas de STT/TTS externe)
 * - Function calling en temps reel pendant le stream
 * - Transcription automatique (input + output)
 *
 * @example
 * ```ts
 * const live = new OpenAILiveAdapter({
 *   apiKey: process.env.OPENAI_API_KEY!,
 *   voice: 'alloy',
 * });
 *
 * const session = await live.createSession({
 *   systemPrompt: 'Tu es un assistant vocal.',
 *   tools: toolDeclarations,
 *   onAudioOutput: (audio, mime) => transport.send(connId, Messages.audioStream(audio, mime)),
 *   onToolCall: (tc) => transport.send(connId, Messages.toolCall(tc.callId, tc.name, tc.args)),
 * });
 *
 * session.sendAudio(pcmBase64);
 * ```
 */
export class OpenAILiveAdapter implements LiveAdapter {
  readonly name = 'openai-realtime';
  systemPrompt?: SystemPrompt;

  private apiKey: string;
  private model: string;
  private defaultVoice: string;
  private baseURL: string;

  constructor(options: OpenAILiveAdapterOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model || 'gpt-4o-realtime-preview';
    this.defaultVoice = options.voice || 'alloy';
    this.systemPrompt = options.systemPrompt;
    this.baseURL = options.baseURL || 'wss://api.openai.com/v1/realtime';
  }

  async createSession(config: LiveSessionConfig): Promise<LiveSession> {
    const voice = config.voice || this.defaultVoice;
    const rawPrompt = config.systemPrompt || this.systemPrompt || '';
    const systemPrompt = typeof rawPrompt === 'string' ? rawPrompt : resolveSystemPrompt(rawPrompt);

    // Convertir les tools DomOS → format OpenAI Realtime
    const tools = config.tools.length > 0
      ? toOpenAIRealtimeTools(config.tools)
      : [];

    log.info(`Creation session Realtime — modele: ${this.model}, voix: ${voice}, tools: ${config.tools.length}`);

    let isSessionActive = true;

    // ============================================================
    // Connexion a OpenAI Realtime via WebSocket
    // ============================================================
    const wsUrl = `${this.baseURL}?model=${this.model}`;

    // Import ws pour Node.js
    const { default: WebSocket } = await import('ws');
    const ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    });

    // Attendre l'ouverture
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connexion Realtime timeout')), 10_000);
      ws.on('open', () => {
        clearTimeout(timeout);
        log.info('Session OpenAI Realtime ouverte');
        resolve();
      });
      ws.on('error', (err: unknown) => {
        clearTimeout(timeout);
        reject(err instanceof Error ? err : new Error(String(err)));
      });
    });

    // Configurer la session (instructions, voix, tools, etc.)
    ws.send(JSON.stringify({
      type: 'session.update',
      session: {
        instructions: systemPrompt,
        voice,
        tools,
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: { model: 'whisper-1' },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
      },
    }));

    // Map pour les tool calls en cours (accumulation d'arguments)
    const pendingToolArgs = new Map<string, { name: string; args: string }>();

    // ============================================================
    // Gestion des messages entrants
    // ============================================================
    ws.on('message', (data: Buffer | string) => {
      try {
        const event = JSON.parse(typeof data === 'string' ? data : data.toString());

        switch (event.type) {
          // --- Audio de l'agent ---
          case 'response.audio.delta': {
            if (event.delta) {
              config.onAudioOutput?.(event.delta, 'audio/pcm;rate=24000');
            }
            break;
          }

          // --- Transcription de l'input utilisateur ---
          case 'conversation.item.input_audio_transcription.completed': {
            if (event.transcript) {
              config.onTranscript?.('user', event.transcript);
            }
            break;
          }

          // --- Texte de l'agent (transcription de l'audio output) ---
          case 'response.audio_transcript.delta': {
            if (event.delta) {
              config.onTextOutput?.(event.delta, false);
            }
            break;
          }

          case 'response.audio_transcript.done': {
            if (event.transcript) {
              config.onTranscript?.('agent', event.transcript);
            }
            config.onTextOutput?.('', true);
            break;
          }

          // --- Texte direct (reponse texte) ---
          case 'response.text.delta': {
            if (event.delta) {
              config.onTextOutput?.(event.delta, false);
            }
            break;
          }

          case 'response.text.done': {
            config.onTextOutput?.('', true);
            break;
          }

          // --- Function calling ---
          case 'response.function_call_arguments.delta': {
            const callId = event.call_id;
            if (callId) {
              const pending = pendingToolArgs.get(callId);
              if (pending) {
                pending.args += event.delta || '';
              } else {
                pendingToolArgs.set(callId, {
                  name: event.name || '',
                  args: event.delta || '',
                });
              }
            }
            break;
          }

          case 'response.function_call_arguments.done': {
            const callId = event.call_id;
            const pending = pendingToolArgs.get(callId);
            if (pending) {
              pendingToolArgs.delete(callId);
              let args: Record<string, unknown> = {};
              try {
                args = JSON.parse(pending.args || '{}');
              } catch {
                log.error('Erreur parsing tool args:', pending.args);
              }
              const toolCall: LLMToolCall = {
                callId,
                name: event.name || pending.name,
                args,
              };
              log.debug(`Tool call: ${toolCall.name}`, toolCall.args);
              config.onToolCall?.(toolCall);
            }
            break;
          }

          // --- Reponse complete ---
          case 'response.done': {
            // La reponse complete est terminee
            break;
          }

          // --- Erreurs ---
          case 'error': {
            const errMsg = event.error?.message || 'Erreur inconnue';
            log.error('Erreur Realtime:', errMsg);
            config.onError?.(new Error(errMsg));
            break;
          }

          // --- Session terminee ---
          case 'session.created': {
            log.debug('Session Realtime confirmee');
            break;
          }

          case 'session.updated': {
            log.debug('Session Realtime mise a jour');
            break;
          }
        }
      } catch (err) {
        log.error('Erreur parsing message Realtime:', String(err));
      }
    });

    ws.on('close', () => {
      log.info('Session OpenAI Realtime fermee');
      isSessionActive = false;
      config.onClose?.();
    });

    ws.on('error', (err: unknown) => {
      log.error('Erreur WebSocket Realtime:', String(err));
      config.onError?.(err instanceof Error ? err : new Error(String(err)));
    });

    // ============================================================
    // Retourner l'objet LiveSession
    // ============================================================
    const session: LiveSession = {
      /**
       * Envoyer l'audio du micro vers OpenAI Realtime.
       * Format attendu : PCM 16-bit base64.
       */
      async sendAudio(audioBase64: string, _mimeType = 'audio/pcm;rate=16000') {
        if (!isSessionActive) return;
        try {
          ws.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: audioBase64,
          }));
        } catch (err) {
          log.error('Erreur sendAudio:', String(err));
        }
      },

      /**
       * Envoyer du texte a OpenAI Realtime.
       */
      async sendText(text: string) {
        if (!isSessionActive) return;
        try {
          // Ajouter un item de conversation texte + creer une reponse
          ws.send(JSON.stringify({
            type: 'conversation.item.create',
            item: {
              type: 'message',
              role: 'user',
              content: [{ type: 'input_text', text }],
            },
          }));
          ws.send(JSON.stringify({ type: 'response.create' }));
        } catch (err) {
          log.error('Erreur sendText:', String(err));
        }
      },

      /**
       * Envoyer le resultat d'un tool a OpenAI Realtime.
       */
      async sendToolResponse(callId: string, name: string, result: unknown) {
        if (!isSessionActive) return;
        try {
          ws.send(JSON.stringify({
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: callId,
              output: typeof result === 'string' ? result : JSON.stringify(result),
            },
          }));
          // Declencher la reponse de l'agent apres le tool result
          ws.send(JSON.stringify({ type: 'response.create' }));
          log.debug(`Tool response envoyee: ${name}`);
        } catch (err) {
          log.error('Erreur sendToolResponse:', String(err));
        }
      },

      /**
       * Fermer la session Realtime.
       */
      close() {
        if (isSessionActive) {
          isSessionActive = false;
          try {
            ws.close();
          } catch {
            // Ignore close errors
          }
        }
      },

      get isActive() {
        return isSessionActive;
      },
    };

    return session;
  }

  getCapabilities(): LLMAdapterCapabilities {
    const OPENAI_REALTIME_VOICES: VoiceInfo[] = [
      { id: 'alloy',   name: 'Alloy',   gender: 'neutral', language: 'multilingual' },
      { id: 'echo',    name: 'Echo',    gender: 'male',    language: 'multilingual' },
      { id: 'fable',   name: 'Fable',   gender: 'male',    language: 'multilingual' },
      { id: 'onyx',    name: 'Onyx',    gender: 'male',    language: 'multilingual' },
      { id: 'nova',    name: 'Nova',    gender: 'female',  language: 'multilingual' },
      { id: 'shimmer', name: 'Shimmer', gender: 'female',  language: 'multilingual' },
      { id: 'ash',     name: 'Ash',     gender: 'male',    language: 'multilingual' },
      { id: 'coral',   name: 'Coral',   gender: 'female',  language: 'multilingual' },
      { id: 'sage',    name: 'Sage',    gender: 'neutral', language: 'multilingual' },
    ];
    return {
      provider: 'openai',
      providerName: 'OpenAI Realtime',
      currentModel: this.model,
      currentVoice: this.defaultVoice,
      models: [
        { id: 'gpt-4o-realtime-preview',       name: 'GPT-4o Realtime',        supportsAudio: true, supportsTools: true },
        { id: 'gpt-4o-mini-realtime-preview',  name: 'GPT-4o Mini Realtime',   supportsAudio: true, supportsTools: true },
      ],
      voices: OPENAI_REALTIME_VOICES,
    };
  }
}
