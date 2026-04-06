import { afterEach, describe, expect, it, vi } from 'vitest';
import { AutoDiscoveryManager } from '../src/runtime/autoDiscovery.js';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
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

// ---------------------------------------------------------------------------
// Nouvelles actions Sprint 2
// ---------------------------------------------------------------------------

describe('AutoDiscoveryManager — action show / hide', () => {
  it('action show: retire .hidden et set display:block', async () => {
    const target = document.createElement('div');
    target.id = 'target-show';
    target.classList.add('hidden');
    target.style.display = 'none';
    document.body.appendChild(target);

    const trigger = document.createElement('div');
    trigger.setAttribute('data-domos-tool', 'show_el');
    trigger.setAttribute('data-domos-action', 'show');
    trigger.setAttribute('data-domos-selector', '#target-show');
    document.body.appendChild(trigger);

    let handler: ((args: Record<string, unknown>) => Promise<unknown>) | null = null;
    const manager = new AutoDiscoveryManager({
      onToolDiscovered: (_tool, h) => { handler = h; },
      onToolRemoved: () => {},
    });
    manager.start();

    await handler?.({});
    expect(target.classList.contains('hidden')).toBe(false);
    expect(target.style.display).toBe('block');
    manager.stop();
  });

  it('action hide: ajoute .hidden et set display:none', async () => {
    const target = document.createElement('div');
    target.id = 'target-hide';
    document.body.appendChild(target);

    const trigger = document.createElement('div');
    trigger.setAttribute('data-domos-tool', 'hide_el');
    trigger.setAttribute('data-domos-action', 'hide');
    trigger.setAttribute('data-domos-selector', '#target-hide');
    document.body.appendChild(trigger);

    let handler: ((args: Record<string, unknown>) => Promise<unknown>) | null = null;
    const manager = new AutoDiscoveryManager({
      onToolDiscovered: (_tool, h) => { handler = h; },
      onToolRemoved: () => {},
    });
    manager.start();

    await handler?.({});
    expect(target.classList.contains('hidden')).toBe(true);
    expect(target.style.display).toBe('none');
    manager.stop();
  });
});

describe('AutoDiscoveryManager — action addClass / removeClass', () => {
  it('action addClass: ajoute plusieurs classes CSS separees par espace', async () => {
    const target = document.createElement('div');
    target.id = 'target-add-class';
    document.body.appendChild(target);

    const trigger = document.createElement('div');
    trigger.setAttribute('data-domos-tool', 'add_class');
    trigger.setAttribute('data-domos-action', 'addClass');
    trigger.setAttribute('data-domos-selector', '#target-add-class');
    document.body.appendChild(trigger);

    let handler: ((args: Record<string, unknown>) => Promise<unknown>) | null = null;
    const manager = new AutoDiscoveryManager({
      onToolDiscovered: (_tool, h) => { handler = h; },
      onToolRemoved: () => {},
    });
    manager.start();

    await handler?.({ className: 'active highlighted' });
    expect(target.classList.contains('active')).toBe(true);
    expect(target.classList.contains('highlighted')).toBe(true);
    manager.stop();
  });

  it('action removeClass: retire les classes specifiees', async () => {
    const target = document.createElement('div');
    target.id = 'target-remove-class';
    target.classList.add('active', 'highlighted');
    document.body.appendChild(target);

    const trigger = document.createElement('div');
    trigger.setAttribute('data-domos-tool', 'remove_class');
    trigger.setAttribute('data-domos-action', 'removeClass');
    trigger.setAttribute('data-domos-selector', '#target-remove-class');
    document.body.appendChild(trigger);

    let handler: ((args: Record<string, unknown>) => Promise<unknown>) | null = null;
    const manager = new AutoDiscoveryManager({
      onToolDiscovered: (_tool, h) => { handler = h; },
      onToolRemoved: () => {},
    });
    manager.start();

    await handler?.({ className: 'active' });
    expect(target.classList.contains('active')).toBe(false);
    expect(target.classList.contains('highlighted')).toBe(true);
    manager.stop();
  });
});

