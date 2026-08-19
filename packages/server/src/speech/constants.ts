// ============================================================
// Speech Services Constants
// Enums, modèles, voix et langues pour tous les providers
// Usage : import { OpenAIVoice, Language, SpeechPresets } from '@owllayer/server';
// ============================================================

// ─────────────────────────────────────────────
// Providers
// ─────────────────────────────────────────────

export enum STTProvider {
  WHISPER = 'openai-whisper',
  GOOGLE = 'google-stt',
}

export enum TTSProvider {
  OPENAI = 'openai-tts',
  GOOGLE = 'google-tts',
  ELEVENLABS = 'elevenlabs-tts',
}

// ─────────────────────────────────────────────
// Modèles STT
// ─────────────────────────────────────────────

/** Modèles OpenAI Whisper STT */
export enum WhisperModel {
  WHISPER_1 = 'whisper-1',
}

/** Modèles Google Cloud STT */
export enum GoogleSTTModel {
  /** Audio longue durée (>1 min) */
  LATEST_LONG = 'latest_long',
  /** Audio courte durée (<1 min) — commandes vocales */
  LATEST_SHORT = 'latest_short',
  /** Optimisé téléphonie (8kHz) */
  TELEPHONY = 'telephony',
  /** Dictée médicale */
  MEDICAL_DICTATION = 'medical_dictation',
  /** Conversation médicale */
  MEDICAL_CONVERSATION = 'medical_conversation',
}

// ─────────────────────────────────────────────
// Modèles TTS
// ─────────────────────────────────────────────

/** Modèles OpenAI TTS */
export enum OpenAITTSModel {
  /** Rapide, faible latence (~300ms) — $15/1M chars */
  TTS_1 = 'tts-1',
  /** Haute qualité (~500ms) — $30/1M chars */
  TTS_1_HD = 'tts-1-hd',
}

/** Types de voix Google Cloud TTS */
export enum GoogleTTSVoiceType {
  /** Basique — $4/1M chars */
  STANDARD = 'Standard',
  /** Qualité WaveNet — $16/1M chars */
  WAVENET = 'WaveNet',
  /** Neural2, meilleur rapport qualité/prix — $16/1M chars */
  NEURAL2 = 'Neural2',
  /** Studio, qualité maximale — $160/1M chars */
  STUDIO = 'Studio',
}

/** Modèles ElevenLabs TTS */
export enum ElevenLabsModel {
  /** Multilingue v2 — 29 langues, haute qualité */
  MULTILINGUAL_V2 = 'eleven_multilingual_v2',
  /** Anglais seulement, v1 */
  MONOLINGUAL_V1 = 'eleven_monolingual_v1',
  /** Turbo v2 — faible latence */
  TURBO_V2 = 'eleven_turbo_v2',
  /** Turbo v2.5 — faible latence amélioré */
  TURBO_V2_5 = 'eleven_turbo_v2_5',
}

// ─────────────────────────────────────────────
// Voix OpenAI TTS (6 voix)
// ─────────────────────────────────────────────

export enum OpenAIVoice {
  /** Neutre, professionnelle et claire */
  ALLOY = 'alloy',
  /** Masculine, chaleureuse et mature */
  ECHO = 'echo',
  /** Neutre, énergique et dynamique */
  FABLE = 'fable',
  /** Masculine, profonde et autoritaire */
  ONYX = 'onyx',
  /** Féminine, jeune et moderne — recommandée FR */
  NOVA = 'nova',
  /** Féminine, douce et apaisante */
  SHIMMER = 'shimmer',
}

// ─────────────────────────────────────────────
// Voix ElevenLabs — ID des voix premade
// ─────────────────────────────────────────────

