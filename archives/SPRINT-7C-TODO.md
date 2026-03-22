# SPRINT 7C — STT/TTS Fallback Implementation

> Ajouter le support STT/TTS pour les modèles LLM sans audio natif (Claude, GPT-4 standard, etc.)

---

## 📋 TODO List

### Phase 1 : Architecture de base ✅

- [ ] Créer les interfaces `STTService` et `TTSService`
- [ ] Créer les classes abstraites `BaseSTTService` et `BaseTTSService`
- [ ] Définir les types et options pour chaque provider
- [ ] Créer la structure de dossiers `packages/server/src/speech/`

### Phase 2 : Providers STT

#### OpenAI Whisper
- [ ] Implémenter `WhisperSTT.ts`
- [ ] Gérer les formats audio (PCM, WAV, MP3)
- [ ] Ajouter le support multilingue automatique
- [ ] Tests unitaires

#### Google Cloud Speech-to-Text
- [ ] Implémenter `GoogleSTT.ts`
- [ ] Support des modèles : Chirp, Enhanced, Standard
- [ ] Mode streaming pour audio continu
- [ ] Support 100+ langues
- [ ] Tests unitaires

#### Azure Speech Services
- [ ] Implémenter `AzureSTT.ts`
- [ ] Support du mode streaming
- [ ] Gestion des régions Azure
- [ ] Tests unitaires

### Phase 3 : Providers TTS

#### OpenAI TTS
- [ ] Implémenter `OpenAITTS.ts`
- [ ] Support des 6 voix (alloy, echo, fable, onyx, nova, shimmer)
- [ ] Formats audio : MP3, Opus, AAC, FLAC
- [ ] Tests unitaires

#### Google Cloud Text-to-Speech
- [ ] Implémenter `GoogleTTS.ts`
- [ ] Support Gemini-TTS (nouveau)
- [ ] Support Chirp 3 HD
- [ ] Support Neural2 (meilleur rapport qualité/prix)
- [ ] Support WaveNet
- [ ] Support Standard
- [ ] Lister les voix par langue
- [ ] Tests unitaires

#### ElevenLabs
- [ ] Implémenter `ElevenLabsTTS.ts`
- [ ] Support des voix premium
- [ ] Voice cloning (Instant Custom Voice)
- [ ] Streaming audio
- [ ] Tests unitaires

#### Azure Speech Services
- [ ] Implémenter `AzureTTS.ts`
- [ ] Support Neural voices
- [ ] Support SSML avancé
- [ ] Tests unitaires

### Phase 4 : Intégration DomOSServer

- [ ] Ajouter `stt?: STTService` et `tts?: TTSService` dans `DomOSServerOptions`
- [ ] Modifier `handleUserInput()` pour détecter audio sans LiveAdapter
- [ ] Pipeline hybride : Audio → STT → LLM texte → TTS → Audio
- [ ] Gérer les erreurs STT/TTS
- [ ] Logger les latences (STT time, LLM time, TTS time)
- [ ] Tests d'intégration

### Phase 5 : Configuration & Documentation

- [ ] Variables d'environnement pour credentials
- [ ] Documentation : quand utiliser quel provider
- [ ] Guide de migration : Live → Hybride
- [ ] Exemples de configuration dans `demo-server`
- [ ] Tableau comparatif des providers

### Phase 6 : Tests & Validation

- [ ] Test end-to-end : Audio input → Audio output avec Claude
- [ ] Test performance : mesurer latences
- [ ] Test multilangue (FR, EN, ES, DE)
- [ ] Test fallback : si STT échoue, fallback vers mode texte
- [ ] Load testing

---

## 🎙️ Modèles & Voix Disponibles par Provider

### 1️⃣ OpenAI

#### Whisper STT
| Modèle | Description | Langues | Prix |
|--------|-------------|---------|------|
| `whisper-1` | Modèle unique, ultra-précis | 99 langues | $0.006/min |

**Langues supportées** : Français, Anglais, Espagnol, Allemand, Italien, Portugais, Néerlandais, Polonais, Russe, Chinois, Japonais, Coréen, Arabe, Hindi, Turc, Suédois, etc.

#### OpenAI TTS
| Voix | Genre | Style | Qualité |
|------|-------|-------|---------|
| `alloy` | Neutre | Professionnel, clair | ⭐⭐⭐⭐ |
| `echo` | Masculin | Chaleureux, mature | ⭐⭐⭐⭐ |
| `fable` | Neutre | Énergique, dynamique | ⭐⭐⭐⭐ |
| `onyx` | Masculin | Profond, autoritaire | ⭐⭐⭐⭐ |
| `nova` | Féminin | Jeune, moderne | ⭐⭐⭐⭐ |
| `shimmer` | Féminin | Douce, apaisante | ⭐⭐⭐⭐ |

