import {
  resolveSystemPrompt,
  type ShadowContext,
  type SystemPrompt,
  type ToolDeclaration,
} from '@domos/core';

export interface DomOSBridgeSessionSnapshot {
  sessionId: string;
  apiKey?: string;
  context: ShadowContext;
  effectiveTools: ToolDeclaration[];
  systemPrompt?: SystemPrompt;
  voice?: string;
  language?: string;
  metadata?: Record<string, unknown>;
}

export interface DomOSContextBridgeOptions {
  dataAllowList?: string[];
  maxStringLength?: number;
  maxArrayItems?: number;
  maxObjectKeys?: number;
  maxDepth?: number;
}

export interface DomOSContextSnapshot {
  sessionId: string;
  instructions: string;
  context: ShadowContext;
  tools: ToolDeclaration[];
  toolSummary: string;
  updatedAt: number;
}

const DEFAULT_MAX_STRING_LENGTH = 500;
const DEFAULT_MAX_ARRAY_ITEMS = 10;
const DEFAULT_MAX_OBJECT_KEYS = 20;
const DEFAULT_MAX_DEPTH = 4;
const ALLOW_ALL_DATA_KEYS = '*';
const DEFAULT_DATA_ALLOW_LIST = [
  'route',
  'page',
  'view',
  'role',
  'step',
  'locale',
  'language',
  'voice',
];

export class DomOSContextBridge {
  private readonly options: Required<DomOSContextBridgeOptions>;

  constructor(options: DomOSContextBridgeOptions = {}) {
    this.options = {
      dataAllowList: options.dataAllowList ?? DEFAULT_DATA_ALLOW_LIST,
      maxStringLength: options.maxStringLength ?? DEFAULT_MAX_STRING_LENGTH,
      maxArrayItems: options.maxArrayItems ?? DEFAULT_MAX_ARRAY_ITEMS,
      maxObjectKeys: options.maxObjectKeys ?? DEFAULT_MAX_OBJECT_KEYS,
      maxDepth: options.maxDepth ?? DEFAULT_MAX_DEPTH,
    };
  }

  buildSnapshot(input: DomOSBridgeSessionSnapshot): DomOSContextSnapshot {
    const context = this.compactContext(input.context);
    const tools = input.effectiveTools.map((tool) => ({ ...tool }));
    const toolSummary = buildToolSummary(tools);

    return {
      sessionId: input.sessionId,
      instructions: this.buildInstructions(input, context, toolSummary),
      context,
      tools,
      toolSummary,
      updatedAt: Date.now(),
    };
  }

  private buildInstructions(
    input: DomOSBridgeSessionSnapshot,
    context: ShadowContext,
    toolSummary: string
  ): string {
    const basePrompt = input.systemPrompt ? resolveSystemPrompt(input.systemPrompt) : '';
    const contextJson = safeJsonStringify(context.data);
    const parts = [
      basePrompt.trim(),
      '[DOMOS_SHADOW_CONTEXT]',
      `Session: ${input.sessionId}`,
      `URL: ${context.url || '(unknown)'}`,
      `Title: ${context.title || '(none)'}`,
      `Data: ${contextJson}`,
      '',
      '[DOMOS_NEURAL_BINDING]',
      'The UI exposes only the tools that are currently mounted and effective in DomOS.',
      'A mounted component can add tools; an unmounted component can remove them.',
      'Client tools must be executed by DomOS through ADTP in the browser runtime, never directly by LiveKit.',
      'Server tools and HITL approvals stay under DomOS server policy.',
      '',
      '[DOMOS_EFFECTIVE_TOOLS]',
      toolSummary || 'No effective DomOS tools are currently available.',
    ].filter((line) => line.length > 0);

    return parts.join('\n');
  }

  private compactContext(context: ShadowContext): ShadowContext {
    return {
      url: truncateString(context.url ?? '', this.options.maxStringLength),
      title: context.title ? truncateString(context.title, this.options.maxStringLength) : undefined,
      data: this.compactData(context.data),
      updatedAt: context.updatedAt,
    };
  }

  private compactData(data: Record<string, unknown>): Record<string, unknown> {
    const selected = this.options.dataAllowList.includes(ALLOW_ALL_DATA_KEYS)
      ? data
      : Object.fromEntries(
        this.options.dataAllowList
          .filter((key) => Object.prototype.hasOwnProperty.call(data, key))
          .map((key) => [key, data[key]])
      );

    return compactValue(selected, this.options, 0) as Record<string, unknown>;
  }
}

function buildToolSummary(tools: ToolDeclaration[]): string {
  return tools
    .map((tool) => {
      const risk = tool.risk && tool.risk !== 'none' ? ` risk=${tool.risk}` : '';
      return `- ${tool.name}${risk}: ${tool.description}`;
    })
    .join('\n');
}

function compactValue(
  value: unknown,
  options: Required<DomOSContextBridgeOptions>,
  depth: number
): unknown {
  if (depth >= options.maxDepth) {
    return '[truncated-depth]';
  }

  if (typeof value === 'string') {
    return truncateString(value, options.maxStringLength);
  }

  if (
    value === null ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, options.maxArrayItems)
      .map((item) => compactValue(item, options, depth + 1));
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .slice(0, options.maxObjectKeys);

    return Object.fromEntries(
      entries.map(([key, nested]) => [
        key,
        compactValue(nested, options, depth + 1),
      ])
    );
  }

  return String(value);
}

function truncateString(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 15))}[truncated]`;
}

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '"[unserializable]"';
  }
}
