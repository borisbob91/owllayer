---
mode: agent
description: >
  Sprint 15 - Reconstruction complète du widget chat Angular pour atteindre la parité 
  avec React : 6 composants (AudioOrb, ChatInput, FloatingButton, MessageList, WidgetInner, DomOSWidget)
  avec support full voice/text, streaming, UI riche.
tools:
  - read_file
  - replace_string_in_file
  - create_file
  - run_in_terminal
  - get_errors
---

# Sprint 15 — Angular Widget Chat Riche

**Base :** Sprint 14 livré (helpers options validés)  
**Périmètre :** `domos/packages/angular/src/lib/components/widget/` uniquement — reconstruction de 5 nouveaux composants + 1 existant remaniée  
**Référence :** React widget comme source de vérité (6 fichiers, composants découpés, streaming, voice, UI élégante)

---

## Problème — Widget Angular "vide"

### AVANT

Fichier : `packages/angular/src/lib/components/widget/DomOSWidgetComponent.ts`

Le widget Angular actuel :
- ❌ 1 seul fichier monolithique
- ❌ Pas de composants découpés (AudioOrb, ChatInput, FloatingButton, MessageList, WidgetInner)
- ❌ UI basique, pas d'intégration voice
- ❌ Pas de streaming message
- ❌ Pas de floating button avec animation
- ❌ DevPanel voit le widget mais visuellement "cassé" ou vide

### POURQUOI c'est un défaut

- **Parité SDK** : React/Vue/Svelte ont des widgets riches, Angular reste basique.
- **UX utilisateur** : Sans FloatingButton, ChatInput, MessageList stylisés, le widget n'est pas utilisable.
- **Voice support** : AudioOrb (React) visualise l'agent en train de parler ; Angular n'a rien.
- **Composabilité** : Les composants découplés permettent la personnalisation par l'app (ex: ChatInput custom).

---

## Architecture cible (basée sur React)

### Hiérarchie des composants

```
DomOSWidget (wrapper, standalone)
├── FloatingButton (icône, animations, toggle widget)
├── WidgetInner (modal/dropdown, state manager)
│   ├── MessageList (messages scrollables, streaming)
│   ├── ChatInput (textarea + submit, voice button)
│   └── AudioOrb (visualisation voice actif)
└── Contexte : DomOS injection, Voice mode, Audio state
```

### React Source (patterns à adapter en Angular)

**React files** :
- `AudioOrb.tsx` — Animated orb quand agent parle ; idle/thinking states
- `ChatInput.tsx` — Textarea + voice toggle + send button
- `FloatingButton.tsx` — Floating button styled, toggle WidgetInner
- `MessageList.tsx` — Messages avec streaming support
- `WidgetInner.tsx` — Container modal, layout
- `DomOSWidget.tsx` — Wrapper standalone, injecte contexte

---

## Fichiers à créer/modifier

| Fichier | Nature |
|---|---|
| `packages/angular/src/lib/components/widget/DomOSWidget.component.ts` | Standalone component wrapper |
| `packages/angular/src/lib/components/widget/WidgetInner.component.ts` | Container (modal/dropdown) — **NOUVEAU** |
| `packages/angular/src/lib/components/widget/FloatingButton.component.ts` | Floating button with toggle — **NOUVEAU** |
| `packages/angular/src/lib/components/widget/MessageList.component.ts` | Messages + streaming — **NOUVEAU** |
| `packages/angular/src/lib/components/widget/ChatInput.component.ts` | Input + voice toggle — **NOUVEAU** |
| `packages/angular/src/lib/components/widget/AudioOrb.component.ts` | Voice visualization — **NOUVEAU** |
| `packages/angular/src/lib/components/widget/widget.styles.css` | Styles partagés — **NOUVEAU** |
| `packages/angular/src/lib/components/widget/widget.types.ts` | Types internes — **NOUVEAU** |
| `packages/angular/src/public-api.ts` | Export `DomOSWidgetComponent` (unchanged) |

---

## Plan de correction

### 1️⃣ Créer `widget.types.ts` — Types internes du widget

```typescript
export interface WidgetMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

export interface WidgetState {
  isOpen: boolean;
  isVoiceMode: boolean;
  isThinking: boolean;
  isSpeaking: boolean;
  messages: WidgetMessage[];
  currentInput: string;
}
```

---

### 2️⃣ Créer `widget.styles.css` — Styles partagés

Base Tailwind pour tous les composants : couleurs, layouts, animations, hover states.

---

### 3️⃣ Créer `AudioOrb.component.ts` — Visualisation Voice

