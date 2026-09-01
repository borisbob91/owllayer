<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import {
    createAgent,
    createVoiceMode,
    isThinking,
    isSpeaking,
    agentState,
    pendingApproval,
    approveAction,
    denyAction,
  } from '@owllayer/svelte';
  import { isPanelOpen, closePanel } from '../lib/panelStore';
  import { t, currentLocale } from '../lib/i18n';
  import { renderMarkdown } from '../lib/markdown';
  import { get } from 'svelte/store';

  const { sendText, onAudioOutput, lastResponse } = createAgent();
  const {
    isRecording,
    startRecording,
    stopRecording,
    playAudioChunk,
    destroy: destroyVoice,
  } = createVoiceMode({ live: true });

  // UI state
  let inputText = $state('');
  let micOnly   = $state(false);
  let messages  = $state<{ role: 'user' | 'agent'; text: string }[]>([
    { role: 'agent', text: get(t).agent.welcomeMsg },
  ]);
  let scrollEl = $state<HTMLElement | null>(null);

  // Audio visualisation
  const BAR_COUNT = 32;
  let barHeights  = $state<number[]>(Array(BAR_COUNT).fill(0));
  let audioCtx: AudioContext   | null = null;
  let analyser:  AnalyserNode  | null = null;
  let vizStream: MediaStream   | null = null;
  let rafId = 0;

  // Derived visual state
  const orbState = $derived(
    $isThinking  ? 'thinking'  :
    $isSpeaking  ? 'speaking'  :
    $isRecording ? 'listening' : 'idle'
  );

  // Subscribe to agent responses
  const unsubResponse = lastResponse.subscribe((val: string | null) => {
    if (val) {
      messages = [...messages, { role: 'agent', text: val }];
      tick().then(() => scrollEl?.scrollTo({ top: scrollEl.scrollHeight, behavior: 'smooth' }));
    }
  });

  // Start/stop mic analyser with recording state
  $effect(() => {
    if ($isRecording) {
      startMicViz();
      return stopMicViz;
    }
  });

  onMount(() => {
    onAudioOutput((b64: string, mime: string) => playAudioChunk(b64, mime));
  });

  onDestroy(() => {
    unsubResponse();
    if ($isRecording) stopRecording();
    destroyVoice();
    stopMicViz();
  });

  // ── Audio analysis ─────────────────────────────────────────────────────────

  async function startMicViz() {
    try {
      vizStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      audioCtx  = new AudioContext();
      analyser  = audioCtx.createAnalyser();
      analyser.fftSize               = 128;
      analyser.smoothingTimeConstant = 0.72;
      audioCtx.createMediaStreamSource(vizStream).connect(analyser);
      drawLoop();
    } catch {
      /* mic unavailable — CSS animations handle visual state */
    }
  }

  function drawLoop() {
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    barHeights = Array.from({ length: BAR_COUNT }, (_, i) => {
      const src = Math.floor(i * data.length / BAR_COUNT);
      return Math.max(3, (data[src] / 255) * 68);
    });
    rafId = requestAnimationFrame(drawLoop);
  }

  function stopMicViz() {
    cancelAnimationFrame(rafId);
    analyser?.disconnect();
    analyser = null;
    audioCtx?.close();
    audioCtx = null;
    vizStream?.getTracks().forEach((t) => t.stop());
    vizStream = null;
    barHeights = Array(BAR_COUNT).fill(0);
  }

  // ── Chat ──────────────────────────────────────────────────────────────────

  async function toggleMic() {
    if ($isRecording) stopRecording();
    else await startRecording();
  }

  function send() {
    const text = inputText.trim();
    if (!text) return;
    messages  = [...messages, { role: 'user', text }];
    sendText(text);
    inputText = '';
    tick().then(() => scrollEl?.scrollTo({ top: scrollEl.scrollHeight, behavior: 'smooth' }));
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }
</script>

<!-- ────────────────────────────────────────────────────────────────────────
     Side panel — slides in from the left, pushes content right