export enum ElevenLabsVoiceId {
  /** Féminine, calme et narrative */
  RACHEL = '21m00Tcm4TlvDq8ikWAM',
  /** Féminine, douce et chaleureuse */
  BELLA = 'EXAVITQu4vr4xnSDxMaL',
  /** Masculine, bien modulée, storytelling */
  ANTONI = 'ErXwobaYiN019PkySvjV',
  /** Masculine, grave et confiante */
  ARNOLD = 'VR6AewLTigWG4xSOukaG',
  /** Masculine, profonde et narrative */
  ADAM = 'pNInz6obpgDQGcFmaJgB',
  /** Féminine, jeune et animée */
  GIGI = 'jBpfuIE2acCO8z3wKNLl',
  /** Féminine, énergique et dynamique */
  DOMI = 'AZnzlk1XvdvUeBnXmlld',
  /** Masculine, conversationnel casual */
  DAVE = 'CYw49thpadwDBTtFJPY0',
  /** Masculine, mature et sérieux */
  FIN = 'D38z5RcWu1voky8WS1ja',
  /** Féminine, douce et apaisante */
  SARAH = 'EXAVITQu4vr4xnSDxMaL',
  /** Masculine, narrateur documentaire */
  THOMAS = 'GBv7mTt0atIp3Br8iCZE',
  /** Masculine, jeune et casual */
  CHARLIE = 'IKne3meq5aSn9XLyUdCD',
  /** Féminine, professionnelle et confiante */
  EMILY = 'LcfcDJNUP1GQjkzn1xUU',
  /** Féminine, jeune et moderne */
  ELLI = 'MF3mGyEYCl7XYWbV9V6O',
  /** Masculine, narrateur intense */
  CALLUM = 'N2lVS1w4EtoT3dr4eOWO',
  /** Masculine, voix grave et forte */
  PATRICK = 'ODq5zmih8GrVes37Dizd',
  /** Masculine, accent UK et poli */
  HARRY = 'SOYHLrjzK2X1ezoPC6cr',
  /** Masculine, narrateur aventure */
  LIAM = 'TX3LPaxmHKxFdv7VOQHJ',
  /** Féminine, mature et sage */
  DOROTHY = 'ThT5KcBeYPX3keUQqHPh',
  /** Masculine, conversationnel naturel */
  JOSH = 'TxGEqnHWrfWFTfGW9XjX',
  /** Féminine, accent UK et élégant */
  CHARLOTTE = 'XB0fDUnXU5powFXDhCwa',
  /** Féminine, accent UK et chaleureux */
  MATILDA = 'XrExE9yKIg1WjnnlVkGX',
  /** Masculine, narrateur audiobook */
  MATTHEW = 'Yko7PKs6WkR5GIbGerXZ',
  /** Masculine, accent UK et sérieux */
  JAMES = 'ZQe5CZNOzWyzPSCn5a3c',
  /** Masculine, voix off cinéma */
  JOSEPH = 'Zlb1dXrM653N07WRdFW3',
  /** Masculine, narrateur podcast */
  JEREMY = 'bVMeCyTHy58xNoL34h3p',
  /** Masculine, accent US et confiant */
  MICHAEL = 'flq6f7yk4E4fJM5XTYuZ',
  /** Masculine, jeune et dynamique */
  ETHAN = 'g5CIjZEefAph4nQFvHAz',
  /** Masculine, conversationnel casual */
  CHRIS = 'iP95p4xoKVk53GoZ742B',
  /** Féminine, accent UK et professionnelle */
  FREYA = 'jsCqWAovK2LkecY7zXl4',
  /** Masculine, narrateur éducatif */
  BRIAN = 'nPczCjzI2devNBz1zQrb',
  /** Féminine, douce et rassurante */
  GRACE = 'oWAxZDx7w5VEj9dCyTzz',
  /** Masculine, voix off corporatif */
  DANIEL = 'onwK4e9ZLuTAKqWW03F9',
  /** Féminine, accent UK et jeune */
  LILY = 'pFZP5JQG7iQjIQuC4Bku',
  /** Féminine, mature et confiante */
  SERENA = 'pMsXgVXv3BLzUgSXRplE',
  /** Féminine, voix off médias */
  NICOLE = 'piTKgcLEGmPE4e6mEKli',
  /** Masculine, accent US et fort */
  BILL = 'pqHfZKP75CvOlQylNhV4',
  /** Masculine, jeune et casual */
  JESSIE = 't0jbNlBVZ17f02VDIeMI',
  /** Masculine, voix raspy */
  SAM = 'yoZ06aMxZJJ28mfd3POQ',
  /** Féminine, accent US et élégant */
  GLINDA = 'z9fAnlkpzviPz146aGWa',
  /** Masculine, professionnel et clair */
  DREW = '29vD33N1CtxCmqQRPOHJ',
  /** Masculine, chaleureux et amical */
  CLYDE = '2EiwWnXFnvU5JabPnv8n',
  /** Masculine, narrateur documentaire */
  PAUL = '5Q0t7uMcjvnagumLfvZi',
}

