import { DomOSProvider, useDomOS } from '@domos/react';
import { DemoCRMPlugin } from '@domos-plugins/demo-crm';
import type { PluginEntry } from '@domos/core';

// ── Plugin registration ──────────────────────────────────────
// Pass '/mock' as apiUrl to use built-in mock CRM data (no server needed).
// Replace with a real URL and tenantId to connect to a live CRM API.
const plugins: PluginEntry[] = [
  [DemoCRMPlugin, { apiUrl: '/mock', tenantId: 'demo-tenant' }],
];

// ── Inner component (accesses DomOS context) ─────────────────
function PluginDemoInner() {
  const { sendText, agentState } = useDomOS();

  const queries = [
    'Search for Alice in the CRM',
    'Get contact details for c2',
    'Add a note to contact c1: "Followed up by email"',
  ];

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>DomOS Plugin Demo — CRM</h1>
        <p style={styles.subtitle}>
          Agent status: <strong>{agentState}</strong>
        </p>
        <p style={styles.subtitle}>
          Plugin <code>@domos-plugins/demo-crm</code> is installed with mock data.
          The tools available to the agent are:
          <code>@domos-plugins/demo-crm/search_contacts</code>,{' '}
          <code>@domos-plugins/demo-crm/get_contact</code> and{' '}
          <code>@domos-plugins/demo-crm/add_note</code>.
        </p>
      </header>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Test queries</h2>
        <p style={{ ...styles.subtitle, marginBottom: 16 }}>
          Click a query to send it to the agent. The agent will call the appropriate CRM tool
          and return the result.
        </p>
        <div style={styles.queryList}>
          {queries.map(q => (
            <button key={q} style={styles.button} onClick={() => sendText(q)}>
              {q}
            </button>
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Mock CRM data</h2>
        <pre style={styles.pre}>
          {JSON.stringify(
            [
              { id: 'c1', name: 'Alice Martin', company: 'Acme Corp', status: 'customer' },
              { id: 'c2', name: 'Bob Dupont', company: 'Dupont SARL', status: 'lead' },
              { id: 'c3', name: 'Carol Lee', company: 'TechCorp', status: 'customer' },
              { id: 'c4', name: 'David Chen', company: 'StartupAI', status: 'churned' },
            ],
            null,
            2,
          )}
        </pre>
      </section>
    </div>
  );
}

// ── Root — wraps with DomOSProvider + plugins ────────────────
export function App() {
  const endpoint = import.meta.env.VITE_DOMOS_ENDPOINT ?? 'ws://localhost:3000/domos';
  const apiKey = import.meta.env.VITE_DOMOS_API_KEY ?? 'pk_demo_local';

  return (
    <DomOSProvider endpoint={endpoint} apiKey={apiKey} plugins={plugins}>
      <PluginDemoInner />
    </DomOSProvider>
  );
}

// ── Minimal inline styles (no Tailwind dependency) ───────────
const styles = {
  container: {
    fontFamily: 'system-ui, sans-serif',
    maxWidth: 800,
    margin: '0 auto',
    padding: '32px 24px',
    color: '#111',
  },
  header: {
    marginBottom: 40,
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    margin: '0 0 8px',
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    margin: '4px 0',
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    margin: '0 0 12px',
  },
  queryList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 10,
    maxWidth: 500,
  },
  button: {
    padding: '10px 16px',
    fontSize: 14,
    cursor: 'pointer',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    textAlign: 'left' as const,
  },
  pre: {
    background: '#f3f4f6',
    padding: 16,
    borderRadius: 8,
    fontSize: 13,
    overflowX: 'auto' as const,
  },
} as const;
