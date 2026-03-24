<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import {
  DomOSClient,
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
} from '@domos/core';
import ApprovalModal from '../hitl.ApprovalModal.vue';

// ---- Props ----
const props = withDefaults(defineProps<{
  apiKey?: string;
  endpoint?: string;
  client?: DomOSClient;
  config?: WidgetConfig;
  showApprovalModal?: boolean;
}>(), {
  config: () => ({}),
  showApprovalModal: true,
});

// ---- Merged config ----
const cfg = computed(() => ({
  ...DEFAULT_WIDGET_CONFIG,
  ...props.config,
  theme: { ...DEFAULT_THEME, ...props.config?.theme },
  labels: { ...DEFAULT_LABELS, ...props.config?.labels },
}));

// ---- DomOS Client ----
let client: DomOSClient | null = null;
let ownsClient = false;

const agentState = ref<ClientState>('disconnected');
const lastResponse = ref<string | null>(null);
const pendingApproval = ref<ApprovalRequest | null>(null);
let approvalResolver: ((approved: boolean) => void) | null = null;

// ---- Widget state ----
const isOpen = ref(false);
const isClosing = ref(false);
const currentMode = ref<WidgetMode>(cfg.value.mode);
const messages = ref<WidgetMessage[]>([]);
const isRecording = ref(false);

// Audio recording state
let mediaStream: MediaStream | null = null;
let audioContext: AudioContext | null = null;
let processor: ScriptProcessorNode | null = null;

// Audio playback state (pour recevoir la voix de l'agent)
let playbackContext: AudioContext | null = null;
let playbackNextStartTime = 0;

// ---- CSS (generated once) ----
const widgetCSS = computed(() => generateWidgetStyles(cfg.value.theme, cfg.value.stylePreset));

// ---- Derived state ----
const visualState = computed<WidgetVisualState>(() => {
  if (agentState.value === 'listening' || isRecording.value) return 'listening';
  if (agentState.value === 'thinking') return 'thinking';
  if (agentState.value === 'speaking') return 'speaking';
  if (agentState.value === 'error' || agentState.value === 'disconnected') return 'error';
  return 'idle';
});

const statusLabel = computed(() => {
  switch (visualState.value) {
    case 'listening': return cfg.value.labels.listening;
    case 'thinking': return cfg.value.labels.thinking;
    case 'speaking': return cfg.value.labels.speaking;
    case 'error': return cfg.value.labels.error;
    default: return cfg.value.labels.idle;
  }
});

const dotClass = computed(() => {
  if (visualState.value === 'error') return 'error';
  if (agentState.value === 'disconnected') return 'offline';
  return '';
});

const isLive = computed(() =>
  ['connected', 'listening', 'thinking', 'speaking'].includes(agentState.value)
);

const agentDisplay = computed(() =>
  cfg.value.agentTitle
    ? `${cfg.value.agentName} (${cfg.value.agentTitle})`
    : cfg.value.agentName
);

const isThinking = computed(() => agentState.value === 'thinking');

const positionClass = computed(() =>
  cfg.value.position === 'bottom-left' ? 'bottom-left' : ''
);
const presetClass = computed(() => `domos-preset-${cfg.value.stylePreset}`);

// ---- Track agent responses ----
let prevResponse: string | null = null;
watch(lastResponse, (val) => {
  if (val && val !== prevResponse) {
    prevResponse = val;
    const last = messages.value[messages.value.length - 1];
    if (last?.role === 'agent') {
      messages.value.splice(messages.value.length - 1, 1, {
        ...last,
        content: val,
        timestamp: Date.now(),
      });
      return;
    }

    messages.value.push({
      id: generateId(),
      role: 'agent',
      content: val,
      timestamp: Date.now(),
    });
  }
});

// ---- Lifecycle ----
onMounted(() => {
  if (props.client) {
    client = props.client;
    ownsClient = false;
  } else {
    if (!props.endpoint || props.apiKey === undefined) {
      throw new Error('DomOSWidget: endpoint/apiKey requis si client non fourni');
    }

    client = new DomOSClient({
      endpoint: props.endpoint,
      apiKey: props.apiKey,
      autoReconnect: true,
    });
    ownsClient = true;
  }

  client.on({
    onStateChange: (state: ClientState) => {
      agentState.value = state;
    },
    onAgentResponse: (text: string, done: boolean) => {
      lastResponse.value = text;
      agentState.value = done ? 'connected' : 'speaking';
    },
    onAudioOutput: (audioBase64: string, mimeType: string) => {
      playAudioChunk(audioBase64, mimeType);
    },
    onApprovalRequest: (request: ApprovalRequest, resolve: (approved: boolean) => void) => {
      pendingApproval.value = request;
      approvalResolver = (approved: boolean) => {
        resolve(approved);
        pendingApproval.value = null;
        approvalResolver = null;
      };
    },
  });

  if (ownsClient) {
    client.connect();
  }
});

