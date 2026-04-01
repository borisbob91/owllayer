export type EventMapBase = object;

export type TypedEvent<TType extends string, TPayload> = {
  type: TType;
  payload: TPayload;
};

export type EventFromMap<TEventMap extends EventMapBase> = {
  [TType in keyof TEventMap & string]: TypedEvent<TType, TEventMap[TType]>;
}[keyof TEventMap & string];

export type EventListener<
  TEventMap extends EventMapBase,
  TType extends keyof TEventMap & string,
> = (payload: TEventMap[TType], event: TypedEvent<TType, TEventMap[TType]>) => void;

export type AnyEventListener<TEvent> = (event: TEvent) => void;

export class EventEmitter<
  TEventMap extends EventMapBase,
> {
  private listeners: Partial<{
    [TType in keyof TEventMap & string]: Set<EventListener<TEventMap, TType>>;
  }> = {};

  private anyListeners = new Set<AnyEventListener<EventFromMap<TEventMap>>>();

  on<TType extends keyof TEventMap & string>(
    type: TType,
    listener: EventListener<TEventMap, TType>
  ): () => void {
    const listeners = this.getListeners(type);
    listeners.add(listener);
    return () => this.off(type, listener);
  }

  off<TType extends keyof TEventMap & string>(
    type: TType,
    listener: EventListener<TEventMap, TType>
  ): void {
    this.listeners[type]?.delete(listener);
  }

  onAny(listener: AnyEventListener<EventFromMap<TEventMap>>): () => void {
    this.anyListeners.add(listener);
    return () => this.offAny(listener);
  }

  offAny(listener: AnyEventListener<EventFromMap<TEventMap>>): void {
    this.anyListeners.delete(listener);
  }

  emit<TType extends keyof TEventMap & string>(type: TType, payload: TEventMap[TType]): void {
    const event: TypedEvent<TType, TEventMap[TType]> = { type, payload };
    for (const listener of this.getListeners(type)) {
      listener(payload, event);
    }
    for (const listener of this.anyListeners) {
      listener(event as EventFromMap<TEventMap>);
    }
  }

  clear(): void {
    for (const type in this.listeners) {
      this.listeners[type as keyof TEventMap & string]?.clear();
    }
    this.anyListeners.clear();
  }

  private getListeners<TType extends keyof TEventMap & string>(type: TType): Set<EventListener<TEventMap, TType>> {
    const listeners = this.listeners[type] as Set<EventListener<TEventMap, TType>> | undefined;
    if (listeners) {
      return listeners;
    }

    const nextListeners = new Set<EventListener<TEventMap, TType>>();
    this.listeners[type] = nextListeners as Set<EventListener<TEventMap, keyof TEventMap & string>>;
    return nextListeners;
  }
}
