# Sprint Angular Alignment — Roadmap d'alignement SDK

**Statut** : REFERENCE ONLY  
**Domaine** : `angular`  
**Objectif** : Aligner le SDK Angular (`packages/angular/`) avec les capacités complètes des SDKs React et Vue (hors devtools).  
**Porteur** : DomOS Core Team  
**Date** : 7 Avril 2026

> Note d'execution
>
> - Ce document n'est pas un document d'execution.
> - Pour l'implementation, suivre uniquement `SPRINT-10`, `SPRINT-11` puis `SPRINT-12`.
> - Les items non couverts par `feature_26` ou `feature_27` restent hors chemin court terme.

---

## 1. Résumé exécutif

### État actuel

Le SDK Angular (`packages/angular/`) est fonctionnel mais **incomplet** par rapport aux SDKs React et Vue. Il expose uniquement :

- ✅ **Service d'injection** (`DomOSAngularService`) avec signals Angular
- ✅ **Fonctions de registration** pour tools, context, navigation, view state et resolvers
- ✅ **Types de base** pour définir des tools et leurs schemas Zod

### Ce qui manque (comparé à React/Vue)

- ❌ **Aucun composant UI** (ApprovalModal, ApprovalBanner, AgentIndicator, Notification)
- ❌ **Aucun composant agentic UI** (DomOSTool, DomOSToolBtn)
- ❌ **Aucun widget de chat** (DomOSWidget)
- ❌ **Aucune gestion voice** (pas d'équivalent à `useVoiceMode`)
- ❌ **Aucun système de plugins UI** (pas d'équivalent à `usePluginComponents`, `useDevTools`)
- ❌ **Absence de helpers resolver** (`createResolverFromSwitch`, `createCRUDResolver`)

### Impact business

Un développeur Angular qui souhaite intégrer DomOS doit :
1. Implémenter manuellement les composants UI HITL (modale d'approbation, bannière, indicateur d'état agent)
2. Implémenter manuellement la gestion voice (capture micro, streaming PCM, playback audio)
3. Implémenter manuellement le widget de chat s'il veut une UI complète
4. Ne peut pas utiliser les plugins DomOS officiels s'ils exposent des composants UI

**Ce gap rallonge l'onboarding d'un projet Angular de ~3-5 jours** et crée une dette technique (réimplémentation de logique existante).

---

## 2. Tableau comparatif des exports

| Catégorie | Angular | React | Vue | Gap |
|-----------|---------|-------|-----|-----|
| **Provider / Injection** | ✅ `provideDomOS`, `injectDomOS` | ✅ `DomOSProvider`, `useAgent` | ✅ `DomOSPlugin`, `useAgent` | ≈ équivalent |
| **Tool registration** | ✅ `registerToolResolver`, `registerNavigationTool`, `registerViewStateTool`, `registerContext` | ✅ `useAgentTool`, `useAgentToolResolver`, `useNavigationTool`, `useViewStateTool`, `useAgentContext` | ✅ `useAgentTool`, `useAgentToolResolver`, `useNavigationTool`, `useViewStateTool`, `useAgentContext` | ✅ aligné |
| **HITL Components** | ❌ | ✅ `ApprovalModal`, `ApprovalBanner` | ✅ `ApprovalModal`, `ApprovalBanner` | **P0** |
| **Agent UI Components** | ❌ | ✅ `AgentIndicator`, `Notification` | ✅ `AgentIndicator` | **P1** |
| **Agentic UI (Tool co-location)** | ❌ | ✅ `DomOSTool`, `DomOSToolBtn` | ✅ `DomOSTool`, `DomOSToolBtn` | **P1** |
| **Widget Chat** | ❌ | ✅ `DomOSWidget` | ✅ `DomOSWidget` | **P1** |
| **Voice Management** | ❌ | ✅ `useVoiceMode` | ✅ `useVoiceMode` | **P0** |
| **Plugin UI System** | ❌ | ✅ `usePluginComponents`, `PluginRenderer`, `PluginDevPanel` | ✅ `usePluginComponents` | **P2** |
| **DevTools** | ❌ | ✅ `useDevTools` | ✅ `useDevTools` | **HORS SCOPE** (par instruction utilisateur) |
| **Resolver Helpers** | ❌ | ✅ `createResolverFromSwitch`, `createCRUDResolver` | ✅ `createResolverFromSwitch`, `createCRUDResolver` | **P1** |
| **Event Subscriptions** | ✅ `subscribeEvent`, `subscribeAnyEvent` | ✅ `useDomOSEvent`, `useDomOSAnyEvent` | ✅ `useDomOSEvent`, `useDomOSAnyEvent` | ≈ équivalent (pattern différent mais fonctionnel) |
| **Approval Handling** | ❌ | ✅ `useApproval` | ✅ `useApproval` | **P0** (lié à HITL UI) |

---

## 3. Features manquantes — Priorisation

### 🔴 P0 — Bloquant (sans ces features, l'expérience Angular est cassée)

#### **P0.1 — HITL Approval Components**

**Périmètre** :
- Composant Angular `<domos-approval-modal>` (équivalent ApprovalModal React/Vue)
- Composant Angular `<domos-approval-banner>` (équivalent ApprovalBanner React/Vue)
- Service `DomOSApprovalService` pour gérer les pending approvals (signal-based)
- Hook-like injectDomOSApproval() pour accéder aux approvals dans un composant

**Dépendances** :
- `@domos/core` : types `ApprovalRequest`, `ApprovalResponse`
- `DomOSAngularService` : méthode `respondApproval(id, approved)`

**Complexité** : **M** (Medium)  
- Modal Angular : ~150 lignes (template + logic)
- Banner Angular : ~100 lignes
- Service : ~80 lignes
- Styling : utiliser les styles de `@domos/core` (generateApprovalStyles ? non existant → définir inline ou via un fichier CSS partagé)

**Critères d'acceptance** :
- [ ] Modal Angular affiche le pending approval avec nom du tool, description, args
- [ ] Boutons "Approuver" / "Refuser" fonctionnels
- [ ] Banner affiche l'approval en version compacte (sticky top)
- [ ] Service émet des signals réactifs pour pending approvals
- [ ] Démontrer dans `apps/demo-angular` (à créer) : tool high-risk → modal s'affiche

**Fichiers impactés** :
- `packages/angular/src/lib/components/` → nouveau dossier
  - `hitl.ApprovalModal.component.ts` (NEW)
  - `hitl.ApprovalModal.component.html` (NEW)
  - `hitl.ApprovalModal.component.css` (NEW)
  - `hitl.ApprovalBanner.component.ts` (NEW)
  - `hitl.ApprovalBanner.component.html` (NEW)
  - `hitl.ApprovalBanner.component.css` (NEW)
- `packages/angular/src/lib/services/` → nouveau dossier
  - `DomOSApprovalService.ts` (NEW)
- `packages/angular/src/public-api.ts` → ajouter exports

---

#### **P0.2 — Voice Management (injectDomOSVoice)**

**Périmètre** :
- Service `DomOSVoiceService` (équivalent `useVoiceMode` React/Vue)
- Gestion micro : `navigator.mediaDevices.getUserMedia`
- Capture PCM 16kHz mono via `ScriptProcessorNode` (suivre règles R1-R7 de `docs/AUDIO_PIPELINE_RULES.md`)
- Streaming audio vers serveur via `sendAudioStream` (live mode) ou `sendAudio` (STT mode)
- Playback audio reçu (mode live uniquement)
- Signals Angular : `isRecording`, `isMuted`, `voiceState`, `isSpeaking`
- Méthodes : `startRecording()`, `stopRecording()`, `toggleMute()`

**Dépendances** :
- `@domos/core` : `VoiceStateMachine`, types `VoiceState`
- `DomOSAngularService` : méthodes `sendAudio`, `sendAudioStream`, `sendAudioEnd`, `sendInterrupt`, `onAudioOutput`
- `Web Audio API` (navigateur)

**Complexité** : **L** (Large)  
- Service voice : ~400 lignes (audio capture, PCM conversion, playback, state machine)
- Tests critiques : valider règle R7 (pas de AudioContext.close au stop de capture)
- Tests critiques : valider règle R3 (validLength = binary.length - (binary.length % 2))

**Critères d'acceptance** :
- [ ] `DomOSVoiceService` démarre la capture micro et stream PCM 16kHz mono
- [ ] Mode `live: false` (défaut) : envoie `USER_INPUT` + audio base64
- [ ] Mode `live: true` : envoie `AUDIO_STREAM` chunk par chunk
- [ ] Playback audio reçu en mode live (décode base64 → PCM → Web Audio API)
- [ ] Transitions `VoiceStateMachine` correctes : idle → capturing → speaking → idle
- [ ] Gestion erreur micro refusé (permissions)
- [ ] Démontrer dans `apps/demo-angular` : bouton voice → capture → réponse audio jouée

**Fichiers impactés** :
- `packages/angular/src/lib/services/DomOSVoiceService.ts` (NEW)
- `packages/angular/src/public-api.ts` → ajouter export `injectDomOSVoice`

---

### 🟠 P1 — Important (améliore significativement la DX mais contournable)

#### **P1.1 — Agent UI Components (Indicator, Notification)**

**Périmètre** :
- Composant Angular `<domos-agent-indicator>` (équivalent `AgentIndicator` React/Vue)
  - Affiche l'état agent (idle, listening, thinking, speaking, error)
  - Dot coloré + label textuel
- Composant Angular `<domos-notification>` (équivalent `Notification` React)
  - Toast notification pour messages agent

**Dépendances** :
- `DomOSAngularService` : signal `state`
- `@domos/core` : type `ClientState`

**Complexité** : **S** (Small)  
- Indicator : ~80 lignes
- Notification : ~60 lignes (si on garde simple, pas de queue de toasts)

**Critères d'acceptance** :
- [ ] Indicator affiche les états agent avec dot coloré
- [ ] Notification affiche un message avec auto-dismiss après X secondes
- [ ] Démontrer dans `apps/demo-angular`

**Fichiers impactés** :
- `packages/angular/src/lib/components/agentic-ui.Indicator.component.ts` (NEW)
- `packages/angular/src/lib/components/agentic-ui.Indicator.component.html` (NEW)
- `packages/angular/src/lib/components/agentic-ui.Indicator.component.css` (NEW)
- `packages/angular/src/lib/components/agentic-ui.Notification.component.ts` (NEW)
- `packages/angular/src/lib/components/agentic-ui.Notification.component.html` (NEW)
- `packages/angular/src/lib/components/agentic-ui.Notification.component.css` (NEW)
- `packages/angular/src/public-api.ts` → ajouter exports

---

#### **P1.2 — Agentic UI (DomOSTool, DomOSToolBtn)**

**Périmètre** :
- Directive Angular `domOSTool` (équivalent composant `<DomOSTool>` React/Vue)
  - Wrapper transparent qui enregistre un tool co-localisé avec un élément DOM
  - Support actions : `click`, `focus`, `scrollIntoView`, `show`, `hide`
  - Support handler custom
- Composant Angular `<domos-tool-btn>` (équivalent `<DomOSToolBtn>` React/Vue)
  - Bouton stylisé avec tool auto-enregistré

**Dépendances** :
- `DomOSAngularService` : méthode `registerTool`
- Directive `@HostListener` ou `Renderer2` pour intercepter actions DOM

**Complexité** : **M** (Medium)  
- Directive domOSTool : ~150 lignes (enregistrement tool, gestion lifecycle, actions DOM)
- Composant DomOSToolBtn : ~80 lignes

**Design Note** :
Angular n'a pas de slot natif comme Vue ou de `children` prop comme React.  
Pour `domOSTool`, on utilise une **directive** qui s'applique sur un élément existant :

```html
<!-- Usage Angular -->
<button domOSTool
        toolName="clear_cart"
        toolDescription="Clear the entire cart"
        toolRisk="high"
        toolAction="click"
        (click)="clearCart()">
  Clear Cart
</button>
```

Pour `DomOSToolBtn`, on encapsule le bouton dans un composant :

```html
<domos-tool-btn
  name="add_to_cart"
  description="Add product to cart"
  risk="low"
  (toolClick)="addToCart()">
  Add to Cart
</domos-tool-btn>
```

**Critères d'acceptance** :
- [ ] Directive `domOSTool` enregistre un tool au mount, désenregistre au unmount
- [ ] Actions DOM (`click`, `focus`, etc.) déclenchées par l'agent fonctionnent
- [ ] Handler custom fonctionne si fourni
- [ ] Composant `DomOSToolBtn` affiche un bouton stylisé et enregistre un tool
- [ ] Démontrer dans `apps/demo-angular`

**Fichiers impactés** :
- `packages/angular/src/lib/directives/domOSTool.directive.ts` (NEW)
- `packages/angular/src/lib/components/tool/DomOSToolBtn.component.ts` (NEW)
- `packages/angular/src/lib/components/tool/DomOSToolBtn.component.html` (NEW)
- `packages/angular/src/lib/components/tool/DomOSToolBtn.component.css` (NEW)
- `packages/angular/src/public-api.ts` → ajouter exports

---

#### **P1.3 — Widget Chat (DomOSWidget)**

**Périmètre** :
- Composant Angular `<domos-widget>` (équivalent `<DomOSWidget>` React/Vue)
- UI complète : bouton flottant + panneau chat (texte + voice)
- Inputs : `apiKey`, `endpoint`, `config` (WidgetConfig de @domos/core)
- Styling : utiliser `generateWidgetStyles` de `@domos/core`
- Intégration voice : utiliser `DomOSVoiceService`
- HITL : utiliser `DomOSApprovalService` + `<domos-approval-modal>`

**Dépendances** :
- `DomOSAngularService` (connexion, envoi messages)
- `DomOSVoiceService` (capture micro, playback audio)
- `DomOSApprovalService` (gestion approvals)
- `@domos/core` : `generateWidgetStyles`, `WidgetConfig`, `WidgetTheme`, `DEFAULT_WIDGET_CONFIG`

**Complexité** : **L** (Large)  
- Composant widget : ~500 lignes (template + logic)
- Sub-composants : FloatingButton, ChatInput, MessageList, AudioOrb → ~300 lignes supplémentaires
- Styling : ~100 lignes CSS (ou réutiliser styles générés par `generateWidgetStyles`)

**Design Note** :
- **React** : Shadow DOM (WidgetInner crée un `createRoot` isolé)
- **Vue** : Light DOM (wrapper `.domos-widget-root` + CSS scopé)
- **Angular** : **Light DOM** (comme Vue), car ViewEncapsulation.ShadowDom nécessite des adaptations complexes pour les composants dynamiques

**Critères d'acceptance** :
- [ ] Widget affiche un bouton flottant (bottom-right par défaut)
- [ ] Clic bouton → panneau chat s'ouvre
- [ ] Mode texte : input texte + envoi message → affiche réponse agent
- [ ] Mode audio : bouton voice → capture micro → réponse audio jouée
- [ ] HITL : tool high-risk → modal approval s'affiche dans le widget
- [ ] Styling : thème appliqué via `generateWidgetStyles`
- [ ] Démontrer dans `apps/demo-angular`

**Fichiers impactés** :
- `packages/angular/src/lib/components/widget/DomOSWidget.component.ts` (NEW)
- `packages/angular/src/lib/components/widget/DomOSWidget.component.html` (NEW)
- `packages/angular/src/lib/components/widget/DomOSWidget.component.css` (NEW)
- `packages/angular/src/lib/components/widget/FloatingButton.component.ts` (NEW)
- `packages/angular/src/lib/components/widget/ChatInput.component.ts` (NEW)
- `packages/angular/src/lib/components/widget/MessageList.component.ts` (NEW)
- `packages/angular/src/lib/components/widget/AudioOrb.component.ts` (NEW)
- `packages/angular/src/public-api.ts` → ajouter export

---

#### **P1.4 — Resolver Helpers (createResolverFromSwitch, createCRUDResolver)**

**Périmètre** :
- Fonctions utilitaires `createResolverFromSwitch` et `createCRUDResolver`
- Identiques aux versions React/Vue (code framework-agnostic)
- Retournent un `DomOSResolverConfig` (type déjà défini dans `types.ts`)

**Dépendances** :
- `zod` (déjà dans package.json)
- Types existants : `DomOSResolverConfig`, `DomOSResolverToolDefinition`

**Complexité** : **S** (Small)  
- Code copié quasiment à l'identique de React/Vue (~100 lignes total)

**Critères d'acceptance** :
- [ ] `createResolverFromSwitch` convertit un objet de tools en `DomOSResolverConfig`
- [ ] `createCRUDResolver` génère automatiquement des tools CRUD (create, update, delete, read, list)
- [ ] Utilisable avec `registerToolResolver`
- [ ] Démontrer dans `apps/demo-angular`

**Fichiers impactés** :
- `packages/angular/src/lib/utils/resolverHelpers.ts` (NEW)
- `packages/angular/src/public-api.ts` → ajouter exports

---

### 🟢 P2 — Nice to have (améliore la DX mais non critique)

#### **P2.1 — Plugin UI System (injectPluginComponents, PluginRenderer)**

**Périmètre** :
- Fonction `injectPluginComponents<T>(plugin: DomOSClientPlugin)` → retourne les composants Angular du plugin
- Composant `<domos-plugin-renderer>` (équivalent `<PluginRenderer>` React)
  - Affiche dynamiquement un composant de plugin par son nom

**Dépendances** :
- `@domos/core` : type `DomOSClientPlugin`
- Plugins doivent exposer une clé `ui.angularComponents` (nouvelle convention à ajouter)

**Complexité** : **M** (Medium)  
- injectPluginComponents : ~30 lignes (lecture triviale)
- PluginRenderer : ~120 lignes (dynamic component loading avec Angular `ViewContainerRef` + `ComponentFactoryResolver`)

**Design Note** :
Actuellement, les plugins DomOS n'exposent que `ui.components` (React) et rien pour Angular.  
Il faudrait :
1. Ajouter une convention `ui.angularComponents` (ou `ui.components` devient framework-agnostic)
2. Documenter dans `packages/core/src/plugins/types.ts` (ou créer un guide)

**Critères d'acceptance** :
- [ ] `injectPluginComponents` lit les composants Angular d'un plugin
- [ ] `<domos-plugin-renderer>` charge et affiche dynamiquement un composant de plugin
- [ ] Démontrer avec un plugin Angular minimal (ex: `@domos-plugins/example-angular`)

**Fichiers impactés** :
- `packages/angular/src/lib/plugins/injectPluginComponents.ts` (NEW)
- `packages/angular/src/lib/components/plugins/PluginRenderer.component.ts` (NEW)
- `packages/angular/src/public-api.ts` → ajouter exports

**HORS SCOPE** : `PluginDevPanel` est explicitement exclu (instruction utilisateur).

---

## 4. Recommandations d'organisation

### Option A : Sprint global unique

**Périmètre** : Livrer toutes les features P0 et P1 dans un seul sprint "Angular Alignment".

**Avantages** :
- Vision d'ensemble cohérente
- Tests d'intégration complets dès la fin du sprint
- Démo Angular (`apps/demo-angular`) construite en parallèle, couvre tous les cas

**Inconvénients** :
- Sprint long (~2-3 semaines estimé)
- Risque de blocage si une feature P0 (ex: voice) prend plus de temps que prévu
- Difficile de livrer incrémentalement (tout ou rien)

**Livrable** :
- `domos/sprints/sprint_angular_alignment.md` (document unique)
- PR unique à la fin du sprint

---

### Option B : Features individuelles + sprint orchestrateur

**Périmètre** : Créer un canvas `feature_XX` pour chaque feature P0/P1, puis un sprint orchestrateur qui les assemble.

**Avantages** :
- Livraison incrémentale : chaque feature peut être mergée dès qu'elle est prête
- Parallélisation : plusieurs contributeurs peuvent travailler sur des features différentes
- Traçabilité fine (issues GitHub liées à chaque feature)

**Inconvénients** :
- Overhead administratif (5-6 documents feature à maintenir)
- Risque de dépendances entre features non détectées tôt

**Structure proposée** :
```
features/
  feature_20_angular_hitl_components.md       (P0.1)
  feature_21_angular_voice_management.md      (P0.2)
  feature_22_angular_agent_ui_components.md   (P1.1)
  feature_23_angular_agentic_ui_tool.md       (P1.2)
  feature_24_angular_widget_chat.md           (P1.3)
  feature_25_angular_resolver_helpers.md      (P1.4)

sprints/
  sprint_angular_alignment_orchestrator.md    (référence les 6 features ci-dessus)
```

---

### ✅ Recommandation finale : **Option B (Features individuelles)**

**Justification** :

1. **Livraison incrémentale** : P0.1 (HITL) et P0.2 (Voice) sont les plus critiques. On peut les livrer en priorité et débloquer les premiers projets Angular.

2. **Parallélisation** : Voice (P0.2) est complexe (~400 lignes, tests audio critiques). Pendant qu'un dev travaille dessus, un autre peut implémenter P0.1 (HITL) et P1.1 (Agent UI).

3. **Testabilité** : Chaque feature est testable indépendamment. P1.3 (Widget) dépend de P0.1, P0.2, P1.1 → on la fait en dernier.

4. **Respect des conventions DomOS** : CONTRIBUTING.md impose des canvas feature pour les nouvelles fonctionnalités. Créer un sprint global serait non-conventionnel.

**Ordre de livraison recommandé** :

```
1. P1.4 (Resolver Helpers)     → S (Small), 0 dépendance, déblocage immédiat
2. P0.1 (HITL Components)      → M (Medium), dépend uniquement de core
3. P1.1 (Agent UI Components)  → S (Small), dépend uniquement de service
4. P0.2 (Voice Management)     → L (Large), complexe mais 0 dépendance UI
5. P1.2 (Agentic UI Tool)      → M (Medium), dépend du service de registration
6. P1.3 (Widget Chat)          → L (Large), dépend de P0.1, P0.2, P1.1
7. P2.1 (Plugin UI System)     → M (Medium), optionnel, peut être fait après
```

---

## 5. Canvas Feature à créer

Créer les documents suivants dans `domos/features/` :

### P0 — Bloquant
- [ ] `feature_20_angular_hitl_components.md` (P0.1)
- [ ] `feature_21_angular_voice_management.md` (P0.2)

### P1 — Important
- [ ] `feature_22_angular_agent_ui_components.md` (P1.1)
- [ ] `feature_23_angular_agentic_ui_tool.md` (P1.2)
- [ ] `feature_24_angular_widget_chat.md` (P1.3)
- [ ] `feature_25_angular_resolver_helpers.md` (P1.4)

### P2 — Nice to have
- [ ] `feature_26_angular_plugin_ui_system.md` (P2.1)

**Sprint orchestrateur** :
- [ ] `sprint_angular_alignment_orchestrator.md` → référence les features ci-dessus, définit l'app de démo `apps/demo-angular`

---

## 6. Hors scope

Les éléments suivants sont **explicitement hors scope** de ce sprint (instruction utilisateur) :

- ❌ DevTools (`useDevTools`) → outil de développement, non prioritaire pour l'alignement fonctionnel
- ❌ Refactoring du package React/Vue → focus 100% Angular
- ❌ Modification du package `ui` → runtime partagé, pas touché
- ❌ Création de nouveaux composants non présents dans React/Vue
- ❌ Tests E2E cross-framework → hors périmètre du sprint Angular

---

## 7. Hypothèses ouvertes

Les hypothèses suivantes nécessitent validation avant de démarrer les features :

### H1 : Shadow DOM vs Light DOM pour Angular

**Hypothèse** : Le widget Angular utilisera **Light DOM** (comme Vue), car `ViewEncapsulation.ShadowDom` est moins mature et complique le dynamic component loading.

**Validation** : Confirmer avec l'équipe Core que Light DOM est acceptable. Si Shadow DOM est requis, la complexité de P1.3 (Widget) passe de L à XL.

### H2 : CSS Styling Strategy

**Hypothèse** : Les composants Angular réutilisent `generateWidgetStyles` et `generateApprovalStyles` (à créer dans `@domos/core`).

**Validation** : Vérifier que `generateWidgetStyles` existe et peut être réutilisé. Si non, définir une stratégie CSS partagée (fichiers `.css` dans `packages/angular/src/lib/styles/`).

### H3 : Plugin UI Convention (P2.1)

**Hypothèse** : Ajouter une convention `ui.angularComponents` dans les plugins DomOS.

**Validation** : Discuter avec le porteur du package `core` pour standardiser cette convention. Impact : types `DomOSClientPlugin` dans `packages/core/src/plugins/types.ts`.

### H4 : Demo Angular App

**Hypothèse** : Créer `apps/demo-angular` pour démontrer toutes les features.

**Validation** : Confirmer que Turborepo supporte Angular (spoiler: oui, mais nécessite `@angular/cli` dans le workspace). Définir si on utilise Angular 19+ (standalone components) ou une version antérieure.

### H5 : Audio Pipeline Rules (P0.2)

**Hypothèse** : Les règles R1-R7 de `docs/AUDIO_PIPELINE_RULES.md` s'appliquent strictement au voice service Angular.

**Validation** : Relire le document audio avant d'implémenter P0.2. Règles critiques :
- **R7** : Ne jamais appeler `AudioContext.close()` au stop de capture
- **R3** : `validLength = binary.length - (binary.length % 2)` avant de créer `Int16Array`

---

## 8. Next Steps

1. **Valider les hypothèses H1-H5** avec l'équipe Core (réunion ou async via issue)
2. **Créer les 7 canvas feature** listés en Section 5
3. **Créer `sprint_angular_alignment_orchestrator.md`** avec :
   - Ordre de livraison précis
   - Définition de `apps/demo-angular` (structure, user stories)
   - Gates de fin du sprint
4. **Démarrer par P1.4 (Resolver Helpers)** → feature la plus simple, déblocage immédiat

---

## 9. Estimation globale

| Feature | Priorité | Complexité | Estimation (jours) |
|---------|----------|------------|--------------------|
| P1.4 — Resolver Helpers | P1 | S | 0.5 |
| P0.1 — HITL Components | P0 | M | 2 |
| P1.1 — Agent UI Components | P1 | S | 1 |
| P0.2 — Voice Management | P0 | L | 4 |
| P1.2 — Agentic UI Tool | P1 | M | 2 |
| P1.3 — Widget Chat | P1 | L | 5 |
| P2.1 — Plugin UI System | P2 | M | 2 |
| **Demo Angular App** | - | M | 2 |
| **Documentation** | - | S | 1 |
| **TOTAL P0 + P1** | - | - | **14.5 jours** |
| **TOTAL avec P2** | - | - | **16.5 jours** |

**Recommandation** : Prévoir **3 semaines** pour livrer P0 + P1 + Demo + Docs.  
P2 peut être fait après (sprint ultérieur ou feature isolée).

---

## 10. Success Metrics

Le sprint sera considéré comme réussi si :

- [ ] **100% des features P0 et P1 sont implémentées et testées**
- [ ] **Démo Angular (`apps/demo-angular`) fonctionne end-to-end** :
  - Connexion WebSocket OK
  - Tool enregistrement/appel OK
  - HITL modal s'affiche pour tool high-risk
  - Voice capture + playback OK
  - Widget chat affiche messages texte + audio
- [ ] **Aucun import de `@domos/react` ou `@domos/vue`** dans le package Angular
- [ ] **Aucune duplication de code** de `@domos/ui` (utiliser le runtime partagé quand approprié)
- [ ] **Tests unitaires couvrent les services critiques** (DomOSVoiceService, DomOSApprovalService)
- [ ] **Documentation README.md** dans `packages/angular/` mise à jour avec exemples

---

## 11. Risques identifiés

| Risque | Impact | Mitigation |
|--------|--------|------------|
| **Voice Service (P0.2) prend plus de 4 jours** | Bloque P1.3 (Widget) | Prioriser P0.2 en premier. Si blocage, livrer P0.1 + P1.1 + P1.2 + P1.4 et reporter le widget à un sprint ultérieur. |
| **Shadow DOM requis pour le widget** (rejet de Light DOM) | Complexité +50% sur P1.3 | Valider H1 avant de démarrer P1.3. Si Shadow DOM requis, ajouter 2 jours d'estimation. |
| **Plugins UI non standardisés** | P2.1 impossible à implémenter | Discuter H3 avec Core. Si non résolu, P2.1 reste en draft. |
| **Angular 19 breaking changes** | Compatibilité codebase | Tester avec Angular 18 ET 19. Lock peerDependency `>=18.0.0`. |
| **Tests audio flaky** (environnement CI sans micro) | Faux négatifs en CI | Mocker `navigator.mediaDevices` dans les tests. Tests E2E voice réservés à des runs manuels. |

---

## Annexe A : Comparaison architecture React vs Vue vs Angular (actuel)

### React (`packages/react/`)

**Provider** : `<DomOSProvider>` (Context API)  
**Hooks** : `useAgent`, `useAgentTool`, `useVoiceMode`, etc.  
**Components** : TSX + CSS modules  
**Shadow DOM** : Oui (widget uniquement)  
**Voice** : `useVoiceMode` (~250 lignes, Web Audio API)

### Vue (`packages/vue/`)

**Provider** : `DomOSPlugin` (Vue Plugin API)  
**Composables** : `useAgent`, `useAgentTool`, `useVoiceMode`, etc.  
**Components** : SFC (`.vue` files)  
**Shadow DOM** : Non (Light DOM + wrapper `.domos-widget-root`)  
**Voice** : `useVoiceMode` (~280 lignes, Web Audio API)

### Angular (`packages/angular/`) — Actuel

**Provider** : `provideDomOS` (Angular DI)  
**Services** : `DomOSAngularService` (signals)  
**Components** : ❌ Aucun  
**Shadow DOM** : N/A  
**Voice** : ❌ Aucun

### Angular (`packages/angular/`) — Après sprint

**Provider** : `provideDomOS` (Angular DI)  
**Services** : `DomOSAngularService`, `DomOSVoiceService`, `DomOSApprovalService`  
**Components** : ✅ HITL (modal, banner), Agent UI (indicator, notification), Agentic UI (tool directive, tool btn), Widget (chat complet)  
**Shadow DOM** : Non (Light DOM + wrapper `.domos-widget-root`, comme Vue)  
**Voice** : ✅ `DomOSVoiceService` (~400 lignes, Web Audio API, identique à React/Vue)

---

**Fin du document.**