onUnmounted(() => {
  stopRecordingInternal();
  if (playbackContext && playbackContext.state !== 'closed') {
    void playbackContext.close().catch(() => {});
  }
  playbackContext = null;
  playbackNextStartTime = 0;
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
    isRecording.value = true;
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
  isRecording.value = false;
}

// ---- Audio playback (voix de l'agent) ----
function playAudioChunk(audioBase64: string, mimeType: string) {
  try {
    if (!audioBase64) return;

    const rateMatch = mimeType.match(/rate=(\d+)/);
    const outputRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;

    if (!playbackContext || playbackContext.state === 'closed') {
      playbackContext = new AudioContext({ sampleRate: outputRate });
      playbackNextStartTime = 0;
    }

    const ctx = playbackContext;

    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }

    // Decoder base64 → Int16 PCM → Float32
    // validLength : aligner sur 2 octets pour eviter la corruption Int16Array
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

    // Scheduling sequentiel : evite chevauchements et silences entre chunks
    const startTime = Math.max(ctx.currentTime, playbackNextStartTime);
    source.start(startTime);
    playbackNextStartTime = startTime + buffer.duration;
  } catch (err) {
    console.error('Erreur lecture audio:', err);
  }
}

// ---- Actions ----
async function handleOpen() {
  isOpen.value = true;
  isClosing.value = false;

  if (cfg.value.mode === 'audio') {
    try {
      await startRecordingInternal();
    } catch {
      if (cfg.value.fallbackToText) {
        currentMode.value = 'text';
      }
    }
  }
}

function handleHangUp() {
  if (isRecording.value) stopRecordingInternal();

  if (playbackContext && playbackContext.state !== 'closed') {
    void playbackContext.close().catch(() => {});
  }
  playbackContext = null;
  playbackNextStartTime = 0;

  isClosing.value = true;
  setTimeout(() => {
    isOpen.value = false;
    isClosing.value = false;
    messages.value = [];
  }, 250);
}

function handleSendText(text: string) {
  const trimmed = text.trim();
  if (!trimmed || !client) return;

  messages.value.push({
    id: generateId(),
    role: 'user',
    content: trimmed,
    timestamp: Date.now(),
  });
  client.sendText(trimmed);
}

async function handleSwitchMode() {
  if (currentMode.value === 'audio') {
    if (isRecording.value) stopRecordingInternal();
    currentMode.value = 'text';
  } else {
    currentMode.value = 'audio';
    try {
      await startRecordingInternal();
    } catch {
      if (cfg.value.fallbackToText) currentMode.value = 'text';
    }
  }
}

// ---- Text input ----
const textInput = ref('');

