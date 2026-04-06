import { useContext, useEffect } from 'react';
import type {
  DomOSClientAnyEventListener,
  DomOSClientEventListener,
  DomOSClientEventType,
} from '@domos/core';
import { DomOSContext } from '../provider/DomOSContext.js';

export function useDomOSEvent<TType extends DomOSClientEventType>(
  type: TType,
  listener: DomOSClientEventListener<TType> | null | undefined,
): void {
  const ctx = useContext(DomOSContext);

  useEffect(() => {
    if (!ctx || !listener) return;
    return ctx.subscribeEvent(type, listener);
  }, [ctx, type, listener]);
}

export function useDomOSAnyEvent(listener: DomOSClientAnyEventListener | null | undefined): void {
  const ctx = useContext(DomOSContext);

  useEffect(() => {
    if (!ctx || !listener) return;
    return ctx.subscribeAnyEvent(listener);
  }, [ctx, listener]);
}