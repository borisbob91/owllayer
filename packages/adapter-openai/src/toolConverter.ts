import type { ToolDeclaration } from '@owllayer/core';

/**
 * Convertir les ToolDeclaration OwlLayer vers le format OpenAI function calling.
 *
 * @example
 * ```ts
 * const tools = toOpenAITools(declarations);
 * // Resultat : [{ type: 'function', function: { name, description, parameters } }]
 * ```
 */
export function toOpenAITools(tools: ToolDeclaration[]) {
  return tools.map((tool) => ({
    type: 'function' as const,
    function: {
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
                  ...(prop.enum ? { enum: prop.enum } : {}),
                },
              ])
            ),
            required: tool.parameters.required || [],
          }
        : { type: 'object', properties: {} },
    },
  }));
}

/**
 * Convertir les ToolDeclaration OwlLayer vers le format OpenAI Realtime.
 * Le format Realtime est legerement different du chat completions.
 */
export function toOpenAIRealtimeTools(tools: ToolDeclaration[]) {
  return tools.map((tool) => ({
    type: 'function' as const,
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
                ...(prop.enum ? { enum: prop.enum } : {}),
              },
            ])
          ),
          required: tool.parameters.required || [],
        }
      : { type: 'object', properties: {} },
  }));
}
