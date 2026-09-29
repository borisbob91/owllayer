export { AnthropicAdapter } from './AnthropicAdapter.js';
export type { AnthropicAdapterOptions } from './AnthropicAdapter.js';
export type {
	AnthropicAdapterAnyEventListener,
	AnthropicAdapterEvent,
	AnthropicAdapterEventListener,
	AnthropicAdapterEventMap,
	AnthropicAdapterEventType,
} from './events.js';

// --- Catalogue type des modeles ---
export {
	ANTHROPIC_CATALOG_VERIFIED_AT,
	ANTHROPIC_MODELS,
	ANTHROPIC_DEFAULT_MODEL,
	ANTHROPIC_LANGUAGES,
	ANTHROPIC_DEPRECATED_MODELS,
	isKnownAnthropicModel,
	anthropicSupportsLanguage,
	getAnthropicDeprecatedModel,
} from './catalog.js';
export type {
	AnthropicCatalogStatus,
	AnthropicCatalogModel,
	AnthropicDeprecatedStatus,
	AnthropicDeprecatedModel,
	LanguageSupport,
	AnthropicModel,
} from './catalog.js';
export { warnIfDeprecatedAnthropicModel } from './warnings.js';
export type { WarnLogger } from './warnings.js';
