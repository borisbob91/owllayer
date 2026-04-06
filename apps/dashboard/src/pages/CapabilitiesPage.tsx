import { useState, useEffect } from 'react';
import { api, type ServerCapabilities, type ProviderCapabilities, type SpeechCapabilities } from '../api';

function Badge({ active }: { active: boolean }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${active ? 'bg-green-700 text-green-100' : 'bg-gray-700 text-gray-400'}`}>
      {active ? 'actif' : 'non configuré'}
    </span>
  );
}

function ProviderCard({ title, data }: { title: string; data: ProviderCapabilities | null }) {
  if (!data) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
        <div className="flex items-center gap-3 mb-3">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <Badge active={false} />
        </div>
        <p className="text-sm text-gray-500">Non configuré</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <Badge active />
        <span className="text-xs text-gray-400 ml-auto">{data.providerName}</span>
      </div>

      {data.currentModel && (
        <p className="text-sm text-indigo-300 mb-3">
          Modèle actuel : <span className="font-mono font-semibold">{data.currentModel}</span>
        </p>
      )}

      {data.models.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Modèles disponibles</p>
          <div className="space-y-1">
            {data.models.map(m => (
              <div
                key={m.id}
                className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded ${m.id === data.currentModel ? 'bg-indigo-900/50 border border-indigo-700' : 'bg-gray-800'}`}
              >
                <span className="font-mono text-xs text-gray-300 flex-1">{m.id}</span>
                {m.description && <span className="text-gray-500 text-xs">{m.description}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.voices && data.voices.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Voix disponibles</p>
          <div className="flex flex-wrap gap-2">
            {data.voices.map(v => (
              <span
                key={v.id}
                className={`px-2 py-1 rounded text-xs ${v.id === data.currentVoice ? 'bg-indigo-700 text-white' : 'bg-gray-800 text-gray-300'}`}
              >
                {v.name}{v.gender ? ` (${v.gender})` : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SpeechCard({ title, data }: { title: string; data: SpeechCapabilities | null }) {
  if (!data) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
        <div className="flex items-center gap-3 mb-3">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <Badge active={false} />
        </div>
        <p className="text-sm text-gray-500">Non configuré</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <Badge active />
        <span className="text-xs text-gray-400 ml-auto">{data.providerName}</span>
      </div>

      {data.currentVoice && (
        <p className="text-sm text-indigo-300 mb-2">
          Voix actuelle : <span className="font-mono font-semibold">{data.currentVoice}</span>
        </p>
      )}
      {data.currentLanguage && (
        <p className="text-sm text-indigo-300 mb-3">
          Langue : <span className="font-mono font-semibold">{data.currentLanguage}</span>
        </p>
      )}

      {data.models && data.models.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Modèles</p>
          <div className="space-y-1">
            {data.models.map(m => (
              <div key={m.id} className="flex items-center gap-2 text-sm px-3 py-1.5 rounded bg-gray-800">
                <span className="font-mono text-xs text-gray-300 flex-1">{m.id}</span>
                {m.description && <span className="text-gray-500 text-xs">{m.description}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.voices && data.voices.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Voix</p>
          <div className="flex flex-wrap gap-2">
            {data.voices.map(v => (
              <span
                key={v.id}
                className={`px-2 py-1 rounded text-xs ${v.id === data.currentVoice ? 'bg-indigo-700 text-white' : 'bg-gray-800 text-gray-300'}`}
              >
                {v.name}{v.gender ? ` (${v.gender})` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.languages && data.languages.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Langues supportées</p>
          <div className="flex flex-wrap gap-1">
            {data.languages.map(l => (
              <span
                key={l}
                className={`px-2 py-0.5 rounded text-xs font-mono ${l === data.currentLanguage ? 'bg-indigo-700 text-white' : 'bg-gray-800 text-gray-400'}`}
              >
                {l}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CapabilitiesPage() {
  const [caps, setCaps] = useState<ServerCapabilities | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCapabilities()
      .then(setCaps)
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-gray-400">Chargement...</div>;
  }

  if (error) {
    return (
      <div className="text-red-400 bg-red-900/20 border border-red-800 rounded-lg p-4">
        Erreur : {error}
      </div>
    );
  }

  if (!caps) {
    return <p className="text-gray-400">Impossible de charger les capabilities.</p>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Configuration Serveur</h2>
      <p className="text-sm text-gray-400 mb-6">
        Lecture seule — modifiez <span className="font-mono text-indigo-300">domos.config.yml</span> pour changer la configuration.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProviderCard title="LLM (Texte)" data={caps.llm} />
        <ProviderCard title="Audio Live" data={caps.live} />
        <SpeechCard title="Speech-to-Text" data={caps.stt} />
        <SpeechCard title="Text-to-Speech" data={caps.tts} />
      </div>
    </div>
  );
}
