import type { ToolDeclaration, ToolParameterProperty, ToolParameters } from '@owllayer/core';
import type { LiveKitFunctionCall, LiveKitRuntimeHelpers } from './types.js';

export interface JsonSchemaObject {
  type: 'object';
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
}

export interface JsonSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  enum?: string[];
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

export function createLiveKitToolContext(
  helpers: LiveKitRuntimeHelpers,
  tools: ToolDeclaration[]
): unknown {
  return helpers.createToolContext(tools);
}

export function toLiveKitToolSchema(parameters?: ToolParameters): JsonSchemaObject {
  if (!parameters) {
    return { type: 'object', properties: {} };
  }

  return {
    type: 'object',
    properties: Object.fromEntries(
      Object.entries(parameters.properties).map(([name, property]) => [
        name,
        toJsonSchemaProperty(property),
      ])
    ),
    ...(parameters.required?.length ? { required: [...parameters.required] } : {}),
  };
}

export function toOwlLayerToolCall(call: LiveKitFunctionCall) {
  return {
    callId: call.callId,
    name: call.name,
    args: parseToolArgs(call.args),
  };
}

export function serializeToolResult(result: unknown): string {
  if (typeof result === 'string') {
    return result;
  }

  try {
    return JSON.stringify(result);
  } catch {
    return String(result);
  }
}

function toJsonSchemaProperty(property: ToolParameterProperty): JsonSchemaProperty {
  return {
    type: toJsonSchemaType(property.type),
    ...(property.description ? { description: property.description } : {}),
    ...(property.enum ? { enum: [...property.enum] } : {}),
    ...(property.items ? { items: toJsonSchemaProperty(property.items) } : {}),
    ...(property.properties
      ? {
          properties: Object.fromEntries(
            Object.entries(property.properties).map(([name, nested]) => [
              name,
              toJsonSchemaProperty(nested),
            ])
          ),
        }
      : {}),
    ...(property.required?.length ? { required: [...property.required] } : {}),
  };
}

function toJsonSchemaType(type: ToolParameterProperty['type']): JsonSchemaProperty['type'] {
  switch (type) {
    case 'STRING':
      return 'string';
    case 'NUMBER':
      return 'number';
    case 'BOOLEAN':
      return 'boolean';
    case 'OBJECT':
      return 'object';
    case 'ARRAY':
      return 'array';
  }
}

function parseToolArgs(args: LiveKitFunctionCall['args']): Record<string, unknown> {
  if (!args) {
    return {};
  }

  if (typeof args !== 'string') {
    return args;
  }

  try {
    const parsed = JSON.parse(args);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
