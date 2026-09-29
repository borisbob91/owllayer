// ============================================================
// Conversion des tools AITP vers les fonctions du Voice Agent Deepgram.
// Jamais d'`endpoint` : Deepgram renvoie chaque appel a OwlLayer, qui
// l'execute via le routeur HITL (recherche R4). Les tools `high`/`critical`
// portent `defer_until_eot` ; le niveau de risque lui-meme n'est jamais envoye.
// ============================================================

import type { ToolDeclaration, ToolParameterProperty } from '@owllayer/core';
import type { AgentFunctionDefinition } from './protocol/agent.messages.js';

function toJsonSchemaType(type: ToolParameterProperty['type'] | undefined): string {
  switch (type) {
    case 'STRING':
      return 'string';
    case 'NUMBER':
      return 'number';
    case 'BOOLEAN':
      return 'boolean';
    case 'ARRAY':
      return 'array';
    default:
      return 'object';
  }
}

function toJsonSchemaProperty(property: ToolParameterProperty): Record<string, unknown> {
  const schema: Record<string, unknown> = { type: toJsonSchemaType(property.type) };
  if (property.description) {
    schema.description = property.description;
  }
  if (property.enum && property.enum.length > 0) {
    schema.enum = property.enum;
  }
  if (property.type === 'ARRAY' && property.items) {
    schema.items = toJsonSchemaProperty(property.items);
  }
  if (property.type === 'OBJECT' && property.properties) {
    schema.properties = Object.fromEntries(
      Object.entries(property.properties).map(([key, value]) => [key, toJsonSchemaProperty(value)]),
    );
    if (property.required && property.required.length > 0) {
      schema.required = property.required;
    }
  }
  return schema;
}

/** Convertit les tools OwlLayer en `agent.think.functions`. */
export function toDeepgramAgentFunctions(tools: readonly ToolDeclaration[]): AgentFunctionDefinition[] {
  return tools.map((tool) => {
    const fn: AgentFunctionDefinition = {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
        ? {
            type: 'object',
            properties: Object.fromEntries(
              Object.entries(tool.parameters.properties).map(([key, value]) => [key, toJsonSchemaProperty(value)]),
            ),
            required: tool.parameters.required ?? [],
          }
        : { type: 'object', properties: {} },
    };
    if (tool.risk === 'high' || tool.risk === 'critical') {
      fn.defer_until_eot = true;
    }
    return fn;
  });
}
