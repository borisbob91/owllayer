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
    <div class="domos-modal-overlay">
      <div class="domos-modal">
        <div class="domos-modal__header" :style="{ borderColor: riskColor }">
          <span class="domos-modal__badge" :style="{ background: riskColor }">
            {{ riskLabel }}
          </span>
          <h3 class="domos-modal__title">Approbation requise</h3>
        </div>

        <div class="domos-modal__body">
          <p class="domos-modal__message">{{ message }}</p>

          <div v-if="args && Object.keys(args).length" class="domos-modal__args">
            <p class="domos-modal__args-label">Parametres :</p>
            <pre class="domos-modal__args-code">{{ JSON.stringify(args, null, 2) }}</pre>
          </div>
        </div>

        <div class="domos-modal__actions">
          <button class="domos-modal__btn domos-modal__btn--deny" @click="emit('deny')">
            Refuser
          </button>
          <button class="domos-modal__btn domos-modal__btn--approve" @click="emit('approve')">
            Approuver
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.domos-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  font-family: system-ui, sans-serif;
}

.domos-modal {
  background: white;
  border-radius: 12px;
  width: 420px;
  max-width: 90vw;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.domos-modal__header {
  padding: 16px 20px;
  border-bottom: 3px solid;
  display: flex;
  align-items: center;
  gap: 10px;
}

.domos-modal__badge {
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  text-transform: uppercase;
}

.domos-modal__title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.domos-modal__body {
  padding: 20px;
}

.domos-modal__message {
  color: #374151;
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
}

.domos-modal__args {
  margin-top: 12px;
}

.domos-modal__args-label {
  font-size: 12px;
  color: #6b7280;
  margin: 0 0 4px;
}

.domos-modal__args-code {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 12px;
  color: #1f2937;
  overflow-x: auto;
  margin: 0;
}

.domos-modal__actions {
  padding: 12px 20px;
  background: #f9fafb;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.domos-modal__btn {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: background 0.15s;
}

.domos-modal__btn--deny {
  background: #e5e7eb;
  color: #374151;
}

.domos-modal__btn--deny:hover {
  background: #d1d5db;
}

.domos-modal__btn--approve {
  background: #0070c7;
  color: white;
}

.domos-modal__btn--approve:hover {
  background: #0059a1;
}
</style>
