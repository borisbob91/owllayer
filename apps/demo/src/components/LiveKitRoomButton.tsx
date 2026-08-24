import { useAgent, useOwlLayerLiveKitRoom } from '@owllayer/react';

const OWLLAYER_ENDPOINT = import.meta.env.VITE_OWLLAYER_ENDPOINT || 'ws://localhost:4001/owllayer';
const OWLLAYER_API_KEY = import.meta.env.VITE_OWLLAYER_API_KEY || '';

/**
 * LiveKitRoomButton — Bouton flottant pour rejoindre/quitter une room LiveKit.
 *
 * Ajoute un controle vocal optionnel cote client sans remplacer OwlLayerClient :
 * - connectRoom / disconnectRoom
 * - mute / unmute micro
 * - etat connexion
 *
 * La session OwlLayer (Shadow Context, tools, HITL) reste entierement portee par ADTP.
 */
export function LiveKitRoomButton() {
  const { agentState, sessionId } = useAgent();
  const isOwlLayerSessionReady = Boolean(sessionId) && agentState !== 'disconnected' && agentState !== 'error';

  const {
    status,
    connectionState,
    isConnected: isRoomConnected,
    isMicrophoneEnabled,
    agentSpeaking,
    participantIdentity,
    connect,
    disconnect,
    toggleMicrophone,
    error,
  } = useOwlLayerLiveKitRoom({
    tokenEndpoint: OWLLAYER_ENDPOINT.replace(/^ws/, 'http') + '/livekit/token',
    apiKey: OWLLAYER_API_KEY,
    autoConnect: false,
    disconnectOnUnmount: true,
    microphoneEnabledOnConnect: true,
  });

  if (!isOwlLayerSessionReady) {
    return null;
  }

  const isRoomBusy = status === 'requesting-token' || status === 'connecting' || status === 'disconnecting';

  const statusLabel = {
    idle: 'Rejoindre le salon vocal',
    'requesting-token': 'Demande de token…',
    connecting: 'Connexion…',
    connected: isMicrophoneEnabled ? 'Micro actif' : 'Micro coupé',
    disconnecting: 'Déconnexion…',
    disconnected: 'Rejoindre le salon vocal',
    error: `Erreur: ${error?.message || 'inconnue'}`,
  }[status];

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2">
      <button
        onClick={() => {
          if (isRoomBusy) {
            return;
          }

          if (isRoomConnected) {
            disconnect();
          } else {
            void connect();
          }
        }}
        disabled={isRoomBusy}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-sm font-semibold transition-all active:scale-95 border border-white/10 ${
          isRoomConnected
            ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
            : status === 'error'
              ? 'bg-red-800 hover:bg-red-700 text-white'
              : 'bg-gray-800 hover:bg-gray-700 text-white/90'
        } ${isRoomBusy ? 'opacity-70 cursor-wait' : ''}`}
      >
        {/* Point d'etat */}
        <span
          className={`w-2 h-2 rounded-full ${
            status === 'connected'
              ? 'bg-emerald-400'
              : status === 'connecting' || status === 'requesting-token'
                ? 'bg-yellow-400 animate-pulse'
                : status === 'error'
                  ? 'bg-red-400'
                  : 'bg-gray-500'
          }`}
        />
        {statusLabel}
      </button>

      {isRoomConnected && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800/80 text-xs text-white/60">
          {/* Bouton micro */}
          <button
            onClick={toggleMicrophone}
            className={`p-1 rounded transition-colors ${
              isMicrophoneEnabled
                ? 'text-emerald-400 hover:text-emerald-300'
                : 'text-red-400 hover:text-red-300'
            }`}
            title={isMicrophoneEnabled ? 'Couper le micro' : 'Activer le micro'}
          >
            {isMicrophoneEnabled ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 11a7 7 0 01-14 0m14 0a7 7 0 00-14 0m14 0v1a7 7 0 01-14 0v-1m7 8v4m-4 0h8" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            )}
          </button>

          {/* Etat connexion + agent qui parle */}
          <span>
            {agentSpeaking
              ? 'Agent parle…'
              : `Room: ${connectionState || 'connecte'}`}
          </span>

          {/* Identite participant */}
          {participantIdentity && (
            <span className="text-white/40" title={participantIdentity}>
              {participantIdentity.slice(0, 8)}…
            </span>
          )}
        </div>
      )}
    </div>
  );
}
