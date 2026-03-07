import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, type SessionDetail } from '../api';
import ToolCallTimeline from '../components/ToolCallTimeline';

type Tab = 'conversation' | 'tools' | 'graph';

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [tab, setTab] = useState<Tab>('conversation');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = () => {
      api.getSession(id).then(setSession).catch(e => setError(e.message));
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const handleDelete = async () => {
    if (!id || !confirm('Fermer cette session ?')) return;
    await api.deleteSession(id);
    navigate('/sessions');
  };

  if (error) {
    return (
      <div className="text-red-400 bg-red-900/20 border border-red-800 rounded-lg p-4">
        Erreur : {error}
      </div>
    );
  }

  if (!session) {
    return <div className="text-gray-400">Chargement...</div>;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'conversation', label: 'Conversation' },
    { key: 'tools', label: 'Tools' },
    { key: 'graph', label: 'Graph' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">
            Session <span className="text-indigo-400 font-mono">{session.id}</span>
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Etat: {session.state} — URL: {session.context.url || 'N/A'}
          </p>
        </div>
        <button
          onClick={handleDelete}
          className="px-3 py-1.5 bg-red-900 hover:bg-red-800 text-red-200 text-sm rounded-md transition-colors"
        >
          Fermer la session
        </button>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 border-b border-gray-800 mb-4">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {tab === 'conversation' && (
        <div className="space-y-3 max-w-2xl">
          {session.conversation.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucun message</p>
          ) : (
            session.conversation.map((msg, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg text-sm ${
                  msg.role === 'user'
                    ? 'bg-gray-800 text-gray-200'
                    : msg.role === 'assistant'
                    ? 'bg-indigo-900/30 border border-indigo-800 text-indigo-200'
                    : 'bg-gray-900 text-gray-400 text-xs'
                }`}
              >
                <span className="text-xs font-medium text-gray-500 uppercase mr-2">
                  {msg.role}
                </span>
                {msg.content}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'tools' && (
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-3">
            Tools client enregistres ({session.tools.length})
          </h3>
          {session.tools.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucun tool</p>
          ) : (
            <div className="space-y-2 mb-6">
              {session.tools.map(tool => (
                <div
                  key={tool.name}
                  className="bg-gray-900 border border-gray-800 rounded p-3"
                >
                  <span className="font-mono text-sm text-indigo-300">{tool.name}</span>
                  {tool.description && (
                    <p className="text-xs text-gray-400 mt-1">{tool.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <h3 className="text-sm font-medium text-gray-300 mb-3">Top tools appeles</h3>
          <ToolCallTimeline topTools={session.graph.topTools} />
        </div>
      )}

      {tab === 'graph' && (
        <div className="space-y-6">
          {/* Metriques */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">Metriques</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Messages', value: session.graph.metrics.totalMessages },
                { label: 'Tool calls', value: session.graph.metrics.totalToolCalls },
                { label: 'Tokens in', value: session.graph.metrics.totalTokensIn },
                { label: 'Tokens out', value: session.graph.metrics.totalTokensOut },
              ].map(m => (
                <div key={m.label} className="bg-gray-900 border border-gray-800 rounded p-3">
                  <div className="text-xs text-gray-400">{m.label}</div>
                  <div className="text-lg font-bold">{m.value.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Pages visitees */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">
              Pages visitees ({session.graph.pageHistory.length})
            </h3>
            {session.graph.pageHistory.length === 0 ? (
              <p className="text-gray-500 text-sm">Aucune page</p>
            ) : (
              <div className="space-y-1">
                {session.graph.pageHistory.map((page, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 text-sm py-1"
                  >
                    <span className="text-xs text-gray-500 font-mono w-20">
                      {new Date(page.visitedAt).toLocaleTimeString()}
                    </span>
                    <span className="text-gray-300">{page.url}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
