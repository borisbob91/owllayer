DomOS — Addendum UI Component System — Futur4Tech





**DomOS**

*DOM Operating System*



**ADDENDUM**

**DomOS UI Component System**

**Composants Natifs · Mode Clé en Main · Mode Headless**

*React · Vue · Svelte · Flutter · @domos/browser*

*"Personnalise l'UI. Jamais la communication."*

Version 1.0  —  Mars 2026


|**Projet**|DomOS UI Component System|
| :- | :- |
|**Type de document**|Addendum — Composants natifs & Headless UI|
|**Complément de**|CdC Technique général (Doc 2) + CdC @domos/browser (Doc 6)|
|**Organisation**|Futur4Tech|
|**Responsable**|Kouakou Boris (CEO)|
|**Date**|Mars 2026|
|**Package**|@domos/ui (partagé) + intégrations framework|
|**Statut**|En conception — composants intégrés au SDK v1.0|


# **Table des matières**





# **1. Vision et principe fondateur**
## **1.1 Le problème actuel**
Aujourd'hui, chaque développeur qui intègre DomOS doit implémenter lui-même les composants UI de l'expérience agent : les bulles de conversation, les indicateurs d'état, la capture audio, les modaux HITL, les notifications. Le WIDGET.md fournit un widget clé en main, mais dès qu'un développeur veut personnaliser l'interface, il repart de zéro — sans brique de base réutilisable, sans composants prêts à l'emploi.

Cette situation crée trois problèmes concrets :

