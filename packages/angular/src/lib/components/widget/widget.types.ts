export interface WidgetMessage {
  id: string;
  role: 'user' | 'assistant' | 'agent';
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
