import { useState, useEffect } from 'preact/hooks';
import type { ApiClient, ServerCapabilities, ProviderCapabilities, SpeechCapabilities } from '../api.js';

const SURFACE = '#1a1a24';
const BORDER = '#2a2a3a';
const ACCENT = '#6366f1';
const TEXT = '#e5e5e5';
const MUTED = '#666680';
const BG_CARD = '#111118';

function Badge({ active }: { active: boolean }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 12,
      fontSize: 11,
      fontWeight: 600,
      background: active ? 'rgba(34,197,94,0.15)' : 'rgba(100,100,120,0.2)',
      color: active ? '#4ade80' : MUTED,
    }}>
      {active ? 'actif' : 'non configuré'}
    </span>
  );
}

function ProviderCard({ title, data }: { title: string; data: ProviderCapabilities | null }) {
  if (!data) {
    return (
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{title}</span>
          <Badge active={false} />
        </div>
        <p style={{ fontSize: 13, color: MUTED }}>Non configuré</p>
      </div>
    );
  }

  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{title}</span>
        <Badge active />
        <span style={{ fontSize: 12, color: MUTED, marginLeft: 'auto' }}>{data.providerName}</span>
      </div>

      {data.currentModel && (
        <p style={{ fontSize: 13, color: '#a5b4fc', marginBottom: 10 }}>
          Modèle actuel : <code style={{ fontWeight: 700 }}>{data.currentModel}</code>
        </p>
      )}

      {data.models.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            Modèles disponibles
          </p>
          {data.models.map(m => (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 10px', borderRadius: 5, marginBottom: 3,
              background: m.id === data.currentModel ? 'rgba(99,102,241,0.15)' : BG_CARD,
              border: `1px solid ${m.id === data.currentModel ? ACCENT : BORDER}`,
              fontSize: 12,
            }}>
              <code style={{ color: '#c4b5fd', flex: 1 }}>{m.id}</code>
              {m.description && <span style={{ color: MUTED }}>{m.description}</span>}
            </div>
          ))}
        </div>
      )}

      {data.voices && data.voices.length > 0 && (
        <div>
          <p style={{ fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            Voix disponibles
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {data.voices.map(v => (
              <span key={v.id} style={{
                padding: '4px 8px', borderRadius: 4, fontSize: 12,
                background: v.id === data.currentVoice ? ACCENT : BG_CARD,
                color: v.id === data.currentVoice ? '#fff' : TEXT,
                border: `1px solid ${BORDER}`,
              }}>
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
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{title}</span>
          <Badge active={false} />
        </div>
        <p style={{ fontSize: 13, color: MUTED }}>Non configuré</p>
      </div>
    );
  }

  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{title}</span>
        <Badge active />
        <span style={{ fontSize: 12, color: MUTED, marginLeft: 'auto' }}>{data.providerName}</span>
      </div>

      {data.currentVoice && (
        <p style={{ fontSize: 13, color: '#a5b4fc', marginBottom: 6 }}>
          Voix actuelle : <code style={{ fontWeight: 700 }}>{data.currentVoice}</code>
        </p>
      )}
      {data.currentLanguage && (
        <p style={{ fontSize: 13, color: '#a5b4fc', marginBottom: 10 }}>
          Langue : <code style={{ fontWeight: 700 }}>{data.currentLanguage}</code>
        </p>
      )}

      {data.models && data.models.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Modèles</p>
          {data.models.map(m => (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 10px', borderRadius: 5, marginBottom: 3,
              background: BG_CARD, border: `1px solid ${BORDER}`, fontSize: 12,
            }}>
              <code style={{ color: '#c4b5fd', flex: 1 }}>{m.id}</code>
              {m.description && <span style={{ color: MUTED }}>{m.description}</span>}
            </div>
          ))}
        </div>
      )}

      {data.voices && data.voices.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Voix</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {data.voices.map(v => (
              <span key={v.id} style={{
                padding: '4px 8px', borderRadius: 4, fontSize: 12,
                background: v.id === data.currentVoice ? ACCENT : BG_CARD,
                color: v.id === data.currentVoice ? '#fff' : TEXT,
                border: `1px solid ${BORDER}`,
              }}>
                {v.name}{v.gender ? ` (${v.gender})` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.languages && data.languages.length > 0 && (
        <div>
          <p style={{ fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            Langues supportées
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {data.languages.map(l => (
              <code key={l} style={{
                padding: '2px 6px', borderRadius: 3, fontSize: 11,
                background: l === data.currentLanguage ? ACCENT : BG_CARD,
                color: l === data.currentLanguage ? '#fff' : MUTED,
                border: `1px solid ${BORDER}`,
              }}>
                {l}
              </code>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface CapabilitiesPageProps {
  api: ApiClient;
}

export function CapabilitiesPage({ api }: CapabilitiesPageProps) {
  const [caps, setCaps] = useState<ServerCapabilities | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [voiceConfig, setVoiceConfig] = useState({ liveVoice: '', ttsVoice: '', language: '' });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api.getCapabilities()
      .then((data) => {
        setCaps(data);
        setVoiceConfig({
          liveVoice: data.voiceConfig?.liveVoice ?? '',
          ttsVoice: data.voiceConfig?.ttsVoice ?? '',
          language: data.voiceConfig?.language ?? '',
        });
      })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [api]);

  const handleSaveVoiceConfig = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const result = await api.setVoiceConfig({
        liveVoice: voiceConfig.liveVoice || undefined,
        ttsVoice: voiceConfig.ttsVoice || undefined,
        language: voiceConfig.language || undefined,
      });
      setVoiceConfig({
        liveVoice: result.voiceConfig.liveVoice ?? '',
        ttsVoice: result.voiceConfig.ttsVoice ?? '',
        language: result.voiceConfig.language ?? '',
      });
      setMessage('Configuration voix mise à jour');
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ color: MUTED }}>Chargement...</div>;
  }

  if (error) {
    return (
      <div style={{
        background: 'rgba(239,68,68,0.1)',
        border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: 8, padding: 16, color: '#ef4444',
      }}>
        Erreur : {error}
      </div>
    );
  }

  if (!caps) {
    return <p style={{ color: MUTED }}>Impossible de charger les capabilities.</p>;
  }

  const voiceConfigEnabled = caps.voiceConfig?.configurable ?? false;

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: '0 0 8px' }}>
        Configuration Serveur
      </h2>
      <p style={{ fontSize: 12, color: MUTED, marginBottom: 20 }}>
        Les secrets, providers et adapters restent configurés au boot. Les préférences voix peuvent être modifiées à chaud si le serveur l'autorise.
      </p>

      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '16px 18px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>Préférences voix runtime</div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>
              Appliquées aux nouvelles sessions live et au TTS hybride quand le contexte client ne fournit pas déjà de voix.
            </div>
          </div>
          <Badge active={voiceConfigEnabled} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: MUTED }}>
            Voix live
            <select
              disabled={!voiceConfigEnabled}
              value={voiceConfig.liveVoice}
              onChange={(e) => setVoiceConfig(v => ({ ...v, liveVoice: (e.target as HTMLSelectElement).value }))}
              style={{ padding: '8px 10px', background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT, fontSize: 12 }}
            >
              <option value="">Défaut adapter</option>
              {caps.live?.voices?.map(voice => (
                <option key={voice.id} value={voice.id}>{voice.name}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: MUTED }}>
            Voix TTS
            <select
              disabled={!voiceConfigEnabled}
              value={voiceConfig.ttsVoice}
              onChange={(e) => setVoiceConfig(v => ({ ...v, ttsVoice: (e.target as HTMLSelectElement).value }))}
              style={{ padding: '8px 10px', background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT, fontSize: 12 }}
            >
              <option value="">Défaut adapter</option>
              {caps.tts?.voices?.map(voice => (
                <option key={voice.id} value={voice.id}>{voice.name}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: MUTED }}>
            Langue
            <input
              disabled={!voiceConfigEnabled}
              value={voiceConfig.language}
              placeholder="fr-FR"
              onInput={(e) => setVoiceConfig(v => ({ ...v, language: (e.target as HTMLInputElement).value }))}
              style={{ padding: '8px 10px', background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT, fontSize: 12 }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <button
            disabled={!voiceConfigEnabled || saving}
            onClick={handleSaveVoiceConfig}
            style={{ padding: '8px 14px', background: ACCENT, border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, cursor: (!voiceConfigEnabled || saving) ? 'not-allowed' : 'pointer', opacity: (!voiceConfigEnabled || saving) ? 0.5 : 1 }}
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
          {message && <span style={{ fontSize: 12, color: message.includes('mise') ? '#4ade80' : '#ef4444' }}>{message}</span>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <ProviderCard title="LLM (Texte)" data={caps.llm} />
        <ProviderCard title="Audio Live" data={caps.live} />
        <SpeechCard title="Speech-to-Text" data={caps.stt} />
        <SpeechCard title="Text-to-Speech" data={caps.tts} />
      </div>
    </div>
  );
}
