import { describe, expect, it, vi } from "vitest";
import { OpenAIAdapter } from "../src/OpenAIAdapter.js";
import { toOpenAITools } from "../src/toolConverter.js";

describe("toOpenAITools", () => {
  it("serializes OwlLayer schema to JSON Schema compatible with OpenAI and DeepSeek", () => {
    const tools = toOpenAITools([
      {
        name: "demo-crm_search_contacts",
        description: "Search contacts in the CRM by name, email, or company.",
        parameters: {
          type: "OBJECT",
          properties: {
            query: { type: "STRING", description: "Search keyword" },
            maxResults: { type: "NUMBER", description: "Maximum contacts" },
            activeOnly: {
              type: "BOOLEAN",
              description: "Only active contacts",
            },
          },
          required: ["query"],
        },
      },
    ]);

    expect(tools[0].function.parameters).toMatchObject({
      type: "object",
      properties: {
        query: { type: "string" },
        maxResults: { type: "number" },
        activeOnly: { type: "boolean" },
      },
      required: ["query"],
    });
  });

  it("echoes reasoning_content when returning tool results in DeepSeek thinking mode", async () => {
    const adapter = new OpenAIAdapter({
      apiKey: "test-key",
      model: "deepseek-v4-pro",
      baseURL: "https://api.deepseek.com",
    });

    const createMock = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            role: "assistant",
            content: "done",
          },
        },
      ],
    });

    (adapter as any).client = {
      chat: {
        completions: {
          create: createMock,
        },
      },
    };

    (adapter as any).pendingToolContext.set("call_123", {
      toolName: "demo-crm_search_contacts",
      args: { query: "alice" },
      messages: [{ role: "user", content: "find alice" }],
      systemPrompt: "system",
      reasoningContent: "I should search contacts.",
    });

    await adapter.handleToolResult("call_123", { ok: true });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "deepseek-v4-pro",
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "assistant",
            content: "",
            reasoning_content: "I should search contacts.",
            tool_calls: [
              expect.objectContaining({
                function: expect.objectContaining({
                  name: "demo-crm_search_contacts",
                }),
              }),
            ],
          }),
        ]),
      }),
    );
  });
});
