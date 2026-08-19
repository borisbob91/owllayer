<script setup lang="ts">
import {  ref } from 'vue';

const props = defineProps<{
  toolName: string;
  message: string;
  risk: 'high' | 'critical';
  args?: Record<string, unknown>;
}>();

const emit = defineEmits<{
  approve: [];
  deny: [];
}>();

const riskLabel = props.risk === 'critical' ? 'CRITIQUE' : 'IMPORTANT';
const riskColor = props.risk === 'critical' ? '#dc2626' : '#f59e0b';
</script>

<template>
  <Teleport to="body">
    <div class="owllayer-modal-overlay">
      <div class="owllayer-modal">
        <div class="owllayer-modal__header" :style="{ borderColor: riskColor }">
          <span class="owllayer-modal__badge" :style="{ background: riskColor }">
            {{ riskLabel }}
          </span>
          <h3 class="owllayer-modal__title">Approbation requise</h3>
        </div>

        <div class="owllayer-modal__body">
          <p class="owllayer-modal__message">{{ message }}</p>

          <div v-if="args && Object.keys(args).length" class="owllayer-modal__args">
            <p class="owllayer-modal__args-label">Parametres :</p>
            <pre class="owllayer-modal__args-code">{{ JSON.stringify(args, null, 2) }}</pre>
          </div>
        </div>

        <div class="owllayer-modal__actions">
          <button class="owllayer-modal__btn owllayer-modal__btn--deny" @click="emit('deny')">
            Refuser
          </button>
          <button class="owllayer-modal__btn owllayer-modal__btn--approve" @click="emit('approve')">
            Approuver
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.owllayer-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  font-family: system-ui, sans-serif;
}

.owllayer-modal {
  background: white;
  border-radius: 12px;
  width: 420px;
  max-width: 90vw;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.owllayer-modal__header {
  padding: 16px 20px;
  border-bottom: 3px solid;
  display: flex;
  align-items: center;
  gap: 10px;
}

.owllayer-modal__badge {
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  text-transform: uppercase;
}

.owllayer-modal__title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.owllayer-modal__body {
  padding: 20px;
}

.owllayer-modal__message {
  color: #374151;
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
}

.owllayer-modal__args {
  margin-top: 12px;
}

.owllayer-modal__args-label {
  font-size: 12px;
  color: #6b7280;
  margin: 0 0 4px;
}

.owllayer-modal__args-code {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 12px;
  color: #1f2937;
  overflow-x: auto;
  margin: 0;
}

.owllayer-modal__actions {
  padding: 12px 20px;
  background: #f9fafb;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.owllayer-modal__btn {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: background 0.15s;
}

.owllayer-modal__btn--deny {
  background: #e5e7eb;
  color: #374151;
}

.owllayer-modal__btn--deny:hover {
  background: #d1d5db;
}

.owllayer-modal__btn--approve {
  background: #0070c7;
  color: white;
}

.owllayer-modal__btn--approve:hover {
  background: #0059a1;
}
</style>