**Modèles TTS** :
- `tts-1` : Standard, latence faible (~300ms)
- `tts-1-hd` : Haute qualité, latence moyenne (~500ms)

**Formats audio** : MP3 (défaut), Opus, AAC, FLAC, WAV, PCM

**Prix** : $15/1M caractères (tts-1), $30/1M caractères (tts-1-hd)

---

### 2️⃣ Google Cloud

#### Google Speech-to-Text (STT)
| Modèle | Description | Précision | Prix |
|--------|-------------|-----------|------|
| `chirp` | Dernière génération Universal Speech Model | ⭐⭐⭐⭐⭐ | $0.016/min |
| `chirp_2` | Version 2 (obsolète) | ⭐⭐⭐⭐ | $0.012/min |
| `latest_long` | Optimisé pour audio long (>1min) | ⭐⭐⭐⭐ | $0.009/min |
| `latest_short` | Optimisé pour commandes vocales | ⭐⭐⭐⭐ | $0.009/min |
| `phone_call` | Optimisé téléphonie (8kHz) | ⭐⭐⭐⭐ | $0.009/min |
| `video` | Optimisé vidéos (bruits de fond) | ⭐⭐⭐⭐ | $0.009/min |
| `default` | Modèle standard | ⭐⭐⭐ | $0.006/min |

**Langues supportées** : 100+ langues avec variantes régionales

#### Google Text-to-Speech (TTS)

**Modèles disponibles** :

| Modèle | Description | Qualité | Prix |
|--------|-------------|---------|------|
| `gemini-tts` | Nouveau modèle Gemini 2.0 | ⭐⭐⭐⭐⭐ | Non public (preview) |
| `chirp3-hd` | Ultra-naturel, streaming temps réel | ⭐⭐⭐⭐⭐ | Premium |
| `neural2` | Deep Learning, meilleur rapport qualité/prix | ⭐⭐⭐⭐ | $16/1M caractères |
| `wavenet` | Ancien modèle premium | ⭐⭐⭐⭐ | $16/1M caractères |
| `standard` | Basique, synthèse paramétrique | ⭐⭐⭐ | $4/1M caractères |

**Voix françaises (Neural2 - Recommandées)** :

| Code | Genre | Style | Description |
|------|-------|-------|-------------|
| `fr-FR-Neural2-A` | Féminin | Neutre | Voix professionnelle, claire |
| `fr-FR-Neural2-B` | Féminin | Chaleureux | Voix douce, amicale |
| `fr-FR-Neural2-C` | Masculin | Naturel | Voix masculine standard |
| `fr-FR-Neural2-D` | Masculin | Profond | Voix grave, autoritaire |
| `fr-FR-Neural2-E` | Féminin | Jeune | Voix dynamique, moderne |

**Voix françaises (WaveNet - Premium)** :

| Code | Genre | Description |
|------|-------|-------------|
| `fr-FR-Wavenet-A` | Féminin | Premium naturel |
| `fr-FR-Wavenet-B` | Masculin | Premium professionnel |
| `fr-FR-Wavenet-C` | Féminin | Premium chaleureux |
| `fr-FR-Wavenet-D` | Masculin | Premium autoritaire |
| `fr-FR-Wavenet-E` | Féminin | Premium dynamique |

**Voix françaises canadiennes** :

| Code | Genre | Accent |
|------|-------|--------|
| `fr-CA-Neural2-A` | Féminin | Québécois |
| `fr-CA-Neural2-B` | Masculin | Québécois |
| `fr-CA-Neural2-C` | Féminin | Québécois |
| `fr-CA-Neural2-D` | Masculin | Québécois |

**Autres langues populaires** :

| Langue | Codes Neural2 | Nombre de voix |
|--------|---------------|----------------|
| Anglais US | `en-US-Neural2-A/C/D/E/F/G/H/I/J` | 9 voix |
| Anglais UK | `en-GB-Neural2-A/B/C/D/F` | 5 voix |
| Espagnol | `es-ES-Neural2-A/B/C/D/E/F` | 6 voix |
| Allemand | `de-DE-Neural2-A/B/C/D/F` | 5 voix |
| Italien | `it-IT-Neural2-A/C` | 2 voix |
| Portugais BR | `pt-BR-Neural2-A/B/C` | 3 voix |
| Japonais | `ja-JP-Neural2-B/C/D` | 3 voix |
| Chinois | `cmn-CN-Neural2-A/B/C/D` | 4 voix |
| Arabe | `ar-XA-Neural2-A/B/C/D` | 4 voix |

