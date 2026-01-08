import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import type { MessageParam, Tool } from "@anthropic-ai/sdk/resources/messages";
import { api } from "./api";

export interface MessageAttachment {
  id: string;
  name: string;
  content: string;
  type: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  attachments?: MessageAttachment[];
  toolCalls?: ToolCall[];
  toolCallId?: string;
  isLoading?: boolean;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
  result?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  model: string;
  connectionId: string;
  createdAt: number;
  updatedAt: number;
}

// Available models
export const AI_MODELS = [
  { id: "gpt-5", name: "GPT-5", provider: "openai" },
  { id: "gpt-5-mini", name: "GPT-5 Mini", provider: "openai" },
] as const;

export type ModelId = (typeof AI_MODELS)[number]["id"];

// Define the tools the AI can use (read-only operations)
export const AI_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_tables",
      description:
        "List all tables in the database with their schemas and row counts",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_table_columns",
      description:
        "Get the column information for a specific table including column names, data types, nullability, and primary key status",
      parameters: {
        type: "object",
        properties: {
          schema: {
            type: "string",
            description: "The schema name (e.g., 'public')",
          },
          table: {
            type: "string",
            description: "The table name",
          },
        },
        required: ["schema", "table"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_select_query",
      description:
        "Execute a SELECT query to retrieve data from the database. Only SELECT queries are allowed for safety.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "The SELECT SQL query to execute. Must start with SELECT.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_table_sample",
      description: "Get a sample of rows from a table to understand its data",
      parameters: {
        type: "object",
        properties: {
          schema: {
            type: "string",
            description: "The schema name (e.g., 'public')",
          },
          table: {
            type: "string",
            description: "The table name",
          },
          limit: {
            type: "number",
            description: "Number of rows to return (default 10, max 100)",
          },
        },
        required: ["schema", "table"],
      },
    },
  },
];

