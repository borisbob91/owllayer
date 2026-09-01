import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { generateId } from '@owllayer/core';
import { OwlLayerAngularService } from '../../services/OwlLayerAngularService.js';
import { OwlLayerVoiceService } from '../../services/voice/OwlLayerVoiceService.js';
import { MessageListComponent } from './MessageList.component.js';
import { ChatInputComponent } from './ChatInput.component.js';
import { AudioOrbComponent } from './AudioOrb.component.js';
import { WidgetMessage } from './widget.types.js';

import { WIDGET_STYLES } from './widget.styles.js';

@Component({
  selector: 'owllayer-widget-inner',
  standalone: true,
  imports: [
    CommonModule,
    MessageListComponent,
    ChatInputComponent,
    AudioOrbComponent
  ],
  providers: [OwlLayerVoiceService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="widget-modal" [class.is-closing]="isClosing" [class.text-mode]="currentMode() === 'text'" [class.audio-mode]="currentMode() === 'audio'">
      <!-- HEADER -->
      <div class="owllayer-panel-header">
        <div class="header-info">
          <span class="header-title">Assistant OwlLayer</span>
          <div class="header-status">
            <div [class]="'status-dot ' + dotClass()"></div>
            <span>{{ statusLabel() }}</span>
          </div>
        </div>
        <button class="close-button" (click)="onClose.emit()" aria-label="Fermer le chat">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- TEXT MODE -->
      @if (currentMode() === 'text') {
        <owllayer-message-list
          [messages]="messages()"
          [isThinking]="isThinking()"
          [thinkingLabel]="thinkingLabel()"
        ></owllayer-message-list>

        <div class="chat-input-wrapper">
          <owllayer-chat-input
            [isVoiceMode]="false"
            (onSend)="onSendMessage($event)"
            (onVoiceToggle)="setMode('audio')"
          ></owllayer-chat-input>
        </div>
      }

      <!-- VOICE MODE -->
      @if (currentMode() === 'audio') {
        <div class="voice-mode-container">
          <owllayer-audio-orb [visualState]="orbState()"></owllayer-audio-orb>
        </div>

        <div class="voice-controls">
          <!-- Mute / Unmute -->
          <button
            (click)="toggleMute()"
            class="voice-btn-large voice-btn-secondary"
            [title]="voice.isMuted() ? 'Réactiver le micro' : 'Couper le micro'"
          >
            @if (voice.isMuted()) {
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="1" y1="1" x2="23" y2="23"></line>
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            } @else {
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            }
          </button>

          <!-- Basculer en mode texte -->
          <button (click)="setMode('text')" class="voice-btn-large voice-btn-secondary" title="Mode Texte">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </button>

          <!-- Raccrocher -->
          <button (click)="onClose.emit()" class="voice-btn-large voice-btn-hangup" title="Raccrocher">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path>
            </svg>
          </button>
        </div>
      }

      <!-- SIGNATURE — footer commun aux deux modes -->
      <div class="owllayer-widget-signature">Propulsé par OwlLayer AI</div>
    </div>
  `,
  styles: [WIDGET_STYLES]
})
export class WidgetInnerComponent implements OnInit, OnDestroy {
  private readonly owllayer = inject(OwlLayerAngularService);
  readonly voice = inject(OwlLayerVoiceService);

  @Input() isClosing: boolean = false;
  @Output() onClose = new EventEmitter<void>();

  messages = signal<WidgetMessage[]>([]);
  currentMode = signal<'text' | 'audio'>('text');

  agentState = this.owllayer.state;
  isConnected = this.owllayer.isConnected;

  // État visuel global : combine agentState + signaux du service voice
  visualState = computed(() => {
    const state = this.agentState();
    if (state === 'error' || state === 'disconnected') return 'error' as const;
    if (state === 'speaking' || this.voice.isPlaybackActive() || this.voice.voiceState() === 'playing') return 'speaking' as const;
    if (state === 'thinking' || this.voice.voiceState() === 'awaiting_model') return 'thinking' as const;
    if (state === 'listening' || this.voice.isRecording() || this.voice.voiceState() === 'capturing') return 'listening' as const;
    return 'idle' as const;
  });

  // État de l'orbe audio — 'error' se rend en 'idle' (pas de classe CSS error sur l'orbe)
  orbState = computed(() => {
    const v = this.visualState();
    return (v === 'error' ? 'idle' : v) as 'idle' | 'listening' | 'thinking' | 'speaking';
  });

  statusLabel = computed(() => {
    switch (this.visualState()) {
      case 'listening': return 'À l\'écoute...';
      case 'thinking':  return 'Réflexion...';
      case 'speaking':  return 'L\'agent parle...';
      case 'error':     return 'Erreur';
      default:          return 'Prêt';
    }
  });

  dotClass = computed(() => {
    const visual = this.visualState();
    if (visual === 'error') return 'error';
    if (this.agentState() === 'disconnected') return 'offline';
    return 'online';
  });

  isThinking = computed(() => {
    const state = this.agentState();
    const visual = this.visualState();
    if (state === 'error' || state === 'disconnected' || visual === 'error') {
      return false;
    }
    const msgs = this.messages();
    const lastMsg = msgs[msgs.length - 1];
    return state === 'thinking' || visual === 'thinking' || (lastMsg?.role === 'user');
  });

  thinkingLabel = computed(() => {
    const lang = (this.owllayer.client as any)?.options?.language;
    return lang === 'en' ? 'Thinking...' : 'En train d\'écrire...';
  });

  constructor() {
    // Abonnement aux réponses texte de l'agent (streaming)
    this.owllayer.subscribeEvent('agent.response.delta', (payload) => {
      this.updateLastMessage(payload.text, true);
    });

    this.owllayer.subscribeEvent('agent.response.done', (payload) => {
      this.updateLastMessage(payload.text, false);
    });

    // Détection des erreurs système/LLM pour mise à jour immédiate du chat
    this.owllayer.subscribeEvent('system.error', (payload) => {
      const errorText = payload.message || 'Erreur du service IA';
      const msgs = this.messages();
      const last = msgs[msgs.length - 1];
      if (!last || last.role === 'user') {
        this.messages.set([
          ...msgs,
          { id: generateId(), role: 'agent', content: `⚠️ ${errorText}`, timestamp: Date.now(), isStreaming: false }
        ]);
      }
    });
  }

  ngOnInit(): void {
    if (this.currentMode() === 'audio') {
      this.voice.startCapture().catch(() => this.currentMode.set('text'));
    }
  }

  ngOnDestroy(): void {
    // OwlLayerVoiceService.ngOnDestroy() est appelé automatiquement par Angular
    // car il est fourni dans providers de ce composant.
    // Appel explicite en sécurité supplémentaire pour les ressources audio.
    this.voice.stopCapture('user_stop', false);
  }

  setMode(mode: 'text' | 'audio'): void {
    if (mode === 'audio') {
      this.voice.startCapture().catch(() => this.currentMode.set('text'));
    } else {
      this.voice.stopCapture('user_stop');
    }
    this.currentMode.set(mode);
  }

  toggleMute(): void {
    if (this.voice.isMuted()) {
      this.voice.unmute();
    } else {
      this.voice.mute();
    }
  }

  onSendMessage(text: string): void {
    this.messages.update(msgs => [
      ...msgs,
      { id: generateId(), role: 'user', content: text, timestamp: Date.now() }
    ]);
    this.owllayer.sendText(text);
  }

  private updateLastMessage(content: string, isStreaming: boolean): void {
    const msgs = this.messages();
    const last = msgs[msgs.length - 1];

    if (last && (last.role === 'agent' || last.role === 'assistant')) {
      this.messages.set([
        ...msgs.slice(0, -1),
        { ...last, content, isStreaming }
      ]);
    } else {
      this.messages.set([
        ...msgs,
        { id: generateId(), role: 'agent', content, timestamp: Date.now(), isStreaming }
      ]);
    }
  }
}
