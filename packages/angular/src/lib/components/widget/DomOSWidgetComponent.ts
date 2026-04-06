import {
  Component,
  input,
  signal,
  computed,
  effect,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { DomOSApprovalModalComponent } from '../hitl/DomOSApprovalModalComponent.js';

/**
 * DomOSWidgetComponent — Widget de chat vocal/texte standalone Angular.
 *
 * Surface widget officielle du SDK Angular, équivalent des widgets React/Vue/Svelte.
 * Gère autonomement le cycle de vie du client DomOS, l'audio bidirectionnel,
 * le texte, et la boucle HITL avec modal d'approbation intégrée.
 *
 * @example
 * ```typescript
 * import { DomOSWidgetComponent } from '@domos/angular';
 *
 * @Component({
 *   standalone: true,
 *   imports: [DomOSWidgetComponent],
 *   template: `
 *     <domos-widget
 *       [apiKey]="'pk_live_xxx'"
 *       [endpoint]="'wss://api.example.com/domos'"
 *       [config]="{ agentName: 'Alex', mode: 'audio' }"
 *     />
 *   `,
 * })
 * export class AppComponent {}
 * ```
 */
@Component({
  selector: 'domos-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, DomOSApprovalModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="domos-widget-root">
      <!-- Inject widget CSS -->
      <style>{{ widgetCSS() }}</style>

      <!-- Floating Button (when closed) -->
      @if (!isOpen()) {
        <button
          [class]="'domos-fab ' + positionClass() + ' ' + presetClass()"
          [attr.aria-label]="cfg().labels.callToAction"
          (click)="handleOpen()"
        >
          @if (cfg().labels.badge) {
            <span class="domos-fab-badge">{{ cfg().labels.badge }}</span>
          }

          <div class="domos-fab-content">
            <span class="domos-fab-title">{{ cfg().labels.callToAction }}</span>
            <span class="domos-fab-subtitle">{{ cfg().labels.subtitle }}</span>
            <span class="domos-fab-signature">by DomOS AI</span>
          </div>

          <div class="domos-fab-icon">
            <svg viewBox="0 0 24 24">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </div>
        </button>
      }

      <!-- Call Panel (when open) -->
      @if (isOpen()) {
        <div [class]="'domos-panel ' + positionClass() + ' ' + presetClass() + (currentMode() === 'text' ? ' text-mode' : '') + (isClosing() ? ' is-closing' : '')">

          <!-- Header -->
          <div class="domos-panel-header">
            <div class="domos-avatar">
              <svg viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>

            <div class="domos-panel-info">
              <div class="domos-panel-name">{{ agentDisplay() }}</div>
              <div class="domos-panel-status">
                @if (dotClass()) {
                  <span [class]="'domos-status-dot ' + dotClass()"></span>
                }
                {{ statusLabel() }}
              </div>
            </div>

            <button class="domos-hangup-btn" (click)="handleHangUp()" [attr.aria-label]="cfg().labels.hangUp">
              <svg viewBox="0 0 24 24">
                <path d="M23 16.92V20a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 5.11 2h3.09a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 20 18.92V17m2.5-1.5L19 12"/>
              </svg>
            </button>
          </div>

          <!-- Messages (text mode) -->
          @if (currentMode() === 'text') {
            <div class="domos-messages">
              @for (msg of messages(); track msg.id) {
                <div [class]="'domos-message domos-message-' + msg.role">
                  <div class="domos-message-content">{{ msg.content }}</div>
                  <div class="domos-message-time">{{ formatTime(msg.timestamp) }}</div>
                </div>
              }
            </div>
          }

          <!-- Audio visualizer -->
          @if (currentMode() === 'audio') {
            <div class="domos-audio-visualizer">
              <div class="domos-waveform" [class.active]="visualState() === 'listening' || visualState() === 'speaking'">
                @for (bar of [0,1,2,3,4]; track bar) {
                  <div class="domos-wave-bar"></div>
                }
              </div>
              @if (isThinkingState()) {
                <div class="domos-thinking-pulse"></div>
              }
            </div>
          }

          <!-- Text Input -->
          @if (currentMode() === 'text') {
            <div class="domos-input-area">
              <input
                type="text"
                class="domos-text-input"
                [(ngModel)]="textInputValue"
                [placeholder]="cfg().labels.textPlaceholder"
                (keydown)="onKeyDown($event)"
                [disabled]="!isLive()"
              />
              <button class="domos-send-btn" (click)="onSend()" [disabled]="!textInputValue.trim() || !isLive()">
                <svg viewBox="0 0 24 24">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </button>
            </div>
          }

          <!-- Mode Toggle -->
          @if (cfg().allowModeSwitch) {
            <button class="domos-mode-toggle" (click)="handleSwitchMode()">
              @if (currentMode() === 'audio') {
                <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <span>Passer au texte</span>
              } @else {
                <svg viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/></svg>
                <span>Passer à l'audio</span>
              }
            </button>
          }
        </div>
      }

      <!-- Approval Modal -->
      <domos-approval-modal
        [request]="pendingApproval()"
        [open]="!!pendingApproval()"
        (approve)="approveAction()"
        (deny)="denyAction()"
      />
    </div>
  `,
})
export class DomOSWidgetComponent implements OnDestroy {
  // ---- Inputs ----
  apiKey = input<string | undefined>(undefined);
  endpoint = input<string | undefined>(undefined);
  client = input<DomOSClient | undefined>(undefined);
  config = input<WidgetConfig>({});
  showApprovalModal = input<boolean>(true);

  // ---- Merged config ----
  cfg = computed(() => ({
    ...DEFAULT_WIDGET_CONFIG,
    ...this.config(),
    theme: { ...DEFAULT_THEME, ...this.config()?.theme },
    labels: { ...DEFAULT_LABELS, ...this.config()?.labels },
  }));

  // ---- DomOS Client state ----
  private _client: DomOSClient | null = null;
  private _ownsClient = false;

  agentState = signal<ClientState>('disconnected');
  lastResponse = signal<string | null>(null);
  pendingApproval = signal<ApprovalRequest | null>(null);
  private approvalResolver: ((approved: boolean) => void) | null = null;
  lineState = signal<'idle' | 'waiting' | 'busy'>('idle');

  // ---- Widget state ----
  isOpen = signal(false);
  isClosing = signal(false);
  currentMode = signal<WidgetMode>(this.cfg().mode);
  messages = signal<WidgetMessage[]>([]);
  isRecording = signal(false);
  textInputValue = '';

  // Audio recording state
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;

  // Audio playback state
  private playbackContext: AudioContext | null = null;
  private playbackNextStartTime = 0;

  // ---- CSS ----
  widgetCSS = computed(() =>
    generateWidgetStyles(this.cfg().theme, this.cfg().stylePreset, '.domos-widget-root')
  );

  // ---- Derived state ----
  visualState = computed<WidgetVisualState>(() => {
    const state = this.agentState();
    if (state === 'listening' || this.isRecording()) return 'listening';
    if (state === 'thinking') return 'thinking';
    if (state === 'speaking') return 'speaking';
    if (state === 'error' || state === 'disconnected') return 'error';
    return 'idle';
  });

  statusLabel = computed(() => {
    const state = this.visualState();
    const labels = this.cfg().labels;
    switch (state) {
      case 'listening': return labels.listening;
      case 'thinking': return labels.thinking;
      case 'speaking': return labels.speaking;
      case 'error': return labels.error;
      default: return labels.idle;
    }
  });

  dotClass = computed(() => {
    const visual = this.visualState();
    if (visual === 'error') return 'error';
    if (this.agentState() === 'disconnected') return 'offline';
    return '';
  });

  isLive = computed(() =>
    ['connected', 'listening', 'thinking', 'speaking'].includes(this.agentState())
  );

  agentDisplay = computed(() => {
    const c = this.cfg();
    return c.agentTitle ? `${c.agentName} (${c.agentTitle})` : c.agentName;
  });

  isThinkingState = computed(() => this.agentState() === 'thinking');

  positionClass = computed(() =>
    this.cfg().position === 'bottom-left' ? 'bottom-left' : ''
  );

  presetClass = computed(() => `domos-preset-${this.cfg().stylePreset}`);

  // ---- Track agent responses ----
  private prevResponse: string | null = null;

  constructor() {
    this.initializeClient();

    // Track agent responses and update messages
    effect(() => {
      const val = this.lastResponse();
      if (val && val !== this.prevResponse) {
        this.prevResponse = val;
        const msgs = this.messages();
        const last = msgs[msgs.length - 1];
        if (last?.role === 'agent') {
          this.messages.set([
            ...msgs.slice(0, -1),
            { ...last, content: val, timestamp: Date.now() },
          ]);
        } else {
          this.messages.set([
            ...msgs,
            { id: generateId(), role: 'agent', content: val, timestamp: Date.now() },
          ]);
        }
      }
    });
  }

  private initializeClient(): void {
    const providedClient = this.client();
    if (providedClient) {
      this._client = providedClient;
      this._ownsClient = false;
    } else {
      const ep = this.endpoint();
      const key = this.apiKey();
      if (!ep || key === undefined) {
        throw new Error('DomOSWidget: endpoint/apiKey requis si client non fourni');
      }

      this._client = new DomOSClient({
        endpoint: ep,
        apiKey: key,
        autoReconnect: true,
      });
      this._ownsClient = true;
    }

    this._client.on({
      onStateChange: (state: ClientState) => {
        this.agentState.set(state);
      },
      onAgentResponse: (text: string, done: boolean) => {
        this.lastResponse.set(text);
        this.agentState.set(done ? 'connected' : 'speaking');
      },
      onAudioOutput: (audioBase64: string, mimeType: string) => {
        this.playAudioChunk(audioBase64, mimeType);
      },
      onLineAcquired: (_ln: string, waiting: boolean) => {
        this.lineState.set(waiting ? 'waiting' : 'idle');
      },
      onLineBusy: () => {
        this.lineState.set('busy');
      },
      onLineReady: (_ln: string) => {
        this.lineState.set('idle');
      },
      onApprovalRequest: (request: ApprovalRequest, resolve: (approved: boolean) => void) => {
        this.pendingApproval.set(request);
        this.approvalResolver = (approved: boolean) => {
          resolve(approved);
          this.pendingApproval.set(null);
          this.approvalResolver = null;
        };
      },
    });

    if (this._ownsClient) {
      this._client.connect();
    }
  }

  ngOnDestroy(): void {
    this.stopRecordingInternal();
    if (this.playbackContext && this.playbackContext.state !== 'closed') {
      this.playbackContext.close().catch(() => {});
    }
    this.playbackContext = null;
    this.playbackNextStartTime = 0;
    if (this._ownsClient) {
      this._client?.destroy();
    }
    this._client = null;
  }

  // ---- Audio recording ----
  private async startRecordingInternal(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      this.mediaStream = stream;
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      const source = this.audioContext.createMediaStreamSource(stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (event) => {
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
        this._client?.sendAudioStream(btoa(binary), 'audio/pcm;rate=16000');
      };

      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      this.isRecording.set(true);
    } catch {
      throw new Error('Microphone access denied');
    }
  }

  private stopRecordingInternal(): void {
    this.processor?.disconnect();
    this.audioContext?.close();
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.processor = null;
    this.audioContext = null;
    this.mediaStream = null;
    this.isRecording.set(false);
  }

  // ---- Audio playback (voix de l'agent) ----
  private playAudioChunk(audioBase64: string, mimeType: string): void {
    try {
      if (!audioBase64) return;

      const rateMatch = mimeType.match(/rate=(\d+)/);
      const outputRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;

      if (!this.playbackContext || this.playbackContext.state === 'closed') {
        this.playbackContext = new AudioContext({ sampleRate: outputRate });
        this.playbackNextStartTime = 0;
      }

      const ctx = this.playbackContext;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // Decoder base64 → Int16 PCM → Float32
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
      const startTime = Math.max(ctx.currentTime, this.playbackNextStartTime);
      source.start(startTime);
      this.playbackNextStartTime = startTime + buffer.duration;
    } catch (err) {
      console.error('Erreur lecture audio:', err);
    }
  }

  // ---- Actions ----
  async handleOpen(): Promise<void> {
    this.isOpen.set(true);
    this.isClosing.set(false);

    if (this.cfg().mode === 'audio') {
      try {
        await this.startRecordingInternal();
      } catch {
        if (this.cfg().fallbackToText) {
          this.currentMode.set('text');
        }
      }
    }
  }

  handleHangUp(): void {
    if (this.isRecording()) this.stopRecordingInternal();

    this.isClosing.set(true);
    setTimeout(() => {
      this.isOpen.set(false);
      this.isClosing.set(false);
      this.messages.set([]);
    }, 250);
  }

  private handleSendText(text: string): void {
    const trimmed = text.trim();
    if (!trimmed || !this._client) return;

    this.messages.set([
      ...this.messages(),
      { id: generateId(), role: 'user', content: trimmed, timestamp: Date.now() },
    ]);
    this._client.sendText(trimmed);
  }

  async handleSwitchMode(): Promise<void> {
    if (this.currentMode() === 'audio') {
      if (this.isRecording()) this.stopRecordingInternal();
      this.currentMode.set('text');
    } else {
      this.currentMode.set('audio');
      try {
        await this.startRecordingInternal();
      } catch {
        if (this.cfg().fallbackToText) this.currentMode.set('text');
      }
    }
  }

  // ---- Text input ----
  onSend(): void {
    this.handleSendText(this.textInputValue);
    this.textInputValue = '';
  }

  onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.onSend();
    }
  }

  formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // ---- Approval actions ----
  approveAction(): void {
    this.approvalResolver?.(true);
  }

  denyAction(): void {
    this.approvalResolver?.(false);
  }
}
