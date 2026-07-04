import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'domos-audio-orb',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="orb-wrap" [ngClass]="visualState">
      <div class="orb"></div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
    }

    .orb-wrap {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 140px;
      height: 140px;
    }

    .orb {
      width: 90px;
      height: 90px;
      border-radius: 50%;
      transition: background 1s ease, box-shadow 0.8s ease;
    }

    /* ---- IDLE ---- */
    .orb-wrap.idle .orb {
      background: radial-gradient(circle at 38% 34%,
        #e0e7ff, #c7d2fe, #a5b4fc);
      box-shadow:
        0 6px 18px rgba(165, 180, 252, 0.35),
        inset 0 2px 0 rgba(255,255,255,0.6);
      animation: idleBreathe 5s ease-in-out infinite;
    }

    @keyframes idleBreathe {
      0%, 100% { box-shadow: 0 6px 18px rgba(165,180,252,0.30), inset 0 2px 0 rgba(255,255,255,.6); transform: scale(1); }
      50%       { box-shadow: 0 8px 26px rgba(165,180,252,0.45), inset 0 2px 0 rgba(255,255,255,.6); transform: scale(1.03); }
    }

    /* ---- LISTENING ---- */
    .orb-wrap.listening .orb {
      background: radial-gradient(circle at 38% 34%,
        #93c5fd, #3b82f6, #1d4ed8);
      box-shadow:
        0 0 0 0px rgba(59,130,246,0),
        inset 0 2px 0 rgba(255,255,255,0.5);
      animation: listenGlow 2.4s ease-in-out infinite;
    }

    @keyframes listenGlow {
      0%, 100% {
        box-shadow: 0 6px 20px rgba(59,130,246,0.30), 0 0 0 6px rgba(99,102,241,0.08), inset 0 2px 0 rgba(255,255,255,.5);
        transform: scale(1);
      }
      50% {
        box-shadow: 0 10px 36px rgba(59,130,246,0.45), 0 0 0 14px rgba(99,102,241,0.12), inset 0 2px 0 rgba(255,255,255,.5);
        transform: scale(1.04);
      }
    }

    /* ---- THINKING ---- */
    .orb-wrap.thinking .orb {
      background: radial-gradient(circle at 38% 34%,
        #c4b5fd, #7c3aed, #4c1d95);
      animation: thinkGlow 2s ease-in-out infinite;
    }

    @keyframes thinkGlow {
      0%, 100% {
        box-shadow: 0 6px 22px rgba(124,58,237,0.32), 0 0 0 6px rgba(139,92,246,0.08), inset 0 2px 0 rgba(255,255,255,.45);
        transform: scale(1);
      }
      50% {
        box-shadow: 0 10px 40px rgba(124,58,237,0.50), 0 0 0 16px rgba(139,92,246,0.13), inset 0 2px 0 rgba(255,255,255,.45);
        transform: scale(1.05);
      }
    }

    /* ---- SPEAKING ---- */
    .orb-wrap.speaking .orb {
      background: radial-gradient(circle at 38% 34%,
        #6ee7b7, #10b981, #065f46);
      animation: speakGlow 0.75s ease-in-out infinite;
    }

    @keyframes speakGlow {
      0%, 100% {
        box-shadow: 0 6px 22px rgba(16,185,129,0.32), 0 0 0 6px rgba(52,211,153,0.10), inset 0 2px 0 rgba(255,255,255,.5);
        transform: scale(1);
      }
      50% {
        box-shadow: 0 10px 38px rgba(16,185,129,0.52), 0 0 0 18px rgba(52,211,153,0.15), inset 0 2px 0 rgba(255,255,255,.5);
        transform: scale(1.07);
      }
    }
  `]
})
export class AudioOrbComponent {
  @Input() visualState: 'idle' | 'listening' | 'thinking' | 'speaking' = 'idle';
}
