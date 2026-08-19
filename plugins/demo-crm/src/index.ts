import type { OwlLayerClientPlugin } from '@owllayer/core';

// ============================================================
// Types
// ============================================================

export interface DemoCRMConfig {
  /** Base URL of the CRM API (e.g. 'https://crm.acme.com'). Use '/mock' for built-in mock data. */
  apiUrl: string;
  /** Tenant identifier forwarded in every request header. */
  tenantId: string;
}

export interface CRMContact {
  id: string;
  name: string;
  email: string;
  company: string;
  status: 'lead' | 'customer' | 'churned';
  notes: string[];
}

// ============================================================
// Mock data (used when apiUrl === '/mock')
// ============================================================

const MOCK_CONTACTS: CRMContact[] = [
  { id: 'c1', name: 'Alice Martin', email: 'alice@acme.com', company: 'Acme Corp', status: 'customer', notes: ['Called 2024-01', 'Renewed contract'] },
  { id: 'c2', name: 'Bob Dupont', email: 'bob@dupont.fr', company: 'Dupont SARL', status: 'lead', notes: ['Demo scheduled'] },
  { id: 'c3', name: 'Carol Lee', email: 'carol@techcorp.io', company: 'TechCorp', status: 'customer', notes: ['VIP account'] },
  { id: 'c4', name: 'David Chen', email: 'david@startup.ai', company: 'StartupAI', status: 'churned', notes: ['Cancelled 2023-11'] },
];

function mockSearch(query: string): CRMContact[] {
  const q = query.toLowerCase();
  return MOCK_CONTACTS.filter(
    c =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q),
  );
}

function mockGet(id: string): CRMContact | null {
  return MOCK_CONTACTS.find(c => c.id === id) ?? null;
}

function mockAddNote(id: string, note: string): boolean {
  const contact = MOCK_CONTACTS.find(c => c.id === id);
  if (!contact) return false;
  contact.notes.push(note);
  return true;
}

// ============================================================
// HTTP helpers (real API path)
// ============================================================

async function apiRequest<T>(
  apiUrl: string,
  tenantId: string,
  path: string,
  method: 'GET' | 'POST' = 'GET',
  body?: unknown,
): Promise<T> {
  const url = `${apiUrl}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Id': tenantId,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`CRM API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ============================================================
// Plugin definition
// ============================================================

export const DemoCRMPlugin: OwlLayerClientPlugin<DemoCRMConfig> = {
  meta: {
    name: '@owllayer-plugins/demo-crm',
    version: '0.1.0',
    description: 'Demo CRM plugin — search contacts, retrieve details, add notes',
  },

  setup(ctx, config) {
    const isMock = config.apiUrl === '/mock';

    // Expose tenant context so the LLM knows which CRM it's talking to
    ctx.updateContext({ crm: { tenantId: config.tenantId, mock: isMock } });

    // ── search_contacts ─────────────────────────────────────────
    ctx.registerTool('search_contacts', {
      description: 'Search contacts in the CRM by name, email, or company.',
      parameters: {
        type: 'OBJECT',
        properties: {
          query: { type: 'STRING', description: 'Search keyword (name, email, or company)' },
        },
        required: ['query'],
      },
      risk: 'none',
      handler: async ({ query }) => {
        const q = String(query ?? '').trim();
        if (!q) return { error: 'query cannot be empty' };

        if (isMock) return { contacts: mockSearch(q) };

        return apiRequest<{ contacts: CRMContact[] }>(
          config.apiUrl, config.tenantId, `/contacts?q=${encodeURIComponent(q)}`
        );
      },
    });

    // ── get_contact ──────────────────────────────────────────────
    ctx.registerTool('get_contact', {
      description: 'Retrieve full details for a single contact by ID.',
      parameters: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING', description: 'Contact ID' },
        },
        required: ['id'],
      },
      risk: 'none',
      handler: async ({ id }) => {
        const contactId = String(id ?? '').trim();
        if (!contactId) return { error: 'id cannot be empty' };

        if (isMock) {
          const contact = mockGet(contactId);
          return contact ? { contact } : { error: `Contact '${contactId}' not found` };
        }

        return apiRequest<{ contact: CRMContact }>(
          config.apiUrl, config.tenantId, `/contacts/${encodeURIComponent(contactId)}`
        );
      },
    });

    // ── add_note ─────────────────────────────────────────────────
    ctx.registerTool('add_note', {
      description: "Add a note to a contact's history.",
      parameters: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING', description: 'Contact ID' },
          note: { type: 'STRING', description: 'Note text to append' },
        },
        required: ['id', 'note'],
      },
      risk: 'low',
      handler: async ({ id, note }) => {
        const contactId = String(id ?? '').trim();
        const noteText = String(note ?? '').trim();
        if (!contactId) return { error: 'id cannot be empty' };
        if (!noteText) return { error: 'note cannot be empty' };

        if (isMock) {
          const ok = mockAddNote(contactId, noteText);
          return ok ? { success: true } : { error: `Contact '${contactId}' not found` };
        }

        return apiRequest(
          config.apiUrl, config.tenantId, `/contacts/${encodeURIComponent(contactId)}/notes`,
          'POST', { note: noteText }
        );
      },
    });
  },
};
