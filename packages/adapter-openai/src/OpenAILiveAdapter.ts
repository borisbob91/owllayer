import OpenAI from 'openai';
import {
  createLogger,
  EventEmitter,
  resolveSystemPrompt,
  type SystemPrompt,
  type LiveAdapter,
  type LiveSession,
  type LiveSessionConfig,
  type LLMToolCall,
  type LLMAdapterCapabilities,
  type ToolDeclaration,
  type VoiceInfo,
} from '@owllayer/core';
import type {
  OpenAILiveAnyEventListener,
  OpenAILiveEventListener,
  OpenAILiveEventMap,
  OpenAILiveEventType,
  OpenAILiveSession,
  OpenAILiveSessionConfig,
} from './events.ts';
import { toOpenAIRealtimeTools } from './toolConverter.js';
import {
  OPENAI_REALTIME_MODELS,
  OPENAI_REALTIME_VOICES,
  isOpenAIRealtimeReasoningModel,
  type OpenAIRealtimeModel,
  type OpenAIRealtimeReasoningEffort,
  type OpenAIRealtimeVoice,
  type OpenAISTTModel,
} from './models.js';

const log = createLogger('OwlLayer:OpenAILive');

/**
 * Options pour le OpenAILiveAdapter.
 */
export interface OpenAILiveAdapterOptions {
  /** Cle API OpenAI */
  apiKey: string;

  /** Modele OpenAI Realtime GA (defaut: 'gpt-realtime-1.5', rapide sans raisonnement) */
  model?: OpenAIRealtimeModel;

  /**
   * Effort de raisonnement (gpt-realtime-2* uniquement, defaut: 'low' comme
   * recommande par OpenAI). Non envoye aux modeles sans raisonnement,
   * sauf s'il est fourni explicitement.
   */
  reasoningEffort?: OpenAIRealtimeReasoningEffort;

  /** Voix par defaut (defaut: 'alloy'). Voir OPENAI_REALTIME_VOICES. */
  voice?: OpenAIRealtimeVoice;

  /** Prompt systeme par defaut */
  systemPrompt?: SystemPrompt;

  /** Base URL custom (pour Azure, proxies, etc.) */
  baseURL?: string;

  /** Modele de transcription de l'input utilisateur (defaut: 'whisper-1', null = desactive) */
  inputTranscriptionModel?: OpenAISTTModel | null;

  /**
   * Detection de tour cote serveur (VAD). null = push-to-talk :
   * le tour est valide par endAudioTurn() (VOICE_INPUT_END).
   */
  turnDetection?: {
    threshold?: number;
    prefixPaddingMs?: number;
    silenceDurationMs?: number;
  } | null;
}

