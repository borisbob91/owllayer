// ============================================================
// Catalogue type des modeles Anthropic Claude
// Listes `as const` : autocompletion + catalogue runtime (getCapabilities).
// `(string & {})` garde l'ouverture aux identifiants non encore repertories.
// Verifie par rapport a la documentation officielle Anthropic le
// ANTHROPIC_CATALOG_VERIFIED_AT ci-dessous ; a re-verifier au debut de chaque lot.
// Sources (2026-09-28) : platform.claude.com/docs/en/models/overview,
// platform.claude.com/docs/en/about-claude/model-deprecations.
// ============================================================

/** Date (ISO) de la derniere verification du catalogue par rapport a la documentation Anthropic. */
export const ANTHROPIC_CATALOG_VERIFIED_AT = '2026-09-28';

/** Statut d'une entree active du catalogue. Anthropic ne publie pas de modele preview a ce jour. */
export type AnthropicCatalogStatus = 'stable';

/** Entree de modele du catalogue Anthropic (data-model.md CatalogModel). */
export interface AnthropicCatalogModel {
  id: string;
  name: string;
  role: 'text';
  status: AnthropicCatalogStatus;
  languages?: readonly string[];
  description?: string;
}

/** Statut d'un modele du catalogue deprecie. */
export type AnthropicDeprecatedStatus = 'deprecated' | 'retired';

/** Entree du catalogue deprecie Anthropic (data-model.md DeprecatedModel). */
export interface AnthropicDeprecatedModel {
  id: string;
  role: 'text';
  status: AnthropicDeprecatedStatus;
  shutdownDate?: string;
  replacement?: string;
  source: string;
}

/** Resultat des helpers de support de langue (data-model.md). */
export type LanguageSupport = { supported: true } | { supported: false; supportedLanguages: readonly string[] };

/**
 * Modeles Claude actifs ("Active" sur la page de statut des modeles) :
 * la gamme courante (Fable 5.1, Opus 5.5, Sonnet 5.5, Haiku 4.5) et les
 * modeles legacy toujours disponibles. Anthropic ne documente pas de langues
 * par modele (multilingue non liste par code, cf. ANTHROPIC_LANGUAGES).
 */