Affiche un orb animé quand l'agent parle (isSpeaking) :
- État idle : orb gris, pulsation lente
- État thinking : orb bleu, animation rapide
- État speaking : orb vert/cyan, onde sonore animée
- Basé sur signal Angular de `DomOSAngularService.isSpeaking` (ou custom)

```typescript
@Component({
  selector: 'domos-audio-orb',
  template: `
    <div class="audio-orb" [class.speaking]="isSpeaking()">
      <div class="orb-inner"></div>
      <div class="sound-wave" *ngIf="isSpeaking()"></div>
    </div>
  `,
  styles: [`...`]
})
export class AudioOrbComponent {
  isSpeaking = input.required<boolean>();
}
```

---

### 4️⃣ Créer `ChatInput.component.ts` — Input + Voice Toggle

Textarea multiline + bouton submit + bouton voice toggle :
- Textarea avec auto-grow
- Enter pour envoyer (Shift+Enter = newline)
- Bouton microphone pour toggle voice mode
- Bouton send désactivé si vide

```typescript
@Component({
  selector: 'domos-chat-input',
  template: `
    <form (ngSubmit)="onSend()">
      <textarea 
        [(ngModel)]="inputValue"
        (keydown.enter)="!$event.shiftKey && onSend()"
        placeholder="Posez une question..."
      ></textarea>
      <button type="button" (click)="toggleVoice()" [class.active]="isVoiceMode()">
        🎤
      </button>
      <button type="submit" [disabled]="!inputValue.trim()">Envoyer</button>
    </form>
  `,
  styles: [`...`]
})
export class ChatInputComponent {
  inputValue = '';
  isVoiceMode = input.required<boolean>();
  onSend = output<string>();
  onVoiceToggle = output<void>();
}
```

---

### 5️⃣ Créer `MessageList.component.ts` — Messages avec Streaming

Affiche les messages user/assistant avec support streaming :
- Message avec `isStreaming` animate le contenu
- Auto-scroll au dernier message
- User messages à droite (bubble bleu), assistant à gauche (bubble gris)
- Timestamp optionnel

```typescript
@Component({
  selector: 'domos-message-list',
  template: `
    <div class="message-list" #scrollContainer>
      <div *ngFor="let msg of messages()" class="message" [class]="msg.role">
        <div class="message-content">
          {{ msg.content }}
          <span *ngIf="msg.isStreaming" class="streaming-cursor">▋</span>
        </div>
        <span class="message-time">{{ msg.timestamp | date:'short' }}</span>
      </div>
    </div>
  `,
  styles: [`...`]
})
export class MessageListComponent implements AfterViewInit {
  messages = input.required<WidgetMessage[]>();
  
  ngAfterViewInit() {
    // Auto-scroll to bottom
  }
}
```

---

### 6️⃣ Créer `WidgetInner.component.ts` — Container Modal

Container principal du widget (modal ou dropdown inline) :
- MessageList + ChatInput en colonne
- Événements input + voice toggle
- État synchronisé avec DomOSAngularService

```typescript
@Component({
  selector: 'domos-widget-inner',
  template: `
    <div class="widget-inner">
      <domos-message-list [messages]="messages()"></domos-message-list>
      <domos-audio-orb [isSpeaking]="isSpeaking()"></domos-audio-orb>
      <domos-chat-input 
        [isVoiceMode]="isVoiceMode()"
        (onSend)="onSendMessage($event)"
        (onVoiceToggle)="toggleVoice()"
      ></domos-chat-input>
    </div>
  `,
  styles: [`...`]
})
export class WidgetInnerComponent {
  domos = inject(DomOSAngularService);
  messages = signal<WidgetMessage[]>([]);
  isVoiceMode = signal(false);
  isSpeaking = computed(() => this.domos.isSpeaking?.() ?? false);
  
  onSendMessage(text: string) {
    this.domos.sendText(text);
  }
  
  toggleVoice() {
    this.isVoiceMode.update(v => !v);
  }
}
```

---

### 7️⃣ Créer `FloatingButton.component.ts` — Floating Button avec Toggle

Bouton flottant en bas-droite avec animation :
- Toggle WidgetInner open/close
- Icône + badge (unread count)
- Animation d'apparition

```typescript
@Component({
  selector: 'domos-floating-button',
  template: `
    <button class="floating-button" (click)="toggle()">
      <span class="icon">💬</span>
      <span *ngIf="unreadCount() > 0" class="badge">{{ unreadCount() }}</span>
    </button>
  `,
  styles: [`...`]
})
export class FloatingButtonComponent {
  isOpen = input.required<boolean>();
  unreadCount = input(0);
  onToggle = output<void>();
  
  toggle() {
    this.onToggle.emit();
  }
}
```