// Execute a tool call
export async function executeTool(
  connectionId: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<string> {
  try {
    switch (toolName) {
      case "list_tables": {
        const tables = await api.listTables(connectionId);
        return JSON.stringify(tables, null, 2);
      }

      case "get_table_columns": {
        const { schema, table } = args as { schema: string; table: string };
        const columns = await api.getTableColumns(connectionId, schema, table);
        return JSON.stringify(columns, null, 2);
      }

      case "execute_select_query": {
        const { query } = args as { query: string };
        // Safety check: only allow SELECT queries
        const trimmed = query.trim().toUpperCase();
        if (!trimmed.startsWith("SELECT")) {
          return JSON.stringify({
            error: "Only SELECT queries are allowed for safety",
          });
        }
        const result = await api.executeQuery(connectionId, query);
        // Limit result size for context
        const limitedRows = result.rows.slice(0, 50);
        return JSON.stringify(
          {
            columns: result.columns,
            rows: limitedRows,
            total_rows: result.row_count,
            truncated: result.row_count > 50,
          },
          null,
          2,
        );
      }

      case "get_table_sample": {
        const {
          schema,
          table,
          limit = 10,
        } = args as { schema: string; table: string; limit?: number };
        const safeLimit = Math.min(Math.max(1, limit), 100);
        const result = await api.getTableData(
          connectionId,
          schema,
          table,
          safeLimit,
          0,
        );
        return JSON.stringify(
          {
            columns: result.columns,
            rows: result.rows,
            row_count: result.row_count,
          },
          null,
          2,
        );
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (error) {
    return JSON.stringify({ error: String(error) });
  }
}

const SYSTEM_PROMPT = `You are a helpful database assistant for QueryStudio, a PostgreSQL client.
You can help users with:
- Listing tables and their structures
- Examining column information
- Running SELECT queries to analyze data
- Answering questions about the data
- Explaining how to write SQL queries (INSERT, UPDATE, DELETE, CREATE, etc.)
- Providing SQL examples and best practices

Your tools are read-only (you can only execute SELECT queries), but you can absolutely explain and provide examples for any SQL operation including INSERT, UPDATE, DELETE, and DDL statements. Users can copy your SQL examples and run them in the Query tab.

When users ask about data, use the tools to query the database and provide insights.
Be concise but helpful. Format SQL in code blocks. If a query might return too much data, use LIMIT clauses.`;

// Chat history storage
const CHAT_HISTORY_KEY = "querystudio_chat_history";

export function loadChatHistory(): ChatSession[] {
  try {
    const stored = localStorage.getItem(CHAT_HISTORY_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveChatHistory(sessions: ChatSession[]): void {
  // Keep only last 50 sessions
  const limited = sessions.slice(-50);
  localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(limited));
}

export function createChatSession(
  connectionId: string,
  model: ModelId,
): ChatSession {
  return {
    id: crypto.randomUUID(),
    title: "New Chat",
    messages: [],
    model,
    connectionId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function generateSessionTitle(messages: Message[]): string {
  const firstUserMessage = messages.find((m) => m.role === "user");
  if (!firstUserMessage) return "New Chat";
  const content = firstUserMessage.content;
  return content.length > 40 ? content.substring(0, 40) + "..." : content;
}

export function getModelProvider(modelId: ModelId): "openai" | "anthropic" {
  const model = AI_MODELS.find((m) => m.id === modelId);
  return (model?.provider as "openai" | "anthropic") || "openai";
}

// Anthropic tools format
const ANTHROPIC_TOOLS: Tool[] = [
  {
    name: "list_tables",
    description:
      "List all tables in the database with their schemas and row counts",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_table_columns",
    description:
      "Get the column information for a specific table including column names, data types, nullability, and primary key status",
    input_schema: {
      type: "object" as const,
      properties: {
        schema: {
          type: "string",
          description: "The schema name (e.g., 'public')",
        },
        table: { type: "string", description: "The table name" },
      },
      required: ["schema", "table"],
    },
  },
  {
    name: "execute_select_query",
    description:
      "Execute a SELECT query to retrieve data from the database. Only SELECT queries are allowed for safety.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            "The SELECT SQL query to execute. Must start with SELECT.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_table_sample",
    description: "Get a sample of rows from a table to understand its data",
    input_schema: {
      type: "object" as const,
      properties: {
        schema: {
          type: "string",
          description: "The schema name (e.g., 'public')",
        },
        table: { type: "string", description: "The table name" },
        limit: {
          type: "number",
          description: "Number of rows to return (default 10, max 100)",
        },
      },
      required: ["schema", "table"],
    },
  },
];

export class AIAgent {
  private openaiClient: OpenAI | null = null;
  private anthropicClient: Anthropic | null = null;
  private connectionId: string;
  private model: ModelId;
  private openaiMessages: ChatCompletionMessageParam[];
  private anthropicMessages: MessageParam[];
  private apiKey: string;

  constructor(apiKey: string, connectionId: string, model: ModelId = "gpt-5") {
    this.apiKey = apiKey;
    this.connectionId = connectionId;
    this.model = model;
    this.openaiMessages = [{ role: "system", content: SYSTEM_PROMPT }];
    this.anthropicMessages = [];
    this.initClient();
  }

  private initClient() {
    const provider = getModelProvider(this.model);
    if (provider === "anthropic") {
      this.anthropicClient = new Anthropic({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true,
      });
    } else {
      this.openaiClient = new OpenAI({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true,
      });
    }
  }

  setModel(model: ModelId) {
    const oldProvider = getModelProvider(this.model);
    const newProvider = getModelProvider(model);
    this.model = model;
    if (oldProvider !== newProvider) {
      this.initClient();
    }
  }

  getModel(): ModelId {
    return this.model;
  }

  loadFromSession(session: ChatSession) {
    this.openaiMessages = [{ role: "system", content: SYSTEM_PROMPT }];
    this.anthropicMessages = [];
    for (const msg of session.messages) {
      if (msg.role === "user" || msg.role === "assistant") {
        this.openaiMessages.push({ role: msg.role, content: msg.content });
        this.anthropicMessages.push({ role: msg.role, content: msg.content });
      }
    }
    this.model = session.model as ModelId;
    this.initClient();
  }

  async chat(
    userMessage: string,
    onToolCall?: (toolName: string, args: string) => void,
  ): Promise<string> {
    const provider = getModelProvider(this.model);

    if (provider === "anthropic") {
      return this.chatAnthropic(userMessage, onToolCall);
    } else {
      return this.chatOpenAI(userMessage, onToolCall);
    }
  }

  async *chatStream(
    userMessage: string,
    onToolCall?: (toolName: string, args: string) => void,
  ): AsyncGenerator<string, void, unknown> {
    const provider = getModelProvider(this.model);

    if (provider === "anthropic") {
      yield* this.chatAnthropicStream(userMessage, onToolCall);
    } else {
      yield* this.chatOpenAIStream(userMessage, onToolCall);
    }
  }

  private async *chatOpenAIStream(
    userMessage: string,
    onToolCall?: (toolName: string, args: string) => void,
  ): AsyncGenerator<string, void, unknown> {
    if (!this.openaiClient) {
      this.openaiClient = new OpenAI({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true,
      });
    }

    this.openaiMessages.push({ role: "user", content: userMessage });

    // Use streaming with tool support
    let continueLoop = true;

    while (continueLoop) {
      const stream = await this.openaiClient.chat.completions.create({
        model: this.model,
        messages: this.openaiMessages,
        tools: AI_TOOLS,
        tool_choice: "auto",
        stream: true,
      });

      let fullContent = "";
      let toolCalls: Array<{ id: string; name: string; arguments: string }> =
        [];
      let currentToolCall: {
        id: string;
        name: string;
        arguments: string;
      } | null = null;

      for await (const chunk of stream) {
        const choice = chunk.choices[0];
        if (!choice) continue;

        // Handle content delta
        const contentDelta = choice.delta?.content;
        if (contentDelta) {
          fullContent += contentDelta;
          yield contentDelta;
        }

        // Handle tool call deltas
        const toolCallDeltas = choice.delta?.tool_calls;
        if (toolCallDeltas) {
          for (const tcDelta of toolCallDeltas) {
            if (tcDelta.index !== undefined) {
              // Start of a new tool call or continuation
              if (!currentToolCall || tcDelta.id) {
                if (currentToolCall) {
                  toolCalls.push(currentToolCall);
                }
                currentToolCall = {
                  id: tcDelta.id || "",
                  name: tcDelta.function?.name || "",
                  arguments: tcDelta.function?.arguments || "",
                };
              } else {
                // Continuation of current tool call
                if (tcDelta.function?.name) {
                  currentToolCall.name += tcDelta.function.name;
                }
                if (tcDelta.function?.arguments) {
                  currentToolCall.arguments += tcDelta.function.arguments;
                }
              }
            }
          }
        }

        // Check if we're done
        if (choice.finish_reason === "stop") {
          continueLoop = false;
          this.openaiMessages.push({
            role: "assistant",
            content: fullContent || "I couldn't generate a response.",
          });
        } else if (choice.finish_reason === "tool_calls") {
          // Push the last tool call
          if (currentToolCall) {
            toolCalls.push(currentToolCall);
          }

          // Add assistant message with tool calls
          this.openaiMessages.push({
            role: "assistant",
            content: fullContent || null,
            tool_calls: toolCalls.map((tc) => ({
              id: tc.id,
              type: "function" as const,
              function: { name: tc.name, arguments: tc.arguments },
            })),
          });

          // Execute tool calls
          for (const toolCall of toolCalls) {
            onToolCall?.(toolCall.name, toolCall.arguments);

            const toolArgs = JSON.parse(toolCall.arguments);
            const result = await executeTool(
              this.connectionId,
              toolCall.name,
              toolArgs,
            );

            this.openaiMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: result,
            });
          }

          // Continue the loop to get the next response
          break;
        }
      }

      // If no finish reason was received, exit loop
      if (continueLoop && toolCalls.length === 0) {
        continueLoop = false;
        if (fullContent) {
          this.openaiMessages.push({ role: "assistant", content: fullContent });
        }
      }
    }
  }

  private async *chatAnthropicStream(
    userMessage: string,
    onToolCall?: (toolName: string, args: string) => void,
  ): AsyncGenerator<string, void, unknown> {
    if (!this.anthropicClient) {
      this.anthropicClient = new Anthropic({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true,
      });
    }

    this.anthropicMessages.push({ role: "user", content: userMessage });

    let continueLoop = true;

    while (continueLoop) {
      const stream = this.anthropicClient.messages.stream({
        model: this.model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: this.anthropicMessages,
        tools: ANTHROPIC_TOOLS,
      });

      let fullContent = "";
      const toolUseBlocks: Array<{
        id: string;
        name: string;
        input: Record<string, unknown>;
      }> = [];
      let currentToolUse: { id: string; name: string; input: string } | null =
        null;
      let stopReason: string | null = null;

      for await (const event of stream) {
        if (event.type === "content_block_start") {
          if (event.content_block.type === "tool_use") {
            currentToolUse = {
              id: event.content_block.id,
              name: event.content_block.name,
              input: "",
            };
          }
        } else if (event.type === "content_block_delta") {
          if (event.delta.type === "text_delta") {
            fullContent += event.delta.text;
            yield event.delta.text;
          } else if (
            event.delta.type === "input_json_delta" &&
            currentToolUse
          ) {
            currentToolUse.input += event.delta.partial_json;
          }
        } else if (event.type === "content_block_stop") {
          if (currentToolUse) {
            try {
              toolUseBlocks.push({
                id: currentToolUse.id,
                name: currentToolUse.name,
                input: JSON.parse(currentToolUse.input || "{}"),
              });
            } catch {
              toolUseBlocks.push({
                id: currentToolUse.id,
                name: currentToolUse.name,
                input: {},
              });
            }
            currentToolUse = null;
          }
        } else if (event.type === "message_delta") {
          stopReason = event.delta.stop_reason;
        }
      }

      if (stopReason === "tool_use" && toolUseBlocks.length > 0) {
        // Build assistant message content
        const assistantContent: Array<
          | { type: "text"; text: string }
          | {
              type: "tool_use";
              id: string;
              name: string;
              input: Record<string, unknown>;
            }
        > = [];
        if (fullContent) {
          assistantContent.push({ type: "text", text: fullContent });
        }
        for (const tu of toolUseBlocks) {
          assistantContent.push({
            type: "tool_use",
            id: tu.id,
            name: tu.name,
            input: tu.input,
          });
        }

        this.anthropicMessages.push({
          role: "assistant",
          content: assistantContent,
        });

        // Execute tools and add results
        const toolResults: MessageParam["content"] = [];
        for (const toolUse of toolUseBlocks) {
          onToolCall?.(toolUse.name, JSON.stringify(toolUse.input));
          const result = await executeTool(
            this.connectionId,
            toolUse.name,
            toolUse.input,
          );
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: result,
          });
        }

        this.anthropicMessages.push({ role: "user", content: toolResults });
        // Continue loop to get next response
      } else {
        // End of conversation
        continueLoop = false;
        this.anthropicMessages.push({
          role: "assistant",
          content: fullContent || "I couldn't generate a response.",
        });
      }
    }
  }

  private async chatOpenAI(
    userMessage: string,
    onToolCall?: (toolName: string, args: string) => void,
  ): Promise<string> {
    if (!this.openaiClient) {
      this.openaiClient = new OpenAI({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true,
      });
    }

    this.openaiMessages.push({ role: "user", content: userMessage });

    let response = await this.openaiClient.chat.completions.create({
      model: this.model,
      messages: this.openaiMessages,
      tools: AI_TOOLS,
      tool_choice: "auto",
    });

    let assistantMessage = response.choices[0].message;

    while (
      assistantMessage.tool_calls &&
      assistantMessage.tool_calls.length > 0
    ) {
      this.openaiMessages.push(assistantMessage);

      for (const toolCall of assistantMessage.tool_calls) {
        if (toolCall.type !== "function") continue;

        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);

        onToolCall?.(toolName, toolCall.function.arguments);

        const result = await executeTool(this.connectionId, toolName, toolArgs);

        this.openaiMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }

      response = await this.openaiClient.chat.completions.create({
        model: this.model,
        messages: this.openaiMessages,
        tools: AI_TOOLS,
        tool_choice: "auto",
      });

      assistantMessage = response.choices[0].message;
    }

    const content =
      assistantMessage.content || "I couldn't generate a response.";
    this.openaiMessages.push({ role: "assistant", content });

    return content;
  }

  private async chatAnthropic(
    userMessage: string,
    onToolCall?: (toolName: string, args: string) => void,
  ): Promise<string> {
    if (!this.anthropicClient) {
      this.anthropicClient = new Anthropic({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true,
      });
    }

    this.anthropicMessages.push({ role: "user", content: userMessage });

    let response = await this.anthropicClient.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: this.anthropicMessages,
      tools: ANTHROPIC_TOOLS,
    });

    // Handle tool use loop
    while (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (block) => block.type === "tool_use",
      );

      const toolResults: MessageParam["content"] = [];

      for (const toolUse of toolUseBlocks) {
        if (toolUse.type !== "tool_use") continue;

        onToolCall?.(toolUse.name, JSON.stringify(toolUse.input));

        const result = await executeTool(
          this.connectionId,
          toolUse.name,
          toolUse.input as Record<string, unknown>,
        );

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: result,
        });
      }

      // Add assistant message with tool use
      this.anthropicMessages.push({
        role: "assistant",
        content: response.content,
      });
      // Add tool results
      this.anthropicMessages.push({ role: "user", content: toolResults });

      response = await this.anthropicClient.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: this.anthropicMessages,
        tools: ANTHROPIC_TOOLS,
      });
    }

    // Extract text content
    const textBlocks = response.content.filter(
      (block) => block.type === "text",
    );
    const content =
      textBlocks.map((b) => (b.type === "text" ? b.text : "")).join("\n") ||
      "I couldn't generate a response.";

    this.anthropicMessages.push({ role: "assistant", content });

    return content;
  }

  clearHistory() {
    this.openaiMessages = [{ role: "system", content: SYSTEM_PROMPT }];
    this.anthropicMessages = [];
  }
}
