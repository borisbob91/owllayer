import type Anthropic from '@anthropic-ai/sdk';
import type { ToolDeclaration, ToolParameterProperty } from '@owllayer/core';

/**
 * Convertir une propriete AITP (types en majuscules) en JSON Schema,
 * seul format accepte par l'API Claude dans input_schema.
 */
function normalizeProperty(property: ToolParameterProperty): Record<string, unknown> {
  const normalized: Record<string, unknown> = { type: property.type.toLowerCase() };

  if (property.description) normalized.description = property.description;
  if (property.enum && property.enum.length > 0) normalized.enum = property.enum;
  if (property.type === 'ARRAY' && property.items) normalized.items = normalizeProperty(property.items);
  if (property.type === 'OBJECT' && property.properties) {
    normalized.properties = Object.fromEntries(
      Object.entries(property.properties).map(([key, value]) => [key, normalizeProperty(value)])
    );
    if (property.required && property.required.length > 0) normalized.required = property.required;
  }

  return normalized;
}

export function toAnthropicTools(tools: ToolDeclaration[]): Anthropic.Tool[] {
  return tools.map((tool) => {
    const inputSchema: Anthropic.Tool['input_schema'] = { type: 'object', properties: {} };
    if (tool.parameters) {
      inputSchema.properties = Object.fromEntries(
        Object.entries(tool.parameters.properties).map(([key, value]) => [key, normalizeProperty(value)])
      );
      if (tool.parameters.required && tool.parameters.required.length > 0) {
        inputSchema.required = tool.parameters.required;
      }
    }
    return { name: tool.name, description: tool.description || '', input_schema: inputSchema };
  });
}
