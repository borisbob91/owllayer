import type { ToolDeclaration } from '@domos/core';
import { toLiveKitToolSchema } from './toolMapping.js';
import type {
  LiveKitRuntimeHelpers,
  LiveKitRuntimeHelpersFactory,
  LiveKitToolResponseParams,
} from './types.js';

export const createDefaultLiveKitRuntimeHelpers: LiveKitRuntimeHelpersFactory = async () => {
  const agents = await import('@livekit/agents') as unknown as {
    llm: {
      ChatContext: { empty(): unknown };
      FunctionCallOutput: { create(params: LiveKitToolResponseParams): unknown };
      ToolContext: new (tools: unknown[]) => unknown;
      tool(config: {
        name: string;
        description: string;
        parameters: unknown;
        execute: () => Promise<never>;
      }): unknown;
    };
  };
  const rtc = await import('@livekit/rtc-node') as unknown as {
    AudioFrame: new (
      data: Int16Array,
      sampleRate: number,
      channels: number,
      samplesPerChannel: number
    ) => unknown;
  };

  return {
    createAudioFrame(data, sampleRate, channels, samplesPerChannel) {
      return new rtc.AudioFrame(data, sampleRate, channels, samplesPerChannel);
    },
    createChatContext() {
      return agents.llm.ChatContext.empty();
    },
    copyChatContext(chatCtx) {
      if (hasCopy(chatCtx)) {
        return chatCtx.copy();
      }

      return agents.llm.ChatContext.empty();
    },
    appendUserMessage(chatCtx, text) {
      if (!hasAddMessage(chatCtx)) {
        throw new Error('LiveKit ChatContext does not expose addMessage().');
      }

      chatCtx.addMessage({ role: 'user', content: text });
    },
    appendFunctionCallOutput(chatCtx, params) {
      if (!hasItems(chatCtx)) {
        throw new Error('LiveKit ChatContext does not expose items.');
      }

      chatCtx.items.push(agents.llm.FunctionCallOutput.create(params));
    },
    createToolContext(tools) {
      return new agents.llm.ToolContext(
        tools.map((tool) =>
          agents.llm.tool({
            name: tool.name,
            description: buildToolDescription(tool),
            parameters: toLiveKitToolSchema(tool.parameters),
            execute: async () => {
              throw new Error(
                'DomOS executes tools through ADTP, not inside the LiveKit adapter.'
              );
            },
          })
        )
      );
    },
  };
};

function buildToolDescription(tool: ToolDeclaration): string {
  if (!tool.risk || tool.risk === 'none') {
    return tool.description;
  }

  return `${tool.description}\nDomOS HITL risk level: ${tool.risk}. The server/client policy decides whether approval is required.`;
}

function hasCopy(value: unknown): value is { copy(): unknown } {
  return typeof value === 'object' && value !== null && 'copy' in value &&
    typeof (value as { copy?: unknown }).copy === 'function';
}

function hasAddMessage(value: unknown): value is {
  addMessage(params: { role: string; content: string }): unknown;
} {
  return typeof value === 'object' && value !== null && 'addMessage' in value &&
    typeof (value as { addMessage?: unknown }).addMessage === 'function';
}

function hasItems(value: unknown): value is { items: unknown[] } {
  return typeof value === 'object' && value !== null && Array.isArray(
    (value as { items?: unknown }).items
  );
}
