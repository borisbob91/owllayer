// Sprint 6 — Unit tests for WooWidget
// Tests: mount creates Shadow DOM host, unmount removes it, double mount is a no-op

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ─── Mock Preact (no real DOM rendering needed for these structural tests) ─────

vi.mock('preact', () => ({
  h: vi.fn(() => null),
  render: vi.fn(),
}));

vi.mock('../ui/styles.js', () => ({ WIDGET_CSS: '/* test css */' }));
vi.mock('../ui/WooWidgetApp.js', () => ({ WooWidgetApp: vi.fn() }));

import { WooWidget } from '../ui/WooWidget.js';
import type { DomOSBridge } from '../ui/WooWidgetApp.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeBridge(): DomOSBridge {
  return {
    startVoice: vi.fn(),
    stopVoice: vi.fn(),
    muteMic: vi.fn(),
    sendText: vi.fn(),
    onAgentStateChange: vi.fn().mockReturnValue(() => {}),
    onResponse: vi.fn().mockReturnValue(() => {}),
  };
}

const HOST_ID = 'domos-woo-chat-host';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('WooWidget', () => {
  let bridge: DomOSBridge;

  beforeEach(() => {
    bridge = makeBridge();
    document.getElementById(HOST_ID)?.remove();
  });

  afterEach(() => {
    document.getElementById(HOST_ID)?.remove();
  });

  it('mount() crée un élément host dans document.body', () => {
    const widget = new WooWidget(bridge);
    widget.mount();
    expect(document.getElementById(HOST_ID)).not.toBeNull();
  });

  it('mount() attache un Shadow DOM au host', () => {
    const widget = new WooWidget(bridge);
    widget.mount();
    const host = document.getElementById(HOST_ID)!;
    expect(host.shadowRoot).not.toBeNull();
  });

  it('mount() est idempotent — double appel ne crée pas deux hosts', () => {
    const widget = new WooWidget(bridge);
    widget.mount();
    widget.mount();
    const hosts = document.querySelectorAll(`#${HOST_ID}`);
    expect(hosts.length).toBe(1);
  });

  it('unmount() supprime le host du DOM', () => {
    const widget = new WooWidget(bridge);
    widget.mount();
    widget.unmount();
    expect(document.getElementById(HOST_ID)).toBeNull();
  });

  it('unmount() is safe before mount()', () => {
    const widget = new WooWidget(bridge);
    expect(() => widget.unmount()).not.toThrow();
  });
});
