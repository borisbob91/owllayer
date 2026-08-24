<script setup lang="ts">
import { ref, watch, nextTick, computed, onMounted } from 'vue';
import { useAgent, useVoiceMode } from '@owllayer/vue';

interface Message {
  id: number;
  role: 'user' | 'agent';
  text: string;
  time: string;
}

const isOpen = ref(false);
const inputText = ref('');
const messages = ref<Message[]>([
  { id: 0, role: 'agent', text: 'Bonjour ! Je suis votre assistant admin. Je peux ajouter, modifier ou supprimer des produits. Parlez ou tapez votre commande.', time: now() },
]);
const scrollEl = ref<HTMLElement | null>(null);
let msgId = 1;

const { state, sendText, onAudioOutput } = useAgent();
const { isRecording, voiceState, startRecording, stopRecording, playAudioChunk } = useVoiceMode({ live: true });

// S'assurer que ce composant est bien le destinataire du callback audio au montage
// (priorité live — s'exécute après les setup() des composants enfants)
onMounted(() => {
  onAudioOutput?.((audioBase64, mimeType) => {
    playAudioChunk(audioBase64, mimeType);
  });
});

function now() {
  return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// Ajouter réponse agent quand lastResponse change
watch(() => state.lastResponse, (val) => {
  if (val) {
    messages.value.push({ id: msgId++, role: 'agent', text: val, time: now() });
    scrollToBottom();
  }
});

function send() {
  const text = inputText.value.trim();
  if (!text) return;
  messages.value.push({ id: msgId++, role: 'user', text, time: now() });
  sendText(text);
  inputText.value = '';
  scrollToBottom();
}

async function scrollToBottom() {
  await nextTick();
  scrollEl.value?.scrollTo({ top: scrollEl.value.scrollHeight, behavior: 'smooth' });
}

function toggleVoice() {
  if (isRecording.value) stopRecording();
  else startRecording();
}

const agentStatusLabel = computed(() => {
  if (state.agentState === 'thinking') return '● Réfléchit…';
  if (state.agentState === 'speaking') return '● Répond…';
  if (isRecording.value) return '● Écoute votre voix…';
  return null;
});

const voiceButtonClass = computed(() => {
  if (isRecording.value) return 'bg-red-500 hover:bg-red-600 ring-2 ring-red-400/40 animate-pulse';
  if (voiceState.value === 'playing') return 'bg-green-500 hover:bg-green-600';
  return 'bg-slate-700 hover:bg-slate-600';
});

// Dot de statut dans le header — priorité : thinking > speaking > recording > connected > off
const statusDotClass = computed(() => {
  if (!state.isConnected) return 'bg-red-500';
  if (state.agentState === 'disconnected') return 'bg-slate-500';
  if (state.agentState === 'thinking') return 'bg-amber-400 animate-pulse';
  if (state.agentState === 'speaking') return 'bg-green-400 animate-pulse';
  if (isRecording.value) return 'bg-violet-400 animate-pulse';
  return 'bg-green-400';
});
</script>

<template>
  <!-- Floating toggle button -->
  <button
    @click="isOpen = !isOpen"
    class="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/30 flex items-center justify-center transition-all duration-200"
    :class="isOpen ? 'rotate-45 bg-slate-700 hover:bg-slate-600' : ''"
    title="Ouvrir l'assistant"
  >
    <svg v-if="!isOpen" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
    <span v-else class="text-xl font-light">×</span>
  </button>

  <!-- Panel slide-over -->
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="translate-x-full opacity-0"
    enter-to-class="translate-x-0 opacity-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="translate-x-0 opacity-100"
    leave-to-class="translate-x-full opacity-0"
  >
    <div
      v-if="isOpen"
      class="fixed bottom-20 right-5 z-40 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      style="max-height: min(520px, calc(100vh - 120px))"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full" :class="statusDotClass" />
          <span class="text-white text-sm font-medium">Assistant Admin</span>
        </div>
        <span v-if="agentStatusLabel" class="text-xs text-slate-400">{{ agentStatusLabel }}</span>
      </div>

      <!-- Messages -->
      <div ref="scrollEl" class="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="flex"
          :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[85%] px-3 py-2 rounded-xl text-sm"
            :class="msg.role === 'user'
              ? 'bg-violet-600 text-white rounded-br-sm'
              : 'bg-slate-800 text-slate-200 rounded-bl-sm'"
          >
            {{ msg.text }}
            <div class="text-xs mt-1 opacity-50">{{ msg.time }}</div>
          </div>
        </div>

        <!-- Typing indicator -->
        <div v-if="state.agentState === 'thinking'" class="flex justify-start">
          <div class="bg-slate-800 px-3 py-2 rounded-xl rounded-bl-sm flex gap-1 items-center">
            <span v-for="i in 3" :key="i" class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" :style="`animation-delay: ${(i - 1) * 0.15}s`" />
          </div>
        </div>
      </div>

      <!-- Input bar -->
      <div class="px-3 py-3 border-t border-slate-800 flex items-center gap-2">
        <!-- Mic button (Live mode) -->
        <button
          @click="toggleVoice"
          class="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
          :class="voiceButtonClass"
          :title="isRecording ? 'Arrêter le micro' : 'Parler (mode Live)'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>

        <!-- Text input -->
        <input
          v-model="inputText"
          @keydown.enter.prevent="send"
          type="text"
          placeholder="Tapez ou parlez…"
          class="flex-1 bg-slate-800 text-white placeholder-slate-500 text-sm px-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-violet-500 border border-transparent focus:border-violet-500/30"
          :disabled="!state.isConnected"
        />

        <!-- Send button -->
        <button
          @click="send"
          :disabled="!inputText.trim() || !state.isConnected"
          class="flex-shrink-0 w-9 h-9 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  </Transition>
</template>
