import type { z } from 'zod';
import type { ToolParameters, ToolParameterProperty } from '../protocol/adtp.types.js';

/**
 * Mapping des types Zod vers les types JSON Schema ADTP.
 */
type ADTPType = ToolParameterProperty['type'];

function zodTypeToADTP(zodType: z.ZodTypeAny): ADTPType {
  const typeName = zodType._def.typeName;

  switch (typeName) {
    case 'ZodString':
      return 'STRING';
    case 'ZodNumber':
    case 'ZodBigInt':
      return 'NUMBER';
    case 'ZodBoolean':
      return 'BOOLEAN';
    case 'ZodArray':
      return 'ARRAY';
    case 'ZodObject':
      return 'OBJECT';
    case 'ZodOptional':
    case 'ZodNullable':
      return zodTypeToADTP(zodType._def.innerType);
    case 'ZodDefault':
      return zodTypeToADTP(zodType._def.innerType);
    case 'ZodEnum':
      return 'STRING';
    default:
      return 'STRING';
  }
}

function getDescription(zodType: z.ZodTypeAny): string | undefined {
  return zodType._def.description;
}

function getEnumValues(zodType: z.ZodTypeAny): string[] | undefined {
  if (zodType._def.typeName === 'ZodEnum') {
    return zodType._def.values as string[];
  }
  return undefined;
}

/**
 * Convertir un schema Zod (ZodObject) en ToolParameters ADTP.
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   query: z.string().describe("Mots-cles"),
 *   maxPrice: z.number().optional().describe("Prix max"),
 * });
 * const params = zodToToolParameters(schema);
 * ```
 */
export function zodToToolParameters(schema: z.ZodObject<z.ZodRawShape>): ToolParameters {
  const shape = schema.shape;
  const properties: Record<string, ToolParameterProperty> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    const zodField = value as z.ZodTypeAny;
    const isOptional =
      zodField._def.typeName === 'ZodOptional' ||
      zodField._def.typeName === 'ZodNullable' ||
      zodField._def.typeName === 'ZodDefault';
    const isRequired = !isOptional;
    const baseDescription = getDescription(zodField);
    const description = isRequired
      ? (baseDescription ? `${baseDescription} (obligatoire)` : 'Obligatoire.')
      : baseDescription;

    properties[key] = {
      type: zodTypeToADTP(zodField),
      description,
      enum: getEnumValues(zodField),
    };

    // Un champ est requis s'il n'est pas optional/nullable
    if (isRequired) {
      required.push(key);
    }
  }

  return {
    type: 'OBJECT',
    properties,
    required: required.length > 0 ? required : undefined,
  };
}
