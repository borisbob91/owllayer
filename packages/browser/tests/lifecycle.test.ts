import { afterEach, describe, expect, it } from 'vitest';
import { OwlLayer } from '../src/index.js';

afterEach(() => {
  OwlLayer.destroy();
  document.body.innerHTML = '';
});

describe('OwlLayer singleton lifecycle', () => {
  it('init est idempotent et destroy nettoie les hosts UI', async () => {
    await OwlLayer.init({
      apiKey: 'pk_test',
      endpoint: 'ws://localhost:4001/owllayer',
      autoConnect: false,
      widget: { enabled: true },
      hitl: { enabled: true },
    });

    await OwlLayer.init({
      apiKey: 'pk_test',
      endpoint: 'ws://localhost:4001/owllayer',
      autoConnect: false,
    });

    expect(document.querySelectorAll('[data-owllayer-widget-host="browser"]').length).toBe(1);
    expect(document.querySelectorAll('[data-owllayer-hitl-overlay="browser"]').length).toBe(1);

    OwlLayer.destroy();

    expect(document.querySelectorAll('[data-owllayer-widget-host="browser"]').length).toBe(0);
    expect(document.querySelectorAll('[data-owllayer-hitl-overlay="browser"]').length).toBe(0);
  });
});
