import {
  Component,
  Input,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { WidgetMessage } from './widget.types.js';
import { WIDGET_STYLES } from './widget.styles.js';

@Component({
  selector: 'domos-message-list',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="message-list" #scrollContainer>
      @if (messages.length === 0) {
        <div class="message-empty">
          <svg viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <p>Posez une question pour commencer</p>
        </div>
      }
      @for (msg of messages; track msg.id) {
        <div class="message" [class.user]="msg.role === 'user'" [class.assistant]="msg.role === 'assistant' || msg.role === 'agent'">
          <div class="message-content">
            {{ msg.content }}
            @if (msg.isStreaming) {
              <span class="streaming-cursor"></span>
            }
          </div>
          <span class="message-time">{{ msg.timestamp | date:'HH:mm' }}</span>
        </div>
      }
    </div>
  `,
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`, WIDGET_STYLES]
})
export class MessageListComponent implements AfterViewChecked {
  @Input() messages!: WidgetMessage[];

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch (err) {
      // Ignore
    }
  }
}
