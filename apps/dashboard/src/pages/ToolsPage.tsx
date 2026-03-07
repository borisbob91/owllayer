import { useState, useEffect } from 'react';
import { api, type ToolsData, type ToolDecl } from '../api';

const RISK_COLORS: Record<string, string> = {
  none:     'bg-gray-700 text-gray-300',
  low:      'bg-blue-900/50 text-blue-300',
  high:     'bg-yellow-900/50 text-yellow-300',
  critical: 'bg-red-900/50 text-red-300',
};

const TYPE_COLORS: Record<string, string> = {
  STRING:  'text-green-400',
  NUMBER:  'text-yellow-400',
  BOOLEAN: 'text-purple-400',
  OBJECT:  'text-blue-400',
  ARRAY:   'text-orange-400',
};

function ToolDetail({ tool, onClose }: { tool: ToolDecl; onClose: () => void }) {
  const params = tool.parameters?.properties
    ? Object.entries(tool.parameters.properties)
    : [];
  const required = tool.parameters?.required ?? [];

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-semibold text-white text-base">{tool.name}</span>
            {tool.risk && tool.risk !== 'none' && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RISK_COLORS[tool.risk] ?? 'bg-gray-700 text-gray-300'}`}>
                {tool.risk}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 mt-1 leading-relaxed">{tool.description}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-200 shrink-0 mt-0.5"
          title="Fermer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Parameters */}
      {params.length > 0 ? (
        <div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Paramètres</div>
          <div className="space-y-2">
            {params.map(([key, prop]) => (
              <div key={key} className="bg-gray-800/60 rounded-lg px-3 py-2 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-white">{key}</span>
                    {required.includes(key) && (
                      <span className="text-xs text-red-400">requis</span>
                    )}
                  </div>
                  {prop.description && (
                    <p className="text-xs text-gray-400 mt-0.5">{prop.description}</p>
                  )}
                  {prop.enum && prop.enum.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {prop.enum.map(v => (
                        <span key={v} className="text-xs bg-gray-700 rounded px-1.5 py-0.5 font-mono text-gray-300">{v}</span>
                      ))}
                    </div>
                  )}
                </div>
                <span className={`text-xs font-mono font-medium shrink-0 ${TYPE_COLORS[prop.type] ?? 'text-gray-400'}`}>
                  {prop.type.toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-600 italic">Aucun paramètre</p>
      )}
    </div>
  );
}

export default function ToolsPage() {
  const [tools, setTools] = useState<ToolsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ToolDecl | null>(null);

  useEffect(() => {
    const load = () => {
      api.getTools().then(data => {
        setTools(data);
        // Refresh la sélection si le tool existe toujours
        setSelected(prev => {
          if (!prev) return null;
          for (const decls of Object.values(data.clientTools)) {
            const found = decls.find(t => t.name === prev.name);
            if (found) return found;
          }
          return null;
        });
      }).catch(e => setError(e.message));
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="text-red-400 bg-red-900/20 border border-red-800 rounded-lg p-4">
        Erreur : {error}
      </div>
    );
  }

  if (!tools) {
    return <div className="text-gray-400">Chargement...</div>;
  }

  const clientSessions = Object.entries(tools.clientTools);

  return (
    <div className="flex gap-6 items-start">
      {/* Liste */}
      <div className="flex-1 min-w-0">
        <h2 className="text-xl font-bold mb-6">Tools</h2>

        {/* Tools serveur */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-gray-300 mb-3">
            Tools serveur ({tools.serverTools.length})
          </h3>
          {tools.serverTools.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucun tool serveur</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tools.serverTools.map(name => (
                <span
                  key={name}
                  className="px-3 py-1.5 bg-indigo-900/30 border border-indigo-800 rounded text-sm font-mono text-indigo-300"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Tools client par session */}
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-3">
            Tools client par session ({clientSessions.length} session{clientSessions.length > 1 ? 's' : ''})
          </h3>
          {clientSessions.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucun tool client actif</p>
          ) : (
            <div className="space-y-4">
              {clientSessions.map(([sessionId, decls]) => (
                <div
                  key={sessionId}
                  className="bg-gray-900 border border-gray-800 rounded-lg p-4"
                >
                  <div className="text-sm font-mono text-indigo-400 mb-3">{sessionId}</div>
                  <div className="flex flex-wrap gap-2">
                    {decls.map(tool => (
                      <button
                        key={tool.name}
                        onClick={() => setSelected(s => s?.name === tool.name ? null : tool)}
                        className={`px-2.5 py-1 rounded text-xs font-mono transition-all border ${
                          selected?.name === tool.name
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600 hover:text-white'
                        }`}
                      >
                        {tool.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Panneau détail  */}
      {selected && (
        <div className="w-96 shrink-0 sticky top-6">
          <ToolDetail tool={selected} onClose={() => setSelected(null)} />
        </div>
      )}
    </div>
  );
}
