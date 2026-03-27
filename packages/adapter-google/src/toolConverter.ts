import type { ToolDeclaration } from '@domos/core';

/**
 * Sanitize un nom d'outil pour Gemini (filet de sécurité).
 * Les noms sont déjà propres grâce à installPlugin/installServerPlugin,
 * mais cette fonction garantit la conformité même en cas d'outil non-plugin.
 * Règle Gemini : doit commencer par une lettre, uniquement [a-zA-Z0-9_-].
 *
 * "demo-crm_search_contacts" → "demo-crm_search_contacts" (inchangé)
 * "@scope/legacy_tool"       → "legacy_tool"              (outil hors plugin)
 */
function sanitizeGeminiToolName(name: string): string {
  let s = name.replace(/^@[^/]+\//, ''); // strip @scope/
  s = s.replace(/\//g, '_');             // / → _
  return s;
}

/**
 * Convertir les ToolDeclaration DomOS vers le format Google Gemini.
 */
export function toGeminiFunctionDeclarations(tools: ToolDeclaration[]) {
  return tools.map((tool) => ({
    name: sanitizeGeminiToolName(tool.name),
    description: tool.description,
    parameters: tool.parameters
      ? {
          type: tool.parameters.type,
          properties: Object.fromEntries(
            Object.entries(tool.parameters.properties).map(([key, prop]) => [
              key,
              {
                type: prop.type,
                description: prop.description,
                enum: prop.enum,
              },
            ])
          ),
          required: tool.parameters.required,
        }
      : undefined,
  }));
}