// ─────────────────────────────────────────────
// Voix Google Cloud TTS — Français
// ─────────────────────────────────────────────

/** Voix Google Cloud TTS — Français (France) */
export const GoogleVoiceFR = {
  // Neural2
  NEURAL2_A: 'fr-FR-Neural2-A', // Féminine
  NEURAL2_B: 'fr-FR-Neural2-B', // Masculine
  NEURAL2_C: 'fr-FR-Neural2-C', // Féminine
  NEURAL2_D: 'fr-FR-Neural2-D', // Masculine
  NEURAL2_E: 'fr-FR-Neural2-E', // Féminine
  // WaveNet
  WAVENET_A: 'fr-FR-Wavenet-A', // Féminine
  WAVENET_B: 'fr-FR-Wavenet-B', // Masculine
  WAVENET_C: 'fr-FR-Wavenet-C', // Féminine
  WAVENET_D: 'fr-FR-Wavenet-D', // Masculine
  WAVENET_E: 'fr-FR-Wavenet-E', // Féminine
  // Standard
  STANDARD_A: 'fr-FR-Standard-A', // Féminine
  STANDARD_B: 'fr-FR-Standard-B', // Masculine
  STANDARD_C: 'fr-FR-Standard-C', // Féminine
  STANDARD_D: 'fr-FR-Standard-D', // Masculine
  STANDARD_E: 'fr-FR-Standard-E', // Féminine
  // Studio
  STUDIO_A: 'fr-FR-Studio-A', // Féminine
  STUDIO_D: 'fr-FR-Studio-D', // Masculine
} as const;

/** Voix Google Cloud TTS — Français (Canada / Québec) */
export const GoogleVoiceFR_CA = {
  NEURAL2_A: 'fr-CA-Neural2-A', // Féminine
  NEURAL2_B: 'fr-CA-Neural2-B', // Masculine
  NEURAL2_C: 'fr-CA-Neural2-C', // Féminine
  NEURAL2_D: 'fr-CA-Neural2-D', // Masculine
  WAVENET_A: 'fr-CA-Wavenet-A', // Féminine
  WAVENET_B: 'fr-CA-Wavenet-B', // Masculine
  WAVENET_C: 'fr-CA-Wavenet-C', // Féminine
  WAVENET_D: 'fr-CA-Wavenet-D', // Masculine
  STANDARD_A: 'fr-CA-Standard-A', // Féminine
  STANDARD_B: 'fr-CA-Standard-B', // Masculine
  STANDARD_C: 'fr-CA-Standard-C', // Féminine
  STANDARD_D: 'fr-CA-Standard-D', // Masculine
} as const;

// ─────────────────────────────────────────────
// Voix Google Cloud TTS — Anglais
// ─────────────────────────────────────────────

/** Voix Google Cloud TTS — Anglais (US) */
export const GoogleVoiceEN_US = {
  // Neural2
  NEURAL2_A: 'en-US-Neural2-A', // Masculine
  NEURAL2_C: 'en-US-Neural2-C', // Féminine
  NEURAL2_D: 'en-US-Neural2-D', // Masculine
  NEURAL2_E: 'en-US-Neural2-E', // Féminine
  NEURAL2_F: 'en-US-Neural2-F', // Féminine
  NEURAL2_G: 'en-US-Neural2-G', // Féminine
  NEURAL2_H: 'en-US-Neural2-H', // Féminine
  NEURAL2_I: 'en-US-Neural2-I', // Masculine
  NEURAL2_J: 'en-US-Neural2-J', // Masculine
  // Studio
  STUDIO_M: 'en-US-Studio-M', // Masculine
  STUDIO_O: 'en-US-Studio-O', // Féminine
  STUDIO_Q: 'en-US-Studio-Q', // Masculine
  // WaveNet
  WAVENET_A: 'en-US-Wavenet-A', // Masculine
  WAVENET_B: 'en-US-Wavenet-B', // Masculine
  WAVENET_C: 'en-US-Wavenet-C', // Féminine
  WAVENET_D: 'en-US-Wavenet-D', // Masculine
  WAVENET_E: 'en-US-Wavenet-E', // Féminine
  WAVENET_F: 'en-US-Wavenet-F', // Féminine
} as const;

