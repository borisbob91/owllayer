<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    OwlLayerClient,
    generateWidgetStyles,
    generateId,
    DEFAULT_WIDGET_CONFIG,
    DEFAULT_LABELS,
    END_CALL_RESULT,
    END_CALL_TIMING,
    END_CALL_TOOL,
    createMicrophoneSource,
    downsamplePcm,
    getMicrophoneErrorKind,
    type MicrophoneErrorKind,
    type OwlLayerClientEventListener,
    type WidgetConfig,
    type WidgetMode,
    type WidgetVisualState,
    type WidgetMessage,
    type ClientState,
    type ApprovalRequest,
  } from '@owllayer/core';
  import { formatMarkdown } from './markdown.util.js';
  import ApprovalModal from '../hitl.ApprovalModal.svelte';

  // ---- Props ----
  let { apiKey, endpoint, client: providedClient = null, config = {} }: {
    apiKey?: string;
    endpoint?: string;
    client?: OwlLayerClient;
    config?: WidgetConfig;
  } = $props();

  // ---- Merged config ----
  const cfg = $derived({
    ...DEFAULT_WIDGET_CONFIG,
    ...config,
    labels: { ...DEFAULT_LABELS, ...config?.labels },
  });

  /** Lignes de transcription visibles en mode vocal */
  const TRANSCRIPT_LINES = 3;
  const BAR_COUNT = 21;
  const BAR_CENTER = (BAR_COUNT - 1) / 2;
  // --w : barres plus hautes au centre ; --i : decalage des animations
  const vizBars = Array.from({ length: BAR_COUNT }, (_, i) =>
    `--i:${i};--w:${(1 - Math.abs(i - BAR_CENTER) / (BAR_CENTER + 1)).toFixed(2)}`);

  // ---- OwlLayer Client ----
  let client: OwlLayerClient | null = null;
  let ownsClient = false;
  let agentState = $state<ClientState>('disconnected');
  let lastResponse = $state<string | null>(null);
  let pendingApproval = $state<ApprovalRequest | null>(null);
  let approvalResolver: ((approved: boolean) => void) | null = null;

  // ---- Widget state ----
  let isOpen = $state(false);
  let isClosing = $state(false);
  let currentMode = $state<WidgetMode>(DEFAULT_WIDGET_CONFIG.mode);
  let lastCfgMode: WidgetMode | undefined;
  $effect(() => {
    if (cfg.mode && cfg.mode !== lastCfgMode) {
      lastCfgMode = cfg.mode;
      currentMode = cfg.mode;
    }
  });
  let messages = $state<WidgetMessage[]>([]);
  let isRecording = $state(false);
  let isMuted = $state(false);
  let micLevel = $state(0);
  // Derniere raison d'echec du micro (null quand l'enregistrement a demarre)
  let micError = $state<MicrophoneErrorKind | null>(null);
  // Dernier message issu d'une transcription vocale : les fragments suivants du meme role s'y ajoutent
  let voiceMessageId: string | null = null;
  let textInput = $state('');
  let lineState = $state<'idle' | 'waiting' | 'busy'>('idle');

  // Audio recording state
  let mediaStream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let processor: ScriptProcessorNode | null = null;

  // Audio playback state (pour recevoir la voix de l'agent)
  let playbackContext: AudioContext | null = null;
  let nextStartTime = 0;

  // ---- CSS : palette du preset puis theme de l'application, portee par la racine du widget ----
  const widgetCSS = $derived(generateWidgetStyles(config?.theme, cfg.stylePreset, '.owllayer-widget-root'));

  // ---- Derived state ----
  // Micro refuse ou absent en mode vocal : on l'affiche au lieu d'attendre en silence
  const micBlocked = $derived(currentMode === 'audio' && !isRecording && micError !== null);

  const visualState = $derived((() => {
    if (agentState === 'error' || agentState === 'disconnected' || micBlocked) return 'error' as WidgetVisualState;
    if (agentState === 'speaking') return 'speaking' as WidgetVisualState;
    if (agentState === 'thinking') return 'thinking' as WidgetVisualState;
    if (agentState === 'listening' || isRecording) return 'listening' as WidgetVisualState;
    return 'idle' as WidgetVisualState;
  })());

  const statusLabel = $derived((() => {
    if (micBlocked) return micError === 'permission' ? cfg.labels.micPermission : cfg.labels.micUnavailable;
    switch (visualState) {
      case 'listening': return cfg.labels.listening;
      case 'thinking':  return cfg.labels.thinking;
      case 'speaking':  return cfg.labels.speaking;
      case 'error':     return cfg.labels.error;
      default:          return cfg.labels.idle;
    }
  })());


  const isLive = $derived(['connected', 'listening', 'thinking', 'speaking'].includes(agentState));

  const agentDisplay = $derived(cfg.agentTitle
    ? `${cfg.agentName} · ${cfg.agentTitle}`
    : cfg.agentName);

  const isThinkingState = $derived((() => {
    const last = messages[messages.length - 1];
    return (agentState === 'thinking' || (last?.role === 'user' && last.id !== voiceMessageId && agentState !== 'speaking'))
      && agentState !== 'error';
  })());

  const isVoice = $derived(currentMode === 'audio');
  const transcript = $derived(messages.slice(-TRANSCRIPT_LINES));
  const avatarState = $derived(
    isVoice ? visualState : isThinkingState ? 'thinking' : visualState === 'error' ? 'error' : 'idle'
  );

  // travel s'ouvre a gauche par defaut, sauf position explicite
  const positionClass = $derived(
    (config?.position ?? (cfg.stylePreset === 'travel' ? 'bottom-left' : cfg.position)) === 'bottom-left' ? 'bottom-left' : ''
  );
  const presetClass = $derived(`owllayer-preset-${cfg.stylePreset}`);

  // ---- Track agent responses ----
  let prevResponse: string | null = null;
  $effect(() => {
    if (lastResponse && lastResponse !== prevResponse) {
      prevResponse = lastResponse;
      voiceMessageId = null;
      const last = messages[messages.length - 1];
      if (last?.role === 'agent') {
        messages = [
          ...messages.slice(0, -1),
          { ...last, content: lastResponse, timestamp: Date.now() },
        ];
      } else {
        messages = [...messages, {
          id: generateId(),
          role: 'agent',
          content: lastResponse,
          timestamp: Date.now(),
        }];
      }
    }
  });

  // ---- Transcriptions vocales : la conversation reste la meme en voix et en texte ----
  const onTranscript: OwlLayerClientEventListener<'transcript.delta'> = ({ role, text }) => {
    const last = messages[messages.length - 1];
    if (last && last.role === role && last.id === voiceMessageId) {
      messages = [...messages.slice(0, -1), { ...last, content: last.content + text }];
      return;
    }
    voiceMessageId = generateId();
    messages = [...messages, { id: voiceMessageId, role, content: text.trimStart(), timestamp: Date.now() }];
  };

  // ---- Lifecycle ----
  onMount(() => {
    if (providedClient) {
      client = providedClient;
      ownsClient = false;
    } else {
      if (!endpoint || apiKey === undefined) {
        throw new Error('OwlLayerWidget: endpoint/apiKey requis si client non fourni');
      }

      client = new OwlLayerClient({
        endpoint,
        apiKey,
        autoReconnect: true,
      });
      ownsClient = true;
    }

    client.on({
      onStateChange: (state: ClientState) => {
        agentState = state;
      },
      onAgentResponse: (text: string, done: boolean) => {
        lastResponse = text;
        agentState = done ? 'connected' : 'speaking';
      },
      onSystemEvent: (kind: string, message?: string) => {
        if (kind === 'error') {
          const last = messages[messages.length - 1];
          if (last?.role === 'user') {
            messages = [...messages, {
              id: generateId(),
              role: 'agent',
              content: `⚠️ ${message ?? 'Erreur du service IA'}`,
              timestamp: Date.now(),
            }];
          }
        }
      },
      onAudioOutput: (audioBase64: string, mimeType: string) => {
        playAudioChunk(audioBase64, mimeType);
      },
      onLineAcquired: (_ln: string, waiting: boolean) => {
        lineState = waiting ? 'waiting' : 'idle';
      },
      onLineBusy: () => {
        lineState = 'busy';
      },
      onLineReady: (_ln: string) => {
        lineState = 'idle';
      },
      onApprovalRequest: (request: ApprovalRequest, resolve: (approved: boolean) => void) => {
        pendingApproval = request;
        approvalResolver = (approved: boolean) => {
          resolve(approved);
          pendingApproval = null;
          approvalResolver = null;
        };
      },
    });

    client.onEvent('transcript.delta', onTranscript);

    if (ownsClient) {
      client.connect();
    }
  });

  onDestroy(() => {
    client?.offEvent('transcript.delta', onTranscript);
    if (endTimer) clearTimeout(endTimer);
    client?.unregisterTool(END_CALL_TOOL.name);
    stopRecordingInternal();
    if (playbackContext && playbackContext.state !== 'closed') {
      void playbackContext.close().catch(() => {});
    }
    playbackContext = null;
    nextStartTime = 0;
    if (ownsClient) {
      client?.destroy();
    }
    client = null;
  });

  // ---- Audio recording ----
  /** Starts the microphone; false on failure (the reason is in micError). */
  async function startRecordingInternal(): Promise<boolean> {
    if (isRecording) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });

      mediaStream = stream;
      // 16 kHz quand le navigateur l'accepte, sinon frequence native du micro puis reechantillonnage
      const mic = createMicrophoneSource(stream, 16000);
      audioContext = mic.context;
      const source = mic.source;
      processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (event) => {
        const captured = event.inputBuffer.getChannelData(0);
        // Niveau du micro pour le visualiseur (RMS lisse)
        let sum = 0;
        for (let i = 0; i < captured.length; i++) sum += captured[i] * captured[i];
        const rms = Math.min(1, Math.sqrt(sum / captured.length) * 4);
        micLevel = micLevel * 0.6 + rms * 0.4;
        if (isMuted) return;
        const pcmData = downsamplePcm(captured, mic.ratio);
        const int16 = new Int16Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
          const s = Math.max(-1, Math.min(1, pcmData[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        const bytes = new Uint8Array(int16.buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        client?.sendAudioStream(btoa(binary), 'audio/pcm;rate=16000');
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
      micError = null;
      isRecording = true;
      return true;
    } catch (err) {
      micError = getMicrophoneErrorKind(err);
      mediaStream?.getTracks().forEach((t) => t.stop());
      mediaStream = null;
      console.error('Erreur micro:', err);
      return false;
    }
  }

  function stopRecordingInternal() {
    processor?.disconnect();
    audioContext?.close();
    mediaStream?.getTracks().forEach((t) => t.stop());
    processor = null;
    audioContext = null;
    mediaStream = null;
    isRecording = false;
    isMuted = false;
    micLevel = 0;
  }

  // ---- Audio playback (voix de l'agent) ----
  function playAudioChunk(audioBase64: string, mimeType: string) {
    try {
      if (!audioBase64) return;

      const rateMatch = mimeType.match(/rate=(\d+)/);
      const outputRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;

      if (!playbackContext || playbackContext.state === 'closed') {
        playbackContext = new AudioContext({ sampleRate: outputRate });
        nextStartTime = 0;
      }

      const ctx = playbackContext;

      if (ctx.state === 'suspended') {
        void ctx.resume().catch(() => {});
      }

      // Decoder base64 → Int16 PCM → Float32
      // validLength : aligner sur 2 octets pour éviter la corruption Int16Array
      const binary = atob(audioBase64);
      const validLength = binary.length - (binary.length % 2);
      const bytes = new Uint8Array(validLength);
      for (let i = 0; i < validLength; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768;
      }

      const buffer = ctx.createBuffer(1, float32.length, outputRate);
      buffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      // Scheduling séquentiel : évite chevauchements et silences entre chunks
      const startTime = Math.max(ctx.currentTime, nextStartTime);
      source.start(startTime);
      nextStartTime = startTime + buffer.duration;
    } catch (err) {
      console.error('Erreur lecture audio:', err);
    }
  }

  // ---- Actions ----
  // Voix : en cas d'echec du micro, la raison s'affiche et le bouton micro relance
  async function startVoice(): Promise<boolean> {
    currentMode = 'audio';
    return startRecordingInternal();
  }

  function onMicButton() {
    if (!isRecording) void startVoice();
    else toggleMute();
  }

  // ---- end_call : l'agent termine la conversation ; on ferme une fois qu'il a fini de parler ----
  let endTimer: ReturnType<typeof setTimeout> | null = null;
  let endRequestedAt = 0;
  let lastSpeakingAt = 0;

  function isAgentSpeaking(): boolean {
    const playing = playbackContext !== null && playbackContext.state !== 'closed'
      && nextStartTime > playbackContext.currentTime;
    return agentState === 'speaking' || playing;
  }

  function checkEnd() {
    const now = Date.now();
    if (isAgentSpeaking()) lastSpeakingAt = now;
    if (now - endRequestedAt >= END_CALL_TIMING.maxWaitMs || now - lastSpeakingAt >= END_CALL_TIMING.graceMs) {
      handleHangUp();
      return;
    }
    endTimer = setTimeout(checkEnd, 200);
  }

  function requestEnd() {
    if (endTimer) clearTimeout(endTimer);
    endRequestedAt = Date.now();
    lastSpeakingAt = endRequestedAt;
    checkEnd();
  }

  function registerEndCallTool() {
    if (!client || cfg.disableEndCallTool) return;
    client.registerTool({
      declaration: END_CALL_TOOL,
      handler: async () => {
        requestEnd();
        return END_CALL_RESULT;
      },
    });
  }

  async function handleOpen() {
    isOpen = true;
    isClosing = false;
    registerEndCallTool();
    // Ouverture directe en vocal : repli sur le texte si le micro n'est pas disponible
    if (cfg.mode === 'audio' && !(await startVoice()) && cfg.fallbackToText) currentMode = 'text';
  }

  function handleHangUp() {
    if (endTimer) clearTimeout(endTimer);
    endTimer = null;
    client?.unregisterTool(END_CALL_TOOL.name);
    if (isRecording) stopRecordingInternal();

    isClosing = true;
    setTimeout(() => {
      isOpen = false;
      isClosing = false;
      messages = [];
      voiceMessageId = null;
      currentMode = cfg.mode;
    }, 220);
  }

  function toggleMute() {
    isMuted = !isMuted;
  }

  function handleSendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || !client) return;

    voiceMessageId = null;
    messages = [...messages, {
      id: generateId(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    }];
    client.sendText(trimmed);
  }

  // Texte -> voix : le serveur transmet l'historique a la session vocale
  async function handleSwitchMode() {
    if (currentMode === 'audio') {
      if (isRecording) stopRecordingInternal();
      currentMode = 'text';
    } else {
      await startVoice();
    }
  }

  function onSend() {
    handleSendText(textInput);
    textInput = '';
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function approveAction() {
    approvalResolver?.(true);
  }

  function denyAction() {
    approvalResolver?.(false);
  }
</script>

<!-- Inject widget CSS -->
<svelte:head>
  {@html `<style>${widgetCSS}</style>`}
</svelte:head>

<div class="owllayer-widget-root">
{#if !isOpen}
  <!-- Lanceur -->
  <button
    type="button"
    class="owllayer-fab {positionClass} {presetClass}"
    aria-label={cfg.labels.callToAction}
    title={cfg.stylePreset === 'chat' ? cfg.labels.callToAction : undefined}
    onclick={handleOpen}
  >
    {#if cfg.labels.badge}
      <span class="owllayer-fab-badge">{cfg.labels.badge}</span>
    {/if}
    <span class="owllayer-fab-content">
      <span class="owllayer-fab-title">{cfg.labels.callToAction}</span>
      <span class="owllayer-fab-subtitle">{cfg.labels.subtitle}</span>
      <span class="owllayer-fab-signature">by OwlLayer AI</span>
    </span>
    <span class="owllayer-fab-icon">
      {#if cfg.stylePreset === 'chat'}
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.8A8 8 0 1 1 21 12z" /><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" /></svg>
      {:else if cfg.stylePreset === 'travel'}
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 7v10M21 12h0" /></svg>
      {:else}
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
      {/if}
    </span>
  </button>
{/if}

{#if isOpen}
  <!-- Panneau -->
  <div
    class="owllayer-panel {positionClass} {presetClass} {isVoice ? 'voice-mode' : 'text-mode'} {isClosing ? 'is-closing' : ''}"
    role="dialog"
    aria-label={agentDisplay}
  >
    <!-- En-tete -->
    <div class="owllayer-panel-header">
      <div class="owllayer-avatar state-{avatarState}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" /></svg>
      </div>
      <div class="owllayer-agent-info">
        <div class="owllayer-agent-name">{agentDisplay}</div>
        <div class="owllayer-agent-status">
          <span class="owllayer-status-dot state-{visualState} {visualState === 'error' ? 'error' : ''}"></span>
          <span>{micBlocked ? cfg.labels.micUnavailable : statusLabel}</span>
          {#if isLive && isVoice}
            <span class="owllayer-live-badge">{cfg.labels.live}</span>
          {/if}
        </div>
      </div>
      <div class="owllayer-header-actions">
        {#if cfg.allowModeSwitch}
          <button
            type="button"
            class="owllayer-btn-header"
            aria-label={isVoice ? cfg.labels.switchToText : cfg.labels.switchToVoice}
            onclick={handleSwitchMode}
          >
            {#if isVoice}
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="3" /><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M7 15h10" /></svg>
            {:else}
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" /></svg>
            {/if}
            <span class="owllayer-tooltip">{isVoice ? cfg.labels.switchToText : cfg.labels.switchToVoice}</span>
          </button>
        {/if}
        <button type="button" class="owllayer-btn-close" aria-label={cfg.labels.close} onclick={handleHangUp}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>
    </div>

    {#if lineState === 'waiting'}
      <!-- Lignes virtuelles -->
      <div class="owllayer-line-overlay">
        <div class="owllayer-line-spinner"></div>
        <p class="owllayer-line-title">{cfg.labels.linesWaitingTitle}</p>
        <p class="owllayer-line-sub">{cfg.labels.linesWaitingText}</p>
      </div>
    {:else if lineState === 'busy'}
      <div class="owllayer-line-overlay owllayer-line-overlay--busy">
        <p class="owllayer-line-title">{cfg.labels.linesBusyTitle}</p>
        <p class="owllayer-line-sub">{cfg.labels.linesBusyText}</p>
        <button type="button" class="owllayer-btn-chip" onclick={handleHangUp}>{cfg.labels.close}</button>
      </div>
    {:else if isVoice}
      <!-- Mode vocal -->
      <div class="owllayer-voice-stage">
        <div
          class="owllayer-viz state-{visualState} {isMuted ? 'is-muted' : ''}"
          style="--level:{isMuted ? 0 : micLevel.toFixed(3)}"
          aria-hidden="true"
        >
          <div class="owllayer-viz-ring"></div>
          <div class="owllayer-viz-ring"></div>
          <div class="owllayer-viz-ring"></div>
          <div class="owllayer-viz-orb"></div>
          <div class="owllayer-viz-bars">
            {#each vizBars as bar}
              <div class="owllayer-viz-bar" style={bar}></div>
            {/each}
          </div>
        </div>
        <p class="owllayer-voice-status state-{visualState}" aria-live="polite">{statusLabel}</p>
        <div class="owllayer-transcript" aria-live="polite">
          {#each transcript as msg (msg.id)}
            <div class="owllayer-transcript-line {msg.role}">{msg.content}</div>
          {/each}
        </div>
      </div>
      <div class="owllayer-voice-controls">
        <button
          type="button"
          class="owllayer-btn-round {isMuted || micBlocked ? 'is-active' : ''}"
          aria-label={!isRecording || isMuted ? cfg.labels.unmuteMic : cfg.labels.muteMic}
          aria-pressed={isMuted}
          onclick={onMicButton}
        >
          {#if isMuted || micBlocked}
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 2l20 20M9 9v2a3 3 0 0 0 5.1 2.1M15 9.3V5a3 3 0 0 0-5.9-.8" /><path d="M17 16.9A7 7 0 0 1 5 11v-1M19 10v1a7 7 0 0 1-.1 1.2M12 18v4" /></svg>
          {:else}
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" /></svg>
          {/if}
        </button>
        <button type="button" class="owllayer-btn-round danger" aria-label={cfg.labels.hangUp} onclick={handleHangUp}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.7 13.3a16 16 0 0 0 3.4 2.6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 3.1 4.2 2 2 0 0 1 5.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.4 2.1L9.1 9.9" /><path d="M22 2L2 22" /></svg>
        </button>
        {#if cfg.allowModeSwitch}
          <button type="button" class="owllayer-btn-round" aria-label={cfg.labels.switchToText} onclick={handleSwitchMode}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="3" /><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M7 15h10" /></svg>
          </button>
        {/if}
      </div>
      <div class="owllayer-widget-signature">by OwlLayer AI</div>
    {:else}
      <!-- Mode texte -->
      <div class="owllayer-messages" role="log" aria-live="polite">
        {#if messages.length === 0 && !isThinkingState}
          <div class="owllayer-empty">
            <div class="owllayer-empty-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" /></svg>
            </div>
            <div class="owllayer-empty-title">{cfg.labels.emptyTitle}</div>
            <div class="owllayer-empty-text">{cfg.labels.emptyText}</div>
          </div>
        {/if}

        {#each messages as msg (msg.id)}
          <div class="owllayer-msg {msg.role}">
            <div class="owllayer-msg-content">{@html formatMarkdown(msg.content)}</div>
            <div class="owllayer-msg-time">{formatTime(msg.timestamp)}</div>
          </div>
        {/each}

        {#if isThinkingState}
          <div class="owllayer-msg agent owllayer-thinking-msg">
            <div class="owllayer-typing">
              <div class="owllayer-typing-dots">
                <div class="owllayer-typing-dot"></div>
                <div class="owllayer-typing-dot"></div>
                <div class="owllayer-typing-dot"></div>
              </div>
              <span class="owllayer-typing-label">{cfg.labels.thinking}</span>
            </div>
          </div>
        {/if}
      </div>

      <div class="owllayer-text-bar">
        <input
          bind:value={textInput}
          type="text"
          class="owllayer-text-input"
          aria-label={cfg.labels.textPlaceholder}
          placeholder={cfg.labels.textPlaceholder}
          onkeydown={onKeyDown}
        />
        <button
          type="button"
          class="owllayer-btn-send"
          disabled={!textInput.trim()}
          aria-label={cfg.labels.send}
          onclick={onSend}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" /></svg>
        </button>
      </div>

      <div class="owllayer-text-footer">
        {#if cfg.allowModeSwitch}
          <button type="button" class="owllayer-btn-chip" onclick={handleSwitchMode}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" /></svg>
            {cfg.labels.switchToVoice}
          </button>
        {:else}
          <span></span>
        {/if}
        <span class="owllayer-widget-signature">by OwlLayer AI</span>
      </div>
    {/if}
  </div>
{/if}
</div>

{#if pendingApproval}
  <ApprovalModal
    toolName={pendingApproval.toolName}
    message={pendingApproval.message}
    risk={pendingApproval.risk}
    args={pendingApproval.args}
    onapprove={approveAction}
    ondeny={denyAction}
  />
{/if}
