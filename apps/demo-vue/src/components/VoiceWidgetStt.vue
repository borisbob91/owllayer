<script setup lang="ts">
import { ref, watch, nextTick, computed, onUnmounted } from 'vue';
import { useAgent, useVoiceMode, useApproval } from '@owllayer/vue';
import { renderMarkdown } from '../utils/markdown';
import { useI18n } from '../i18n';

const { pendingApproval, approve, deny } = useApproval();
const { t } = useI18n();

function formatApprovalText(approval: any): { title: string; desc: string; detail?: string } {
  if (!approval) return { title: t.value.agent.approvalRequiredTitle, desc: '' };
  if (approval.toolName === 'delete_product') {
    const id = approval.args?.id as string | undefined;
    return {
      title: t.value.agent.approvalDeleteTitle,
      desc: t.value.agent.approvalDeleteDesc,
      detail: id ? `ID: ${id}` : undefined,
    };
  }
  if (approval.toolName === 'edit_product') {
    return {
      title: t.value.agent.approvalEditTitle,
      desc: t.value.agent.approvalEditDesc,
      detail: approval.args?.id ? `ID: ${approval.args.id}` : undefined,
    };
  }
  return {
    title: t.value.agent.approvalRequiredTitle,
    desc: approval.message || t.value.agent.approvalRequiredDesc,
    detail: undefined,
  };
}

/**
 * VoiceWidgetStt — Hybrid Google STT + Google TTS mode.
 */

interface Message {
  id: number;
  role: 'user' | 'agent';
  text: string;
  time: string;
  isAudio?: boolean;
}

const isOpen = ref(false);
const inputText = ref('');
const transcript = ref<string | null>(null);
const messages = ref<Message[]>([
  {
    id: 0,
    role: 'agent',
    text: t.value.agent.sttWelcome,
    time: now(),
  },
]);
const scrollEl = ref<HTMLElement | null>(null);
let msgId = 1;

const { state, sendText, onAudioOutput } = useAgent();
const { isRecording, voiceState, startRecording, stopRecording, playAudioChunk } =
  useVoiceMode({ live: false });

// Register audio output callback when widget opens
watch(isOpen, (open) => {
  if (open) {
    onAudioOutput?.((audioBase64, mimeType) => {
      playAudioChunk(audioBase64, mimeType);
    });
  }
});

onUnmounted(() => {
  if (isOpen.value) {
    onAudioOutput?.(() => {});
  }
});

function now() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// Add agent reply to chat
watch(() => state.lastResponse, (val) => {
  if (!val) return;
  messages.value.push({ id: msgId++, role: 'agent', text: val, time: now() });
  scrollToBottom();
});

// Final transcript on recording end
watch(() => state.agentState, (val, prev) => {
  if (prev === 'listening' && val === 'thinking' && transcript.value) {
    messages.value.push({
      id: msgId++,
      role: 'user',
      text: transcript.value,
      time: now(),
      isAudio: true,
    });
    transcript.value = null;
    scrollToBottom();
  }
});

