import { useState, useRef, useEffect } from 'react';
import { useAgent, useVoiceMode } from '@owllayer/react';
import { VoiceOverlay } from './VoiceOverlay';
import { MarkdownText } from './MarkdownText';
import { useI18n } from '../i18n';

interface Message {
  role: 'user' | 'agent';
  text: string;
  timestamp: number;
}

export function ChatPanel() {
  const { sendText, lastResponse, isThinking, isSpeaking, isConnected, agentError, clearAgentError } = useAgent();
  const { isRecording, startRecording, stopRecording } = useVoiceMode({ live: true });
  const { t } = useI18n();

  // isVoiceMode reste true pendant thinking/speaking — l'overlay ne disparaît pas
  const [isVoiceMode, setIsVoiceMode] = useState(false);

  // État vocal dérivé pour les styles
  const voiceState = isSpeaking ? 'speaking' : isThinking ? 'thinking' : isRecording ? 'listening' : 'idle';

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Ajouter la reponse de l'agent aux messages
  useEffect(() => {
    if (lastResponse) {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'agent') {
          return [...prev.slice(0, -1), { ...last, text: lastResponse }];
        }
        return [...prev, { role: 'agent', text: lastResponse, timestamp: Date.now() }];
      });
    }
  }, [lastResponse]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !isConnected) return;

    setMessages((prev) => [...prev, { role: 'user', text: input, timestamp: Date.now() }]);
    sendText(input);
    setInput('');
  };

  const handleStartVoice = async () => {
    try {
      await startRecording();
      setIsVoiceMode(true);
    } catch (err) {
      console.error("Erreur au lancement du vocal:", err);
    }
  };

  // Fin de prise de parole : stop micro seulement, l'overlay reste
  const handleFinishedSpeaking = () => {
    stopRecording();
  };

  // Reprendre la parole depuis l'état "prêt"
  const handleRestartSpeaking = async () => {
    try {
      await startRecording();
    } catch (err) {
      console.error('Erreur relance micro:', err);
    }
  };

  // Quitter complètement le mode vocal
  const handleExitVoice = () => {
    stopRecording();
    setIsVoiceMode(false);
  };

  // Quand une erreur audio arrive : arrêter le micro pour stopper le flood AUDIO_STREAM
  // L'overlay reste ouvert pour afficher l'erreur à l'utilisateur
  useEffect(() => {
    if (agentError && isVoiceMode) {
      stopRecording();
    }
  }, [agentError]);

  // Fermer la bannière d'erreur et quitter le mode vocal
  const handleErrorDismiss = () => {
    clearAgentError();
    setIsVoiceMode(false);
  };

  return (
    <>
      {/* Overlay vocal — reste visible tant que isVoiceMode est true */}
      <VoiceOverlay
        isVoiceMode={isVoiceMode}
        isRecording={isRecording}
        isThinking={isThinking}
        isSpeaking={isSpeaking}
        onFinishedSpeaking={handleFinishedSpeaking}
        onRestartSpeaking={handleRestartSpeaking}
        onExitVoice={handleExitVoice}
        agentError={agentError}
        onErrorDismiss={handleErrorDismiss}
      />

      {/* Bouton micro flottant — masqué quand le mode vocal est actif */}
      {!isRecording && !isVoiceMode && (
        <button
          onClick={handleStartVoice}
          title={t.chat.voiceMode}
          className="fixed bottom-6 right-24 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all bg-gray-800 hover:bg-gray-700 text-white/70 hover:text-white border border-white/10"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 11a7 7 0 01-14 0m14 0a7 7 0 00-14 0m14 0v1a7 7 0 01-14 0v-1m7 8v4m-4 0h8" />
          </svg>
        </button>
      )}

      {/* Bouton flottant chat */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
          isOpen ? 'bg-gray-700 hover:bg-gray-800' : 'bg-owllayer-600 hover:bg-owllayer-700'
        } ${isThinking ? 'animate-pulse' : ''}`}
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header — couleur dynamique selon l'état vocal */}
          <div className={`text-white px-4 py-3 flex items-center justify-between transition-colors duration-300 ${
            voiceState === 'listening' ? 'bg-blue-600'
            : voiceState === 'thinking' ? 'bg-purple-700'
            : voiceState === 'speaking' ? 'bg-emerald-600'
            : 'bg-owllayer-600'
          }`}>
            <div className="flex items-center gap-2">
              {/* Point d'état animé */}
              <div className={`w-2 h-2 rounded-full ${
                voiceState === 'listening' ? 'bg-blue-200 animate-ping'
                : voiceState === 'thinking' ? 'bg-purple-200 animate-pulse'
                : voiceState === 'speaking' ? 'bg-emerald-200 animate-bounce'
                : 'bg-green-400'
              }`} />
              <span className="font-medium text-sm">{t.chat.assistantName}</span>
            </div>
            <span className="text-xs opacity-75">
              {voiceState === 'listening' ? t.chat.listening
              : voiceState === 'thinking' ? t.chat.thinking
              : voiceState === 'speaking' ? t.chat.speaking
              : t.chat.online}
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 text-sm mt-8">
                <p className="font-medium">{t.chat.helloTitle}</p>
                <p className="mt-1">{t.chat.helloMsg}</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3.5 py-2 rounded-xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-owllayer-600 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm border border-gray-200/60'
                  }`}
                >
                  {msg.role === 'agent' ? (
                    <MarkdownText content={msg.text} />
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-2 rounded-xl rounded-bl-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            )}

            {agentError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between gap-2">
                <span>⚠️ {agentError}</span>
                <button onClick={clearAgentError} className="text-red-500 hover:text-red-800 font-bold px-1.5 py-0.5 rounded" title="Fermer">✕</button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input — masqué en mode vocal */}
          {!isVoiceMode ? (
            <div className="border-t border-gray-200 p-3 flex items-center gap-2">
              {/* Bouton micro */}
              <button
                onClick={handleStartVoice}
                className="p-2 rounded-lg transition-all bg-gray-100 text-gray-500 hover:bg-gray-200"
                title={t.chat.voiceMode}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-14 0m14 0a7 7 0 00-14 0m14 0v1a7 7 0 01-14 0v-1m7 8v4m-4 0h8" />
                </svg>
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={t.chat.placeholder}
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-owllayer-500 focus:border-transparent"
                disabled={!isConnected}
              />

              <button
                onClick={handleSend}
                disabled={!input.trim() || !isConnected}
                title={t.common.send}
                className="btn-primary text-sm px-3 py-2 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="border-t border-gray-200 p-3 flex items-center justify-center gap-2 text-xs text-gray-400">
              <div className={`w-2 h-2 rounded-full ${
                voiceState === 'listening' ? 'bg-blue-400 animate-ping'
                : voiceState === 'thinking' ? 'bg-purple-400 animate-pulse'
                : voiceState === 'speaking' ? 'bg-emerald-400 animate-bounce'
                : 'bg-gray-400'
              }`} />
              {t.chat.voiceModeActive}
            </div>
          )}
        </div>
      )}
    </>
  );
}
