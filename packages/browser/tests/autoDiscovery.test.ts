import { afterEach, describe, expect, it, vi } from 'vitest';
import { AutoDiscoveryManager } from '../src/runtime/autoDiscovery.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('AutoDiscoveryManager', () => {
  it('mappe data-domos-* vers un tool et execute click', async () => {
    const button = document.createElement('button');
    button.id = 'target-btn';
    button.setAttribute('data-domos-tool', 'click_target');
    button.setAttribute('data-domos-action', 'click');
    button.setAttribute('data-domos-selector', '#target-btn');

    const clickSpy = vi.fn();
    button.addEventListener('click', clickSpy);
    document.body.appendChild(button);

    let discoveredHandler: ((args: Record<string, unknown>) => Promise<unknown>) | null = null;

    const manager = new AutoDiscoveryManager({
      onToolDiscovered: (_tool, handler) => {
        discoveredHandler = handler;
      },
      onToolRemoved: () => {},
    });

    manager.start();

    expect(discoveredHandler).not.toBeNull();
    await discoveredHandler?.({});
    expect(clickSpy).toHaveBeenCalledTimes(1);

    manager.stop();
  });

  it('declenche onToolRemoved quand element disparait', async () => {
    const el = document.createElement('div');
    el.setAttribute('data-domos-tool', 'temp_tool');
    document.body.appendChild(el);

    const removed = vi.fn();
    const manager = new AutoDiscoveryManager({
      onToolDiscovered: () => {},
      onToolRemoved: removed,
    });

    manager.start();
    el.remove();

    await Promise.resolve();
    expect(removed).toHaveBeenCalledWith('temp_tool');

    manager.stop();
  });
});