// Reset transcript when done
watch(isRecording, (recording) => {
  if (!recording) transcript.value = null;
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

const micButtonClass = computed(() => {
  if (isRecording.value) return 'bg-red-500 hover:bg-red-600 ring-2 ring-red-400/40 animate-pulse';
  return 'bg-slate-700 hover:bg-emerald-600';
});

const statusDotClass = computed(() => ({
  'bg-emerald-400': state.agentState === 'connected' && !isRecording.value,
  'bg-violet-400 animate-pulse': isRecording.value,
  'bg-amber-400 animate-pulse': state.agentState === 'thinking',
  'bg-emerald-400 animate-pulse': state.agentState === 'speaking',
  'bg-red-500': !state.isConnected,
  'bg-slate-500': state.agentState === 'disconnected',
}));

const statusLabel = computed(() => {
  if (isRecording.value) return t.value.agent.sttListening;
  if (state.agentState === 'thinking') return t.value.agent.sttThinking;
  if (state.agentState === 'speaking') return t.value.agent.sttSpeaking;
  return null;
});
</script>

<template>
  <!-- Floating toggle — bottom-left -->
  <button
    @click="isOpen = !isOpen"
    class="fixed bottom-5 left-5 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200"
    :class="isOpen
      ? 'bg-slate-700 hover:bg-slate-600 rotate-45'
      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'"
    title="STT/TTS Voice Assistant"
  >
    <!-- Mic icon when closed -->
    <svg v-if="!isOpen" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
    <span v-else class="text-xl font-light text-white">×</span>
  </button>

  <!-- Panel -->
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="-translate-x-4 opacity-0"
    enter-to-class="translate-x-0 opacity-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="translate-x-0 opacity-100"
    leave-to-class="-translate-x-4 opacity-0"
  >
    <div
      v-if="isOpen"
      class="fixed bottom-20 left-5 z-40 w-80 bg-slate-900 border border-emerald-900/40 rounded-2xl shadow-2xl shadow-emerald-950/30 flex flex-col overflow-hidden"
      style="max-height: min(520px, calc(100vh - 120px))"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-emerald-950/20">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full" :class="statusDotClass" />
          <span class="text-white text-sm font-medium">Voice Assistant</span>
          <span class="text-xs bg-emerald-900/60 text-emerald-400 border border-emerald-800/50 px-1.5 py-0.5 rounded-full font-medium leading-none">
            STT / TTS
          </span>
        </div>
        <span v-if="statusLabel" class="text-xs text-slate-400">{{ statusLabel }}</span>
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
              ? 'bg-emerald-700 text-white rounded-br-sm'
              : 'bg-slate-800 text-slate-200 rounded-bl-sm'"
          >
            <div class="flex items-center gap-1.5 mb-0.5" v-if="msg.isAudio">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-emerald-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span class="text-xs text-emerald-300">{{ t.common.voice }}</span>
            </div>
            <div class="leading-relaxed break-words" v-html="renderMarkdown(msg.text)" />
            <div class="text-xs mt-1 opacity-50">{{ msg.time }}</div>
          </div>
        </div>

        <!-- Recording wave -->
        <div v-if="isRecording" class="flex justify-end">
          <div class="bg-emerald-700/40 border border-emerald-600/30 px-3 py-2 rounded-xl rounded-br-sm flex items-center gap-2">
            <span v-for="i in 4" :key="i"
              class="w-1 bg-emerald-400 rounded-full animate-bounce"
              :style="`height: ${8 + (i % 3) * 4}px; animation-delay: ${(i - 1) * 0.1}s`"
            />
            <span class="text-xs text-emerald-300">{{ t.status.listening }}</span>
          </div>
        </div>

        <!-- Agent thinking / TTS -->
        <div v-else-if="state.agentState === 'thinking' || state.agentState === 'speaking'" class="flex justify-start">
          <div class="bg-slate-800 px-3 py-2 rounded-xl rounded-bl-sm flex gap-1 items-center">
            <span v-for="i in 3" :key="i"
              class="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"
              :style="`animation-delay: ${(i - 1) * 0.15}s`"
            />
            <span class="text-xs text-slate-400 ml-1">
              {{ state.agentState === 'speaking' ? 'TTS…' : 'LLM…' }}
            </span>
          </div>
        </div>
      </div>

      <!-- HITL approval banner inside widget -->
      <div v-if="pendingApproval" class="mx-3 my-2 p-3.5 bg-slate-900/95 border border-amber-500/50 rounded-xl shadow-xl">
        <div class="flex items-center gap-2 mb-1.5">
          <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs">⚠️</span>
          <span class="text-xs font-semibold text-amber-300">{{ formatApprovalText(pendingApproval).title }}</span>
        </div>
        <p class="text-xs text-slate-200 mb-2 leading-relaxed">
          {{ formatApprovalText(pendingApproval).desc }}
        </p>
        <div v-if="formatApprovalText(pendingApproval).detail" class="text-xs text-slate-400 bg-slate-950/60 px-2.5 py-1 rounded-md mb-2.5 font-mono">
          {{ formatApprovalText(pendingApproval).detail }}
        </div>
        <div class="flex gap-2 justify-end">
          <button @click="deny" class="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors font-medium">
            {{ t.common.deny }}
          </button>
          <button @click="approve" class="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-semibold shadow-sm">
            {{ t.common.confirm }}
          </button>
        </div>
      </div>

      <!-- Input bar -->
      <div class="px-3 py-3 border-t border-slate-800 flex items-center gap-2">
        <!-- Mic button -->
        <button
          @click="toggleVoice"
          class="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
          :class="micButtonClass"
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
          :placeholder="t.agent.inputPlaceholder"
          class="flex-1 bg-slate-800 text-white placeholder-slate-500 text-sm px-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 border border-transparent focus:border-emerald-500/30"
          :disabled="!state.isConnected"
        />

        <!-- Send -->
        <button
          @click="send"
          :disabled="!inputText.trim() || !state.isConnected"
          class="flex-shrink-0 w-9 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>

      <!-- Mode info footer -->
      <div class="px-4 py-2 bg-slate-950/40 border-t border-slate-800/60 flex items-center gap-2">
        <div class="flex items-center gap-1 text-xs text-slate-600">
          <span class="text-emerald-700">▶</span>
          <span>Google STT</span>
          <span class="text-slate-700">→</span>
          <span>Gemini LLM</span>
          <span class="text-slate-700">→</span>
          <span>Google TTS</span>
        </div>
      </div>
    </div>
  </Transition>
</template>
