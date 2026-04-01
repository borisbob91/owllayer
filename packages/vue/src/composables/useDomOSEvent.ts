import { inject, onUnmounted } from 'vue';
import type {
  DomOSClientAnyEventListener,
  DomOSClientEventListener,
  DomOSClientEventType,
} from '@domos/core';
import { DOMOS_CLIENT_KEY } from '../plugin/DomOSPlugin.js';

export function useDomOSEvent<TType extends DomOSClientEventType>(
  type: TType,
  listener: DomOSClientEventListener<TType>,
): () => void {
  const client = inject(DOMOS_CLIENT_KEY);

  if (!client) {
    return () => {};
  }

  client.onEvent(type, listener);

  const cleanup = () => {
    client.offEvent(type, listener);
  };

  onUnmounted(cleanup);
  return cleanup;
}

export function useDomOSAnyEvent(listener: DomOSClientAnyEventListener): () => void {
  const client = inject(DOMOS_CLIENT_KEY);

  if (!client) {
    return () => {};
  }

  client.onAnyEvent(listener);

  const cleanup = () => {
    client.offAnyEvent(listener);
  };

  onUnmounted(cleanup);
  return cleanup;
}