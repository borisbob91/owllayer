import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WIDGET_STYLES } from './widget.styles.js';

@Component({
  selector: 'owllayer-chat-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chat-input-container">
      <textarea
        [ngModel]="inputValue()"
        (ngModelChange)="inputValue.set($event)"
        (keydown.enter)="handleEnter($event)"
        [placeholder]="placeholder"
        rows="1"
      ></textarea>

      <button
        type="button"
        class="icon-button"
        (click)="onVoiceToggle.emit()"
        [class.active]="isVoiceMode"
        title="Toggle Voice Mode"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      </button>

      <button
        type="button"
        class="icon-button send-button"
        (click)="send()"
        [disabled]="!inputValue().trim()"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13"/>
          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      </button>
    </div>
  `,
  styles: [WIDGET_STYLES]
})
export class ChatInputComponent {
  @Input() isVoiceMode!: boolean;
  @Input() placeholder: string = 'Posez une question...';

  @Output() onSend = new EventEmitter<string>();
  @Output() onVoiceToggle = new EventEmitter<void>();

  inputValue = signal('');

  handleEnter(event: KeyboardEvent) {
    if (!event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  send() {
    const text = this.inputValue().trim();
    if (text) {
      this.onSend.emit(text);
      this.inputValue.set('');
    }
  }
}