/** Voix Google Cloud TTS — Anglais (UK) */
export const GoogleVoiceEN_GB = {
  NEURAL2_A: 'en-GB-Neural2-A', // Féminine
  NEURAL2_B: 'en-GB-Neural2-B', // Masculine
  NEURAL2_C: 'en-GB-Neural2-C', // Féminine
  NEURAL2_D: 'en-GB-Neural2-D', // Masculine
  NEURAL2_F: 'en-GB-Neural2-F', // Féminine
  WAVENET_A: 'en-GB-Wavenet-A', // Féminine
  WAVENET_B: 'en-GB-Wavenet-B', // Masculine
  WAVENET_C: 'en-GB-Wavenet-C', // Féminine
  WAVENET_D: 'en-GB-Wavenet-D', // Masculine
  WAVENET_F: 'en-GB-Wavenet-F', // Féminine
} as const;

// ─────────────────────────────────────────────
// Voix Google Cloud TTS — Autres langues
// ─────────────────────────────────────────────

/** Voix Google Cloud TTS — Espagnol (Espagne) */
export const GoogleVoiceES = {
  NEURAL2_A: 'es-ES-Neural2-A', // Féminine
  NEURAL2_B: 'es-ES-Neural2-B', // Masculine
  NEURAL2_C: 'es-ES-Neural2-C', // Féminine
  NEURAL2_D: 'es-ES-Neural2-D', // Féminine
  NEURAL2_E: 'es-ES-Neural2-E', // Féminine
  NEURAL2_F: 'es-ES-Neural2-F', // Masculine
  WAVENET_B: 'es-ES-Wavenet-B', // Masculine
  WAVENET_C: 'es-ES-Wavenet-C', // Féminine
  WAVENET_D: 'es-ES-Wavenet-D', // Féminine
} as const;

/** Voix Google Cloud TTS — Allemand */
export const GoogleVoiceDE = {
  NEURAL2_A: 'de-DE-Neural2-A', // Féminine
  NEURAL2_B: 'de-DE-Neural2-B', // Masculine
  NEURAL2_C: 'de-DE-Neural2-C', // Féminine
  NEURAL2_D: 'de-DE-Neural2-D', // Masculine
  NEURAL2_F: 'de-DE-Neural2-F', // Féminine
  WAVENET_A: 'de-DE-Wavenet-A', // Féminine
  WAVENET_B: 'de-DE-Wavenet-B', // Masculine
  WAVENET_C: 'de-DE-Wavenet-C', // Féminine
  WAVENET_D: 'de-DE-Wavenet-D', // Masculine
  WAVENET_E: 'de-DE-Wavenet-E', // Masculine
  WAVENET_F: 'de-DE-Wavenet-F', // Féminine
} as const;

/** Voix Google Cloud TTS — Italien */
export const GoogleVoiceIT = {
  NEURAL2_A: 'it-IT-Neural2-A', // Féminine
  NEURAL2_C: 'it-IT-Neural2-C', // Masculine
  WAVENET_A: 'it-IT-Wavenet-A', // Féminine
  WAVENET_B: 'it-IT-Wavenet-B', // Féminine
  WAVENET_C: 'it-IT-Wavenet-C', // Masculine
  WAVENET_D: 'it-IT-Wavenet-D', // Masculine
} as const;

/** Voix Google Cloud TTS — Portugais (Brésil) */
export const GoogleVoicePT_BR = {
  NEURAL2_A: 'pt-BR-Neural2-A', // Féminine
  NEURAL2_B: 'pt-BR-Neural2-B', // Masculine
  NEURAL2_C: 'pt-BR-Neural2-C', // Féminine
  WAVENET_A: 'pt-BR-Wavenet-A', // Féminine
  WAVENET_B: 'pt-BR-Wavenet-B', // Masculine
  WAVENET_C: 'pt-BR-Wavenet-C', // Féminine
} as const;

/** Voix Google Cloud TTS — Japonais */
export const GoogleVoiceJA = {
  NEURAL2_B: 'ja-JP-Neural2-B', // Féminine
  NEURAL2_C: 'ja-JP-Neural2-C', // Masculine
  NEURAL2_D: 'ja-JP-Neural2-D', // Masculine
  WAVENET_A: 'ja-JP-Wavenet-A', // Féminine
  WAVENET_B: 'ja-JP-Wavenet-B', // Féminine
  WAVENET_C: 'ja-JP-Wavenet-C', // Masculine
  WAVENET_D: 'ja-JP-Wavenet-D', // Masculine
} as const;

