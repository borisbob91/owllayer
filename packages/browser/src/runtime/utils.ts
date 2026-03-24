import type { ToolParameters } from '@domos/core';
import type { JsonSchemaObject } from '../types.js';

const VALID_TYPES = ['STRING', 'NUMBER', 'BOOLEAN', 'OBJECT', 'ARRAY'] as const;

/**
 * Normalise les paramètres d'outil vers le format ToolParameters de @domos/core.
 * Accepte aussi bien le format ToolParameters natif que le format JSON Schema.
 *
 * Partagé par BrowserDomOS et BrowserDomOSCore — ne pas exporter depuis index.ts.
 */
export function normalizeParameters(p?: ToolParameters | JsonSchemaObject): ToolParameters | undefined {
  if (!p) return undefined;

  // Déjà au format ToolParameters (type uppercase 'OBJECT')
  if ((p as ToolParameters).type === 'OBJECT' && typeof (p as ToolParameters).properties === 'object') {
    return p as ToolParameters;
  }

  // Format JSON Schema → convertir
  const json = p as JsonSchemaObject;
  const properties: ToolParameters['properties'] = {};
  if (json.properties) {
    for (const [key, prop] of Object.entries(json.properties)) {
      const upper = String(prop.type ?? 'string').toUpperCase() as typeof VALID_TYPES[number];
      properties[key] = {
        type: VALID_TYPES.includes(upper) ? upper : 'STRING',
        description: prop.description,
      };
    }
  }
  return { type: 'OBJECT', properties, required: json.required };
}
