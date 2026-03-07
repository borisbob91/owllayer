interface VoiceOverlayProps {
  isVoiceMode: boolean;
  isRecording: boolean;
  isThinking: boolean;
  isSpeaking: boolean;
  onFinishedSpeaking: () => void;  // arrête le micro, garde le mode vocal
  onRestartSpeaking: () => void;   // relance le micro (état ready)
  onExitVoice: () => void;         // quitte complètement le mode vocal
  agentError?: string | null;      // erreur serveur à afficher
  onErrorDismiss?: () => void;     // fermer l'erreur + quitter le vocal
}

/**
 * VoiceOverlay - UI vocale flottante.
 *
 * Reste visible tant que isVoiceMode est true.
 * 4 états :
 *  - listening : micro actif (bleu)
 *  - thinking  : agent réfléchit (violet)
 *  - speaking  : agent parle (vert)
 *  - ready     : en attente de prise de parole (gris)
 */
export function VoiceOverlay({
  isVoiceMode,
  isRecording,
  isThinking,
  isSpeaking,
  onFinishedSpeaking,
  onRestartSpeaking,
  onExitVoice,
  agentError,
  onErrorDismiss,
}: VoiceOverlayProps) {
  if (!isVoiceMode) return null;

  const state: 'listening' | 'thinking' | 'speaking' | 'ready' = isRecording
    ? 'listening'
    : isThinking
    ? 'thinking'
    : isSpeaking
    ? 'speaking'
    : 'ready';

  return (
    <div className="fixed inset-0 z-[9998] flex items-end justify-center pb-32 pointer-events-none">
      {/* Card principale */}
      <div className="pointer-events-auto w-72 rounded-3xl shadow-2xl overflow-hidden border border-white/10 bg-[rgba(15,15,20,0.92)] backdrop-blur-xl">

        {/* Bouton quitter — coin haut droit */}
        <div className="flex justify-end px-4 pt-3">
          <button
            onClick={onExitVoice}
            className="text-white/30 hover:text-white/70 text-xs flex items-center gap-1 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Quitter le vocal
          </button>
        </div>

        {/* Zone visuelle */}
        <div className="flex flex-col items-center pt-4 pb-6 px-6 gap-4">

          {/* Orbe animé */}
          <OrbVisual state={state} />

          {/* Label état */}
          <div className="text-center">
            <StateLabel state={state} />
          </div>

          {/* Barres audio (écoute / agent parle) */}
          {(state === 'listening' || state === 'speaking') && (
            <AudioBars state={state === 'speaking' ? 'speaking' : 'listening'} />
          )}
        </div>

        {/* Bouton principal du bas */}
        <div className="flex justify-center pb-6 px-6">
          {/* Bannière d'erreur — masque le bouton habituel */}
          {agentError ? (
            <div className="w-full flex flex-col items-center gap-3">
              <div className="w-full rounded-xl bg-red-900/60 border border-red-500/40 px-4 py-3 text-center">
                <p className="text-red-300 text-xs font-semibold">Erreur vocale</p>
                <p className="text-red-200/70 text-xs mt-1 break-words">{agentError}</p>
              </div>
              <button
                onClick={onErrorDismiss}
                className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-red-700 hover:bg-red-600 active:scale-95 transition-all"
              >
                Fermer
              </button>
            </div>
          ) : (<>
          {state === 'listening' && (
            <button
              onClick={onFinishedSpeaking}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all shadow-lg shadow-blue-900/40"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              J'ai fini de parler
            </button>
          )}
          {state === 'ready' && (
            <button
              onClick={onRestartSpeaking}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-gray-600 hover:bg-gray-500 active:scale-95 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 11a7 7 0 01-14 0m14 0a7 7 0 00-14 0m14 0v1a7 7 0 01-14 0v-1m7 8v4m-4 0h8" />
              </svg>
              Parler à nouveau
            </button>
          )}
          {(state === 'thinking' || state === 'speaking') && (
            <div className="text-white/30 text-xs">Patientez…</div>
          )}
          </>)}
        </div>
      </div>
    </div>
  );
}

// ── Orbe central ──────────────────────────────────────────────────