/** Seul taux PCM accepte par l'API Realtime GA. */
const REALTIME_PCM_RATE = 24000;

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
  private inputTranscriptionModel: string | null;
  private turnDetection: OpenAILiveAdapterOptions['turnDetection'];
  private reasoningEffort?: OpenAIRealtimeReasoningEffort;

  constructor(options: OpenAILiveAdapterOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model || 'gpt-realtime-1.5';
    this.defaultVoice = options.voice || 'alloy';
    this.systemPrompt = options.systemPrompt;
    this.baseURL = options.baseURL || 'wss://api.openai.com/v1/realtime';
    this.inputTranscriptionModel =
      options.inputTranscriptionModel === undefined ? 'whisper-1' : options.inputTranscriptionModel;
    this.turnDetection = options.turnDetection === undefined ? {} : options.turnDetection;
    this.reasoningEffort =
      options.reasoningEffort ?? (isOpenAIRealtimeReasoningModel(this.model) ? 'low' : undefined);
  }

  async createSession(config: OpenAILiveSessionConfig): Promise<OpenAILiveSession> {
    const voice = config.voice || this.defaultVoice;
    const rawPrompt = config.systemPrompt || this.systemPrompt || '';
    const systemPrompt = typeof rawPrompt === 'string' ? rawPrompt : resolveSystemPrompt(rawPrompt);

    // Convertir les tools OwlLayer → format OpenAI Realtime
    const tools = config.tools.length > 0
      ? toOpenAIRealtimeTools(config.tools)
      : [];

    log.info(`Creation session Realtime — modele: ${this.model}, voix: ${voice}, tools: ${config.tools.length}`);

    let isSessionActive = true;
    let hasStartedTurn = false;
    const emitter = new EventEmitter<OpenAILiveEventMap>();

    if (config.onEvent) {
      emitter.onAny(config.onEvent);
    }
    if (config.onAnyEvent) {
      emitter.onAny(config.onAnyEvent);
    }

    const emitTurnStarted = () => {
      if (hasStartedTurn) {
        return;
      }

      hasStartedTurn = true;
      emitter.emit('live.turn.started', { source: 'provider' });
    };

    // ============================================================
    // Connexion a OpenAI Realtime via WebSocket
    // ============================================================
    const wsUrl = `${this.baseURL}?model=${encodeURIComponent(this.model)}`;

    // Import ws pour Node.js — interface GA : plus d'en-tete OpenAI-Beta
    const { default: WebSocket } = await import('ws');
    const ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    // Attendre l'ouverture
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connexion Realtime timeout')), 10_000);
      ws.on('open', () => {
        clearTimeout(timeout);
        log.info('Session OpenAI Realtime ouverte');
        emitter.emit('live.session.opened', {
          model: this.model,
          voice,
        });
        resolve();
      });
      ws.on('error', (err: unknown) => {
        clearTimeout(timeout);
        reject(err instanceof Error ? err : new Error(String(err)));
      });
    });

    // Configurer la session (format GA : session.type + bloc audio input/output)
    const turnDetection = this.turnDetection;
    ws.send(JSON.stringify({
      type: 'session.update',
      session: {
        type: 'realtime',
        instructions: systemPrompt,
        tools,
        ...(this.reasoningEffort ? { reasoning: { effort: this.reasoningEffort } } : {}),
        output_modalities: ['audio'],
        audio: {
          input: {
            format: { type: 'audio/pcm', rate: REALTIME_PCM_RATE },
            transcription: this.inputTranscriptionModel
              ? { model: this.inputTranscriptionModel }
              : null,
            turn_detection: turnDetection
              ? {
                  type: 'server_vad',
                  threshold: turnDetection.threshold ?? 0.5,
                  prefix_padding_ms: turnDetection.prefixPaddingMs ?? 300,
                  silence_duration_ms: turnDetection.silenceDurationMs ?? 500,
                }
              : null,
          },
          output: {
            format: { type: 'audio/pcm', rate: REALTIME_PCM_RATE },
            voice,
          },
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
          // --- Audio de l'agent (GA ; nom beta conserve pour les deploiements Azure preview) ---
          case 'response.output_audio.delta':
          case 'response.audio.delta': {
            if (event.delta) {
              emitTurnStarted();
              emitter.emit('live.audio.output', {
                audioBase64: event.delta,
                mimeType: 'audio/pcm;rate=24000',
              });
              config.onAudioOutput?.(event.delta, 'audio/pcm;rate=24000');
            }
            break;
          }

          // --- Transcription de l'input utilisateur ---
          case 'conversation.item.input_audio_transcription.completed': {
            if (event.transcript) {
              emitter.emit('live.transcript.user.delta', {
                role: 'user',
                text: event.transcript,
              });
              config.onTranscript?.('user', event.transcript);
            }
            break;
          }

          // --- Texte de l'agent (transcription de l'audio output) ---
          case 'response.output_audio_transcript.delta':
          case 'response.audio_transcript.delta': {
            if (event.delta) {
              emitTurnStarted();
              emitter.emit('live.text.output.delta', {
                text: event.delta,
                done: false,
              });
              config.onTextOutput?.(event.delta, false);
            }
            break;
          }

          case 'response.output_audio_transcript.done':
          case 'response.audio_transcript.done': {
            if (event.transcript) {
              emitTurnStarted();
              emitter.emit('live.transcript.agent.delta', {
                role: 'agent',
                text: event.transcript,
              });
              config.onTranscript?.('agent', event.transcript);
            }
            config.onTextOutput?.('', true);
            break;
          }

          // --- Texte direct (reponse texte) ---
          case 'response.output_text.delta':
          case 'response.text.delta': {
            if (event.delta) {
              emitTurnStarted();
              emitter.emit('live.text.output.delta', {
                text: event.delta,
                done: false,
              });
              config.onTextOutput?.(event.delta, false);
            }
            break;
          }

          case 'response.output_text.done':
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
            // GA : l'evenement done porte le nom et les arguments complets
            const rawArgs: string | undefined = event.arguments ?? pending?.args;
            if (callId && (pending || event.name)) {
              pendingToolArgs.delete(callId);
              let args: Record<string, unknown> = {};
              try {
                args = JSON.parse(rawArgs || '{}');
              } catch {
                log.error('Erreur parsing tool args:', rawArgs);
              }
              const toolCall: LLMToolCall = {
                callId,
                name: event.name || pending?.name || '',
                args,
              };
              emitTurnStarted();
              log.debug(`Tool call: ${toolCall.name}`, toolCall.args);
              emitter.emit('live.tool.call', { toolCall });
              config.onToolCall?.(toolCall);
            }
            break;
          }

          // --- Barge-in : l'utilisateur parle pendant la reponse (VAD serveur) ---
          case 'input_audio_buffer.speech_started': {
            if (hasStartedTurn) {
              config.onInterrupted?.();
            }
            break;
          }

          // --- Reponse complete ---
          case 'response.done': {
            emitter.emit('live.turn.completed', { source: 'provider' });
            emitter.emit('live.text.output.done', {
              text: '',
              done: true,
            });
            hasStartedTurn = false;
            break;
          }

          // --- Erreurs ---
          case 'error': {
            const errMsg = event.error?.message || 'Erreur inconnue';
            log.error('Erreur Realtime:', errMsg);
            const error = new Error(errMsg);
            emitter.emit('live.error', {
              error,
              message: errMsg,
            });
            config.onError?.(error);
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

    ws.on('close', (code: number, reason: Buffer) => {
      log.info('Session OpenAI Realtime fermee');
      isSessionActive = false;
      emitter.emit('live.closed', {
        code,
        reason: reason?.toString() || '',
        fatal: false,
      });
      config.onClose?.();
    });

    ws.on('error', (err: unknown) => {
      log.error('Erreur WebSocket Realtime:', String(err));
      const error = err instanceof Error ? err : new Error(String(err));
      emitter.emit('live.error', {
        error,
        message: error.message,
      });
      config.onError?.(error);
    });

    // ============================================================
    // Retourner l'objet LiveSession
    // ============================================================
    const session: OpenAILiveSession = {
      /**
       * Envoyer l'audio du micro vers OpenAI Realtime.
       * Format attendu : PCM 16-bit base64. Les SDK clients capturent en 16 kHz :
       * l'API n'accepte que 24 kHz, on reechantillonne donc selon le mimeType.
       */
      async sendAudio(audioBase64: string, mimeType = 'audio/pcm;rate=16000') {
        if (!isSessionActive) return;
        try {
          const rateMatch = mimeType.match(/rate=(\d+)/);
          const inputRate = rateMatch ? parseInt(rateMatch[1], 10) : 16000;
          let audio = audioBase64;

          if (mimeType.startsWith('audio/pcm') && inputRate !== REALTIME_PCM_RATE) {
            const bytes = Buffer.from(audioBase64, 'base64');
            // Longueur paire obligatoire pour Int16Array (R3)
            const validLength = bytes.length - (bytes.length % 2);
            const input = new Int16Array(
              bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + validLength)
            );
            const outputLength = Math.floor((input.length * REALTIME_PCM_RATE) / inputRate);
            const output = new Int16Array(outputLength);
            const step = inputRate / REALTIME_PCM_RATE;
            // Interpolation lineaire
            for (let i = 0; i < outputLength; i++) {
              const position = i * step;
              const index = Math.floor(position);
              const next = Math.min(index + 1, input.length - 1);
              const fraction = position - index;
              output[i] = Math.round(input[index] * (1 - fraction) + input[next] * fraction);
            }
            audio = Buffer.from(output.buffer).toString('base64');
          }

          ws.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio,
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
              // Toujours un objet JSON (format attendu par le modele) : une chaine brute
              // est plus souvent paraphrasee ou tronquee a l'oral.
              output: JSON.stringify(
                typeof result === 'string' ? { response_text: result } : result ?? {}
              ),
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
       * Fin du tour utilisateur. Avec le VAD serveur, OpenAI detecte la fin de
       * parole lui-meme ; en push-to-talk (turnDetection: null), on valide le buffer.
       */
      async endAudioTurn() {
        if (!isSessionActive || turnDetection) return;
        try {
          ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
          ws.send(JSON.stringify({ type: 'response.create' }));
        } catch (err) {
          log.error('Erreur endAudioTurn:', String(err));
        }
      },

      /**
       * Barge-in : annuler la reponse en cours.
       */
      async interrupt() {
        if (!isSessionActive || !hasStartedTurn) return;
        try {
          ws.send(JSON.stringify({ type: 'response.cancel' }));
        } catch (err) {
          log.error('Erreur interrupt:', String(err));
        }
      },

      /**
       * Mettre a jour les tools apres un CONTEXT_UPDATE (navigation, montage).
       */
      updateTools(nextTools: ToolDeclaration[]) {
        if (!isSessionActive) return;
        try {
          ws.send(JSON.stringify({
            type: 'session.update',
            session: {
              type: 'realtime',
              tools: toOpenAIRealtimeTools(nextTools),
            },
          }));
        } catch (err) {
          log.error('Erreur updateTools:', String(err));
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

      onEvent<TType extends OpenAILiveEventType>(
        type: TType,
        listener: OpenAILiveEventListener<TType>
      ) {
        return emitter.on(type, listener);
      },

      offEvent<TType extends OpenAILiveEventType>(
        type: TType,
        listener: OpenAILiveEventListener<TType>
      ) {
        emitter.off(type, listener);
      },

      onAnyEvent(listener: OpenAILiveAnyEventListener) {
        return emitter.onAny(listener);
      },

      offAnyEvent(listener: OpenAILiveAnyEventListener) {
        emitter.offAny(listener);
      },
    };

    return session;
  }

  getCapabilities(): LLMAdapterCapabilities {
    // Genres connus ; les voix plus recentes n'en declarent pas
    const knownGenders: Record<string, VoiceInfo['gender']> = {
      alloy: 'neutral', ash: 'male', coral: 'female', echo: 'male', sage: 'neutral', shimmer: 'female',
    };
    return {
      provider: 'openai',
      providerName: 'OpenAI Realtime',
      currentModel: this.model,
      currentVoice: this.defaultVoice,
      models: OPENAI_REALTIME_MODELS.map((id) => ({
        id,
        name: id,
        supportsAudio: true,
        supportsTools: true,
      })),
      voices: OPENAI_REALTIME_VOICES.map((id) => ({
        id,
        name: id.charAt(0).toUpperCase() + id.slice(1),
        gender: knownGenders[id],
        language: 'multilingual',
      })),
    };
  }
}
