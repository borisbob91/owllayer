import type { ToolParameterProperty, ToolParameters } from '@owllayer/core';

/**
 * Verifier les arguments produits par le LLM contre le schema declare du tool.
 * Les arguments d'un LLM peuvent etre influences par une injection de prompt :
 * un handler serveur ne doit recevoir que des types attendus.
 *
 * @returns un message d'erreur, ou null si les arguments sont valides.
 */
export function validateToolArgs(parameters: ToolParameters | undefined, args: unknown): string | null {
  if (!parameters) return null;
  return validateObject(parameters.properties, parameters.required, args, 'args');
}

function validateObject(
  properties: Record<string, ToolParameterProperty> | undefined,
  required: string[] | undefined,
  value: unknown,
  path: string
): string | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return `${path} must be an object`;
  }
  const record = value as Record<string, unknown>;
  for (const key of required ?? []) {
    if (record[key] === undefined) return `${path}.${key} is required`;
  }
  for (const [key, schema] of Object.entries(properties ?? {})) {
    if (record[key] === undefined) continue;
    const error = validateValue(schema, record[key], `${path}.${key}`);
    if (error) return error;
  }
  return null;
}

function validateValue(schema: ToolParameterProperty, value: unknown, path: string): string | null {
  switch (schema.type) {
    case 'STRING':
      if (typeof value !== 'string') return `${path} must be a string`;
      if (schema.enum && !schema.enum.includes(value)) return `${path} must be one of ${schema.enum.join(', ')}`;
      return null;
    case 'NUMBER':
      return typeof value === 'number' && Number.isFinite(value) ? null : `${path} must be a number`;
    case 'BOOLEAN':
      return typeof value === 'boolean' ? null : `${path} must be a boolean`;
    case 'ARRAY':
      if (!Array.isArray(value)) return `${path} must be an array`;
      if (!schema.items) return null;
      for (let i = 0; i < value.length; i++) {
        const error = validateValue(schema.items, value[i], `${path}[${i}]`);
        if (error) return error;
      }
      return null;
    case 'OBJECT':
      return validateObject(schema.properties, schema.required, value, path);
    default:
      return null;
  }
}