function OrbVisual({ state }: { state: 'listening' | 'thinking' | 'speaking' | 'ready' }) {
  if (state === 'listening') {
    return (
      <div className="relative flex items-center justify-center w-24 h-24">
        {/* Anneaux pulsants */}
        <span className="absolute w-24 h-24 rounded-full bg-blue-500/20 animate-ping [animation-duration:1.2s]" />
        <span className="absolute w-16 h-16 rounded-full bg-blue-500/30 animate-ping [animation-duration:1s] [animation-delay:200ms]" />
        {/* Icône micro */}
        <div className="relative z-10 w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/40">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 11a7 7 0 01-14 0m14 0a7 7 0 00-14 0m14 0v1a7 7 0 01-14 0v-1m7 8v4m-4 0h8" />
          </svg>
        </div>
      </div>
    );
  }

  if (state === 'thinking') {
    return (
      <div className="relative flex items-center justify-center w-24 h-24">
        {/* Gradient tournant */}
        <div className="absolute w-24 h-24 rounded-full animate-spin [animation-duration:1.5s] bg-[conic-gradient(from_0deg,transparent_60%,#7c3aed,transparent)]" />
        <div className="relative z-10 w-14 h-14 rounded-full bg-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/40">
          {/* Trois dots */}
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0ms]" />
            <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:150ms]" />
            <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    );
  }

  // speaking
  if (state === 'speaking') {
    return (
      <div className="relative flex items-center justify-center w-24 h-24">
        <span className="absolute w-24 h-24 rounded-full bg-emerald-500/15 animate-pulse" />
        <div className="relative z-10 w-14 h-14 rounded-full bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/40">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15.536 8.464a5 5 0 010 7.072M12 6v12M8.464 8.464a5 5 0 000 7.072M4.929 4.929a10 10 0 000 14.142M19.071 4.929a10 10 0 010 14.142" />
          </svg>
        </div>
      </div>
    );
  }

  // ready
  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <div className="relative z-10 w-14 h-14 rounded-full bg-gray-600 flex items-center justify-center shadow-lg">
        <svg className="w-7 h-7 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M19 11a7 7 0 01-14 0m14 0a7 7 0 00-14 0m14 0v1a7 7 0 01-14 0v-1m7 8v4m-4 0h8" />
        </svg>
      </div>
    </div>
  );
}

// ── Label ─────────────────────────────────────────────────────────

function StateLabel({ state }: { state: 'listening' | 'thinking' | 'speaking' | 'ready' }) {
  const config = {
    listening: { text: 'Je vous écoute…', color: 'text-blue-300', sub: 'Parlez maintenant' },
    thinking:  { text: 'Réflexion en cours…', color: 'text-purple-300', sub: 'Traitement de votre demande' },
    speaking:  { text: "L'assistant parle…", color: 'text-emerald-300', sub: 'Réponse vocale' },
    ready:     { text: 'Prêt à vous écouter', color: 'text-white/50', sub: 'Appuyez pour parler' },
  }[state];

  return (
    <>
      <p className={`text-base font-semibold ${config.color}`}>{config.text}</p>
      <p className="text-xs text-white/40 mt-0.5">{config.sub}</p>
    </>
  );
}

// ── Barres audio ──────────────────────────────────────────────────

// Heights et delays pré-définis — pas de valeurs dynamiques
const BAR_CONFIGS: { h: string; dur: string; delay: string }[] = [
  { h: 'h-3', dur: '[animation-duration:0.5s]',  delay: '[animation-delay:0ms]'   },
  { h: 'h-5', dur: '[animation-duration:0.65s]', delay: '[animation-delay:50ms]'  },
  { h: 'h-8', dur: '[animation-duration:0.8s]',  delay: '[animation-delay:100ms]' },
  { h: 'h-6', dur: '[animation-duration:0.5s]',  delay: '[animation-delay:150ms]' },
  { h: 'h-4', dur: '[animation-duration:0.65s]', delay: '[animation-delay:200ms]' },
  { h: 'h-7', dur: '[animation-duration:0.8s]',  delay: '[animation-delay:250ms]' },
  { h: 'h-5', dur: '[animation-duration:0.5s]',  delay: '[animation-delay:0ms]'   },
  { h: 'h-8', dur: '[animation-duration:0.65s]', delay: '[animation-delay:50ms]'  },
  { h: 'h-5', dur: '[animation-duration:0.8s]',  delay: '[animation-delay:100ms]' },
  { h: 'h-3', dur: '[animation-duration:0.5s]',  delay: '[animation-delay:150ms]' },
];

function AudioBars({ state }: { state: 'listening' | 'speaking' }) {
  const color = state === 'listening' ? 'bg-blue-400 opacity-70' : 'bg-emerald-400';

  return (
    <div className="flex items-end gap-1 h-8">
      {BAR_CONFIGS.map((bar, i) => (
        <div
          key={i}
          className={`w-1.5 rounded-full animate-bounce ${color} ${bar.h} ${bar.dur} ${bar.delay}`}
        />
      ))}
    </div>
  );
}
