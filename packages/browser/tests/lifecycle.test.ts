import { afterEach, describe, expect, it } from 'vitest';
import { DomOS } from '../src/index.js';

afterEach(() => {
  DomOS.destroy();
  document.body.innerHTML = '';
});

describe('DomOS singleton lifecycle', () => {
  it('init est idempotent et destroy nettoie les hosts UI', async () => {
    await DomOS.init({
      apiKey: 'pk_test',
      endpoint: 'ws://localhost:4001/domos',
      autoConnect: false,
      widget: { enabled: true },
      hitl: { enabled: true },
    });

    await DomOS.init({
      apiKey: 'pk_test',
      endpoint: 'ws://localhost:4001/domos',
      autoConnect: false,
    });

    expect(document.querySelectorAll('[data-domos-widget-host="browser"]').length).toBe(1);
    expect(document.querySelectorAll('[data-domos-hitl-overlay="browser"]').length).toBe(1);

    DomOS.destroy();

    expect(document.querySelectorAll('[data-domos-widget-host="browser"]').length).toBe(0);
    expect(document.querySelectorAll('[data-domos-hitl-overlay="browser"]').length).toBe(0);
  });
});