/** Voix Google Cloud TTS — Chinois (Mandarin) */
export const GoogleVoiceCMN = {
  NEURAL2_A: 'cmn-CN-Neural2-A', // Féminine
  NEURAL2_B: 'cmn-CN-Neural2-B', // Masculine
  NEURAL2_C: 'cmn-CN-Neural2-C', // Masculine
  NEURAL2_D: 'cmn-CN-Neural2-D', // Féminine
  WAVENET_A: 'cmn-CN-Wavenet-A', // Féminine
  WAVENET_B: 'cmn-CN-Wavenet-B', // Masculine
  WAVENET_C: 'cmn-CN-Wavenet-C', // Masculine
  WAVENET_D: 'cmn-CN-Wavenet-D', // Féminine
} as const;

/** Voix Google Cloud TTS — Arabe */
export const GoogleVoiceAR = {
  NEURAL2_A: 'ar-XA-Neural2-A', // Féminine
  NEURAL2_B: 'ar-XA-Neural2-B', // Masculine
  NEURAL2_C: 'ar-XA-Neural2-C', // Masculine
  NEURAL2_D: 'ar-XA-Neural2-D', // Féminine
  WAVENET_A: 'ar-XA-Wavenet-A', // Féminine
  WAVENET_B: 'ar-XA-Wavenet-B', // Masculine
  WAVENET_C: 'ar-XA-Wavenet-C', // Masculine
  WAVENET_D: 'ar-XA-Wavenet-D', // Féminine
} as const;

/** Voix Google Cloud TTS — Coréen */
export const GoogleVoiceKO = {
  NEURAL2_A: 'ko-KR-Neural2-A', // Féminine
  NEURAL2_B: 'ko-KR-Neural2-B', // Féminine
  NEURAL2_C: 'ko-KR-Neural2-C', // Masculine
  WAVENET_A: 'ko-KR-Wavenet-A', // Féminine
  WAVENET_B: 'ko-KR-Wavenet-B', // Féminine
  WAVENET_C: 'ko-KR-Wavenet-C', // Masculine
  WAVENET_D: 'ko-KR-Wavenet-D', // Masculine
} as const;

// ─────────────────────────────────────────────
// Voix Azure Speech Services
// ─────────────────────────────────────────────

/** Voix Azure Neural — Français (France) */
export const AzureVoiceFR = {
  DENISE: 'fr-FR-DeniseNeural', // Féminine, standard
  HENRI: 'fr-FR-HenriNeural', // Masculine, standard
  ALAIN: 'fr-FR-AlainNeural', // Masculine, professionnel
  BRIGITTE: 'fr-FR-BrigitteNeural', // Féminine, chaleureux
  CELESTE: 'fr-FR-CelesteNeural', // Féminine, jeune
  CLAUDE: 'fr-FR-ClaudeNeural', // Masculine, mature
  CORALIE: 'fr-FR-CoralieNeural', // Féminine, douce
  ELOISE: 'fr-FR-EloiseNeural', // Féminine, enfant
  JACQUELINE: 'fr-FR-JacquelineNeural', // Féminine, senior
  JEROME: 'fr-FR-JeromeNeural', // Masculine, senior
  JOSEPHINE: 'fr-FR-JosephineNeural', // Féminine, corporative
  MAURICE: 'fr-FR-MauriceNeural', // Masculine, profond
  YVES: 'fr-FR-YvesNeural', // Masculine, narrateur
  YVETTE: 'fr-FR-YvetteNeural', // Féminine, élégante
} as const;

/** Voix Azure Neural — Anglais (US) */
export const AzureVoiceEN_US = {
  JENNY: 'en-US-JennyNeural', // Féminine, assistant virtuel
  GUY: 'en-US-GuyNeural', // Masculine, conversationnel
  ARIA: 'en-US-AriaNeural', // Féminine, chatbot naturel
  DAVIS: 'en-US-DavisNeural', // Masculine, professionnel
  AMBER: 'en-US-AmberNeural', // Féminine, dynamique
  ASHLEY: 'en-US-AshleyNeural', // Féminine, narratrice
  BRANDON: 'en-US-BrandonNeural', // Masculine, énergique
  CHRISTOPHER: 'en-US-ChristopherNeural', // Masculine, voix off
  CORA: 'en-US-CoraNeural', // Féminine, confiante
  ELIZABETH: 'en-US-ElizabethNeural', // Féminine, senior
  ERIC: 'en-US-EricNeural', // Masculine, documentaire
  JACOB: 'en-US-JacobNeural', // Masculine, casual
  JANE: 'en-US-JaneNeural', // Féminine, professionnelle
  JASON: 'en-US-JasonNeural', // Masculine, corporatif
  MICHELLE: 'en-US-MichelleNeural', // Féminine, médias
  MONICA: 'en-US-MonicaNeural', // Féminine, amicale
  NANCY: 'en-US-NancyNeural', // Féminine, élégante
  ROGER: 'en-US-RogerNeural', // Masculine, autoritaire
  SARA: 'en-US-SaraNeural', // Féminine, moderne
  STEFFAN: 'en-US-SteffanNeural', // Masculine, cinéma
  TONY: 'en-US-TonyNeural', // Masculine, naturel
} as const;