**Features avancées** :
- SSML support (Speech Synthesis Markup Language)
- Audio profiles (téléphone, casque, home theater, etc.)
- Speed, pitch, volume control
- Instant Custom Voice (clonage de voix en 60 secondes)

---

### 3️⃣ ElevenLabs

#### ElevenLabs TTS (Premium)

**Modèles disponibles** :

| Modèle | Description | Latence | Qualité |
|--------|-------------|---------|---------|
| `eleven_multilingual_v2` | Support 29 langues | Faible | ⭐⭐⭐⭐⭐ |
| `eleven_turbo_v2` | Ultra-rapide streaming | Très faible | ⭐⭐⭐⭐ |
| `eleven_monolingual_v1` | Anglais uniquement | Moyenne | ⭐⭐⭐⭐⭐ |

**Voix pré-construites (Premade Voices)** :

| Voix | Genre | Style | Langues |
|------|-------|-------|---------|
| `Rachel` | Féminin | Calme, narrative | EN + 28 langues |
| `Drew` | Masculin | Professionnel, clair | EN + 28 langues |
| `Clyde` | Masculin | Chaleureux, amical | EN + 28 langues |
| `Paul` | Masculin | Narrateur documentaire | EN + 28 langues |
| `Domi` | Féminin | Énergique, dynamique | EN + 28 langues |
| `Dave` | Masculin | Conversationnel | EN + 28 langues |
| `Fin` | Masculin | Mature, sérieux | EN + 28 langues |
| `Sarah` | Féminin | Douce, apaisante | EN + 28 langues |
| `Antoni` | Masculin | Narrateur storytelling | EN + 28 langues |
| `Thomas` | Masculin | Voix off médias | EN + 28 langues |
| `Charlie` | Masculin | Jeune, casual | EN + 28 langues |
| `Emily` | Féminin | Professionnelle, confiante | EN + 28 langues |
| `Elli` | Féminin | Jeune, moderne | EN + 28 langues |
| `Callum` | Masculin | Narrateur intense | EN + 28 langues |
| `Patrick` | Masculin | Voix grave, forte | EN + 28 langues |
| `Harry` | Masculin | Accent UK, poli | EN + 28 langues |
| `Liam` | Masculin | Narrateur aventure | EN + 28 langues |
| `Dorothy` | Féminin | Mature, sage | EN + 28 langues |
| `Josh` | Masculin | Conversationnel naturel | EN + 28 langues |
| `Arnold` | Masculin | Autoritaire, fort | EN + 28 langues |
| `Charlotte` | Féminin | Accent UK, élégant | EN + 28 langues |
| `Matilda` | Féminin | Accent UK, chaleureux | EN + 28 langues |
| `Matthew` | Masculin | Narrateur audiobook | EN + 28 langues |
| `James` | Masculin | Accent UK, sérieux | EN + 28 langues |
| `Joseph` | Masculin | Voix off cinéma | EN + 28 langues |
| `Jeremy` | Masculin | Narrateur podcast | EN + 28 langues |
| `Michael` | Masculin | Accent US, confiant | EN + 28 langues |
| `Ethan` | Masculin | Jeune, dynamique | EN + 28 langues |
| `Chris` | Masculin | Conversationnel casual | EN + 28 langues |
| `Gigi` | Féminin | Jeune, énergique | EN + 28 langues |
| `Freya` | Féminin | Accent UK, professionnelle | EN + 28 langues |
| `Brian` | Masculin | Narrateur éducatif | EN + 28 langues |
| `Grace` | Féminin | Douce, rassurante | EN + 28 langues |
| `Daniel` | Masculin | Voix off corporatif | EN + 28 langues |
| `Lily` | Féminin | Accent UK, jeune | EN + 28 langues |
| `Serena` | Féminin | Mature, confiante | EN + 28 langues |
| `Adam` | Masculin | Narrateur dramatique | EN + 28 langues |
| `Nicole` | Féminin | Voix off médias | EN + 28 langues |
| `Bill` | Masculin | Accent US, fort | EN + 28 langues |
| `Jessie` | Masculin | Jeune, casual | EN + 28 langues |
| `Sam` | Masculin | Narrateur raspy | EN + 28 langues |
| `Glinda` | Féminin | Accent US, élégant | EN + 28 langues |
| `Giovanni` | Masculin | Accent italien | EN + 28 langues |
| `Mimi` | Féminin | Accent asiatique | EN + 28 langues |