export const ANTHROPIC_MODELS = [
  { id: 'claude-fable-5-1', name: 'Claude Fable 5.1', role: 'text', status: 'stable', description: 'Raisonnement exigeant et travail agentique long-horizon' },
  { id: 'claude-fable-5', name: 'Claude Fable 5', role: 'text', status: 'stable', description: 'Legacy, toujours disponible' },
  { id: 'claude-opus-5-5', name: 'Claude Opus 5.5', role: 'text', status: 'stable', description: 'Travail agentique et connaissance de longue duree' },
  { id: 'claude-opus-5', name: 'Claude Opus 5', role: 'text', status: 'stable', description: 'Legacy, toujours disponible' },
  { id: 'claude-opus-4-8', name: 'Claude Opus 4.8', role: 'text', status: 'stable', description: 'Legacy, toujours disponible' },
  { id: 'claude-opus-4-7', name: 'Claude Opus 4.7', role: 'text', status: 'stable', description: 'Legacy, toujours disponible' },
  { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', role: 'text', status: 'stable', description: 'Legacy, toujours disponible' },
  { id: 'claude-opus-4-5', name: 'Claude Opus 4.5', role: 'text', status: 'stable', description: 'Legacy, toujours disponible' },
  { id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5', role: 'text', status: 'stable', description: 'Meilleure combinaison vitesse/intelligence' },
  { id: 'claude-sonnet-5', name: 'Claude Sonnet 5', role: 'text', status: 'stable', description: 'Legacy, toujours disponible' },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', role: 'text', status: 'stable', description: 'Legacy, toujours disponible' },
  { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', role: 'text', status: 'stable', description: 'Legacy, toujours disponible' },
  { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', role: 'text', status: 'stable', description: 'Le plus rapide, intelligence proche de la frontiere' },
] as const satisfies readonly AnthropicCatalogModel[];

/** Modele texte par defaut. `claude-sonnet-5` est Active (non deprecie) : inchange (FR-010). */
export const ANTHROPIC_DEFAULT_MODEL = 'claude-sonnet-5';

/** Langues supportees : Anthropic ne publie pas de liste de codes, tous les modeles sont multilingues. */
export const ANTHROPIC_LANGUAGES = ['multilingual'] as const;

export type AnthropicModel = (typeof ANTHROPIC_MODELS)[number]['id'] | (string & {});

/**
 * Modeles Anthropic deprecies ou retires (platform.claude.com/docs/en/about-claude/model-deprecations,
 * table "Model status"). Toujours acceptes en entree (constante ou chaine
 * libre) mais declenchent un avertissement a la construction (FR-016).
 */
export const ANTHROPIC_DEPRECATED_MODELS = [
  {
    id: 'claude-mythos-preview',
    role: 'text',
    status: 'deprecated',
    replacement: undefined,
    source: 'platform.claude.com/docs/en/about-claude/model-deprecations',
  },
  {
    id: 'claude-opus-4-1-20250805',
    role: 'text',
    status: 'retired',
    shutdownDate: '2026-08-05',
    replacement: 'claude-opus-4-8',
    source: 'platform.claude.com/docs/en/about-claude/model-deprecations',
  },
  {
    id: 'claude-opus-4-20250514',
    role: 'text',
    status: 'retired',
    shutdownDate: '2026-06-15',
    replacement: 'claude-opus-4-8',
    source: 'platform.claude.com/docs/en/about-claude/model-deprecations',
  },
  {
    id: 'claude-sonnet-4-20250514',
    role: 'text',
    status: 'retired',
    shutdownDate: '2026-06-15',
    replacement: 'claude-sonnet-4-6',
    source: 'platform.claude.com/docs/en/about-claude/model-deprecations',
  },
  {
    id: 'claude-3-7-sonnet-20250219',
    role: 'text',
    status: 'retired',
    shutdownDate: '2026-02-19',
    replacement: 'claude-sonnet-4-6',
    source: 'platform.claude.com/docs/en/about-claude/model-deprecations',
  },
  {
    id: 'claude-3-5-haiku-20241022',
    role: 'text',
    status: 'retired',
    shutdownDate: '2026-02-19',
    replacement: 'claude-haiku-4-5',
    source: 'platform.claude.com/docs/en/about-claude/model-deprecations',
  },
  {
    id: 'claude-3-haiku-20240307',
    role: 'text',
    status: 'retired',
    shutdownDate: '2026-04-20',
    replacement: 'claude-haiku-4-5',
    source: 'platform.claude.com/docs/en/about-claude/model-deprecations',
  },
] as const satisfies readonly AnthropicDeprecatedModel[];

const KNOWN_MODEL_IDS = new Set<string>(ANTHROPIC_MODELS.map((m) => m.id));
const DEPRECATED_MODELS_BY_ID: Map<string, AnthropicDeprecatedModel> = new Map(
  ANTHROPIC_DEPRECATED_MODELS.map((entry) => [entry.id, entry]),
);

/** Verifie qu'un identifiant de modele est repertorie (FR-005 : ne leve jamais). */
export function isKnownAnthropicModel(id: string): boolean {
  return KNOWN_MODEL_IDS.has(id);
}

/** Tous les modeles Anthropic etant multilingues, toute langue est supportee (FR-005/edge case multilingue). */
export function anthropicSupportsLanguage(_id: string, _language: string): LanguageSupport {
  return { supported: true };
}

/** Retourne l'entree du catalogue deprecie pour un identifiant, ou `undefined` (FR-016, ne leve jamais). */
export function getAnthropicDeprecatedModel(id: string): AnthropicDeprecatedModel | undefined {
  return DEPRECATED_MODELS_BY_ID.get(id);
}