- Réimplémentation répétée — chaque projet DomOS réinvente les mêmes composants (bulles de chat, gestion micro, états visuels de l'agent).
- Inconsistance — l'expérience agent varie d'une application DomOS à l'autre selon les compétences UI du développeur.
- Friction inutile — un développeur backend qui intègre DomOS doit devenir expert en UI audio et chat pour livrer une expérience correcte.
## **1.2 La solution — DomOS UI Component System**
Le DomOS UI Component System est une bibliothèque de composants natifs qui couvre l'intégralité de l'expérience agent — du widget flottant jusqu'à la gestion audio PCM, des bulles de conversation jusqu'aux modaux HITL. Le développeur choisit son niveau d'implication :

**Mode Clé en Main :** Le développeur utilise les composants DomOS tels quels — style par défaut, comportement complet. Zéro configuration UI requise. C'est le mode actuel du DomOSWidget, étendu à tous les composants.

**Mode Headless :** Le développeur importe uniquement la logique (hooks, stores, actions) sans aucun rendu visuel. Il construit son propre UI avec ses composants, son design system, ses animations. La couche communication DomOS reste intacte et non-remplaçable.

**Mode Hybride :** Le développeur remplace certains composants par les siens (ex: ses propres bulles de message) tout en gardant d'autres tels quels (ex: le modal HITL Shadow DOM). Chaque composant est indépendamment remplaçable.

## **1.3 La règle absolue — La communication est non-remplaçable**
Le DomOS UI Component System repose sur un principe architectural fondamental et non négociable :

**"Le développeur personnalise l'UI. Jamais la communication."**

Concrètement, cela signifie :

- Le protocole ADTP, le WebSocket, le tool registry, la validation Zod, la HITLPolicy — tout cela est encapsulé dans des hooks et stores non-remplaçables.
- Un développeur peut remplacer la bulle de message par son propre composant — mais il se branche obligatoirement sur useAgentMessages() pour obtenir les messages. Il ne peut pas bypasser ce hook.
- Un développeur peut créer son propre bouton micro — mais il appelle DomOS.startVoice() pour démarrer le streaming. Il ne peut pas remplacer la logique de capture PCM.
- Un développeur peut créer son propre modal d'approbation — mais il se branche sur useHITLApproval() et son handler doit appeler approve() ou deny(). Il ne peut pas sauter l'évaluation de risque.

*⚠️  Cette règle protège les utilisateurs finaux — un développeur ne peut pas accidentellement supprimer la sécurité HITL en remplaçant un composant. La logique de sécurité est toujours active, quelle que soit l'UI choisie.*
## **1.4 Architecture en deux couches**

|**Couche**|**Contenu**|**Remplaçable ?**|**Package**|
| :- | :- | :- | :- |
|Couche logique (non-remplaçable)|Connexion WebSocket ADTP, tool registry, session, HITL evaluation, audio PCM capture, DomosAgent memory binding|Non — jamais|@domos/core + SDKs|
|Couche UI (remplaçable)|Composants visuels — bulles, widget, modaux, notifications, états, audio visualizer, barre progression|Oui — partiellement ou totalement|@domos/ui|


# **2. Inventaire des composants natifs**
## **2.1 Vue d'ensemble — 9 groupes de composants**

|**Groupe**|**Composants inclus**|**Mode clé en main**|**Mode headless**|
| :- | :- | :- | :- |
|Chat Widget|DomOSWidget, WidgetButton, WidgetPanel|✅ Widget complet flottant|useWidget() — état ouvert/fermé, position, badge|
|Conversation|MessageList, MessageBubble, TypingIndicator, ConversationEmpty|✅ Bulles + scroll auto|useConversation() — messages, états|
|Audio|AudioVisualizer, MicButton, AudioWaveform, VoiceStatusBadge|✅ Micro + animation|useVoiceMode() — capture, streaming, état|
|Agent States|AgentStatusBadge, AgentThinkingDots, AgentSpeakingBars, AgentErrorState|✅ Indicateurs animés|useAgentState() — état courant de l'agent|
|HITL|ApprovalModal, ApprovalForm, CriticalWarning, DenyButton, ApproveButton|✅ Shadow DOM isolé|useHITLApproval() — pending, approve, deny|
|Notifications|ToastNotification, ToastContainer, InlineAlert|✅ Toasts positionnés|useNotifications() — queue, dismiss|
|Mode Selector|ModeToggle, TextModeIcon, VoiceModeIcon|✅ Bouton bascule|useMode() — mode courant, toggle|
|Plan Progress|PlanProgressBar, PlanStepList, PlanStepItem, PlanStatusBadge|✅ Barre + liste étapes|usePlan() — plan, currentStep, progress|
|Memory UI|MemoryPanel, MemoryEntryList, MemoryEntryItem, MemoryResetButton, MemoryExportButton|✅ Interface mémoire complète|useAgentMemory() — entries, update, delete, export|


# **3. Composants — Détail par groupe**
## **3.1 Groupe Chat Widget**
Le Chat Widget est le composant racine de l'expérience DomOS. Il encapsule le bouton flottant et le panneau de conversation dans un Shadow DOM isolé. Il orchestrate tous les autres groupes de composants.

|**Composant**|**Rôle**|**Props principales**|
| :- | :- | :- |
|DomOSWidget|Composant racine — encapsule tout dans Shadow DOM. Autonome, injectable n'importe où dans le DOM.|apiKey, endpoint, config (WidgetConfig), onReady, onError|
|WidgetButton|Bouton flottant pill avec badge, titre, icône et animation d'entrée.|agentName, agentTitle, badgeText, position, accentColor, isOpen, onClick|
|WidgetPanel|Panneau de conversation — contient tous les sous-composants (MessageList, AudioVisualizer, ModeToggle, input).|isOpen, mode, agentName, onClose, children (mode headless)|

### **Hook headless — useWidget()**
const {

`  `isOpen,          // boolean — panneau ouvert ou fermé

`  `toggle,          // () => void — ouvrir/fermer le panneau

`  `open,            // () => void

`  `close,           // () => void

`  `badgeCount,      // number — nb de messages non lus

`  `clearBadge,      // () => void

`  `position,        // 'bottom-right' | 'bottom-left'

} = useWidget();

## **3.2 Groupe Conversation**
Le groupe Conversation gère l'affichage de l'historique des échanges entre l'utilisateur et l'agent. Il inclut les bulles de message, l'indicateur de frappe, le scroll automatique et l'état vide (première ouverture).

|**Composant**|**Rôle**|**Props / Comportement**|
| :- | :- | :- |
|MessageList|Conteneur de la liste des messages avec auto-scroll vers le bas à chaque nouveau message et smooth scroll configurable.|messages[], autoScroll, scrollBehavior, emptyState, className|
|MessageBubble|Bulle de message individuelle avec rôle (user ou agent), timestamp, état (sending, sent, error), support du markdown et des liens.|message (id, role, text, timestamp, status), showTimestamp, onRetry|
|TypingIndicator|Animation 3 dots indiquant que l'agent est en train de générer sa réponse (affiché pendant isThinking).|isVisible, dotColor, animationSpeed|
|ConversationEmpty|Écran d'accueil affiché quand aucun message n'existe — personnalisable avec titre, sous-titre et suggestions de démarrage.|agentName, welcomeTitle, welcomeSubtitle, suggestions (string[]), onSuggestionClick|

### **Hook headless — useConversation()**
const {

`  `messages,        // Message[] — historique complet

`  `sendText,        // (text: string) => void

`  `clearHistory,    // () => void

`  `isThinking,      // boolean — agent en train de générer

`  `lastMessage,     // Message | null — dernier message reçu

`  `messageCount,    // number

} = useConversation();

### **Structure d'un Message**
interface Message {

`  `id: string;

`  `role: 'user' | 'agent' | 'system';

`  `text: string;

`  `timestamp: number;

`  `status: 'sending' | 'sent' | 'error';

`  `audioUrl?: string;      // Si réponse vocale de l'agent

`  `toolCalls?: ToolCallRecord[];  // Tool calls associés à ce message

}

## **3.3 Groupe Audio**
Le groupe Audio gère l'intégralité de l'expérience vocale — de la capture micro à la visualisation en temps réel du signal audio, en passant par le streaming PCM vers le serveur DomOS. C'est le groupe le plus complexe techniquement et celui qui bénéficie le plus d'être fourni nativement.

|**Composant**|**Rôle**|**Comportement**|
| :- | :- | :- |
|MicButton|Bouton de capture micro avec états visuels intégrés (idle, listening, processing, error). Gère la demande de permission et le fallback.|isListening, isDisabled, onToggle, accentColor, size|
|AudioVisualizer|Visualisation en temps réel du signal audio entrant (microphone utilisateur) sous forme de barres animées ou de waveform.|audioData (Float32Array), barCount, color, style ('bars'|'waveform'|'dots')|
|AudioWaveform|Visualisation de la réponse audio de l'agent pendant la lecture — barres de hauteur variable animées selon l'amplitude.|isPlaying, amplitude, barCount, color|
|VoiceStatusBadge|Badge textuel indiquant l'état vocal courant : EN ECOUTE, REFLEXION, PARLE, PRET, HORS LIGNE.|status (AgentVoiceState), labels (i18n), color|

### **Hook headless — useVoiceMode()**
const {

`  `isVoiceActive,      // boolean — mode vocal activé

`  `isListening,        // boolean — micro actif et capture en cours

`  `isSpeaking,         // boolean — agent en train de parler

`  `audioLevel,         // number (0-1) — niveau audio temps réel

`  `audioData,          // Float32Array — données PCM brutes pour visualisation

`  `startVoice,         // () => Promise<void> — demande permission + démarre

`  `stopVoice,          // () => void — arrête capture

`  `toggleVoice,        // () => void — bascule

`  `micPermission,      // 'granted'|'denied'|'prompt'|'unknown'

`  `error,              // string | null — erreur micro

} = useVoiceMode();

### **Pipeline audio interne (non-remplaçable)**
La logique de capture et de streaming audio est encapsulée dans le hook useVoiceMode() et ne peut pas être remplacée. Elle gère :

- Demande de permission microphone (navigator.mediaDevices.getUserMedia).
- Capture PCM 16kHz via WebAudio API (AudioContext + ScriptProcessorNode ou AudioWorklet).
- Encodage et chunking des données audio (chunks de 4096 samples ~256ms).
- Streaming en temps réel via ADTP USER\_INPUT modality: audio vers le serveur DomOS.
- Réception et décodage de la réponse audio de l'agent.
- Lecture de la réponse audio via Web Audio API.

*⚠️  Le développeur peut remplacer les composants visuels (MicButton, AudioVisualizer) mais ne peut pas remplacer le pipeline WebAudio PCM. Les données audioData exposées par useVoiceMode() sont en lecture seule — à usage uniquement pour la visualisation.*

## **3.4 Groupe Agent States**
Le groupe Agent States expose les indicateurs visuels de l'état courant de l'agent. Ces composants sont synchronisés en temps réel avec le protocole ADTP — ils reflètent exactement ce que fait l'agent à chaque instant.

|**État (AgentState)**|**Composant associé**|**Déclencheur ADTP**|**Visuel par défaut**|
| :- | :- | :- | :- |
|idle|AgentStatusBadge (gris)|Connexion active, aucune activité|Indicateur gris statique — « PRÊT »|
|connecting|AgentStatusBadge (orange animé)|Ouverture WebSocket avant HANDSHAKE\_ACK|Spinner orange — « CONNEXION... »|
|listening|AgentThinkingDots (couleur accent, rebondissants)|USER\_INPUT audio reçu, micro actif côté client|3 dots rebondissants — « EN ÉCOUTE »|
|thinking|AgentThinkingDots (couleur accent, pulsants)|USER\_INPUT envoyé, attente LLMResponse|3 dots pulsants — « RÉFLEXION... »|
|speaking|AgentSpeakingBars (barres audio animées)|AGENT\_RESPONSE avec audioData reçu|Barres de hauteur variable — « PARLE »|
|streaming|TypingIndicator (dots défilants)|AGENT\_RESPONSE avec done: false|Dots défilants — réponse texte en cours|
|error|AgentErrorState (rouge)|SYSTEM\_EVENT kind: error|Indicateur rouge — « HORS LIGNE »|

### **Hook headless — useAgentState()**
const {

`  `state,           // AgentState — état courant

`  `isConnected,     // boolean

`  `isThinking,      // boolean

`  `isSpeaking,      // boolean

`  `isListening,     // boolean

`  `isStreaming,      // boolean — réponse texte en cours

`  `error,           // string | null

`  `connectionStatus, // 'connected'|'connecting'|'reconnecting'|'disconnected'

} = useAgentState();

## **3.5 Groupe HITL — Modaux d'approbation**
Le groupe HITL est le groupe le plus sensible du système. Les composants d'approbation sont rendus dans un Shadow DOM fermé pour garantir l'isolation complète. Le développeur peut personnaliser le style du modal, mais la logique d'approbation/refus reste toujours gérée par la HITLPolicy de @domos/core.

|**Composant**|**Niveau de risque**|**Rôle**|**Personnalisable**|
| :- | :- | :- | :- |
|ApprovalModal|high et critical|Conteneur Shadow DOM du modal — encapsule ApprovalForm et CriticalWarning dans un environnement isolé|Style Shadow DOM via CSS variables uniquement|
|ApprovalForm|high et critical|Corps du modal — nom de l'action, description, arguments, boutons Approuver/Refuser|Layout et textes via props, logique non-remplaçable|
|CriticalWarning|critical uniquement|Bandeau rouge renforcé au-dessus du formulaire — avertissement explicite pour les actions irréversibles|Couleur et texte via props|
|ApproveButton|high et critical|Bouton de confirmation — déclenche approve() de la HITLPolicy|Style via className/style — handler non-remplaçable|
|DenyButton|high et critical|Bouton de refus — déclenche deny() de la HITLPolicy|Style via className/style — handler non-remplaçable|

### **Hook headless — useHITLApproval()**
const {

`  `pendingApproval,    // HITLRequest | null — demande en attente

`  `approve,           // () => void — approuve l'action

`  `deny,              // () => void — refuse l'action

`  `riskLevel,         // 'none'|'low'|'high'|'critical'

`  `toolName,          // string — nom du tool en attente

`  `toolArgs,          // Record<string, unknown> — arguments

`  `warningMessage,    // string — message d'avertissement

} = useHITLApproval();

*ℹ️  En mode headless HITL, le développeur DOIT implémenter un modal d'approbation visible et accessible. DomOS vérifie au démarrage que useHITLApproval() est consommé quelque part dans l'arbre de composants — si non, un warning est émis en console.*

Le Shadow DOM du modal natif reste disponible même en mode headless pour les développeurs qui souhaitent uniquement styliser sans re-implémenter. C'est la voie recommandée pour les niveaux critical.

## **3.6 Groupe Notifications**
Le groupe Notifications gère les toasts non-bloquants affichés pour les actions de niveau de risque low. Les notifications sont empilées, auto-dismissées après un délai configurable et accessibles pour les lecteurs d'écran (ARIA live region).

|**Composant**|**Rôle**|**Props principales**|
| :- | :- | :- |
|ToastContainer|Conteneur positionné (coin de l'écran) qui gère la pile de toasts et les animations d'entrée/sortie.|position ('top-right'|'bottom-right'|etc.), maxToasts, gap|
|ToastNotification|Toast individuel avec icône, message, durée configurable et bouton de fermeture manuelle.|message, type ('info'|'success'|'warning'), duration, onDismiss, icon|
|InlineAlert|Alerte inline (dans le flux de la conversation) pour les messages système non critiques.|message, type, dismissible|

### **Hook headless — useNotifications()**
const {

`  `notifications,   // Notification[] — file d'attente

`  `dismiss,         // (id: string) => void

`  `dismissAll,      // () => void

`  `add,             // (notification: NotificationConfig) => void — custom notif

} = useNotifications();

## **3.7 Groupe Mode Selector**
Le Mode Selector permet à l'utilisateur de basculer entre le mode texte et le mode vocal. Il gère les transitions d'état et le fallback automatique si le micro est refusé.

|**Composant**|**Rôle**|**Props principales**|
| :- | :- | :- |
|ModeToggle|Bouton bascule texte ↔ vocal avec animation de transition et indicateur de mode actif.|currentMode, onToggle, textIcon, voiceIcon, disabled, labels|
|TextModeIcon|Icône représentant le mode texte (clavier ou bulle de texte).|size, color, active|
|VoiceModeIcon|Icône représentant le mode vocal (micro ou onde sonore).|size, color, active, isListening (animation pulsante si écoute active)|

### **Hook headless — useMode()**
const {

`  `mode,            // 'text' | 'voice'

`  `setMode,         // (mode: 'text'|'voice') => void

`  `toggleMode,      // () => void

`  `canUseVoice,     // boolean — micro disponible et permission accordée

`  `fallbackActive,  // boolean — true si voice → text fallback déclenché

} = useMode();

## **3.8 Groupe Plan Progress**
Le groupe Plan Progress expose les composants de suivi des plans DomosAgent. Ils permettent d'afficher visuellement la progression d'un workflow multi-étapes en cours d'exécution.

|**Composant**|**Rôle**|**Props principales**|
| :- | :- | :- |
|PlanProgressBar|Barre de progression horizontale indiquant l'avancement global du plan (étapes complètes / total).|current, total, label, color, showPercentage|
|PlanStepList|Liste des étapes du plan avec statut visuel par étape (pending, in\_progress, completed, failed).|steps (PlanStep[]), currentStepIndex, compact|
|PlanStepItem|Item individuel d'étape avec icône de statut, titre et durée si disponible.|step (PlanStep), isCurrent, statusIcons|
|PlanStatusBadge|Badge compact indiquant l'état global du plan (En cours, Terminé, En pause, Échoué).|status (PlanStatus), label, color|

### **Hook headless — usePlan()**
const {

`  `activePlan,        // Plan | null — plan en cours

`  `currentStep,       // PlanStep | null — étape courante

`  `progress,          // number (0-100) — pourcentage

`  `completedSteps,    // number

`  `totalSteps,        // number

`  `status,            // PlanStatus

`  `isPlanActive,      // boolean

`  `onStepComplete,    // EventEmitter — émis à chaque étape complétée

} = usePlan();

## **3.9 Groupe Memory UI**
Le groupe Memory UI expose les composants permettant à l'utilisateur de visualiser, modifier et gérer sa mémoire DomosAgent. Ces composants sont conformes RGPD par design — l'export et la réinitialisation sont disponibles en un clic.

|**Composant**|**Rôle**|**Props principales**|
| :- | :- | :- |
|MemoryPanel|Panneau complet de gestion de la mémoire — contient tous les sous-composants. Peut être affiché dans le Widget ou en standalone.|userId, onClose, readOnly|
|MemoryEntryList|Liste des entrées mémoire groupées par catégorie (préférences, historique, corrections, objectifs).|entries (MemoryEntry[]), groupBy, onDelete, onEdit, filters|
|MemoryEntryItem|Item individuel d'entrée mémoire avec catégorie, contenu, date et actions (modifier, supprimer).|entry (MemoryEntry), onDelete, onEdit, showDate|
|MemoryResetButton|Bouton de réinitialisation complète de la mémoire — déclenche un modal HITL critical avant exécution.|onReset, label, confirmMessage|
|MemoryExportButton|Bouton d'export de toute la mémoire en JSON (conformité RGPD — droit à la portabilité).|onExport, filename, label|

### **Hook headless — useAgentMemory()**
const {

`  `entries,         // MemoryEntry[] — entrées de la mémoire persistante

`  `categories,      // string[] — catégories disponibles

`  `isLoading,       // boolean

`  `updateEntry,     // (id, patch) => Promise<void>

`  `deleteEntry,     // (id) => Promise<void>

`  `resetMemory,     // (category?) => Promise<void>

`  `exportMemory,    // () => Promise<MemoryExport>

`  `searchMemory,    // (query) => Promise<MemoryEntry[]>

} = useAgentMemory();


# **4. Modes d'utilisation — Exemples par framework**
## **4.1 Mode Clé en Main — React**
Le développeur utilise le DomOSWidget complet — zéro configuration UI requise :

import { DomOSProvider, DomOSWidget } from '@domos/react';

function App() {

`  `return (

`    `<DomOSProvider apiKey="pk\_live\_xxx" endpoint="wss://...">

`      `<MonApplication />

`      `{/\* Widget complet — tout est inclus \*/}

`      `<DomOSWidget

`        `config={{

`          `agentName: 'Alex',

`          `agentTitle: 'Assistant',

`          `mode: 'text',

`          `theme: { accentColor: '#6366f1' }

`        `}}

`      `/>

`    `</DomOSProvider>

`  `);

}

## **4.2 Mode Headless complet — React (UI entièrement custom)**
Le développeur construit toute son UI avec ses propres composants, branchés sur les hooks DomOS :

import {

`  `DomOSProvider,

`  `useConversation,

`  `useAgentState,

`  `useVoiceMode,

`  `useHITLApproval,

`  `useMode,

} from '@domos/react';

function MonChatCustom() {

`  `const { messages, sendText, isThinking } = useConversation();

`  `const { state } = useAgentState();

`  `const { isListening, startVoice, stopVoice, audioLevel } = useVoiceMode();

`  `const { pendingApproval, approve, deny, riskLevel } = useHITLApproval();

`  `const { mode, toggleMode } = useMode();

`  `const [input, setInput] = useState('');

`  `return (

`    `<div className="mon-chat-custom">

`      `{/\* Mes propres bulles de message \*/}

`      `{messages.map(msg => (

`        `<MaBulle key={msg.id} message={msg} />

`      `))}

`      `{/\* Mon propre indicateur d'état \*/}

`      `{isThinking && <MonSpinner label={state} />}

`      `{/\* Mon propre modal HITL — OBLIGATOIRE si pendingApproval \*/}

`      `{pendingApproval && (

`        `<MonModalApprobation

`          `toolName={pendingApproval.toolName}

`          `risk={riskLevel}

`          `onApprove={approve}   // Toujours appeler approve()

`          `onDeny={deny}         // Toujours appeler deny()

`        `/>

`      `)}

`      `{/\* Mon propre input \*/}

`      `<input value={input} onChange={e => setInput(e.target.value)} />

`      `<button onClick={() => sendText(input)}>Envoyer</button>

`    `</div>

`  `);

}

## **4.3 Mode Hybride — React (remplacement partiel)**
Le développeur remplace uniquement les bulles de message, garde tout le reste natif :

import {

`  `DomOSProvider,

`  `DomOSWidget,          // Widget natif gardé

`  `MessageBubble,        // Composant natif remplacé

} from '@domos/react';

// Mon propre composant de bulle

function MaBulle({ message }) {

`  `return (

`    `<div className={`bulle ${message.role}`}>

`      `<span>{message.text}</span>

`      `<time>{new Date(message.timestamp).toLocaleTimeString()}</time>

`    `</div>

`  `);

}

function App() {

`  `return (

`    `<DomOSProvider apiKey="pk\_live\_xxx" endpoint="wss://...">

`      `<DomOSWidget

`        `config={{ agentName: 'Alex' }}

`        `// Override du composant MessageBubble uniquement

`        `components={{

`          `MessageBubble: MaBulle,

`          `// Tout le reste reste natif

`        `}}

`      `/>

`    `</DomOSProvider>

`  `);

}

## **4.4 Mode Headless — Vue (composables)**
Les composables Vue suivent exactement les mêmes interfaces que les hooks React :

<script setup lang="ts">

import {

`  `useConversation,

`  `useAgentState,

`  `useVoiceMode,

`  `useHITLApproval,

} from '@domos/vue';

const { messages, sendText, isThinking } = useConversation();

const { state, isConnected } = useAgentState();

const { startVoice, stopVoice, isListening } = useVoiceMode();

const { pendingApproval, approve, deny } = useHITLApproval();

</script>

<template>

`  `<div class="mon-chat">

`    `<MaBulle v-for="msg in messages" :key="msg.id" :message="msg" />

`    `<MonModalHITL

`      `v-if="pendingApproval"

`      `:pending="pendingApproval"

`      `@approve="approve"

`      `@deny="deny"

`    `/>

`  `</div>

</template>

## **4.5 Mode Headless — Svelte (stores réactifs)**

<script>

`  `import {

`    `conversationStore,

`    `agentStateStore,

`    `voiceModeStore,

`    `hitlStore,

`  `} from '@domos/svelte';

`  `// Stores réactifs Svelte — auto-subscribe avec $

`  `$: messages = $conversationStore.messages;

`  `$: isThinking = $agentStateStore.isThinking;

`  `$: pendingApproval = $hitlStore.pending;

</script>

{#each $conversationStore.messages as msg}

`  `<MaBulle {msg} />

{/each}

{#if $hitlStore.pending}

`  `<MonModal

`    `on:approve={() => hitlStore.approve()}

`    `on:deny={() => hitlStore.deny()}

`  `/>

{/if}

## **4.6 Mode Headless — @domos/browser (Vanilla JS)**
Pour les sites sans framework, l'API impérative expose les mêmes données via callbacks et EventEmitter :

// @domos/browser — mode headless via callbacks

DomOS.init({

`  `apiKey: 'pk\_live\_xxx',

`  `endpoint: 'wss://...',

`  `headless: true,  // Désactive le Widget natif

});

// Écouter les messages

DomOS.onMessage((message) => {

`  `const bulle = document.createElement('div');

`  `bulle.className = `bulle ${message.role}`;

`  `bulle.textContent = message.text;

`  `document.getElementById('chat').appendChild(bulle);

});

// Écouter l'état de l'agent

DomOS.onAgentStateChange((state) => {

`  `document.getElementById('status').textContent = state;

});

// HITL — OBLIGATOIRE d'implémenter

DomOS.onHITLRequest((request) => {

`  `const confirmed = confirm(

`    ``L'agent veut exécuter : ${request.toolName}. Approuver ?`

`  `);

`  `if (confirmed) DomOS.approveHITL(request.callId);

`  `else DomOS.denyHITL(request.callId);

});

## **4.7 Mode Headless — Flutter (Dart)**

// Flutter — StatefulWidget ou Riverpod

class MonChatCustom extends ConsumerWidget {

`  `@override

`  `Widget build(BuildContext context, WidgetRef ref) {

`    `final messages = ref.watch(domosConversationProvider);

`    `final agentState = ref.watch(domosAgentStateProvider);

`    `final hitlRequest = ref.watch(domosHITLProvider);

`    `return Column(children: [

`      `// Mes propres bulles

...messages.map((msg) => MaBulle(message: msg)),

`      `// Mon propre indicateur d'état

`      `if (agentState.isThinking) MonSpinner(),

`      `// HITL — OBLIGATOIRE

`      `if (hitlRequest != null)

`        `MonModalHITL(

`          `request: hitlRequest,

`          `onApprove: () => ref.read(domosHITLProvider.notifier).approve(),

`          `onDeny: () => ref.read(domosHITLProvider.notifier).deny(),

`        `),

`    `]);

`  `}

}


# **5. Architecture du package @domos/ui**
## **5.1 Positionnement dans le monorepo**
@domos/ui est un package partagé dans le monorepo DomOS qui contient les types, interfaces, constantes de style et les composants Preact utilisés en interne par tous les SDKs. Chaque SDK framework (@domos/react, @domos/vue, @domos/svelte, @domos/flutter, @domos/browser) l'importe et expose ses propres wrappers natifs.

|**Package**|**Ce qu'il exporte pour le développeur final**|
| :- | :- |
|@domos/ui (interne)|Types, interfaces, CSS variables, composants Preact internes — pas importé directement par le développeur|
|@domos/react|Composants React + hooks (useConversation, useAgentState, useVoiceMode, useHITLApproval, useMode, usePlan, useAgentMemory, useNotifications, useWidget)|
|@domos/vue|Composants Vue 3 + composables (mêmes noms que les hooks React)|
|@domos/svelte|Composants Svelte + stores réactifs (conversationStore, agentStateStore, etc.)|
|@domos/browser|API impérative DomOS.onMessage(), DomOS.onAgentStateChange(), DomOS.onHITLRequest(), etc.|
|@domos/flutter|Widgets Dart + Riverpod/Provider providers (domosConversationProvider, etc.)|

## **5.2 Structure de @domos/ui**

packages/ui/src/

├── types/

│   ├── message.types.ts          # Message, MessageRole, MessageStatus

│   ├── agent-state.types.ts      # AgentState, AgentVoiceState, ConnectionStatus

│   ├── hitl.types.ts             # HITLRequest, RiskLevel, HITLAction

│   ├── notification.types.ts     # Notification, NotificationType

│   ├── plan.types.ts             # Plan, PlanStep, PlanStatus

│   ├── memory.types.ts           # MemoryEntry, MemoryCategory, MemoryExport

│   └── widget.types.ts           # WidgetConfig, WidgetTheme, WidgetLabels, Mode

│

├── components/                   # Composants Preact internes

│   ├── chat/

│   │   ├── MessageList.tsx

│   │   ├── MessageBubble.tsx

│   │   ├── TypingIndicator.tsx

│   │   └── ConversationEmpty.tsx

│   ├── audio/

│   │   ├── AudioVisualizer.tsx

│   │   ├── MicButton.tsx

│   │   ├── AudioWaveform.tsx

│   │   └── VoiceStatusBadge.tsx

│   ├── agent-state/

│   │   ├── AgentStatusBadge.tsx

│   │   ├── AgentThinkingDots.tsx

│   │   ├── AgentSpeakingBars.tsx

│   │   └── AgentErrorState.tsx

│   ├── hitl/

│   │   ├── ApprovalModal.tsx     # Rendu dans Shadow DOM

│   │   ├── ApprovalForm.tsx

│   │   ├── CriticalWarning.tsx

│   │   ├── ApproveButton.tsx

│   │   └── DenyButton.tsx

│   ├── notifications/

│   │   ├── ToastContainer.tsx

│   │   ├── ToastNotification.tsx

│   │   └── InlineAlert.tsx

│   ├── mode/

│   │   ├── ModeToggle.tsx

│   │   ├── TextModeIcon.tsx

│   │   └── VoiceModeIcon.tsx

│   ├── plan/

│   │   ├── PlanProgressBar.tsx

│   │   ├── PlanStepList.tsx

│   │   ├── PlanStepItem.tsx

│   │   └── PlanStatusBadge.tsx

│   ├── memory/

│   │   ├── MemoryPanel.tsx

│   │   ├── MemoryEntryList.tsx

│   │   ├── MemoryEntryItem.tsx

│   │   ├── MemoryResetButton.tsx

│   │   └── MemoryExportButton.tsx

│   └── widget/

│       ├── DomOSWidget.tsx       # Composant racine Preact

│       ├── WidgetButton.tsx

│       └── WidgetPanel.tsx

│

├── styles/

│   ├── css-variables.ts          # Toutes les CSS variables DomOS

│   ├── themes/                   # Thème clair, sombre, custom

│   └── generate-widget-css.ts    # Génération CSS à partir du thème

│

└── constants/

`    `├── default-config.ts         # WidgetConfig par défaut

`    `├── default-labels.ts         # Labels i18n par défaut (FR/EN)

`    `└── animations.ts             # Durées et courbes d'animation

## **5.3 Système de thème — CSS Variables**
Tous les composants natifs DomOS sont stylisés via des CSS variables. Le développeur peut personnaliser l'apparence complète en ne fournissant qu'un objet thème — sans toucher au CSS interne :

|**Variable CSS**|**Valeur par défaut**|**Impact**|
| :- | :- | :- |
|--domos-accent|#6366f1 (violet)|Couleur principale — boutons, indicateurs, liens actifs|
|--domos-bg|#0f172a (bleu nuit)|Fond du Widget et des modaux|
|--domos-surface|#1e293b|Fond des bulles agent, des cartes mémoire|
|--domos-text|#f1f5f9|Texte principal|
|--domos-text-muted|#94a3b8|Texte secondaire, timestamps, labels|
|--domos-user-bubble|#6366f1|Fond des bulles utilisateur|
|--domos-agent-bubble|#1e293b|Fond des bulles agent|
|--domos-border|#334155|Couleurs des bordures|
|--domos-radius|16px|Rayon de bordure global|
|--domos-danger|#ef4444|Bouton raccrocher, états erreur, critical HITL|
|--domos-live|#22c55e|Badge LIVE, état connecté|
|--domos-shadow|0 8px 32px rgba(0,0,0,0.4)|Ombre du Widget et des modaux|
|--domos-font|system-ui, sans-serif|Police de caractères|
|--domos-font-size-base|14px|Taille de base|


# **6. Règles de remplacement des composants**
## **6.1 Niveaux de remplacement**
Chaque composant DomOS a un niveau de remplacement défini selon son impact sur la sécurité et le comportement fonctionnel :

|**Niveau**|**Signification**|**Composants concernés**|
| :- | :- | :- |
|Libre|Entièrement remplaçable — le développeur peut fournir n'importe quel composant|MessageBubble, ConversationEmpty, TypingIndicator, AudioVisualizer, AudioWaveform, VoiceStatusBadge, AgentStatusBadge, AgentThinkingDots, AgentSpeakingBars, ToastNotification, ModeToggle, PlanProgressBar, PlanStepList, PlanStepItem, MemoryEntryList, MemoryEntryItem|
|Contraint|Remplaçable mais doit respecter le contrat d'interface — obligatoirement appeler les callbacks DomOS|ApprovalForm (doit appeler approve/deny), MicButton (doit appeler startVoice/stopVoice), MemoryResetButton (doit appeler resetMemory)|
|Style uniquement|Seulement le style est personnalisable via CSS variables ou className — la logique est intégrée|ApproveButton, DenyButton (logique HITL non-remplaçable), MemoryExportButton|
|Non-remplaçable|Composant entièrement protégé — logique et rendu gérés par DomOS|ApprovalModal (Shadow DOM), le pipeline audio WebAudio PCM, la connexion WebSocket ADTP, la HITLPolicy evaluation|

## **6.2 Contrat d'interface pour les composants contraints**
Quand un développeur remplace un composant de niveau Contraint, il doit respecter le contrat d'interface défini par DomOS. Ce contrat garantit que la logique de communication reste fonctionnelle :

### **Contrat — Remplacement de ApprovalForm**
// Le composant de remplacement DOIT accepter ces props

interface ApprovalFormProps {

`  `toolName: string;

`  `toolArgs: Record<string, unknown>;

`  `riskLevel: 'high' | 'critical';

`  `warningMessage: string;

`  `onApprove: () => void;  // OBLIGATOIRE — appeler approve() de useHITLApproval

`  `onDeny: () => void;     // OBLIGATOIRE — appeler deny() de useHITLApproval

}

// Vérification au runtime — DomOS valide le contrat

// Si onApprove ou onDeny ne sont pas appelés dans un délai configurable

// DomOS déclenche automatiquement deny() après timeout (défaut: 5 min)

### **Contrat — Remplacement de MicButton**
interface MicButtonProps {

`  `isListening: boolean;    // Doit refléter l'état réel du micro

`  `onToggle: () => void;    // OBLIGATOIRE — appeler toggleVoice() de useVoiceMode

`  `isDisabled: boolean;     // Doit refléter canUseVoice de useVoiceMode

`  `// Le bouton NE DOIT PAS gérer directement getUserMedia

`  `// Toujours passer par useVoiceMode().startVoice()

}


# **7. Accessibilité et Internationalisation**
## **7.1 Accessibilité (WCAG 2.1 AA)**
Tous les composants natifs DomOS sont conçus pour respecter les critères WCAG 2.1 niveau AA :

|**Composant**|**Mesures d'accessibilité**|
| :- | :- |
|MessageList|role='log', aria-live='polite', aria-label configurable, navigation clavier dans l'historique|
|MessageBubble|role='article', aria-label incluant le rôle et le timestamp, focus visible|
|MicButton|aria-pressed pour l'état listening, aria-label dynamique ('Activer le micro'/'Désactiver le micro'), accessible au clavier|
|ApprovalModal|role='dialog', aria-modal='true', focus trap dans le Shadow DOM, Escape pour deny(), boutons avec aria-label explicites|
|ToastNotification|role='status' ou role='alert' selon l'urgence, aria-live='assertive' pour les alertes critiques|
|MemoryPanel|Structure ARIA landmarks, navigation clavier complète, focus management à l'ouverture/fermeture|
|PlanProgressBar|role='progressbar', aria-valuenow, aria-valuemin, aria-valuemax, aria-label avec pourcentage|
|ModeToggle|aria-pressed, aria-label 'Basculer en mode texte/vocal', accessible au clavier|

## **7.2 Internationalisation (i18n)**
Tous les textes visibles des composants natifs DomOS sont configurables via l'objet labels passé au DomOSWidget ou au DomOSProvider. Les labels par défaut sont disponibles en français et en anglais :

|**Groupe de labels**|**Labels configurables**|
| :- | :- |
|Widget|callToAction, badge, subtitle, agentName, agentTitle|
|Agent States|idle, connecting, listening, thinking, speaking, streaming, error|
|HITL|approveButton, denyButton, highWarning, criticalWarning, confirmMessage|
|Mode Selector|textMode, voiceMode, switchToText, switchToVoice|
|Audio|micStart, micStop, micDenied, micError, fallbackText|
|Notifications|dismiss, closeAll|
|Memory UI|title, categories, deleteEntry, resetAll, exportData, confirmReset, exportSuccess|
|Plan Progress|inProgress, completed, paused, failed, stepOf|
|Conversation|welcome, typingIndicator, emptyState, sendButton, inputPlaceholder, retryMessage|

// Exemple de configuration labels FR

<DomOSWidget

`  `config={{

`    `agentName: 'Alex',

`    `labels: {

`      `callToAction: 'Parler à Alex',

`      `thinking: 'Réflexion en cours...',

`      `listening: 'Je vous écoute...',

`      `approveButton: 'Confirmer',

`      `denyButton: 'Annuler',

`      `inputPlaceholder: 'Tapez votre message...',

`    `}

`  `}}

/>


# **8. Exigences**
## **8.1 Exigences fonctionnelles**

|**ID**|**Exigence**|**Priorité**|
| :- | :- | :- |
|EF-UI01|Chaque composant natif doit fonctionner en mode clé en main sans aucune configuration UI requise du développeur.|Critique|
|EF-UI02|Chaque groupe de composants doit exposer un hook/composable/store headless permettant de construire une UI entièrement custom.|Critique|
|EF-UI03|Le mode hybride doit permettre de remplacer n'importe quel composant individuel via le système de components overrides du DomOSWidget.|Critique|
|EF-UI04|La couche logique (ADTP, WebSocket, HITLPolicy, pipeline audio PCM) doit être entièrement encapsulée et non-remplaçable.|Critique|
|EF-UI05|Le modal HITL doit toujours être rendu dans un Shadow DOM fermé — même en mode headless avec un composant custom, la HITLPolicy reste active.|Critique|
|EF-UI06|useHITLApproval() doit émettre un warning console si aucun composant ne le consomme et qu'une demande HITL arrive.|Critique|
|EF-UI07|Tous les composants natifs doivent respecter WCAG 2.1 AA — navigation clavier, ARIA, contrast ratio.|Haute|
|EF-UI08|Tous les textes visibles des composants natifs doivent être configurables via l'objet labels — support FR/EN natif.|Haute|
|EF-UI09|L'ensemble du système visuel doit être personnalisable via CSS variables — sans modifier les composants.|Haute|
|EF-UI10|Les composants doivent être disponibles dans les 5 environnements : React, Vue, Svelte, @domos/browser, Flutter.|Critique|
|EF-UI11|Le package @domos/ui partagé doit contenir les types, interfaces et composants Preact internes communs à tous les SDKs.|Haute|
|EF-UI12|Un composant remplaçant un composant Contraint doit être validé au runtime — DomOS vérifie que les callbacks obligatoires sont fournis.|Haute|


# **9. Annexes**
## **9.1 Récapitulatif — hooks/composables/stores par framework**

|**Logique**|**React (hook)**|**Vue (composable)**|**Svelte (store)**|**@domos/browser (callback)**|**Flutter (provider)**|
| :- | :- | :- | :- | :- | :- |
|Conversation|useConversation()|useConversation()|conversationStore|DomOS.onMessage()|domosConversationProvider|
|État agent|useAgentState()|useAgentState()|agentStateStore|DomOS.onAgentStateChange()|domosAgentStateProvider|
|Mode vocal|useVoiceMode()|useVoiceMode()|voiceModeStore|DomOS.onVoiceStateChange()|domosVoiceModeProvider|
|HITL|useHITLApproval()|useHITLApproval()|hitlStore|DomOS.onHITLRequest()|domosHITLProvider|
|Mode text/voice|useMode()|useMode()|modeStore|DomOS.onModeChange()|domosModeProvider|
|Plan DomosAgent|usePlan()|usePlan()|planStore|DomOS.onPlanUpdate()|domosPlanProvider|
|Mémoire agent|useAgentMemory()|useAgentMemory()|memoryStore|DomOS.agent.getMemory()|domosMemoryProvider|
|Notifications|useNotifications()|useNotifications()|notificationStore|DomOS.onNotification()|domosNotificationProvider|
|Widget state|useWidget()|useWidget()|widgetStore|DomOS.onWidgetChange()|domosWidgetProvider|

## **9.2 Références**
- CdC Technique général (Doc 2) — Architecture SDK, protocole ADTP, DomOSWidget
- CdC @domos/browser v1 (Doc 6) — API impérative, auto-discovery, session persistence
- CdC DomosAgent (Doc 8) — usePlan(), useAgentMemory(), plan et mémoire
- WIDGET.md — Configuration WidgetConfig, WidgetTheme, WidgetLabels (référence existante)
- HITL\_SECURITY.md — Architecture Shadow DOM, HITLPolicy (référence existante)
- Preact Documentation — https://preactjs.com
- WCAG 2.1 Guidelines — https://www.w3.org/TR/WCAG21/


*Document confidentiel — Futur4Tech © 2026 — DomOS UI Component System*
Page 
