import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { injectOwlLayer } from '@owllayer/angular';
import type { ClientState } from '@owllayer/core';

interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
}

interface ApprovalRequest {
  toolName: string;
  args: Record<string, unknown>;
  risk?: string;
}

@Component({
  standalone: true,
  selector: 'app-chat-widget',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <!-- FAB button -->
    <button
      *ngIf="!isOpen"
      class="chat-fab"
      (click)="open()"
      aria-label="Ouvrir l'assistant"
    >
      <span class="fab-indicator" [class.online]="connected"></span>
      <svg class="fab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <div class="fab-label">
        <span class="fab-title">{{ agentName }}</span>
        <span class="fab-sub">{{ connected ? 'En ligne' : 'Hors ligne' }}</span>
      </div>
    </button>

    <!-- Chat panel -->
    <div *ngIf="isOpen" class="chat-panel" [class.closing]="isClosing">
      <!-- Header -->
      <div class="chat-header">
        <div class="chat-avatar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 20a8 8 0 0 1 16 0"/>
          </svg>
        </div>
        <div class="chat-agent-info">
          <span class="chat-agent-name">{{ agentName }}</span>
          <span class="chat-status" [class]="statusClass">
            <span class="status-dot" *ngIf="agentState !== 'disconnected'"></span>
            {{ statusLabel }}
          </span>
        </div>
        <button class="chat-close-btn" (click)="close()" aria-label="Fermer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Messages -->
      <div class="chat-messages" #messagesContainer>
        <!-- Welcome message -->
        <div *ngIf="messages.length === 0" class="chat-welcome">
          <div class="welcome-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="8" r="4"/>
              <path d="M4 20a8 8 0 0 1 16 0"/>
            </svg>
          </div>
          <p>Bonjour ! Je suis <strong>{{ agentName }}</strong>.<br>Comment puis-je vous aider ?</p>
        </div>

        <div
          *ngFor="let msg of messages; trackBy: trackById"
          class="chat-message"
          [class.user]="msg.role === 'user'"
          [class.agent]="msg.role === 'agent'"
        >
          <div class="message-bubble">{{ msg.content }}</div>
          <span class="message-time">{{ msg.timestamp | date: 'HH:mm' }}</span>
        </div>

        <!-- Thinking indicator -->
        <div *ngIf="agentState === 'thinking'" class="chat-message agent">
          <div class="message-bubble thinking">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          </div>
        </div>
      </div>

      <!-- Input -->
      <div class="chat-input-area">
        <input
          class="chat-input"
          type="text"
          [(ngModel)]="inputText"
          placeholder="Écrivez votre message..."
          (keydown.enter)="sendMessage()"
          [disabled]="!connected || agentState === 'thinking'"
        />
        <button
          class="chat-send-btn"
          (click)="sendMessage()"
          [disabled]="!inputText.trim() || !connected || agentState === 'thinking'"
          aria-label="Envoyer"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m22 2-7 20-4-9-9-4 20-7z"/>
            <path d="M22 2 11 13"/>
          </svg>
        </button>
      </div>

      <!-- HITL Approval Modal -->
      <div *ngIf="pendingApproval" class="hitl-overlay">
        <div class="hitl-card">
          <div class="hitl-icon">⚡</div>
          <h3>Action requise</h3>
          <p class="hitl-tool">Outil : <code>{{ pendingApproval.toolName }}</code></p>
          <div *ngIf="pendingApproval.risk" class="hitl-risk" [class]="'risk-' + pendingApproval.risk">
            Risque : {{ pendingApproval.risk }}
          </div>
          <pre class="hitl-args">{{ pendingApproval.args | json }}</pre>
          <div class="hitl-actions">
            <button class="hitl-deny" (click)="denyApproval()">Refuser</button>
            <button class="hitl-approve" (click)="approveApproval()">Approuver</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ---- FAB ---- */
    .chat-fab {
      align-items: center;
      background: linear-gradient(135deg, #ffcf8b, #f5b942);
      border: none;
      border-radius: 20px;
      bottom: 32px;
      box-shadow: 0 8px 32px rgba(255, 207, 139, 0.35), 0 2px 8px rgba(0,0,0,0.3);
      color: #1d1f1f;
      cursor: pointer;
      display: flex;
      gap: 12px;
      padding: 14px 20px 14px 16px;
      position: fixed;
      right: 32px;
      transition: transform 0.2s, box-shadow 0.2s;
      z-index: 9000;
    }
    .chat-fab:hover {
      box-shadow: 0 12px 40px rgba(255, 207, 139, 0.5), 0 4px 12px rgba(0,0,0,0.3);
      transform: translateY(-3px);
    }
    .fab-indicator {
      background: #666;
      border-radius: 50%;
      height: 10px;
      position: absolute;
      right: 12px;
      top: 12px;
      width: 10px;
    }
    .fab-indicator.online {
      background: #4ade80;
      box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.25);
    }
    .fab-icon {
      flex-shrink: 0;
      height: 24px;
      width: 24px;
    }
    .fab-label {
      display: flex;
      flex-direction: column;
      text-align: left;
    }
    .fab-title {
      font-size: 0.95rem;
      font-weight: 700;
    }
    .fab-sub {
      font-size: 0.78rem;
      opacity: 0.7;
    }

    /* ---- Panel ---- */
    .chat-panel {
      animation: slideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      background: #10212a;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      bottom: 32px;
      box-shadow: 0 24px 80px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.3);
      display: flex;
      flex-direction: column;
      height: 560px;
      overflow: hidden;
      position: fixed;
      right: 32px;
      width: 380px;
      z-index: 9000;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(24px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* ---- Header ---- */
    .chat-header {
      align-items: center;
      background: linear-gradient(90deg, rgba(255,207,139,0.12), rgba(255,255,255,0.04));
      border-bottom: 1px solid rgba(255,255,255,0.08);
      display: flex;
      gap: 12px;
      padding: 16px 20px;
    }
    .chat-avatar {
      align-items: center;
      background: linear-gradient(135deg, #ffcf8b, #f5b942);
      border-radius: 12px;
      color: #1d1f1f;
      display: flex;
      flex-shrink: 0;
      height: 40px;
      justify-content: center;
      width: 40px;
    }
    .chat-avatar svg { height: 22px; width: 22px; }
    .chat-agent-info { display: flex; flex: 1; flex-direction: column; gap: 2px; }
    .chat-agent-name { color: #f6efe3; font-size: 0.95rem; font-weight: 700; }
    .chat-status {
      align-items: center;
      color: #7a8c92;
      display: flex;
      font-size: 0.78rem;
      gap: 5px;
    }
    .status-dot {
      animation: pulse 2s infinite;
      background: #4ade80;
      border-radius: 50%;
      height: 6px;
      width: 6px;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .chat-close-btn {
      align-items: center;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      color: #a9c0c7;
      cursor: pointer;
      display: flex;
      height: 32px;
      justify-content: center;
      padding: 0;
      transition: background 0.2s, color 0.2s;
      width: 32px;
    }
    .chat-close-btn:hover { background: rgba(255,255,255,0.12); color: #f6efe3; }
    .chat-close-btn svg { height: 16px; width: 16px; }

    /* ---- Messages ---- */
    .chat-messages {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 12px;
      overflow-y: auto;
      padding: 20px 16px;
      scroll-behavior: smooth;
    }
    .chat-messages::-webkit-scrollbar { width: 4px; }
    .chat-messages::-webkit-scrollbar-track { background: transparent; }
    .chat-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }

    .chat-welcome {
      align-items: center;
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin: auto 0;
      padding: 24px 0;
      text-align: center;
    }
    .welcome-avatar {
      align-items: center;
      background: linear-gradient(135deg, rgba(255,207,139,0.2), rgba(255,207,139,0.05));
      border: 1px solid rgba(255,207,139,0.3);
      border-radius: 50%;
      color: #ffcf8b;
      display: flex;
      height: 64px;
      justify-content: center;
      width: 64px;
    }
    .welcome-avatar svg { height: 36px; width: 36px; }
    .chat-welcome p { color: #a9c0c7; font-size: 0.9rem; line-height: 1.6; margin: 0; }
    .chat-welcome strong { color: #f6efe3; }

    .chat-message {
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-width: 85%;
    }
    .chat-message.user { align-items: flex-end; align-self: flex-end; }
    .chat-message.agent { align-items: flex-start; align-self: flex-start; }

    .message-bubble {
      border-radius: 16px;
      font-size: 0.9rem;
      line-height: 1.5;
      padding: 10px 14px;
    }
    .user .message-bubble {
      background: linear-gradient(135deg, #ffcf8b, #f5b942);
      border-bottom-right-radius: 4px;
      color: #1d1f1f;
      font-weight: 500;
    }
    .agent .message-bubble {
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.08);
      border-bottom-left-radius: 4px;
      color: #f6efe3;
    }

    .message-bubble.thinking {
      display: flex;
      gap: 6px;
      padding: 12px 16px;
    }
    .dot {
      animation: bounce 1.2s infinite;
      background: #a9c0c7;
      border-radius: 50%;
      display: inline-block;
      height: 7px;
      width: 7px;
    }
    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce {
      0%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-6px); }
    }

    .message-time { color: #4a5c63; font-size: 0.72rem; padding: 0 4px; }

    /* ---- Input ---- */
    .chat-input-area {
      align-items: center;
      background: rgba(255,255,255,0.03);
      border-top: 1px solid rgba(255,255,255,0.08);
      display: flex;
      gap: 10px;
      padding: 14px 16px;
    }
    .chat-input {
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 12px;
      color: #f6efe3;
      flex: 1;
      font-size: 0.9rem;
      outline: none;
      padding: 10px 14px;
      transition: border-color 0.2s;
    }
    .chat-input::placeholder { color: #4a5c63; }
    .chat-input:focus { border-color: rgba(255,207,139,0.4); }
    .chat-input:disabled { opacity: 0.4; }
    .chat-send-btn {
      align-items: center;
      background: linear-gradient(135deg, #ffcf8b, #f5b942);
      border: none;
      border-radius: 10px;
      color: #1d1f1f;
      cursor: pointer;
      display: flex;
      flex-shrink: 0;
      height: 40px;
      justify-content: center;
      transition: opacity 0.2s, transform 0.15s;
      width: 40px;
    }
    .chat-send-btn:disabled { cursor: not-allowed; opacity: 0.35; }
    .chat-send-btn:not(:disabled):hover { transform: scale(1.08); }
    .chat-send-btn svg { height: 18px; width: 18px; }

    /* ---- HITL ---- */
    .hitl-overlay {
      align-items: flex-end;
      background: rgba(10, 18, 24, 0.85);
      backdrop-filter: blur(6px);
      bottom: 0;
      display: flex;
      justify-content: center;
      left: 0;
      padding: 20px;
      position: absolute;
      right: 0;
      top: 0;
    }
    .hitl-card {
      animation: slideUp 0.2s ease;
      background: #152530;
      border: 1px solid rgba(255,207,139,0.3);
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 24px;
      width: 100%;
    }
    .hitl-icon { font-size: 2rem; text-align: center; }
    .hitl-card h3 { color: #f6efe3; font-size: 1rem; margin: 0; text-align: center; }
    .hitl-tool { color: #a9c0c7; font-size: 0.85rem; margin: 0; }
    .hitl-tool code { background: rgba(255,255,255,0.08); border-radius: 4px; color: #ffcf8b; padding: 2px 6px; }
    .hitl-risk { border-radius: 6px; font-size: 0.8rem; font-weight: 600; padding: 4px 10px; text-align: center; }
    .risk-high { background: rgba(239,68,68,0.15); color: #f87171; }
    .risk-low { background: rgba(251,191,36,0.15); color: #fbbf24; }
    .risk-none { background: rgba(74,222,128,0.15); color: #4ade80; }
    .hitl-args {
      background: rgba(0,0,0,0.3);
      border-radius: 8px;
      color: #a9c0c7;
      font-size: 0.75rem;
      margin: 0;
      max-height: 80px;
      overflow: auto;
      padding: 8px;
    }
    .hitl-actions { display: flex; gap: 10px; }
    .hitl-deny {
      background: rgba(239,68,68,0.15);
      border: 1px solid rgba(239,68,68,0.3);
      border-radius: 10px;
      color: #f87171;
      cursor: pointer;
      flex: 1;
      font-weight: 600;
      padding: 10px;
      transition: background 0.2s;
    }
    .hitl-deny:hover { background: rgba(239,68,68,0.25); }
    .hitl-approve {
      background: linear-gradient(135deg, #ffcf8b, #f5b942);
      border: none;
      border-radius: 10px;
      color: #1d1f1f;
      cursor: pointer;
      flex: 1;
      font-weight: 700;
      padding: 10px;
      transition: opacity 0.2s;
    }
    .hitl-approve:hover { opacity: 0.9; }
  `],
})
export class MarketplaceChatWidgetComponent implements OnInit, OnDestroy {
  @Input() agentName = 'Assistant Marketplace';

  private readonly owllayer = injectOwlLayer();
  private readonly cdr = inject(ChangeDetectorRef);

  isOpen = false;
  isClosing = false;
  inputText = '';
  messages: ChatMessage[] = [];
  agentState: ClientState = 'disconnected';
  pendingApproval: ApprovalRequest | null = null;

  private approvalResolver: ((approved: boolean) => void) | null = null;
  private unsubscribers: VoidFunction[] = [];
  private msgIdCounter = 0;

  get connected(): boolean {
    return this.owllayer.isConnected();
  }

  get statusLabel(): string {
    switch (this.agentState) {
      case 'connected': return 'Prêt';
      case 'listening': return 'En écoute';
      case 'thinking': return 'Réfléchit...';
      case 'speaking': return 'Répond...';
      case 'error': return 'Erreur';
      case 'connecting': return 'Connexion...';
      default: return 'Hors ligne';
    }
  }

  get statusClass(): string {
    if (this.agentState === 'error') return 'status-error';
    if (this.agentState === 'disconnected') return 'status-offline';
    return '';
  }

  ngOnInit(): void {
    // Sync agentState from service signal
    this.agentState = this.owllayer.state() as ClientState;

    // Subscribe to state changes via raw client
    const unsubState = this.owllayer.client.on({
      onStateChange: (state) => {
        this.agentState = state;
        this.cdr.detectChanges();
      },
      onAgentResponse: (text: string, done: boolean) => {
        if (done) {
          // Full response received — update or add agent message
          const last = this.messages[this.messages.length - 1];
          if (last?.role === 'agent') {
            last.content = text;
          } else {
            this.messages = [...this.messages, {
              id: String(++this.msgIdCounter),
              role: 'agent',
              content: text,
              timestamp: Date.now(),
            }];
          }
          this.agentState = 'connected';
          this.cdr.detectChanges();
          this.scrollToBottom();
        } else {
          // Streaming — update last agent bubble or create new one
          const last = this.messages[this.messages.length - 1];
          if (last?.role === 'agent') {
            last.content = text;
          } else {
            this.messages = [...this.messages, {
              id: String(++this.msgIdCounter),
              role: 'agent',
              content: text,
              timestamp: Date.now(),
            }];
          }
          this.cdr.detectChanges();
          this.scrollToBottom();
        }
      },
      onApprovalRequest: (request: any, resolve: (approved: boolean) => void) => {
        this.pendingApproval = {
          toolName: request.toolName,
          args: request.args ?? {},
          risk: request.risk,
        };
        this.approvalResolver = resolve;
        this.cdr.detectChanges();
      },
    });

    if (typeof unsubState === 'function') {
      this.unsubscribers.push(unsubState);
    }
  }

  ngOnDestroy(): void {
    this.unsubscribers.forEach(fn => fn());
  }

  open(): void {
    this.isOpen = true;
    this.isClosing = false;
  }

  close(): void {
    this.isClosing = true;
    setTimeout(() => {
      this.isOpen = false;
      this.isClosing = false;
      this.cdr.detectChanges();
    }, 200);
  }

  sendMessage(): void {
    const text = this.inputText.trim();
    if (!text || !this.connected) return;

    this.messages = [...this.messages, {
      id: String(++this.msgIdCounter),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }];
    this.inputText = '';
    this.agentState = 'thinking';
    this.cdr.detectChanges();
    this.scrollToBottom();

    this.owllayer.sendText(text);
  }

  approveApproval(): void {
    if (this.approvalResolver) {
      this.approvalResolver(true);
      this.approvalResolver = null;
    }
    this.pendingApproval = null;
  }

  denyApproval(): void {
    if (this.approvalResolver) {
      this.approvalResolver(false);
      this.approvalResolver = null;
    }
    this.pendingApproval = null;
  }

  trackById(_: number, msg: ChatMessage): string {
    return msg.id;
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const container = document.querySelector('.chat-messages');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 50);
  }
}