describe('AutoDiscoveryManager — data-domos-target avec interpolation', () => {
  it('interpole {param} dans data-domos-target avec les args', async () => {
    const target = document.createElement('div');
    target.id = 'product-42';
    document.body.appendChild(target);
    const clickSpy = vi.fn();
    target.addEventListener('click', clickSpy);

    const trigger = document.createElement('button');
    trigger.setAttribute('data-domos-tool', 'select_product');
    trigger.setAttribute('data-domos-action', 'click');
    trigger.setAttribute('data-domos-target', '#product-{productId}');
    document.body.appendChild(trigger);

    let handler: ((args: Record<string, unknown>) => Promise<unknown>) | null = null;
    const manager = new AutoDiscoveryManager({
      onToolDiscovered: (_tool, h) => { handler = h; },
      onToolRemoved: () => {},
    });
    manager.start();

    await handler?.({ productId: '42' });
    expect(clickSpy).toHaveBeenCalledTimes(1);
    manager.stop();
  });
});

describe('AutoDiscoveryManager — data-domos-schema', () => {
  it('JSON valide: DiscoveredToolConfig contient le schema parse', () => {
    const el = document.createElement('button');
    el.setAttribute('data-domos-tool', 'schema_tool');
    el.setAttribute('data-domos-schema', JSON.stringify({
      type: 'object',
      properties: { userId: { type: 'string' } },
    }));
    document.body.appendChild(el);

    let discoveredTool: { schema?: unknown } | null = null;
    const manager = new AutoDiscoveryManager({
      onToolDiscovered: (tool) => { discoveredTool = tool; },
      onToolRemoved: () => {},
    });
    manager.start();

    expect(discoveredTool?.schema).toEqual({
      type: 'object',
      properties: { userId: { type: 'string' } },
    });
    manager.stop();
  });

  it('JSON invalide: console.warn emis et tool quand meme enregistre', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const el = document.createElement('button');
    el.setAttribute('data-domos-tool', 'broken_schema_tool');
    el.setAttribute('data-domos-schema', 'pas du json { valide');
    document.body.appendChild(el);

    const discovered = vi.fn();
    const manager = new AutoDiscoveryManager({
      onToolDiscovered: discovered,
      onToolRemoved: () => {},
    });
    manager.start();

    expect(warnSpy).toHaveBeenCalled();
    expect(discovered).toHaveBeenCalledTimes(1);
    manager.stop();
  });
});

describe('AutoDiscoveryManager — data-domos-context', () => {
  it('appelle onContextData avec les donnees parsees du JSON', () => {
    const contextData = { cartTotal: 99.99, currency: 'EUR' };

    const el = document.createElement('div');
    el.setAttribute('data-domos-tool', 'ctx_tool');
    el.setAttribute('data-domos-context', JSON.stringify(contextData));
    document.body.appendChild(el);

    const onContextData = vi.fn();
    const manager = new AutoDiscoveryManager({
      onToolDiscovered: () => {},
      onToolRemoved: () => {},
      onContextData,
    });
    manager.start();

    expect(onContextData).toHaveBeenCalledWith(contextData);
    manager.stop();
  });
});

describe('AutoDiscoveryManager — deduplication des noms', () => {
  it('ignore un deuxieme element avec le meme nom de tool et emet console.warn', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const el1 = document.createElement('button');
    el1.setAttribute('data-domos-tool', 'shared_name');
    document.body.appendChild(el1);

    const el2 = document.createElement('button');
    el2.setAttribute('data-domos-tool', 'shared_name');
    document.body.appendChild(el2);

    const discovered = vi.fn();
    const manager = new AutoDiscoveryManager({
      onToolDiscovered: discovered,
      onToolRemoved: () => {},
      debug: true,
    });
    manager.start();

    expect(discovered).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalled();
    manager.stop();
  });
});
