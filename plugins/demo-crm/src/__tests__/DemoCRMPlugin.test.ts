import { describe, it, expect, beforeEach } from 'vitest';
import { installPlugin } from '@owllayer/core';
import type { OwlLayerClient, RegisteredTool } from '@owllayer/core';
import { DemoCRMPlugin } from '../index.js';

// ============================================================
// Minimal OwlLayerClient stub (same pattern as packages/core/tests)
// ============================================================

class FakeClient {
  private _tools = new Map<string, RegisteredTool>();
  private _ctx: Record<string, unknown> = {};

  registerTool(tool: RegisteredTool): void {
    this._tools.set(tool.declaration.name, tool);
  }

  unregisterTool(name: string): void {
    this._tools.delete(name);
  }

  unregisterToolsByComponent(id: string): void {
    for (const [name, tool] of this._tools) {
      if (tool.componentId === id) this._tools.delete(name);
    }
  }

  hasTool(name: string): boolean {
    return this._tools.has(name);
  }

  updateContext(data: Record<string, unknown>): void {
    this._ctx = { ...this._ctx, ...data };
  }

  getContext(): Record<string, unknown> {
    return { ...this._ctx };
  }

  getTool(name: string): RegisteredTool | undefined {
    return this._tools.get(name);
  }

  toolCount(): number {
    return this._tools.size;
  }
}

// ============================================================
// Helpers
// ============================================================

const PREFIX = 'demo-crm';

function callHandler(fake: FakeClient, toolLocalName: string, args: Record<string, unknown>) {
  const tool = fake.getTool(`${PREFIX}_${toolLocalName}`);
  if (!tool) throw new Error(`Tool ${PREFIX}_${toolLocalName} not found`);
  return tool.handler(args);
}

// ============================================================
// Tests
// ============================================================

describe('DemoCRMPlugin (mock mode)', () => {
  let fake: FakeClient;

  beforeEach(() => {
    // Create a fresh client for each test — isolates from prior mutations
    fake = new FakeClient();
    installPlugin(fake as unknown as OwlLayerClient, DemoCRMPlugin, {
      apiUrl: '/mock',
      tenantId: 'test-tenant',
    });
  });

  // ── Registration ───────────────────────────────────────────

  describe('registration', () => {
    it('registers exactly 3 tools', () => {
      expect(fake.toolCount()).toBe(3);
    });

    it('all tool names are namespaced under demo-crm', () => {
      expect(fake.hasTool(`${PREFIX}_search_contacts`)).toBe(true);
      expect(fake.hasTool(`${PREFIX}_get_contact`)).toBe(true);
      expect(fake.hasTool(`${PREFIX}_add_note`)).toBe(true);
    });

    it('exposes CRM tenant data via updateContext', () => {
      expect(fake.getContext()).toEqual({
        crm: { tenantId: 'test-tenant', mock: true },
      });
    });
  });

  // ── search_contacts ────────────────────────────────────────

  describe('search_contacts', () => {
    it('returns Alice Martin for keyword "alice"', async () => {
      const result = await callHandler(fake, 'search_contacts', { query: 'alice' }) as {
        contacts: Array<{ name: string }>;
      };
      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].name).toBe('Alice Martin');
    });

    it('matches contacts by company name', async () => {
      const result = await callHandler(fake, 'search_contacts', { query: 'acme' }) as {
        contacts: Array<{ name: string }>;
      };
      expect(result.contacts.length).toBeGreaterThanOrEqual(1);
      expect(result.contacts.some(c => c.name === 'Alice Martin')).toBe(true);
    });

    it('returns empty array when no match', async () => {
      const result = await callHandler(fake, 'search_contacts', { query: 'zzznomatch999' }) as {
        contacts: unknown[];
      };
      expect(result.contacts).toHaveLength(0);
    });

    it('returns an error when query is empty', async () => {
      const result = await callHandler(fake, 'search_contacts', { query: '' }) as { error: string };
      expect(result.error).toBeDefined();
    });
  });

  // ── get_contact ────────────────────────────────────────────

  describe('get_contact', () => {
    it('returns full details for contact c1 (Alice Martin)', async () => {
      const result = await callHandler(fake, 'get_contact', { id: 'c1' }) as {
        contact: { name: string; email: string; status: string; notes: string[] };
      };
      expect(result.contact.name).toBe('Alice Martin');
      expect(result.contact.email).toBe('alice@acme.com');
      expect(result.contact.status).toBe('customer');
      expect(Array.isArray(result.contact.notes)).toBe(true);
    });

    it('returns the correct contact for c2 (Bob Dupont)', async () => {
      const result = await callHandler(fake, 'get_contact', { id: 'c2' }) as {
        contact: { name: string; status: string };
      };
      expect(result.contact.name).toBe('Bob Dupont');
      expect(result.contact.status).toBe('lead');
    });

    it('returns an error for an unknown id', async () => {
      const result = await callHandler(fake, 'get_contact', { id: 'unknown-xyz' }) as {
        error: string;
      };
      expect(result.error).toMatch(/not found/i);
    });

    it('returns an error when id is empty', async () => {
      const result = await callHandler(fake, 'get_contact', { id: '' }) as { error: string };
      expect(result.error).toBeDefined();
    });
  });

  // ── add_note ───────────────────────────────────────────────

  describe('add_note', () => {
    it('adds a note and confirms it via get_contact', async () => {
      const noteText = 'Re-engaged 2026-Q1';

      // Use c3 (Carol Lee) — no other test modifies her notes
      const addResult = await callHandler(fake, 'add_note', {
        id: 'c3',
        note: noteText,
      }) as { success: boolean };
      expect(addResult.success).toBe(true);

      const getResult = await callHandler(fake, 'get_contact', { id: 'c3' }) as {
        contact: { notes: string[] };
      };
      expect(getResult.contact.notes).toContain(noteText);
    });

    it('returns an error for an unknown contact id', async () => {
      const result = await callHandler(fake, 'add_note', {
        id: 'unknown-xyz',
        note: 'Should fail',
      }) as { error: string };
      expect(result.error).toMatch(/not found/i);
    });

    it('returns an error when note text is empty', async () => {
      const result = await callHandler(fake, 'add_note', { id: 'c1', note: '' }) as {
        error: string;
      };
      expect(result.error).toBeDefined();
    });
  });
});
