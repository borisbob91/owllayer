import { useState, useEffect } from 'preact/hooks';
import type { ApiClient, BridgeStatsData, ServerCapabilities, ProviderCapabilities, SpeechCapabilities } from '../api.js';
import { t } from '../i18n/index.js';

const SURFACE = '#1a1a24';
const BORDER = '#2a2a3a';
const ACCENT = '#6366f1';
const TEXT = '#e5e5e5';
const MUTED = '#666680';
const BG_CARD = '#111118';

function Badge({ active }: { active: boolean }) {
  const strings = t();
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
      {active ? strings.common.active : strings.common.inactive}
    </span>
  );
}

function ProviderCard({ title, data }: { title: string; data: ProviderCapabilities | null }) {
  const strings = t();
  if (!data) {
    return (
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{title}</span>
          <Badge active={false} />
        </div>
        <p style={{ fontSize: 13, color: MUTED }}>{strings.common.none}</p>
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
          {strings.agents.model} : <code style={{ fontWeight: 700 }}>{data.currentModel}</code>
        </p>
      )}

      {data.models.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            {strings.capabilities.availableModels}
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
            Voices
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
  const strings = t();
  if (!data) {
    return (
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{title}</span>
          <Badge active={false} />
        </div>
        <p style={{ fontSize: 13, color: MUTED }}>{strings.common.none}</p>
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
          Voice : <code style={{ fontWeight: 700 }}>{data.currentVoice}</code>
        </p>
      )}
      {data.currentLanguage && (
        <p style={{ fontSize: 13, color: '#a5b4fc', marginBottom: 10 }}>
          {strings.common.language} : <code style={{ fontWeight: 700 }}>{data.currentLanguage}</code>
        </p>
      )}

      {data.models && data.models.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{strings.capabilities.availableModels}</p>
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
          <p style={{ fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Voices</p>
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
            Languages
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
  const strings = t();
  const [caps, setCaps] = useState<ServerCapabilities | null>(null);
  const [bridge, setBridge] = useState<BridgeStatsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [voiceConfig, setVoiceConfig] = useState({ liveVoice: '', ttsVoice: '', language: '' });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api.getBridge().then(setBridge).catch(() => {});
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
      setMessage(strings.capabilities.voiceRuntimeConfig);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ color: MUTED }}>{strings.capabilities.loading}</div>;
  }

  if (error) {
    return (
      <div style={{
        background: 'rgba(239,68,68,0.1)',
        border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: 8, padding: 16, color: '#ef4444',
      }}>
        {strings.common.error} : {error}
      </div>
    );
  }

  if (!caps) {
    return <p style={{ color: MUTED }}>{strings.common.none}</p>;
  }

  const voiceConfigEnabled = caps.voiceConfig?.configurable ?? false;
  const mediaProviders = [
    caps.live ? `Live: ${caps.live.providerName}` : null,
    caps.stt ? `STT: ${caps.stt.providerName}` : null,
    caps.tts ? `TTS: ${caps.tts.providerName}` : null,
  ].filter((provider): provider is string => Boolean(provider));

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: '0 0 8px' }}>
        {strings.capabilities.title}
      </h2>
      <p style={{ fontSize: 12, color: MUTED, marginBottom: 20 }}>
        {strings.capabilities.subtitle}
      </p>

      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>LiveKit / AgentSession</div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>
              AgentSession rooms: {bridge?.enabled ? `${bridge.activeBridges} active` : strings.status.bridgeInactive}
            </div>
          </div>
          <Badge active={Boolean(bridge?.enabled)} />
        </div>
        {mediaProviders.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
            {mediaProviders.map(provider => (
              <span key={provider} style={{ padding: '3px 8px', borderRadius: 4, background: BG_CARD, border: `1px solid ${BORDER}`, color: '#a5b4fc', fontSize: 12 }}>
                {provider}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '16px 18px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{strings.capabilities.voiceRuntimeConfig}</div>
          </div>
          <Badge active={voiceConfigEnabled} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: MUTED }}>
            Live Voice
            <select
              disabled={!voiceConfigEnabled}
              value={voiceConfig.liveVoice}
              onChange={(e) => setVoiceConfig(v => ({ ...v, liveVoice: (e.target as HTMLSelectElement).value }))}
              style={{ padding: '8px 10px', background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT, fontSize: 12 }}
            >
              <option value="">Default</option>
              {caps.live?.voices?.map(voice => (
                <option key={voice.id} value={voice.id}>{voice.name}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: MUTED }}>
            TTS Voice
            <select
              disabled={!voiceConfigEnabled}
              value={voiceConfig.ttsVoice}
              onChange={(e) => setVoiceConfig(v => ({ ...v, ttsVoice: (e.target as HTMLSelectElement).value }))}
              style={{ padding: '8px 10px', background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT, fontSize: 12 }}
            >
              <option value="">Default</option>
              {caps.tts?.voices?.map(voice => (
                <option key={voice.id} value={voice.id}>{voice.name}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: MUTED }}>
            {strings.common.language}
            <input
              disabled={!voiceConfigEnabled}
              value={voiceConfig.language}
              placeholder="en-US"
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
            {saving ? 'Saving...' : strings.capabilities.saveVoiceConfig}
          </button>
          {message && <span style={{ fontSize: 12, color: '#4ade80' }}>{message}</span>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <ProviderCard title="LLM" data={caps.llm} />
        <ProviderCard title="Realtime / Audio" data={caps.live} />
        <SpeechCard title="Speech-to-Text" data={caps.stt} />
        <SpeechCard title="Text-to-Speech" data={caps.tts} />
      </div>
    </div>
  );
}
