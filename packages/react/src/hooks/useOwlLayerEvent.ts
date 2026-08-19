import { useContext, useEffect } from 'react';
import type {
  OwlLayerClientAnyEventListener,
  OwlLayerClientEventListener,
  OwlLayerClientEventType,
} from '@owllayer/core';
import { OwlLayerContext } from '../provider/OwlLayerContext.js';

export function useOwlLayerEvent<TType extends OwlLayerClientEventType>(
  type: TType,
  listener: OwlLayerClientEventListener<TType> | null | undefined,
): void {
  const ctx = useContext(OwlLayerContext);

  useEffect(() => {
    if (!ctx || !listener) return;
    return ctx.subscribeEvent(type, listener);
  }, [ctx, type, listener]);
}

export function useOwlLayerAnyEvent(listener: OwlLayerClientAnyEventListener | null | undefined): void {
  const ctx = useContext(OwlLayerContext);

  useEffect(() => {
    if (!ctx || !listener) return;
    return ctx.subscribeAnyEvent(listener);
  }, [ctx, listener]);
}