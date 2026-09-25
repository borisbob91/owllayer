import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { OwlLayerClient } from '@owllayer/core';
import { OwlLayerProvider } from '../src/provider/OwlLayerProvider.js';

function renderProvider() {
  return render(
    <OwlLayerProvider apiKey="pk_test" endpoint="ws://localhost:3000/owllayer" config={{ autoConnect: false, hitl: { ui: 'none' } }}>
      <div />
    </OwlLayerProvider>
  );
}

describe('OwlLayerProvider — synchro de route', () => {
  let syncSpy: ReturnType<typeof vi.spyOn>;
  let sessionSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    syncSpy = vi.spyOn(OwlLayerClient.prototype, 'syncToolsWithServer').mockImplementation(() => {});
    sessionSpy = vi.spyOn(OwlLayerClient.prototype, 'sessionId', 'get').mockReturnValue('sess_1');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('synchronise sur pushState et replaceState quand le chemin change', () => {
    const view = renderProvider();

    window.history.pushState(null, '', '/checkout');
    window.history.replaceState(null, '', '/checkout/review');

    expect(syncSpy).toHaveBeenCalledTimes(2);
    view.unmount();
  });

  it('ne synchronise pas si seul le hash ou la query change', () => {
    const view = renderProvider();

    window.history.pushState(null, '', '/?tab=2');
    window.history.pushState(null, '', '/#details');

    expect(syncSpy).not.toHaveBeenCalled();
    view.unmount();
  });

  it('synchronise sur popstate (retour navigateur)', async () => {
    const view = renderProvider();
    window.history.pushState(null, '', '/cart');
    syncSpy.mockClear();

    const popped = new Promise((resolve) => window.addEventListener('popstate', resolve, { once: true }));
    window.history.back();
    await popped;

    expect(window.location.pathname).toBe('/');
    expect(syncSpy).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it('synchronise meme si l agent est occupe, pas sans session', () => {
    const view = renderProvider();

    sessionSpy.mockReturnValue(null);
    window.history.pushState(null, '', '/no-session');
    expect(syncSpy).not.toHaveBeenCalled();

    sessionSpy.mockReturnValue('sess_1');
    window.history.pushState(null, '', '/with-session');
    expect(syncSpy).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it('restaure les methodes history au demontage', () => {
    const originalPush = window.history.pushState;
    const originalReplace = window.history.replaceState;
    const view = renderProvider();

    expect(window.history.pushState).not.toBe(originalPush);
    view.unmount();

    expect(window.history.pushState).toBe(originalPush);
    expect(window.history.replaceState).toBe(originalReplace);
  });

  it('n ecrase pas un wrapper pose apres le sien', () => {
    const originalPush = window.history.pushState;
    const view = renderProvider();
    const laterWrapper = vi.fn();
    window.history.pushState = laterWrapper as any;

    view.unmount();

    expect(window.history.pushState).toBe(laterWrapper);
    window.history.pushState = originalPush;
  });
});
