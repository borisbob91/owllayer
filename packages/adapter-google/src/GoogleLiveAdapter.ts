import { GoogleGenAI } from '@google/genai';
import { createLogger, resolveSystemPrompt, type SystemPrompt } from '@domos/core';
import type { LiveAdapter, LiveSession, LiveSessionConfig, LLMToolCall } from '@domos/server';
import { toGeminiFunctionDeclarations } from './toolConverter.js';

const log = createLogger('DomOS:GoogleLive');

/**
 * Options pour le GoogleLiveAdapter.
 */
export interface GoogleLiveAdapterOptions {
  /** Cle API Google */
  apiKey: string;

  /** Modele Gemini Live a utiliser */
  model?: string;

  /** Voix par defaut (Fenrir, Puck, Kore, Charon, Aoede) */
  voice?: string;

  /** Prompt systeme par defaut */
  systemPrompt?: SystemPrompt;
}

/**
 * GoogleLiveAdapter - Adaptateur Gemini Live pour l'audio bidirectionnel.
 *
 * Utilise `ai.live.connect()` pour creer une session WebSocket persistante
 * avec Gemini qui supporte :
 * - Audio natif in/out (pas de STT/TTS externe)
 * - Function calling en temps reel pendant le stream
 * - Transcription automatique (input + output)
 *
 * Reference : server/websocket/liveProxy.js du projet VoiceAgent X
 *
 * @example
 * ```ts
 * const live = new GoogleLiveAdapter({
 *   apiKey: process.env.GOOGLE_API_KEY,
 *   voice: 'Fenrir',
 * });
 *
 * const session = await live.createSession({
 *   systemPrompt: 'Tu es un assistant vocal.',
 *   tools: toolDeclarations,
 *   onAudioOutput: (audio, mime) => transport.send(connId, Messages.audioStream(audio, mime)),
 *   onToolCall: (tc) => transport.send(connId, Messages.toolCall(tc.callId, tc.name, tc.args)),
 *   onTranscript: (role, text) => console.log(`[${role}] ${text}`),
 * });
 *
 * // Micro du client → Gemini
 * session.sendAudio(pcmBase64);
 * ```
 */
export class GoogleLiveAdapter implements LiveAdapter {
  readonly name = 'google-gemini-live';
  systemPrompt?: SystemPrompt;

  private client: GoogleGenAI;
  private model: string;
  private defaultVoice: string;

  // L'ancien modèle mis de côté
  private readonly LEGACY_MODEL = 'gemini-2.5-flash-native-audio-preview';

  constructor(options: GoogleLiveAdapterOptions) {
    this.client = new GoogleGenAI({ apiKey: options.apiKey });
    this.model = options.model || 'gemini-2.5-flash-native-audio-preview-12-2025';
    this.defaultVoice = options.voice || 'Fenrir';
    this.systemPrompt = options.systemPrompt;
  }

  async createSession(config: LiveSessionConfig): Promise<LiveSession> {
    const voice = config.voice || this.defaultVoice;
    const rawPrompt = config.systemPrompt || this.systemPrompt || '';
    const systemPrompt = typeof rawPrompt === 'string' ? rawPrompt : resolveSystemPrompt(rawPrompt);

    // Convertir les tools DomOS → format Gemini
    const tools = config.tools.length > 0
      ? [{ functionDeclarations: toGeminiFunctionDeclarations(config.tools) }]
      : undefined;

    log.info(`Creation session Live — modele: ${this.model}, voix: ${voice}, tools: ${config.tools.length}`);

    let isSessionActive = true;

    // ============================================================
    // Connexion a Gemini Live (WebSocket persistant)
    // Meme pattern que liveProxy.js de VoiceAgent X
    // ============================================================
    const geminiSession = await (this.client as any).live.connect({
      model: this.model,
      config: {
        responseModalities: ['AUDIO'],
        inputAudioTranscription: { model: 'google-default' },
        outputAudioTranscription: { model: 'google-default' },
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
        systemInstruction: systemPrompt,
        tools,
      },
      callbacks: {
        onopen: () => {
          log.info('Session Gemini Live ouverte');
        },

        onmessage: (msg: any) => {
          // ---- Audio output de Gemini ----
          if (msg.serverContent?.modelTurn?.parts) {
            for (const part of msg.serverContent.modelTurn.parts) {
              // Audio inline (PCM base64)
              if (part.inlineData?.data) {
                config.onAudioOutput?.(
                  part.inlineData.data,
                  part.inlineData.mimeType || 'audio/pcm;rate=24000'
                );
              }
              // Texte (rare en mode audio, mais possible)
              if (part.text) {
                config.onTextOutput?.(part.text, false);
              }
            }
          }

          // ---- Transcription input (ce que l'utilisateur a dit) ----
          if (msg.serverContent?.inputTranscription?.text) {
            config.onTranscript?.('user', msg.serverContent.inputTranscription.text);
          }

          // ---- Transcription output (ce que l'agent a dit) ----
          if (msg.serverContent?.outputTranscription?.text) {
            config.onTranscript?.('agent', msg.serverContent.outputTranscription.text);
          }

          // ---- Turn complete ----
          if (msg.serverContent?.turnComplete) {
            config.onTextOutput?.('', true);
          }

          // ---- Tool calls (function calling) ----
          if (msg.toolCall) {
            const functionCalls = msg.toolCall.functionCalls || [];
            for (const fc of functionCalls) {
              const toolCall: LLMToolCall = {
                callId: fc.id || fc.name,
                name: fc.name,
                args: fc.args || {},
              };
              log.debug(`Tool call: ${toolCall.name}`, toolCall.args);
              config.onToolCall?.(toolCall);
            }
          }
        },

        onerror: (err: any) => {
          log.error('Erreur Gemini Live:', String(err));
          config.onError?.(err instanceof Error ? err : new Error(String(err)));
        },

        onclose: () => {
          log.info('Session Gemini Live fermee');
          isSessionActive = false;
          config.onClose?.();
        },
      },
    });

    // ============================================================
    // Retourner l'objet LiveSession
    // ============================================================
    const session: LiveSession = {
      /**
       * Envoyer l'audio du micro vers Gemini Live.
       * Format attendu : PCM base64, 16kHz mono.
       */
      async sendAudio(audioBase64: string, mimeType = 'audio/pcm;rate=16000') {
        if (!isSessionActive) return;
        try {
          await geminiSession.sendRealtimeInput({
            media: { mimeType, data: audioBase64 },
          });
        } catch (err) {
          log.error('Erreur sendAudio:', String(err));
        }
      },

      /**
       * Envoyer du texte a Gemini Live (mode hybride text+audio).
       */
      async sendText(text: string) {
        if (!isSessionActive) return;
        try {
          await geminiSession.sendRealtimeInput({
            content: [{ role: 'user', parts: [{ text }] }],
          });
        } catch (err) {
          log.error('Erreur sendText:', String(err));
        }
      },

      /**
       * Envoyer le resultat d'un tool a Gemini Live.
       * Gemini reprendra la parole apres avoir recu le resultat.
       */
      async sendToolResponse(callId: string, name: string, result: unknown) {
        if (!isSessionActive) return;
        try {
          await geminiSession.sendToolResponse({
            functionResponses: [{
              id: callId,
              name,
              response: result,
            }],
          });
          log.debug(`Tool response envoyee: ${name}`);
        } catch (err) {
          log.error('Erreur sendToolResponse:', String(err));
        }
      },

      /**
       * Fermer la session Live.
       */
      close() {
        if (isSessionActive) {
          isSessionActive = false;
          try {
            geminiSession.close();
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
}