// ─────────────────────────────────────────────
// Codes Langue
// ─────────────────────────────────────────────

/** Codes langue BCP-47 courants pour STT/TTS */
export enum Language {
  // Français
  FRENCH = 'fr-FR',
  FRENCH_CANADA = 'fr-CA',
  FRENCH_BELGIUM = 'fr-BE',
  FRENCH_SWITZERLAND = 'fr-CH',

  // Anglais
  ENGLISH_US = 'en-US',
  ENGLISH_UK = 'en-GB',
  ENGLISH_AU = 'en-AU',
  ENGLISH_IN = 'en-IN',
  ENGLISH_CA = 'en-CA',

  // Espagnol
  SPANISH = 'es-ES',
  SPANISH_MX = 'es-MX',
  SPANISH_AR = 'es-AR',
  SPANISH_CO = 'es-CO',

  // Allemand
  GERMAN = 'de-DE',
  GERMAN_AT = 'de-AT',
  GERMAN_CH = 'de-CH',

  // Autres langues européennes
  ITALIAN = 'it-IT',
  PORTUGUESE_BR = 'pt-BR',
  PORTUGUESE_PT = 'pt-PT',
  DUTCH = 'nl-NL',
  POLISH = 'pl-PL',
  RUSSIAN = 'ru-RU',
  SWEDISH = 'sv-SE',
  NORWEGIAN = 'nb-NO',
  DANISH = 'da-DK',
  FINNISH = 'fi-FI',
  CZECH = 'cs-CZ',
  ROMANIAN = 'ro-RO',
  HUNGARIAN = 'hu-HU',
  GREEK = 'el-GR',
  TURKISH = 'tr-TR',
  UKRAINIAN = 'uk-UA',
  CATALAN = 'ca-ES',
  CROATIAN = 'hr-HR',
  SLOVAK = 'sk-SK',
  BULGARIAN = 'bg-BG',

  // Asiatique
  JAPANESE = 'ja-JP',
  KOREAN = 'ko-KR',
  CHINESE_SIMPLIFIED = 'zh-CN',
  CHINESE_TRADITIONAL = 'zh-TW',
  CHINESE_CANTONESE = 'yue-HK',
  HINDI = 'hi-IN',
  THAI = 'th-TH',
  VIETNAMESE = 'vi-VN',
  INDONESIAN = 'id-ID',
  MALAY = 'ms-MY',
  TAGALOG = 'fil-PH',
  TAMIL = 'ta-IN',
  BENGALI = 'bn-IN',

  // Moyen-Orient / Afrique
  ARABIC = 'ar-XA',
  ARABIC_SA = 'ar-SA',
  ARABIC_EG = 'ar-EG',
  HEBREW = 'he-IL',
  PERSIAN = 'fa-IR',
  SWAHILI = 'sw-KE',
  AFRIKAANS = 'af-ZA',
}

/**
 * Codes langue courts pour Whisper (ISO 639-1).
 * Whisper accepte le code court ('fr') au lieu du code complet ('fr-FR').
 */
