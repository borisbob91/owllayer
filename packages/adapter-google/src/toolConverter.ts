import type { ToolDeclaration } from '@domos/core';

/**
 * Convertir les ToolDeclaration DomOS vers le format Google Gemini.
 * Les noms sont déjà au format Gemini-safe grâce à installPlugin/installServerPlugin
 * (ex: "demo-crm_search_contacts" au lieu de "@domos-plugins/demo-crm/search_contacts").
 */
export function toGeminiFunctionDeclarations(tools: ToolDeclaration[]) {
  return tools.map((tool) => ({
    name: tool.name,
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
