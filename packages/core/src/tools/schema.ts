import type { z } from 'zod';
import type { ToolParameters, ToolParameterProperty } from '../protocol/adtp.types.js';

/**
 * Mapping des types Zod vers les types JSON Schema ADTP.
 */
type ADTPType = ToolParameterProperty['type'];

function unwrapZodType(zodType: z.ZodTypeAny): z.ZodTypeAny {
  const typeName = zodType._def.typeName;

  switch (typeName) {
    case 'ZodOptional':
    case 'ZodNullable':
    case 'ZodDefault':
      return unwrapZodType(zodType._def.innerType);
    default:
      return zodType;
  }
}

function zodTypeToADTP(zodType: z.ZodTypeAny): ADTPType {
  const unwrapped = unwrapZodType(zodType);
  const typeName = unwrapped._def.typeName;

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
  const unwrapped = unwrapZodType(zodType);
  if (unwrapped._def.typeName === 'ZodEnum') {
    return unwrapped._def.values as string[];
  }
  return undefined;
}

function isOptionalField(zodField: z.ZodTypeAny): boolean {
  return (
    zodField._def.typeName === 'ZodOptional' ||
    zodField._def.typeName === 'ZodNullable' ||
    zodField._def.typeName === 'ZodDefault'
  );
}

function zodTypeToProperty(zodType: z.ZodTypeAny, description?: string): ToolParameterProperty {
  const unwrapped = unwrapZodType(zodType);
  const type = zodTypeToADTP(unwrapped);
  const property: ToolParameterProperty = {
    type,
    description,
    enum: getEnumValues(unwrapped),
  };

  if (type === 'ARRAY') {
    const itemType = unwrapped._def.type as z.ZodTypeAny | undefined;
    property.items = itemType ? zodTypeToProperty(itemType) : { type: 'STRING' };
  }

  if (type === 'OBJECT') {
    const shape = (unwrapped as z.ZodObject<z.ZodRawShape>).shape;
    if (shape) {
      const properties: Record<string, ToolParameterProperty> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        const field = value as z.ZodTypeAny;
        properties[key] = zodTypeToProperty(field, getDescription(field));
        if (!isOptionalField(field)) {
          required.push(key);
        }
      }

      property.properties = properties;
      if (required.length > 0) {
        property.required = required;
      }
    }
  }

  return property;
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
    const isOptional = isOptionalField(zodField);
    const isRequired = !isOptional;
    const baseDescription = getDescription(zodField);
    const description = isRequired
      ? (baseDescription ? `${baseDescription} (obligatoire)` : 'Obligatoire.')
      : baseDescription;

    properties[key] = zodTypeToProperty(zodField, description);

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
