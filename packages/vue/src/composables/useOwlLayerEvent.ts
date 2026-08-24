import { inject, onUnmounted } from 'vue';
import type {
  OwlLayerClientAnyEventListener,
  OwlLayerClientEventListener,
  OwlLayerClientEventType,
} from '@owllayer/core';
import { OWLLAYER_CLIENT_KEY } from '../plugin/OwlLayerPlugin.js';

export function useOwlLayerEvent<TType extends OwlLayerClientEventType>(
  type: TType,
  listener: OwlLayerClientEventListener<TType>,
): () => void {
  const client = inject(OWLLAYER_CLIENT_KEY);

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

export function useOwlLayerAnyEvent(listener: OwlLayerClientAnyEventListener): () => void {
  const client = inject(OWLLAYER_CLIENT_KEY);

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