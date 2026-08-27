<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    OwlLayerClient,
    generateWidgetStyles,
    generateId,
    DEFAULT_WIDGET_CONFIG,
    DEFAULT_THEME,
    DEFAULT_LABELS,
    type WidgetConfig,
    type WidgetMode,
    type WidgetVisualState,
    type WidgetMessage,
    type ClientState,
    type ApprovalRequest,
  } from '@owllayer/core';
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
    theme: { ...DEFAULT_THEME, ...config?.theme },
    labels: { ...DEFAULT_LABELS, ...config?.labels },
  });

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
  let textInput = $state('');
  let lineState = $state<'idle' | 'waiting' | 'busy'>('idle');

  // Audio recording state
  let mediaStream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let processor: ScriptProcessorNode | null = null;

  // Audio playback state (pour recevoir la voix de l'agent)
  let playbackContext: AudioContext | null = null;
  let nextStartTime = 0;

  // ---- CSS ----
  const widgetCSS = $derived(generateWidgetStyles(cfg.theme, cfg.stylePreset));

  // ---- Derived state ----
  const visualState = $derived((() => {
    if (agentState === 'listening' || isRecording) return 'listening' as WidgetVisualState;
    if (agentState === 'thinking') return 'thinking' as WidgetVisualState;
    if (agentState === 'speaking') return 'speaking' as WidgetVisualState;
    if (agentState === 'error' || agentState === 'disconnected') return 'error' as WidgetVisualState;
    return 'idle' as WidgetVisualState;
  })());

  const statusLabel = $derived((() => {
    switch (visualState) {
      case 'listening': return cfg.labels.listening;
      case 'thinking':  return cfg.labels.thinking;
      case 'speaking':  return cfg.labels.speaking;
      case 'error':     return cfg.labels.error;
      default:          return cfg.labels.idle;
    }
  })());

  const dotClass = $derived((() => {
    if (visualState === 'error') return 'error';
    if (agentState === 'disconnected') return 'offline';
    return '';
  })());

  const isLive = $derived(['connected', 'listening', 'thinking', 'speaking'].includes(agentState));

  const agentDisplay = $derived(cfg.agentTitle
    ? `${cfg.agentName} (${cfg.agentTitle})`
    : cfg.agentName);

  const isThinkingState = $derived(agentState === 'thinking');

  const positionClass = $derived(cfg.position === 'bottom-left' ? 'bottom-left' : '');
  const presetClass = $derived(`owllayer-preset-${cfg.stylePreset}`);

  // ---- Track agent responses ----
  let prevResponse: string | null = null;
  $effect(() => {
    if (lastResponse && lastResponse !== prevResponse) {
      prevResponse = lastResponse;
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

    if (ownsClient) {
      client.connect();
    }
  });

  onDestroy(() => {
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
  async function startRecordingInternal() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });

      mediaStream = stream;
      audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(stream);
      processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (event) => {
        const pcmData = event.inputBuffer.getChannelData(0);
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
      isRecording = true;
    } catch {
      throw new Error('Microphone access denied');
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
  async function handleOpen() {
    isOpen = true;
    isClosing = false;

    if (cfg.mode === 'audio') {
      try {
        await startRecordingInternal();
      } catch {
        if (cfg.fallbackToText) {
          currentMode = 'text';
        }
      }
    }
  }

  function handleHangUp() {
    if (isRecording) stopRecordingInternal();

    isClosing = true;
    setTimeout(() => {
      isOpen = false;
      isClosing = false;
      messages = [];
    }, 250);
  }

  function handleSendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || !client) return;

    messages = [...messages, {
      id: generateId(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    }];
    client.sendText(trimmed);
  }

  async function handleSwitchMode() {
    if (currentMode === 'audio') {
      if (isRecording) stopRecordingInternal();
      currentMode = 'text';
    } else {
      currentMode = 'audio';
      try {
        await startRecordingInternal();
      } catch {
        if (cfg.fallbackToText) currentMode = 'text';
      }
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

<!-- Floating Button (when closed) -->
{#if !isOpen}
  <button
    class="owllayer-fab {positionClass} {presetClass}"
    aria-label={cfg.labels.callToAction}
    onclick={handleOpen}
  >
    {#if cfg.labels.badge}
      <span class="owllayer-fab-badge">{cfg.labels.badge}</span>
    {/if}

    <div class="owllayer-fab-content">
      <span class="owllayer-fab-title">{cfg.labels.callToAction}</span>
      <span class="owllayer-fab-subtitle">{cfg.labels.subtitle}</span>
      <span class="owllayer-fab-signature">by OwlLayer AI</span>
    </div>

    <div class="owllayer-fab-icon">
      <svg viewBox="0 0 24 24">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    </div>
  </button>
{/if}

<!-- Call Panel (when open) -->
{#if isOpen}
  <div class="owllayer-panel {positionClass} {presetClass} {currentMode === 'text' ? 'text-mode' : ''} {isClosing ? 'is-closing' : ''}">

    <!-- Header -->
    <div class="owllayer-panel-header">
      <div class="owllayer-avatar">
        <svg viewBox="0 0 24 24">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>

      <div class="owllayer-agent-info">
        <div class="owllayer-agent-name">{agentDisplay}</div>
        <div class="owllayer-agent-status">
          <span class="owllayer-status-dot {dotClass}"></span>
          <span>{statusLabel}</span>
        </div>
      </div>

      {#if isLive}
        <span class="owllayer-live-badge">{cfg.labels.live}</span>
      {/if}

      <!-- Header action buttons -->
      <div class="owllayer-header-actions">
        {#if cfg.allowModeSwitch}
          <button
            class="owllayer-btn-header {currentMode === 'text' ? 'active' : ''}"
            aria-label={currentMode === 'audio' ? 'Mode texte' : 'Mode audio'}
            onclick={handleSwitchMode}
          >
            {#if currentMode === 'audio'}
              <!-- Keyboard icon -->
              <svg viewBox="0 0 24 24">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <line x1="6" y1="8" x2="6" y2="8" />
                <line x1="10" y1="8" x2="10" y2="8" />
                <line x1="14" y1="8" x2="14" y2="8" />
                <line x1="18" y1="8" x2="18" y2="8" />
                <line x1="8" y1="16" x2="16" y2="16" />
              </svg>
            {:else}
              <!-- Mic icon -->
              <svg viewBox="0 0 24 24">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
              </svg>
            {/if}
            <span class="owllayer-tooltip">
              {currentMode === 'audio' ? 'Mode texte' : 'Mode audio'}
            </span>
          </button>
        {/if}
      </div>
    </div>

    <!-- Body: Waiting / Busy overlays or normal content -->
    {#if lineState === 'waiting'}
      <div class="owllayer-line-overlay">
        <div class="owllayer-line-spinner"></div>
        <p class="owllayer-line-title">Toutes les lignes sont occup&eacute;es</p>
        <p class="owllayer-line-sub">Vous serez connect&eacute; d&egrave;s qu'une ligne se lib&egrave;re&hellip;</p>
      </div>
    {:else if lineState === 'busy'}
      <div class="owllayer-line-overlay owllayer-line-overlay--busy">
        <p class="owllayer-line-title">Service temporairement indisponible</p>
        <p class="owllayer-line-sub">Toutes les lignes sont occup&eacute;es. Veuillez r&eacute;essayer dans quelques instants.</p>
        <button class="owllayer-btn-hangup" onclick={handleHangUp}>{cfg.labels.hangUp}</button>
      </div>
    {:else if currentMode === 'audio'}
      <!-- Body: Audio mode -->
      <div class="owllayer-panel-body">
        <div class="owllayer-audio-dots {visualState}">
          <div class="owllayer-audio-dot"></div>
          <div class="owllayer-audio-dot"></div>
          <div class="owllayer-audio-dot"></div>
          <div class="owllayer-audio-dot"></div>
          <div class="owllayer-audio-dot"></div>
        </div>
      </div>
    {:else}
      <!-- Body: Text mode (messages) -->
      <div class="owllayer-messages">
        {#if messages.length === 0 && !isThinkingState}
          <div class="owllayer-empty">
            Envoyez un message pour d&eacute;marrer.
          </div>
        {/if}

        {#each messages as msg (msg.id)}
          <div class="owllayer-msg {msg.role}">
            <div>{msg.content}</div>
            <div class="owllayer-msg-time">{formatTime(msg.timestamp)}</div>
          </div>
        {/each}

        {#if isThinkingState}
          <div class="owllayer-typing">
            <div class="owllayer-typing-dot"></div>
            <div class="owllayer-typing-dot"></div>
            <div class="owllayer-typing-dot"></div>
          </div>
        {/if}
      </div>

      <!-- Text input bar -->
      <div class="owllayer-text-bar">
        <input
          bind:value={textInput}
          type="text"
          class="owllayer-text-input"
          placeholder={cfg.labels.textPlaceholder}
          onkeydown={onKeyDown}
        />
        <button
          class="owllayer-btn-send"
          disabled={!textInput.trim()}
          aria-label={cfg.labels.send}
          onclick={onSend}
        >
          <svg viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    {/if}

    <!-- Footer -->
    <div class="owllayer-panel-footer">
      <button class="owllayer-btn-hangup" onclick={handleHangUp}>
        <svg viewBox="0 0 24 24">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        {cfg.labels.hangUp}
      </button>

      {#if cfg.allowModeSwitch}
        <button class="owllayer-btn-switch" onclick={handleSwitchMode}>
          {currentMode === 'audio' ? 'Passer en mode texte' : 'Passer en mode audio'}
        </button>
      {/if}
    </div>
    <div class="owllayer-widget-signature">by OwlLayer AI</div>
  </div>
{/if}

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
