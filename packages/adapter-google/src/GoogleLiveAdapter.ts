import { GoogleGenAI } from '@google/genai';
import {
  createLogger,
  EventEmitter,
  resolveSystemPrompt,
  type SystemPrompt,
  type LiveAdapter,
  type LLMToolCall,
  type ToolDeclaration,
  type LLMAdapterCapabilities,
  type VoiceInfo,
} from '@owllayer/core';
import type {
  GoogleLiveAnyEventListener,
  GoogleLiveEventListener,
  GoogleLiveEventMap,
  GoogleLiveEventType,
  GoogleLiveSession,
  GoogleLiveSessionConfig,
} from './events.ts';
import { toGeminiFunctionDeclarations } from './toolConverter.js';
import { GOOGLE_DEFAULT_LIVE_MODEL, GOOGLE_DEFAULT_LIVE_VOICE, GOOGLE_LIVE_MODELS, GEMINI_VOICES, type GoogleLiveModel, type GeminiVoice } from './catalog.js';
import { warnIfDeprecatedGoogleModel } from './warnings.js';

const log = createLogger('OwlLayer:GoogleLive');

/** Tours de transcription rejoues dans la nouvelle connexion quand les tools changent */
const MAX_REPLAYED_TURNS = 40;

/**
 * Options pour le GoogleLiveAdapter.
 */
export interface GoogleLiveAdapterOptions {
  /** Cle API Google */
  apiKey: string;

  /** Modele Gemini Live a utiliser */
  model?: GoogleLiveModel;