export enum WhisperLanguage {
  FRENCH = 'fr',
  ENGLISH = 'en',
  SPANISH = 'es',
  GERMAN = 'de',
  ITALIAN = 'it',
  PORTUGUESE = 'pt',
  DUTCH = 'nl',
  POLISH = 'pl',
  RUSSIAN = 'ru',
  JAPANESE = 'ja',
  KOREAN = 'ko',
  CHINESE = 'zh',
  ARABIC = 'ar',
  HINDI = 'hi',
  TURKISH = 'tr',
  SWEDISH = 'sv',
  DANISH = 'da',
  FINNISH = 'fi',
  NORWEGIAN = 'no',
  CZECH = 'cs',
  ROMANIAN = 'ro',
  HUNGARIAN = 'hu',
  GREEK = 'el',
  HEBREW = 'he',
  THAI = 'th',
  VIETNAMESE = 'vi',
  INDONESIAN = 'id',
  UKRAINIAN = 'uk',
  CATALAN = 'ca',
  TAMIL = 'ta',
  BENGALI = 'bn',
  PERSIAN = 'fa',
  MALAY = 'ms',
  TAGALOG = 'tl',
  SWAHILI = 'sw',
  AFRIKAANS = 'af',
}

// ─────────────────────────────────────────────
// Formats Audio
// ─────────────────────────────────────────────

/** Formats audio supportés en sortie TTS */
export enum AudioFormat {
  MP3 = 'mp3',
  OPUS = 'opus',
  AAC = 'aac',
  FLAC = 'flac',
  WAV = 'wav',
  PCM = 'pcm',
}

/** Formats de sortie ElevenLabs (avec qualité) */
export enum ElevenLabsOutputFormat {
  /** MP3 haute qualité (44.1kHz, 128kbps) */
  MP3_HIGH = 'mp3_44100_128',
  /** MP3 basse qualité (22.05kHz, 32kbps) */
  MP3_LOW = 'mp3_22050_32',
  /** PCM 16kHz (brut) */
  PCM_16K = 'pcm_16000',
  /** PCM 22.05kHz */
  PCM_22K = 'pcm_22050',
  /** PCM 24kHz */
  PCM_24K = 'pcm_24000',
  /** PCM 44.1kHz (haute fidélité) */
  PCM_44K = 'pcm_44100',
  /** mu-law 8kHz (téléphonie) */
  ULAW_8K = 'ulaw_8000',
}

// ─────────────────────────────────────────────
// Encodages Audio Google STT
// ─────────────────────────────────────────────

/** Encodages audio acceptés par Google Cloud STT */
export enum GoogleAudioEncoding {
  LINEAR16 = 'LINEAR16',
  FLAC = 'FLAC',
  MULAW = 'MULAW',
  AMR = 'AMR',
  AMR_WB = 'AMR_WB',
  OGG_OPUS = 'OGG_OPUS',
  WEBM_OPUS = 'WEBM_OPUS',
  MP3 = 'MP3',
}

// ─────────────────────────────────────────────
// Profils d'effets Google TTS
// ─────────────────────────────────────────────

/** Profils d'effets audio pour Google Cloud TTS */
export enum GoogleTTSEffectProfile {
  /** Casque filaire / écouteurs */
  WEARABLE = 'wearable-class-device',
  /** Téléphone mobile */
  HANDSET = 'handset-class-device',
  /** Petit haut-parleur Bluetooth */
  SMALL_SPEAKER = 'small-bluetooth-speaker-class-device',
  /** Haut-parleur Bluetooth moyen */
  MEDIUM_SPEAKER = 'medium-bluetooth-speaker-class-device',
  /** Enceinte de salon / home cinéma */
  HOME_ENTERTAINMENT = 'large-home-entertainment-class-device',
  /** Appel téléphonique / IVR */
  TELEPHONY = 'telephony-class-application',
  /** Haut-parleur de voiture */
  CAR = 'large-automotive-class-device',
}

// ─────────────────────────────────────────────
// Presets rapides
// ─────────────────────────────────────────────

/**
 * Configurations prêtes à l'emploi pour démarrer vite.
 *
 * @example
 * ```ts
 * import { SpeechPresets, OpenAITTS } from '@owllayer/server';
 *
 * const tts = new OpenAITTS({
 *   apiKey: OPENAI_KEY,
 *   ...SpeechPresets.OPENAI_TTS_FR,
 * });
 * ```
 */