function onSend() {
  handleSendText(textInput.value);
  textInput.value = '';
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

// ---- Shadow DOM ----
const hostRef = ref<HTMLDivElement | null>(null);
let shadowRoot: ShadowRoot | null = null;

onMounted(() => {
  if (hostRef.value && !shadowRoot) {
    // We DON'T use shadow DOM here for Vue — Vue SFC scoped styles handle isolation.
    // Instead we inject the CSS into a style tag next to the component.
  }
});
</script>

<template>
  <!-- Inject widget CSS -->
  <component :is="'style'">{{ widgetCSS }}</component>

  <!-- Floating Button (when closed) -->
  <button
    v-if="!isOpen"
    :class="['domos-fab', positionClass, presetClass]"
    :aria-label="cfg.labels.callToAction"
    @click="handleOpen"
  >
    <span v-if="cfg.labels.badge" class="domos-fab-badge">{{ cfg.labels.badge }}</span>

    <div class="domos-fab-content">
      <span class="domos-fab-title">{{ cfg.labels.callToAction }}</span>
      <span class="domos-fab-subtitle">{{ cfg.labels.subtitle }}</span>
      <span class="domos-fab-signature">by DomOS AI</span>
    </div>

    <div class="domos-fab-icon">
      <svg viewBox="0 0 24 24">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    </div>
  </button>

  <!-- Call Panel (when open) -->
  <div
    v-if="isOpen"
    :class="['domos-panel', positionClass, presetClass, currentMode === 'text' ? 'text-mode' : '', isClosing ? 'is-closing' : '']"
  >
    <!-- Header -->
    <div class="domos-panel-header">
      <div class="domos-avatar">
        <svg viewBox="0 0 24 24">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>

      <div class="domos-agent-info">
        <div class="domos-agent-name">{{ agentDisplay }}</div>
        <div class="domos-agent-status">
          <span :class="['domos-status-dot', dotClass]" />
          <span>{{ statusLabel }}</span>
        </div>
      </div>

      <span v-if="isLive" class="domos-live-badge">{{ cfg.labels.live }}</span>

      <!-- Header action buttons -->
      <div class="domos-header-actions">
        <button
          v-if="cfg.allowModeSwitch"
          :class="['domos-btn-header', currentMode === 'text' ? 'active' : '']"
          :aria-label="currentMode === 'audio' ? 'Mode texte' : 'Mode audio'"
          @click="handleSwitchMode"
        >
          <!-- Keyboard icon (when in audio mode) -->
          <svg v-if="currentMode === 'audio'" viewBox="0 0 24 24">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <line x1="6" y1="8" x2="6" y2="8" />
            <line x1="10" y1="8" x2="10" y2="8" />
            <line x1="14" y1="8" x2="14" y2="8" />
            <line x1="18" y1="8" x2="18" y2="8" />
            <line x1="8" y1="16" x2="16" y2="16" />
          </svg>
          <!-- Mic icon (when in text mode) -->
          <svg v-else viewBox="0 0 24 24">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
          </svg>
          <span class="domos-tooltip">
            {{ currentMode === 'audio' ? 'Mode texte' : 'Mode audio' }}
          </span>
        </button>
      </div>
    </div>

    <!-- Body: Audio mode -->
    <div v-if="currentMode === 'audio'" class="domos-panel-body">
      <div :class="['domos-audio-dots', visualState]">
        <div class="domos-audio-dot" />
        <div class="domos-audio-dot" />
        <div class="domos-audio-dot" />
        <div class="domos-audio-dot" />
        <div class="domos-audio-dot" />
      </div>
    </div>

    <!-- Body: Text mode (messages) -->
    <div v-else class="domos-messages">
      <div v-if="messages.length === 0 && !isThinking" class="domos-empty">
        Envoyez un message pour d&eacute;marrer.
      </div>

      <div
        v-for="msg in messages"
        :key="msg.id"
        :class="['domos-msg', msg.role]"
      >
        <div>{{ msg.content }}</div>
        <div class="domos-msg-time">{{ formatTime(msg.timestamp) }}</div>
      </div>

      <div v-if="isThinking" class="domos-typing">
        <div class="domos-typing-dot" />
        <div class="domos-typing-dot" />
        <div class="domos-typing-dot" />
      </div>
    </div>

    <!-- Text input bar (text mode only) -->
    <div v-if="currentMode === 'text'" class="domos-text-bar">
      <input
        v-model="textInput"
        type="text"
        class="domos-text-input"
        :placeholder="cfg.labels.textPlaceholder"
        @keydown="onKeyDown"
      />
      <button
        class="domos-btn-send"
        :disabled="!textInput.trim()"
        :aria-label="cfg.labels.send"
        @click="onSend"
      >
        <svg viewBox="0 0 24 24">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>

    <!-- Footer -->
    <div class="domos-panel-footer">
      <button class="domos-btn-hangup" @click="handleHangUp">
        <svg viewBox="0 0 24 24">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        {{ cfg.labels.hangUp }}
      </button>

      <button
        v-if="cfg.allowModeSwitch"
        class="domos-btn-switch"
        @click="handleSwitchMode"
      >
        {{ currentMode === 'audio' ? 'Passer en mode texte' : 'Passer en mode audio' }}
      </button>
    </div>
    <div class="domos-widget-signature">by DomOS AI</div>
  </div>

  <ApprovalModal
    v-if="pendingApproval && props.showApprovalModal"
    :tool-name="pendingApproval.toolName"
    :message="pendingApproval.message"
    :risk="(pendingApproval.risk as 'high' | 'critical')"
    :args="pendingApproval.args"
    @approve="approveAction"
    @deny="denyAction"
  />
</template>
