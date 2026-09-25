import type { ToolDeclaration, ToolParameterProperty } from "@owllayer/core";

function mapAITPTypeToJSONSchema(type?: ToolParameterProperty["type"]): string {
  switch (type) {
    case "STRING":
      return "string";
    case "NUMBER":
      return "number";
    case "BOOLEAN":
      return "boolean";
    case "ARRAY":
      return "array";
    case "OBJECT":
    default:
      return "object";
  }
}

function normalizeProperty(
  property: ToolParameterProperty | undefined,
): Record<string, unknown> | undefined {
  if (!property) {
    return undefined;
  }

  const normalized: Record<string, unknown> = {
    type: mapAITPTypeToJSONSchema(property.type),
  };

  if (property.description) {
    normalized.description = property.description;
  }

  if (property.enum && property.enum.length > 0) {
    normalized.enum = property.enum;
  }

  if (property.type === "ARRAY" && property.items) {
    normalized.items = normalizeProperty(property.items);
  }

  if (property.type === "OBJECT" && property.properties) {
    const properties = Object.fromEntries(
      Object.entries(property.properties).map(([key, value]) => [
        key,
        normalizeProperty(value),
      ]),
    );
    normalized.properties = properties;

    if (property.required && property.required.length > 0) {
      normalized.required = property.required;
    }
  }

  return normalized;
}

/**
 * Convertir les ToolDeclaration OwlLayer vers le format OpenAI function calling.
 *
 * DeepSeek/OpenAI rejettent les schemas avec "anyOf" ou types trop complexes non pris en charge.
 * On normalise ici en JSON Schema simple, sans structures optionnelles non standard.
 */
export function toOpenAITools(tools: ToolDeclaration[]) {
  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
        ? {
            type: "object",
            properties: Object.fromEntries(
              Object.entries(tool.parameters.properties).map(([key, prop]) => [
                key,
                normalizeProperty(prop),
              ]),
            ),
            required: tool.parameters.required || [],
          }
        : { type: "object", properties: {} },
    },
  }));
}

/**
 * Convertir les ToolDeclaration OwlLayer vers le format OpenAI Realtime.
 * Le format Realtime est legerement different du chat completions.
 */
export function toOpenAIRealtimeTools(tools: ToolDeclaration[]) {
  return tools.map((tool) => ({
    type: "function" as const,
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters
      ? {
          type: "object",
          properties: Object.fromEntries(
            Object.entries(tool.parameters.properties).map(([key, prop]) => [
              key,
              normalizeProperty(prop),
            ]),
          ),
          required: tool.parameters.required || [],
        }
      : { type: "object", properties: {} },
  }));
}
