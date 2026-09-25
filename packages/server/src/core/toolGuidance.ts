import type { ToolDeclaration } from '@owllayer/core';

/**
 * Consignes d'outils par niveau de risque (feature #35).
 *
 * Le tag est ajoute a la description de chaque tool : il suit donc la liste
 * des tools a chaque navigation (texte, updateTools live) sans reecrire le prompt.
 * La section de prompt, elle, reste fixe et explique les tags.
 */
export type ToolGuidanceLanguage = 'en' | 'fr';

const TAG_BY_RISK: Record<NonNullable<ToolDeclaration['risk']>, string> = {
  none: '[PROACTIVE]',
  low: '[PREAMBLE]',
  high: '[SCREEN CONFIRMATION]',
  critical: '[SCREEN CONFIRMATION]',
};

const PROMPT_SECTION: Record<ToolGuidanceLanguage, string> = {
  en: `# Tool Behavior
Each tool description ends with a behavior tag. Follow it:
- [PROACTIVE]: call the tool as soon as the intent and the required values are clear. Do NOT ask for confirmation and do NOT announce the call.
- [PREAMBLE]: say ONE short sentence describing what you are doing (for example "I'm adding it to your cart."), then call the tool immediately.
- [SCREEN CONFIRMATION]: in one sentence, summarize the action and its consequence and tell the user to confirm on screen, then call the tool immediately. Do NOT ask for a spoken confirmation: the interface asks the user to approve.

## Tool Rules
- Use only the tools in the current tool list. Do not invent, rename or simulate tools.
- Only say an action is done after the tool result confirms success.
- If the result says the user denied the action, acknowledge it briefly and do not call that tool again unless the user asks.
- If a tool fails, explain it briefly without raw error details and offer a next step.`,
  fr: `# Comportement des outils
Chaque description d'outil se termine par un tag de comportement. Respecte-le :
- [PROACTIVE] : appelle l'outil dès que l'intention et les valeurs requises sont claires. NE demande PAS de confirmation et N'annonce PAS l'appel.
- [PREAMBLE] : dis UNE phrase courte décrivant ce que tu fais (par exemple « J'ajoute le produit à votre panier. »), puis appelle l'outil immédiatement.
- [SCREEN CONFIRMATION] : en une phrase, résume l'action et sa conséquence et invite l'utilisateur à confirmer à l'écran, puis appelle l'outil immédiatement. NE demande PAS de confirmation orale : l'interface demande l'approbation à l'utilisateur.

## Règles des outils
- Utilise uniquement les outils de la liste courante. N'invente, ne renomme et ne simule aucun outil.
- N'annonce qu'une action est faite qu'après un résultat d'outil confirmant le succès.
- Si le résultat indique que l'utilisateur a refusé l'action, prends-en acte brièvement et ne rappelle pas cet outil sauf si l'utilisateur le demande.
- Si un outil échoue, explique-le brièvement sans détail d'erreur brut et propose une suite.`,
};

/**
 * Ajouter le tag de comportement a la description de chaque tool.
 */
export function annotateToolDeclarations(tools: ToolDeclaration[]): ToolDeclaration[] {
  return tools.map((tool) => ({
    ...tool,
    description: `${tool.description} ${TAG_BY_RISK[tool.risk ?? 'none']}`,
  }));
}

/**
 * Ajouter la section "Tool Behavior" au prompt systeme.
 */
export function appendToolGuidance(prompt: string, language: ToolGuidanceLanguage): string {
  const section = PROMPT_SECTION[language];
  return prompt ? `${prompt}\n\n${section}` : section;
}