---

### 8️⃣ Remplacer `DomOSWidget.component.ts` — Wrapper Standalone

Compose tous les composants, gère l'état global, standalone :

```typescript
@Component({
  selector: 'domos-widget',
  standalone: true,
  imports: [
    CommonModule,
    FloatingButtonComponent,
    WidgetInnerComponent,
  ],
  template: `
    <domos-floating-button 
      [isOpen]="isWidgetOpen()"
      [unreadCount]="unreadMessages()"
      (onToggle)="toggleWidget()"
    ></domos-floating-button>
    
    <div class="widget-modal" *ngIf="isWidgetOpen()">
      <domos-widget-inner></domos-widget-inner>
    </div>
  `,
  styles: [`
    .widget-modal {
      position: fixed;
      bottom: 80px;
      right: 20px;
      width: 400px;
      height: 600px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      background: white;
      z-index: 1000;
      animation: slideUp 0.3s ease-out;
    }
    
    @keyframes slideUp {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  `]
})
export class DomOSWidgetComponent {
  domos = inject(DomOSAngularService);
  isWidgetOpen = signal(false);
  unreadMessages = signal(0);
  
  toggleWidget() {
    this.isWidgetOpen.update(v => !v);
  }
}
```

---

## Périmètre strict

### Ce que Sprint 15 fait

- Crée 6 composants Angular standalone (AudioOrb, ChatInput, FloatingButton, MessageList, WidgetInner, DomOSWidget)
- Refont `DomOSWidgetComponent.ts` pour composer les 5 nouveaux
- Ajoute styles CSS partagés (Tailwind)
- Ajoute types internes (`widget.types.ts`)
- Intègre `DomOSAngularService` (voice state, send text, audio output)
- Exporte `DomOSWidgetComponent` depuis `public-api.ts` (déjà fait)

### Ce que Sprint 15 ne fait pas

- Ne touche pas `packages/core/**`
- Ne touche pas `packages/react/**`, Vue, Svelte
- Ne modifie pas les helpers (registerViewStateTool, registerNavigationTool)
- Ne crée pas d'app de démo nouvelle
- N'ajoute pas de tests (test suite come après)
- N'optimise pas les performances (lazy load etc.) — juste fonctionnel d'abord

---

## Gate de validation

- [ ] `pnpm --filter @domos/angular build` exit code 0
- [ ] Les 6 composants standalone compilent sans erreur
- [ ] `DomOSWidgetComponent` est importable depuis `@domos/angular`
- [ ] Widget s'affiche dans le DOM (FloatingButton visible)
- [ ] Clic sur FloatingButton toggle WidgetInner (open/close animation)
- [ ] ChatInput text → `domos.sendText()` appelé
- [ ] Messages s'ajoutent à MessageList après `domos.sendText()`
- [ ] AudioOrb pulse quand `domos.isSpeaking` = true
- [ ] Voice toggle button change state visuellement
- [ ] Aucune modification hors `packages/angular/src/lib/components/widget/`
- [ ] DevPanel toujours fonctionnel (0 régression)

---

## Notes d'implémentation

### Angular Signals vs React Hooks

- **React** : `useState(messages)` → **Angular** : `signal<WidgetMessage[]>([])`
- **React** : `useEffect` (auto-scroll) → **Angular** : `@ViewChild` + `AfterViewInit`
- **React** : `useContext(DomOS)` → **Angular** : `inject(DomOSAngularService)`
- **React** : props/callbacks → **Angular** : `input()` / `output()`

### Streaming support

Quand `domos.sendText(text)` → agent stream response :
1. Add message { role: 'user', content: text }
2. On `agent.response.chunk` → Update last assistant message with `isStreaming: true`
3. On `agent.response.end` → Set `isStreaming: false`

### Voice mode

L'état voice vient de `DomOSAngularService` (futur : useVoiceMode hook Angular).
- Toggle button change `isVoiceMode` signal
- Si true : ChatInput affiche "Écoute..." + envoie chunks audio au lieu de texte
- AudioOrb visualise `isSpeaking` (agent output) indépendamment de l'input mode

---

## Dépendances de suite

**Après Sprint 15 :**
- Sprint 16 — Ajouter tests unitaires pour les 6 composants
- Sprint 17 — Voice intégration complète (micro input, audio streaming)
- Sprint 18 — Personnalisation (props de couleur, theme, callback custom)