  /** Voix par defaut (Fenrir, Puck, Kore, Charon, Aoede) */
  voice?: GeminiVoice;

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
    this.client = new GoogleGenAI({
      apiKey: options.apiKey,
      httpOptions: { apiVersion: 'v1alpha' },
    });
    this.model = options.model || GOOGLE_DEFAULT_LIVE_MODEL;
    this.defaultVoice = options.voice || GOOGLE_DEFAULT_LIVE_VOICE;
    this.systemPrompt = options.systemPrompt;
    warnIfDeprecatedGoogleModel(log, this.model);
  }

  async createSession(config: GoogleLiveSessionConfig): Promise<GoogleLiveSession> {
    const voice = config.voice || this.defaultVoice;
    const rawPrompt = config.systemPrompt || this.systemPrompt || '';
    const systemPrompt = typeof rawPrompt === 'string' ? rawPrompt : resolveSystemPrompt(rawPrompt);

    // Convertir les tools OwlLayer → format Gemini
    const toGeminiTools = (list: ToolDeclaration[]) => list.length > 0
      ? [{ functionDeclarations: toGeminiFunctionDeclarations(list) }]
      : undefined;
    const tools = toGeminiTools(config.tools);

    log.info(`Creation session Live — modele: ${this.model}, voix: ${voice}, tools: ${config.tools.length}`);

    let isSessionActive = true;
    const sessionStart = Date.now();
    let audioChunksOut = 0;
    let hasStartedTurn = false;
    const emitter = new EventEmitter<GoogleLiveEventMap>();

    // Mise a jour des tools (#175) : Gemini Live ne lit la config qu'a l'ouverture et une
    // reprise par handle garde les tools d'origine. On ouvre une nouvelle session avec les
    // nouveaux tools et on y reinjecte l'historique des transcriptions.
    const history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    const addToHistory = (role: 'user' | 'model', text: string) => {
      const last = history[history.length - 1];
      if (last?.role === role) last.parts[0].text += text;
      else history.push({ role, parts: [{ text }] });
    };
    let userTurnActive = false;
    let pendingToolCalls = 0;
    let currentToolsKey = JSON.stringify(tools ?? []);
    let pendingTools: ToolDeclaration[] | null = null;
    let reconnecting: Promise<void> | null = null;
    // Les callbacks d'une connexion remplacee sont ignores
    let connectionId = 0;

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
    // Connexion a Gemini Live (WebSocket persistant)
    // Meme pattern que liveProxy.js de VoiceAgent X
    // ============================================================
    const connect = (geminiTools: typeof tools, id: number) => (this.client as any).live.connect({
      model: this.model,
      config: {
        responseModalities: ['AUDIO'],
        inputAudioTranscription:  {},
        outputAudioTranscription: {},
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
        systemInstruction: systemPrompt,
        tools: geminiTools,
      },
      callbacks: {
        onopen: () => {
          if (id !== connectionId) return;
          if (id > 0) {
            log.info(`Gemini Live reconnecte — modele: ${this.model}, tools: ${geminiTools?.[0]?.functionDeclarations.length ?? 0}`);
            return;
          }
          log.info(`✅ Gemini Live connecte — modele: ${this.model}, voix: ${voice}`);
          emitter.emit('live.session.opened', {
            model: this.model,
            voice,
          });
        },

        onmessage: (msg: any) => {
          if (id !== connectionId) return;
          // Preview tronquée pour éviter de noyer les logs de base64
          const preview = JSON.stringify(msg, (k, v) =>
            k === 'data' && typeof v === 'string' && v.length > 40
              ? `[base64 ${v.length}]` : v
          );
          log.debug(`[Gemini→SDK] ${preview.slice(0, 300)}`);

          // ---- Audio output de Gemini ----
          if (msg.serverContent?.modelTurn?.parts) {
            for (const part of msg.serverContent.modelTurn.parts) {
              // Audio inline (PCM base64)
              if (part.inlineData?.data) {
                emitTurnStarted();
                audioChunksOut++;
                emitter.emit('live.audio.output', {
                  audioBase64: part.inlineData.data,
                  mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000',
                });
                config.onAudioOutput?.(
                  part.inlineData.data,
                  part.inlineData.mimeType || 'audio/pcm;rate=24000'
                );
              }
              // Texte (rare en mode audio, mais possible)
              if (part.text) {
                emitTurnStarted();
                emitter.emit('live.text.output.delta', {
                  text: part.text,
                  done: false,
                });
                config.onTextOutput?.(part.text, false);
              }
            }
          }

          // ---- Transcription input (ce que l'utilisateur a dit) ----
          if (msg.serverContent?.inputTranscription?.text) {
            userTurnActive = true;
            addToHistory('user', msg.serverContent.inputTranscription.text);
            log.info(`[User → Gemini] "${msg.serverContent.inputTranscription.text}"`);
            emitter.emit('live.transcript.user.delta', {
              role: 'user',
              text: msg.serverContent.inputTranscription.text,
            });
            config.onTranscript?.('user', msg.serverContent.inputTranscription.text);
          }

          // ---- Transcription output (ce que l'agent a dit) ----
          if (msg.serverContent?.outputTranscription?.text) {
            addToHistory('model', msg.serverContent.outputTranscription.text);
            log.info(`[Gemini → User] "${msg.serverContent.outputTranscription.text}"`);
            emitTurnStarted();
            emitter.emit('live.transcript.agent.delta', {
              role: 'agent',
              text: msg.serverContent.outputTranscription.text,
            });
            config.onTranscript?.('agent', msg.serverContent.outputTranscription.text);
          }

          // ---- Turn complete ----
          if (msg.serverContent?.turnComplete) {
            log.info(`Turn complete — ${audioChunksOut} chunk(s) audio envoyes au client`);
            audioChunksOut = 0;
            emitter.emit('live.turn.completed', { source: 'provider' });
            emitter.emit('live.text.output.done', {
              text: '',
              done: true,
            });
            hasStartedTurn = false;
            userTurnActive = false;
            config.onTextOutput?.('', true);
          }

          // ---- Modele interrompu (barge-in) ----
          if (msg.serverContent?.interrupted) {
            log.info('Gemini Live: modele interrompu (barge-in)');
            emitter.emit('live.turn.interrupted', { source: 'provider' });
            hasStartedTurn = false;
            userTurnActive = false;
            config.onInterrupted?.();
          }

          // ---- Gemini attend l'input utilisateur ----
          if (msg.serverContent?.waitingForInput) {
            log.debug('Gemini Live: en attente d\'input utilisateur');
            emitter.emit('live.turn.waiting_for_input', { source: 'provider' });
            config.onWaitingForInput?.();
          }

          // ---- Tool calls (function calling) ----
          if (msg.toolCall) {
            const functionCalls = msg.toolCall.functionCalls || [];
            pendingToolCalls += functionCalls.length;
            for (const fc of functionCalls) {
              const toolCall: LLMToolCall = {
                callId: fc.id || fc.name,
                name: fc.name,
                args: fc.args || {},
              };
              emitTurnStarted();
              log.info(`Tool call: ${toolCall.name}(${JSON.stringify(toolCall.args)})`);
              emitter.emit('live.tool.call', { toolCall });
              config.onToolCall?.(toolCall);
            }
          }

          // ---- Appels annules : plus de reponse attendue ----
          if (msg.toolCallCancellation?.ids) {
            pendingToolCalls = Math.max(0, pendingToolCalls - msg.toolCallCancellation.ids.length);
          }

          applyPendingTools();
        },

        onerror: (err: any) => {
          if (id !== connectionId) return;
          log.error('Erreur Gemini Live:', String(err));
          const error = err instanceof Error ? err : new Error(String(err));
          emitter.emit('live.error', {
            error,
            message: error.message,
          });
          config.onError?.(error);
        },

        onclose: (reason?: any) => {
          if (id !== connectionId) {
            log.debug('Connexion Gemini Live remplacee fermee');
            return;
          }
          const code    = reason?.code ?? reason?.status ?? '?';
          const msg     = reason?.reason || '(vide)';
          const durSec  = ((Date.now() - sessionStart) / 1000).toFixed(1);
          log.info(`Session Gemini Live fermee — code: ${code}, raison: ${msg}, duree: ${durSec}s`);
          isSessionActive = false;
          // Codes fatals (erreur protocole/config) → déclencher onError pour activer
          // le circuit-breaker côté serveur et arrêter la boucle de reconnexion.
          // 1007 = policy violation (ex: nom d'outil invalide, config rejetée)
          const fatalCodes = new Set([1007, 1002, 1003, 1009, 1010]);
          const fatal = typeof code === 'number' && fatalCodes.has(code);
          emitter.emit('live.closed', {
            code,
            reason: msg,
            fatal,
          });
          if (typeof code === 'number' && fatalCodes.has(code)) {
            const error = new Error(`Gemini Live: fermeture fatale code=${code} — ${msg}`);
            emitter.emit('live.error', {
              error,
              message: error.message,
            });
            config.onError?.(error);
          } else {
            config.onClose?.();
          }
        },
      },
    });

    let geminiSession = await connect(tools, connectionId);

    // Conversation deja menee (ex. en texte avant de passer a la voix) : Gemini Live la reprend
    for (const message of config.conversationHistory ?? []) {
      if (message.role === 'system' || !message.content) continue;
      const role = message.role === 'assistant' ? 'model' : 'user';
      const last = history[history.length - 1];
      if (last?.role === role) last.parts[0].text += `\n${message.content}`;
      else history.push({ role, parts: [{ text: message.content }] });
    }
    if (history.length > 0) {
      const turns = history.slice(-MAX_REPLAYED_TURNS).map((turn) => ({ role: turn.role, parts: [{ ...turn.parts[0] }] }));
      try {
        await geminiSession.sendClientContent({ turns, turnComplete: false });
        log.info(`Historique repris dans Gemini Live: ${turns.length} tours`);
      } catch (err) {
        log.error('Erreur reprise de l\'historique Gemini Live:', String(err));
      }
    }

    /**
     * Applies the latest tool list: opens a new connection with these tools and
     * replays the transcript history. Waits for the end of the model turn, the
     * user turn and the pending tool calls.
     */
    function applyPendingTools(): void {
      if (!pendingTools || reconnecting || !isSessionActive) return;
      if (hasStartedTurn || userTurnActive || pendingToolCalls > 0) return;

      const nextTools = toGeminiTools(pendingTools);
      const count = pendingTools.length;
      const turns = history.slice(-MAX_REPLAYED_TURNS).map((turn) => ({ role: turn.role, parts: [{ ...turn.parts[0] }] }));
      const previous = geminiSession;
      pendingTools = null;
      const id = ++connectionId;

      reconnecting = (async () => {
        try {
          previous.close();
        } catch {
          // Deja fermee
        }
        try {
          const next = await connect(nextTools, id);
          if (!isSessionActive) {
            next.close();
            return;
          }
          if (turns.length > 0) {
            await next.sendClientContent({ turns, turnComplete: false });
          }
          geminiSession = next;
          log.info(`Tools Gemini Live mis a jour: ${count} tools, ${turns.length} tours rejoues`);
        } catch (err) {
          log.error('Erreur reconnexion Gemini Live:', String(err));
          isSessionActive = false;
          const error = err instanceof Error ? err : new Error(String(err));
          emitter.emit('live.error', { error, message: error.message });
          config.onError?.(error);
        } finally {
          reconnecting = null;
        }
        applyPendingTools();
      })();
    }

    // ============================================================
    // Retourner l'objet LiveSession
    // ============================================================
    const session: GoogleLiveSession = {
      /**
       * Envoyer l'audio du micro vers Gemini Live.
       * Format attendu : PCM base64, 16kHz mono.
       */
      async sendAudio(audioBase64: string, mimeType = 'audio/pcm;rate=16000') {
        if (!isSessionActive) return;
        if (reconnecting) await reconnecting;
        if (!isSessionActive) return;
        try {
          await geminiSession.sendRealtimeInput({
            audio: { mimeType, data: audioBase64 },
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
        if (reconnecting) await reconnecting;
        if (!isSessionActive) return;
        try {
          addToHistory('user', text);
          await geminiSession.sendClientContent({
            turns: [{ role: 'user', parts: [{ text }] }],
            turnComplete: true,
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
        if (reconnecting) await reconnecting;
        if (!isSessionActive) return;
        pendingToolCalls = Math.max(0, pendingToolCalls - 1);
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
       * Signaler a Gemini Live que l'utilisateur a fini de parler.
       * Envoie audioStreamEnd: true via sendRealtimeInput().
       */
      async endAudioTurn() {
        if (!isSessionActive) return;
        if (reconnecting) await reconnecting;
        if (!isSessionActive) return;
        try {
          log.info('Envoi audioStreamEnd a Gemini Live');
          await geminiSession.sendRealtimeInput({
            audioStreamEnd: true,
          });
        } catch (err) {
          log.error('Erreur endAudioTurn:', String(err));
        }
      },

      /**
       * Signal barge-in. Gemini gere nativement le barge-in quand on
       * envoie de l'audio pendant qu'il parle — ce signal est pour le logging.
       */
      async interrupt() {
        if (!isSessionActive) return;
        log.info('Signal barge-in recu pour session Gemini Live');
      },

      /**
       * Updates the tools after a CONTEXT_UPDATE (navigation, mount).
       * Gemini Live reads its config only at connection: a new connection with
       * these tools is opened at the end of the current turn, with the transcript history.
       */
      updateTools(nextTools: ToolDeclaration[]) {
        if (!isSessionActive) return;
        const key = JSON.stringify(toGeminiTools(nextTools) ?? []);
        // Liste deja appliquee ou deja en attente
        if (key === currentToolsKey) return;
        currentToolsKey = key;
        pendingTools = nextTools;
        log.debug(`Tools Gemini Live en attente: ${nextTools.length} tools`);
        applyPendingTools();
      },

      /**
       * Fermer la session Live.
       */
      close() {
        if (isSessionActive) {
          isSessionActive = false;
          pendingTools = null;
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

      onEvent<TType extends GoogleLiveEventType>(
        type: TType,
        listener: GoogleLiveEventListener<TType>
      ) {
        return emitter.on(type, listener);
      },

      offEvent<TType extends GoogleLiveEventType>(
        type: TType,
        listener: GoogleLiveEventListener<TType>
      ) {
        emitter.off(type, listener);
      },

      onAnyEvent(listener: GoogleLiveAnyEventListener) {
        return emitter.onAny(listener);
      },

      offAnyEvent(listener: GoogleLiveAnyEventListener) {
        emitter.offAny(listener);
      },
    };

    return session;
  }

  getCapabilities(): LLMAdapterCapabilities {
    const voices: VoiceInfo[] = GEMINI_VOICES.map((voice) => ({
      id: voice.id,
      name: voice.name,
      gender: voice.gender,
      language: 'multilingual',
    }));
    return {
      provider: 'google',
      providerName: 'Google Gemini Live',
      currentModel: this.model,
      currentVoice: this.defaultVoice,
      models: GOOGLE_LIVE_MODELS.map((entry) => ({
        id: entry.id,
        name: entry.name,
        supportsAudio: true,
        supportsTools: true,
        description: entry.description,
      })),
      voices,
    };
  }
}