export const SpeechPresets = {
  // --- OpenAI TTS ---
  /** OpenAI TTS optimisé français — Nova, tts-1 */
  OPENAI_TTS_FR: {
    voice: OpenAIVoice.NOVA as string,
    model: OpenAITTSModel.TTS_1 as string,
    defaultLanguage: Language.FRENCH as string,
  },
  /** OpenAI TTS haute qualité français — Nova, tts-1-hd */
  OPENAI_TTS_FR_HD: {
    voice: OpenAIVoice.NOVA as string,
    model: OpenAITTSModel.TTS_1_HD as string,
    defaultLanguage: Language.FRENCH as string,
  },
  /** OpenAI TTS anglais — Alloy, tts-1 */
  OPENAI_TTS_EN: {
    voice: OpenAIVoice.ALLOY as string,
    model: OpenAITTSModel.TTS_1 as string,
    defaultLanguage: Language.ENGLISH_US as string,
  },

  // --- Google TTS ---
  /** Google TTS Neural2 français */
  GOOGLE_TTS_FR: {
    voice: GoogleVoiceFR.NEURAL2_A,
    voiceType: GoogleTTSVoiceType.NEURAL2 as string,
    defaultLanguage: Language.FRENCH as string,
  },
  /** Google TTS Studio français (meilleure qualité) */
  GOOGLE_TTS_FR_STUDIO: {
    voice: GoogleVoiceFR.STUDIO_A,
    voiceType: GoogleTTSVoiceType.STUDIO as string,
    defaultLanguage: Language.FRENCH as string,
  },
  /** Google TTS Québécois */
  GOOGLE_TTS_FR_CA: {
    voice: GoogleVoiceFR_CA.NEURAL2_A,
    voiceType: GoogleTTSVoiceType.NEURAL2 as string,
    defaultLanguage: Language.FRENCH_CANADA as string,
  },
  /** Google TTS anglais US */
  GOOGLE_TTS_EN: {
    voice: GoogleVoiceEN_US.NEURAL2_C,
    voiceType: GoogleTTSVoiceType.NEURAL2 as string,
    defaultLanguage: Language.ENGLISH_US as string,
  },
  /** Google TTS anglais UK */
  GOOGLE_TTS_EN_GB: {
    voice: GoogleVoiceEN_GB.NEURAL2_A,
    voiceType: GoogleTTSVoiceType.NEURAL2 as string,
    defaultLanguage: Language.ENGLISH_UK as string,
  },
  /** Google TTS espagnol */
  GOOGLE_TTS_ES: {
    voice: GoogleVoiceES.NEURAL2_A,
    voiceType: GoogleTTSVoiceType.NEURAL2 as string,
    defaultLanguage: Language.SPANISH as string,
  },
  /** Google TTS allemand */
  GOOGLE_TTS_DE: {
    voice: GoogleVoiceDE.NEURAL2_A,
    voiceType: GoogleTTSVoiceType.NEURAL2 as string,
    defaultLanguage: Language.GERMAN as string,
  },

  // --- ElevenLabs TTS ---
  /** ElevenLabs multilingue français — Rachel */
  ELEVENLABS_FR: {
    voiceId: ElevenLabsVoiceId.RACHEL as string,
    model: ElevenLabsModel.MULTILINGUAL_V2 as string,
    defaultLanguage: Language.FRENCH as string,
  },
  /** ElevenLabs turbo (faible latence) — Rachel */
  ELEVENLABS_TURBO: {
    voiceId: ElevenLabsVoiceId.RACHEL as string,
    model: ElevenLabsModel.TURBO_V2_5 as string,
    defaultLanguage: Language.FRENCH as string,
  },
  /** ElevenLabs anglais — Drew */
  ELEVENLABS_EN: {
    voiceId: ElevenLabsVoiceId.DREW as string,
    model: ElevenLabsModel.MULTILINGUAL_V2 as string,
    defaultLanguage: Language.ENGLISH_US as string,
  },

  // --- Whisper STT ---
  /** Whisper STT français */
  WHISPER_FR: {
    language: WhisperLanguage.FRENCH as string,
    responseFormat: 'verbose_json' as const,
  },
  /** Whisper STT anglais */
  WHISPER_EN: {
    language: WhisperLanguage.ENGLISH as string,
    responseFormat: 'verbose_json' as const,
  },
  /** Whisper STT auto-détection */
  WHISPER_AUTO: {
    responseFormat: 'verbose_json' as const,
  },

  // --- Google STT ---
  /** Google STT français */
  GOOGLE_STT_FR: {
    defaultLanguage: Language.FRENCH as string,
    enableAutomaticPunctuation: true,
    model: GoogleSTTModel.LATEST_LONG as string,
  },
  /** Google STT anglais */
  GOOGLE_STT_EN: {
    defaultLanguage: Language.ENGLISH_US as string,
    enableAutomaticPunctuation: true,
    model: GoogleSTTModel.LATEST_LONG as string,
  },
} as const;