**Langues supportées** : Anglais, Français, Allemand, Espagnol, Italien, Portugais, Polonais, Néerlandais, Suédois, Danois, Norvégien, Finnois, Tchèque, Roumain, Turc, Japonais, Chinois, Coréen, Hindi, Arabe, etc.

**Features premium** :
- **Voice Cloning** : Cloner n'importe quelle voix avec 1-3 min d'audio
- **Instant Voice Cloning** : Clonage immédiat (60 secondes)
- **Professional Voice Cloning** : Clonage ultra-précis (30 min d'audio)
- **Speech to Speech** : Transformer votre voix en temps réel
- **Voice Design** : Générer des voix artificielles sur mesure
- **Streaming** : Latence <500ms

**Prix** :
- Free : 10,000 caractères/mois
- Creator : $5/mois (30k caractères)
- Pro : $22/mois (100k caractères)
- Scale : $99/mois (500k caractères)
- Enterprise : Sur devis

---

### 4️⃣ Azure Speech Services (Microsoft)

#### Azure Speech-to-Text (STT)

| Modèle | Description | Prix |
|--------|-------------|------|
| `neural` | Modèle neural, haute précision | $1/heure |
| `standard` | Modèle basique | $0.75/heure |

**Langues supportées** : 100+ langues

#### Azure Text-to-Speech (TTS)

**Voix Neural (Recommandées)** :

**Français** :

| Code | Genre | Style | Description |
|------|-------|-------|-------------|
| `fr-FR-DeniseNeural` | Féminin | Neutre | Standard féminin |
| `fr-FR-HenriNeural` | Masculin | Neutre | Standard masculin |
| `fr-FR-AlainNeural` | Masculin | Professionnel | Voix off corporatif |
| `fr-FR-BrigitteNeural` | Féminin | Chaleureux | Voix amicale |
| `fr-FR-CelesteNeural` | Féminin | Jeune | Voix moderne |
| `fr-FR-ClaudeNeural` | Masculin | Mature | Voix autoritaire |
| `fr-FR-CoralieNeural` | Féminin | Douce | Voix apaisante |
| `fr-FR-EloiseNeural` | Féminin | Enfant | Voix jeune |
| `fr-FR-JacquelineNeural` | Féminin | Senior | Voix mature |
| `fr-FR-JeromeNeural` | Masculin | Senior | Voix sage |
| `fr-FR-JosephineNeural` | Féminin | Professionnelle | Voix corporative |
| `fr-FR-MauriceNeural` | Masculin | Profond | Voix grave |
| `fr-FR-YvesNeural` | Masculin | Narrateur | Voix documentaire |
| `fr-FR-YvetteNeural` | Féminin | Senior | Voix élégante |

**Anglais US** :

| Code | Genre | Style |
|------|-------|-------|
| `en-US-JennyNeural` | Féminin | Assistant virtuel |
| `en-US-GuyNeural` | Masculin | Conversationnel |
| `en-US-AriaNeural` | Féminin | Chatbot naturel |
| `en-US-DavisNeural` | Masculin | Professionnel |
| `en-US-AmberNeural` | Féminin | Jeune, dynamique |
| `en-US-AshleyNeural` | Féminin | Narratrice |
| `en-US-BrandonNeural` | Masculin | Jeune, énergique |
| `en-US-ChristopherNeural` | Masculin | Voix off |
| `en-US-CoraNeural` | Féminin | Mature, confiante |
| `en-US-ElizabethNeural` | Féminin | Senior, sage |
| `en-US-EricNeural` | Masculin | Narrateur documentaire |
| `en-US-JacobNeural` | Masculin | Jeune, casual |
| `en-US-JaneNeural` | Féminin | Professionnelle |
| `en-US-JasonNeural` | Masculin | Voix corporative |
| `en-US-MichelleNeural` | Féminin | Narratrice média |
| `en-US-MonicaNeural` | Féminin | Assistant virtuel amical |
| `en-US-NancyNeural` | Féminin | Senior, élégante |
| `en-US-RogerNeural` | Masculin | Senior, autoritaire |
| `en-US-SaraNeural` | Féminin | Jeune, moderne |
| `en-US-SteffanNeural` | Masculin | Voix off cinéma |
| `en-US-TonyNeural` | Masculin | Conversationnel naturel |
| `en-US-AIGenerate1Neural` | Neutre | Voix générée par IA |
| `en-US-AIGenerate2Neural` | Neutre | Voix générée par IA |

**Features avancées** :
- **SSML** : Contrôle total (pauses, emphase, prononciation)
- **Styles** : cheerful, sad, angry, excited, terrified, friendly, etc.
- **Custom Neural Voice** : Clonage de voix sur mesure
- **Streaming** : Latence faible

**Prix** : $15/1M caractères (Neural)

---

### 5️⃣ AWS Polly (Amazon)

#### AWS Polly TTS

**Voix Neural** :

**Français** :

| Code | Genre | Style |
|------|-------|-------|
| `Lea` | Féminin | Standard |
| `Remi` | Masculin | Standard |

**Anglais US** :

| Code | Genre | Description |
|------|-------|-------------|
| `Joanna` | Féminin | Plus populaire, Alexa voice |
| `Matthew` | Masculin | Standard masculin |
| `Ivy` | Féminin | Enfant/jeune |
| `Kendra` | Féminin | Professionnelle |
| `Kimberly` | Féminin | Conversationnelle |
| `Salli` | Féminin | Douce |
| `Joey` | Masculin | Jeune, dynamique |
| `Justin` | Masculin | Enfant/jeune |
| `Kevin` | Masculin | Conversationnel |

**Prix** : $4/1M caractères (Standard), $16/1M caractères (Neural)

---

## 🎯 Recommandations par Use Case

### Use Case 1 : Application vocale conversationnelle (Budget limité)
- **STT** : OpenAI Whisper ($0.006/min)
- **TTS** : Google Neural2 ($16/1M chars)
- **LLM** : Claude 3.5 Haiku (pas d'audio natif)
- **Total** : ~$0.05 par conversation de 3 min

### Use Case 2 : Assistant vocal premium (Meilleure qualité)
- **STT** : Google Chirp ($0.016/min)
- **TTS** : ElevenLabs Multilingual ($22/mois pour 100k chars)
- **LLM** : Claude 3.5 Sonnet
- **Total** : Subscription + usage

### Use Case 3 : Assistant client multilingue (Production)
- **STT** : Google Chirp (100+ langues)
- **TTS** : Azure Neural (bon support multilingue)
- **LLM** : GPT-4o (sans mode Realtime)
- **Total** : Enterprise grade

### Use Case 4 : Voice cloning / Personnalisation
- **STT** : OpenAI Whisper
- **TTS** : ElevenLabs Professional Cloning
- **LLM** : Claude 3.5 Sonnet
- **Total** : Premium

---

## 📦 Packages npm requis

```json
{
  "dependencies": {
    "@google-cloud/speech": "^6.7.0",
    "@google-cloud/text-to-speech": "^5.5.0",
    "openai": "^4.73.0",
    "elevenlabs": "^0.8.2",
    "@azure/cognitiveservices-speech-sdk": "^1.40.0"
  }
}
```

---

## 🔐 Variables d'environnement

```env
# OpenAI
OPENAI_API_KEY=sk-...

# Google Cloud
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
GOOGLE_PROJECT_ID=your-project-id

# ElevenLabs
ELEVENLABS_API_KEY=...

# Azure
AZURE_SPEECH_KEY=...
AZURE_SPEECH_REGION=westus

# Configuration DomOS
DOMOS_STT_PROVIDER=whisper  # whisper | google | azure
DOMOS_TTS_PROVIDER=openai   # openai | google | elevenlabs | azure
DOMOS_TTS_VOICE=nova        # Dépend du provider
DOMOS_LANGUAGE=fr-FR
```

---

## 📊 Tableau comparatif final

| Provider | STT Quality | TTS Quality | Latency | Multilang | Price | Custom Voice |
|----------|-------------|-------------|---------|-----------|-------|--------------|
| **OpenAI** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Moyenne | ✅ 99 langues | $ | ❌ |
| **Google** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Faible | ✅ 100+ langues | $$ | ✅ Instant |
| **ElevenLabs** | ❌ | ⭐⭐⭐⭐⭐ | Très faible | ✅ 29 langues | $$$ | ✅ Pro |
| **Azure** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Moyenne | ✅ 100+ langues | $$ | ✅ Custom |
| **AWS Polly** | ❌ | ⭐⭐⭐ | Moyenne | ✅ 60+ langues | $ | ❌ |

**🏆 Choix recommandé pour DomOS** :
- **STT** : OpenAI Whisper (simplicité + prix + qualité)
- **TTS** : Google Neural2 (qualité + prix) OU ElevenLabs (ultra-réaliste si budget)

---

## 🚀 Ordre d'implémentation

1. **Phase 1** : OpenAI Whisper + OpenAI TTS (plus simple, bon pour MVP)
2. **Phase 2** : Google STT + Google TTS (meilleur rapport qualité/prix)
3. **Phase 3** : ElevenLabs TTS (premium, optionnel)
4. **Phase 4** : Azure (si besoins enterprise spécifiques)

---

✅ **TODO prêt pour implémentation !**