──────────────────────────────────────────────────────────────────────────── -->
<div class="panel" class:open={$isPanelOpen} aria-hidden={!$isPanelOpen}>
  <div class="panel-inner">

    <!-- Header -->
    <div class="panel-header">
      <div class="header-left">
        <div
          class="hdr-dot"
          class:thinking={orbState === 'thinking'}
          class:speaking={orbState === 'speaking'}
          class:listening={orbState === 'listening'}
          class:connected={$agentState === 'connected' && orbState === 'idle'}
        ></div>
        <span class="hdr-title">Assistant IA</span>
      </div>
      <div class="header-actions">
        <!-- Mic-only toggle -->
        <button
          class="mode-btn"
          class:active={micOnly}
          onclick={() => (micOnly = !micOnly)}
          title={micOnly ? 'Afficher le chat' : 'Mode micro seul'}
        >
          {#if micOnly}
            <!-- Chat icon -->
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          {:else}
            <!-- Mic-only icon -->
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
            </svg>
          {/if}
        </button>

        <!-- Close -->
        <button class="close-btn" onclick={closePanel} aria-label="Fermer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- ── Audio Visualiser ─────────────────────────────────────────────── -->
    <div class="viz-wrap"
        class:state-thinking={orbState === 'thinking'}
        class:state-speaking={orbState === 'speaking'}
        class:state-listening={orbState === 'listening'}
        class:mic-only={micOnly}
      >

      <!-- Ambient glow orb -->
      <div class="orb-glow"></div>

      <!-- Waveform bars -->
      <div
        class="waveform"
        class:animate-idle={orbState === 'idle'}
        class:animate-thinking={orbState === 'thinking'}
        class:animate-speaking={orbState === 'speaking'}
      >
        {#each Array.from({ length: BAR_COUNT }, (_, i): number => i) as i}
          {@const h           = barHeights[i] || 0}
          {@const dist        = Math.abs(i - (BAR_COUNT / 2 - 0.5))}
          {@const hasRealData = $isRecording && h > 3}
          <div
            class="bar"
            style="
              --idx: {i};
              --dist: {dist};
              {hasRealData ? `height: ${h}px;` : ''}
            "
          ></div>
        {/each}
      </div>

      <!-- State label -->
      <p class="viz-label">
{#if orbState === 'thinking'}
          {$currentLocale === 'fr' ? 'Réflexion…' : 'Thinking…'}
        {:else if orbState === 'speaking'}
          {$currentLocale === 'fr' ? 'Répond…' : 'Speaking…'}
        {:else if orbState === 'listening'}
          {$currentLocale === 'fr' ? 'Écoute…' : 'Listening…'}
        {:else if $agentState === 'connected'}
          {$currentLocale === 'fr' ? 'En attente' : 'Ready'}
        {:else if $agentState === 'connecting'}
          {$currentLocale === 'fr' ? 'Connexion…' : 'Connecting…'}
        {:else if $agentState === 'error'}
          {$currentLocale === 'fr' ? 'Erreur' : 'Error'}
        {:else if $agentState === 'disconnected'}
          {$currentLocale === 'fr' ? 'Déconnecté' : 'Disconnected'}
        {:else}
          {$currentLocale === 'fr' ? 'Connexion…' : 'Connecting…'}
        {/if}
      </p>
    </div>

    <!-- ── Approval banner ─────────────────────────────────────────────── -->
    {#if $pendingApproval}
      <div class="approval">
        <div class="approval-top">
          <span class="approval-icon">⚠️</span>
          <div>
            <p class="approval-tool">
              {#if $pendingApproval.toolName === 'book_trip'}
                {$t.agent.approvalBookTitle}
              {:else if $pendingApproval.toolName === 'clear_itinerary'}
                {$currentLocale === 'fr' ? 'Suppression de l\'itinéraire' : 'Clear Itinerary'}
              {:else if $pendingApproval.toolName === 'confirm_checkout'}
                {$currentLocale === 'fr' ? 'Confirmation de la commande' : 'Order Confirmation'}
              {:else}
                {$pendingApproval.toolName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              {/if}
            </p>
            <p class="approval-msg">
              {#if $pendingApproval.toolName === 'book_trip' || $pendingApproval.toolName === 'confirm_checkout'}
                {$t.agent.approvalBookDesc}
              {:else if $currentLocale === 'en' && $pendingApproval.message?.includes('ACTION CRITIQUE')}
                CRITICAL ACTION: The assistant wishes to execute "{$pendingApproval.toolName.replace(/_/g, ' ')}". This action is irreversible. Are you sure?
              {:else if $currentLocale === 'en' && $pendingApproval.message?.includes('souhaite executer')}
                The assistant wishes to execute "{$pendingApproval.toolName.replace(/_/g, ' ')}". Confirm?
              {:else}
                {$pendingApproval.message || $t.agent.approvalBookDesc}
              {/if}
            </p>
          </div>
        </div>
        <div class="approval-btns">
          <button class="btn-approve" onclick={approveAction}>{$t.common.confirm}</button>
          <button class="btn-deny"    onclick={denyAction}>{$t.common.cancel}</button>
        </div>
      </div>
    {/if}

    <!-- ── Messages + Input (hidden in mic-only mode) ─────────────────── -->
    {#if !micOnly}
    <!-- ── Messages ────────────────────────────────────────────────────── -->
    <div class="messages" bind:this={scrollEl}>
      {#each messages as msg (msg.text + msg.role)}
        <div class="msg-row" class:user={msg.role === 'user'}>
          <div class="bubble" class:user-bubble={msg.role === 'user'}>
            {@html renderMarkdown(msg.text)}
          </div>
        </div>
      {/each}

      {#if $isThinking}
        <div class="msg-row">
          <div class="bubble thinking-bubble">
            <span class="t-dot"></span>
            <span class="t-dot"></span>
            <span class="t-dot"></span>
          </div>
        </div>
      {/if}
    </div>

    <!-- ── Input bar ────────────────────────────────────────────────────── -->
    <div class="input-bar">
      <button
        class="mic-btn"
        class:active={$isRecording}
        onclick={toggleMic}
        title={$isRecording ? 'Arrêter le micro' : 'Parler'}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
        </svg>
      </button>

      <input
        type="text"
        bind:value={inputText}
        onkeydown={handleKey}
        placeholder={$t.agent.inputPlaceholder}
        class="text-input"
      />

      <button
        class="send-btn"
        onclick={send}
        disabled={!inputText.trim()}
        aria-label={$t.common.send}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
        </svg>
      </button>
    </div><!-- end input-bar -->
    {/if}<!-- end !micOnly -->

  </div>
</div>

<style>
  /* ── Panel shell ───────────────────────────────────────────────────────── */
  .panel {
    width: 0;
    flex-shrink: 0;
    overflow: hidden;
    align-self: stretch;
    border-right: 0px solid var(--border);
    transition:
      width      0.32s cubic-bezier(0.4, 0, 0.2, 1),
      border-width 0.32s cubic-bezier(0.4, 0, 0.2, 1);
    background: var(--bg-card);
  }
  .panel.open {
    width: 320px;
    border-right-width: 1px;
  }

  /* Inner — fixed width so it doesn't squash during animation */
  .panel-inner {
    width: 320px;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* ── Header ───────────────────────────────────────────────────────────── */
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .hdr-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #374151;
    transition: background 0.4s;
    flex-shrink: 0;
  }
  .hdr-dot.connected { background: var(--success); }
  .hdr-dot.thinking  { background: #a855f7; animation: pulse-dot 1s infinite; }
  .hdr-dot.speaking  { background: #3b82f6; animation: pulse-dot 0.75s infinite; }
  .hdr-dot.listening { background: #ef4444; animation: pulse-dot 0.5s infinite; }
  .hdr-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    letter-spacing: -0.01em;
  }
  .close-btn {
    width: 28px;
    height: 28px;
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    transition: all 0.15s;
    border: 1px solid transparent;
  }
  .close-btn:hover {
    background: rgba(255,255,255,0.06);
    border-color: var(--border);
    color: var(--text);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .mode-btn {
    width: 28px;
    height: 28px;
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    border: 1px solid transparent;
    transition: all 0.15s;
  }
  .mode-btn:hover {
    background: rgba(255,255,255,0.06);
    border-color: var(--border);
    color: var(--text);
  }
  .mode-btn.active {
    background: rgba(139,92,246,0.12);
    border-color: rgba(139,92,246,0.3);
    color: #c4b5fd;
  }

  /* ── Visualiser ───────────────────────────────────────────────────────── */
  .viz-wrap {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px 16px 20px;
    flex-shrink: 0;
    overflow: hidden;
    border-bottom: 1px solid var(--border);
  }

  /* Ambient orb behind bars */
  .orb-glow {
    position: absolute;
    width: 200px;
    height: 80px;
    border-radius: 50%;
    background: radial-gradient(ellipse, rgba(59,130,246,0.12) 0%, transparent 70%);
    transition: opacity 0.5s;
    pointer-events: none;
  }
  .state-listening .orb-glow {
    background: radial-gradient(ellipse, rgba(239,68,68,0.18) 0%, transparent 70%);
    animation: orb-breathe 0.5s ease-in-out infinite alternate;
  }
  .state-speaking .orb-glow {
    background: radial-gradient(ellipse, rgba(59,130,246,0.22) 0%, transparent 70%);
    animation: orb-breathe 0.3s ease-in-out infinite alternate;
  }
  .state-thinking .orb-glow {
    background: radial-gradient(ellipse, rgba(168,85,247,0.16) 0%, transparent 70%);
    animation: orb-breathe 1.2s ease-in-out infinite alternate;
  }

  /* Waveform container */
  .waveform {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 2.5px;
    height: 64px;
  }

  /* Individual bar */
  .bar {
    width: 3px;
    height: 4px;
    border-radius: 2px;
    flex-shrink: 0;
    /* Color: center bars brighter blue → outer bars violet */
    background: color-mix(
      in oklch,
      #3b82f6 calc((1 - var(--dist) / 16) * 100%),
      #a78bfa
    );
    filter: drop-shadow(0 0 2px color-mix(in oklch, #3b82f6 50%, #a78bfa));
    transition: height 0.05s linear;
  }

  /* ── Idle animation — subtle breathing ── */
  .animate-idle .bar {
    animation: bar-breathe 2.8s ease-in-out infinite;
    animation-delay: calc(var(--idx) * 0.09s);
  }
  @keyframes bar-breathe {
    0%, 100% { height: 4px; opacity: 0.35; }
    50%       { height: 9px; opacity: 0.6;  }
  }

  /* ── Thinking animation — ripple from centre ── */
  .animate-thinking .bar {
    animation: bar-think 1.6s ease-in-out infinite;
    /* negative delay creates offset so center bars lead */
    animation-delay: calc(var(--dist) * -0.055s);
  }
  @keyframes bar-think {
    0%, 100% { height: 4px; opacity: 0.4; }
    50%       { height: 36px; opacity: 1;  }
  }

  /* ── Speaking animation — fast rolling wave ── */
  .animate-speaking .bar {
    animation: bar-speak 0.42s ease-in-out infinite alternate;
    animation-delay: calc(var(--idx) * 0.022s);
  }
  @keyframes bar-speak {
    from { height: 6px;  opacity: 0.6; }
    to   { height: 52px; opacity: 1;   }
  }

  @keyframes orb-breathe {
    from { transform: scale(0.9); opacity: 0.7; }
    to   { transform: scale(1.2); opacity: 1;   }
  }

  /* Mic-only mode: visualiser fills the panel */
  .viz-wrap.mic-only {
    flex: 1;
    border-bottom: none;
    padding: 40px 16px;
  }
  .viz-wrap.mic-only .waveform { transform: scale(1.25); }
  .viz-wrap.mic-only .orb-glow { width: 260px; height: 120px; }

  /* Viz label */
  .viz-label {
    margin-top: 14px;
    font-size: 11px;
    color: var(--text-muted);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-weight: 500;
  }

  /* ── Approval ─────────────────────────────────────────────────────────── */
  .approval {
    margin: 12px;
    border-radius: 10px;
    border: 1px solid rgba(245,158,11,0.3);
    background: rgba(245,158,11,0.06);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex-shrink: 0;
  }
  .approval-top {
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }
  .approval-icon { font-size: 15px; flex-shrink: 0; }
  .approval-tool { font-size: 12px; font-weight: 600; color: #fcd34d; }
  .approval-msg  { font-size: 11px; color: var(--text-muted); margin-top: 2px; line-height: 1.4; }
  .approval-btns { display: flex; gap: 6px; }
  .btn-approve {
    flex: 1;
    padding: 7px;
    border-radius: 7px;
    background: rgba(16,185,129,0.15);
    border: 1px solid rgba(16,185,129,0.3);
    color: #6ee7b7;
    font-size: 12px;
    font-weight: 600;
    transition: all 0.15s;
  }
  .btn-approve:hover { background: rgba(16,185,129,0.25); }
  .btn-deny {
    flex: 1;
    padding: 7px;
    border-radius: 7px;
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border);
    color: var(--text-muted);
    font-size: 12px;
    transition: all 0.15s;
  }
  .btn-deny:hover { background: rgba(255,255,255,0.08); color: var(--text); }

  /* ── Messages ─────────────────────────────────────────────────────────── */
  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 14px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 0;
  }

  .msg-row {
    display: flex;
    justify-content: flex-start;
    animation: msg-in 0.2s ease both;
  }
  .msg-row.user { justify-content: flex-end; }

  @keyframes msg-in {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .bubble {
    max-width: 88%;
    padding: 9px 13px;
    border-radius: 14px;
    border-bottom-left-radius: 4px;
    font-size: 13px;
    line-height: 1.5;
    color: #f8fafc;
    background: rgba(255,255,255,0.09);
    border: 1px solid rgba(255,255,255,0.14);
    box-shadow: 0 2px 10px rgba(0,0,0,0.15);
  }
  .bubble.user-bubble {
    background: linear-gradient(135deg, rgba(59,130,246,0.45), rgba(139,92,246,0.45));
    border-color: rgba(139,92,246,0.4);
    border-bottom-left-radius: 14px;
    border-bottom-right-radius: 4px;
    color: #ffffff;
  }

  :global(.bubble .chat-bold) {
    font-weight: 600;
    color: #ffffff;
  }
  :global(.bubble .chat-italic) {
    font-style: italic;
    color: #cbd5e1;
  }
  :global(.bubble .chat-link) {
    color: #93c5fd;
    text-decoration: underline;
  }
  :global(.bubble .chat-link:hover) {
    color: #bfdbfe;
  }
  :global(.bubble .chat-list) {
    margin: 6px 0;
    padding-left: 2px;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  :global(.bubble .chat-list-item) {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    line-height: 1.45;
  }
  :global(.bubble .chat-bullet) {
    color: #60a5fa;
    font-weight: bold;
    user-select: none;
  }
  :global(.bubble .chat-paragraph) {
    margin-top: 6px;
  }
  :global(.bubble .chat-inline-code) {
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #93c5fd;
    font-family: monospace;
    font-size: 11.5px;
    padding: 1px 5px;
    border-radius: 4px;
  }
  :global(.bubble .chat-code-block) {
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    padding: 8px 10px;
    margin: 6px 0;
    font-family: monospace;
    font-size: 11.5px;
    color: #93c5fd;
    overflow-x: auto;
  }

  /* Thinking dots */
  .thinking-bubble {
    display: flex;
    gap: 4px;
    align-items: center;
    padding: 10px 14px;
  }
  .t-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(255,255,255,0.6);
    animation: t-bounce 1.1s ease-in-out infinite;
  }
  .t-dot:nth-child(2) { animation-delay: 0.18s; }
  .t-dot:nth-child(3) { animation-delay: 0.36s; }
  @keyframes t-bounce {
    0%, 60%, 100% { transform: translateY(0);   opacity: 0.4; }
    30%            { transform: translateY(-6px); opacity: 1;   }
  }

  /* ── Input bar ────────────────────────────────────────────────────────── */
  .input-bar {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 10px 12px;
    border-top: 1px solid var(--border);
    background: rgba(13, 20, 36, 0.6);
    flex-shrink: 0;
  }

  .mic-btn {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-dim);
    border: 1px solid var(--border);
    background: rgba(255,255,255,0.08);
    transition: all 0.18s;
    flex-shrink: 0;
  }
  .mic-btn:hover { background: rgba(255,255,255,0.15); color: #ffffff; }
  .mic-btn.active {
    background: rgba(239,68,68,0.2);
    border-color: rgba(239,68,68,0.45);
    color: #fca5a5;
    animation: pulse-dot 0.7s ease-in-out infinite;
  }

  .text-input {
    flex: 1;
    background: rgba(255,255,255,0.08);
    border: 1px solid var(--border);
    border-radius: 10px;
    color: #ffffff;
    font-size: 13px;
    padding: 7px 11px;
    outline: none;
    transition: border-color 0.18s, background 0.18s;
    min-width: 0;
  }
  .text-input:focus {
    border-color: rgba(139,92,246,0.5);
    background: rgba(255,255,255,0.12);
  }
  .text-input::placeholder { color: #94a3b8; }

  .send-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(59,130,246,0.22);
    border: 1px solid rgba(59,130,246,0.4);
    color: #bfdbfe;
    transition: all 0.18s;
    flex-shrink: 0;
  }
  .send-btn:hover:not(:disabled) {
    background: rgba(59,130,246,0.38);
    border-color: rgba(59,130,246,0.65);
    color: #ffffff;
  }
  .send-btn:disabled { opacity: 0.3; cursor: not-allowed; }
</style>
