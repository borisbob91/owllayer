/**
 * Configuration structurée pour les system prompts.
 * Permet de composer un prompt par sections au lieu d'écrire un long string.
 */
export interface SystemPromptConfig {
  /** Nom de l'agent (ex: "Alex") — affiché dans le widget UI */
  name?: string;

  /** Langue du prompt (fr, en, es...) — injecte automatiquement dans le contexte */
  language?: string;

  /** Rôle de l'agent (ex: "Tu es Alex, un assistant shopping expert") */
  role: string;

  /** Personnalité / ton (ex: "Tu es amical, professionnel et concis") */
  personality?: string;

  /** Capacités de l'agent — liste de ce qu'il sait faire */
  capabilities?: string[];

  /** Règles strictes — contraintes que l'agent doit respecter */
  rules?: string[];

  /** Contexte dynamique (date, infos business, etc.) */
  context?: string | (() => string);

  /** Instructions spécifiques pour les tools */
  toolInstructions?: string;

  /** Format de réponse attendu */
  responseFormat?: string;

  /** Sections custom additionnelles (extensible) */
  sections?: Record<string, string | string[]>;
}

/**
 * Compiler un SystemPromptConfig en string final.
 * Assemble les sections dans un ordre logique.
 */
export function compileSystemPrompt(config: SystemPromptConfig): string {
  const parts: string[] = [];

  // [CONTEXTE] — langue + contexte dynamique
  const contextLines: string[] = [];
  if (config.language) {
    contextLines.push(`Langue: ${config.language}`);
  }
  const dynamicContext = typeof config.context === 'function' ? config.context() : config.context;
  if (dynamicContext) {
    contextLines.push(dynamicContext);
  }
  if (contextLines.length > 0) {
    parts.push(`[CONTEXTE]\n${contextLines.join('\n')}`);
  }

  // [NOM]
  if (config.name) {
    parts.push(`[NOM]\nTon nom est ${config.name}.`);
  }

  // [RÔLE]
  parts.push(`[RÔLE]\n${config.role}`);

  // [PERSONNALITÉ]
  if (config.personality) {
    parts.push(`[PERSONNALITÉ]\n${config.personality}`);
  }

  // [CAPACITÉS]
  if (config.capabilities && config.capabilities.length > 0) {
    const items = config.capabilities.map((c) => `- ${c}`).join('\n');
    parts.push(`[CAPACITÉS]\n${items}`);
  }

  // [RÈGLES]
  if (config.rules && config.rules.length > 0) {
    const items = config.rules.map((r) => `- ${r}`).join('\n');
    parts.push(`[RÈGLES]\n${items}`);
  }

  // [TOOLS]
  if (config.toolInstructions) {
    parts.push(`[TOOLS]\n${config.toolInstructions}`);
  }

  // [FORMAT]
  if (config.responseFormat) {
    parts.push(`[FORMAT]\n${config.responseFormat}`);
  }

  // Sections custom
  if (config.sections) {
    for (const [name, content] of Object.entries(config.sections)) {
      const sectionContent = Array.isArray(content)
        ? content.map((item) => `- ${item}`).join('\n')
        : content;
      parts.push(`[${name.toUpperCase()}]\n${sectionContent}`);
    }
  }

  return parts.join('\n\n');
}

/** Type union : accepte un string OU un config structuré */
export type SystemPrompt = string | SystemPromptConfig;

/**
 * Résoudre un SystemPrompt en string.
 * Si c'est déjà un string, le retourne tel quel.
 * Si c'est un SystemPromptConfig, le compile.
 */
export function resolveSystemPrompt(prompt: SystemPrompt): string {
  if (typeof prompt === 'string') {
    return prompt;
  }
  return compileSystemPrompt(prompt);
}
