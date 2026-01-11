import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import type { MessageParam, Tool } from "@anthropic-ai/sdk/resources/messages";
import { api } from "./api";

// ============================================================================
// Types
// ============================================================================

export interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
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

// ============================================================================
// Models Configuration
// ============================================================================

export const AI_MODELS = [
  { id: "gpt-5", name: "GPT-5", provider: "openai" },
  { id: "gpt-5-mini", name: "GPT-5 Mini", provider: "openai" },
] as const;

export type ModelId = (typeof AI_MODELS)[number]["id"];

export function getModelProvider(modelId: ModelId): "openai" | "anthropic" {
  const model = AI_MODELS.find((m) => m.id === modelId);
  return (model?.provider as "openai" | "anthropic") || "openai";
}

// ============================================================================
// Tool Definitions (Single Source of Truth)
// ============================================================================

interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
}

const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "list_tables",
    description:
      "List all tables in the database. Returns table names, schemas, and approximate row counts. Use this first to understand what data is available.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_table_columns",
    description:
      "Get detailed column information for a specific table. Returns column names, data types, nullability, default values, and primary key status. Essential for understanding table structure before querying.",
    parameters: {
      type: "object",
      properties: {
        schema: {
          type: "string",
          description: "The schema name (usually 'public' for PostgreSQL)",
        },
        table: {
          type: "string",
          description: "The table name to inspect",
        },
      },
      required: ["schema", "table"],
    },
  },
  {
    name: "execute_select_query",
    description:
      "Execute a read-only SELECT query against the database. Returns up to 50 rows. Use LIMIT clauses for large tables. Only SELECT statements are allowed for safety.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "The SELECT SQL query to execute. Must be a valid PostgreSQL SELECT statement.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_table_sample",
    description:
      "Get a quick sample of rows from a table. Useful for understanding what kind of data a table contains before writing more specific queries.",
    parameters: {
      type: "object",
      properties: {
        schema: {
          type: "string",
          description: "The schema name (usually 'public')",
        },
        table: {
          type: "string",
          description: "The table name to sample",
        },
        limit: {
          type: "number",
          description:
            "Number of sample rows to return (default: 10, max: 100)",
        },
      },
      required: ["schema", "table"],
    },
  },
];

// Convert to OpenAI format
export const AI_TOOLS: ChatCompletionTool[] = TOOL_DEFINITIONS.map((tool) => ({
  type: "function" as const,
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  },
}));

// Convert to Anthropic format
const ANTHROPIC_TOOLS: Tool[] = TOOL_DEFINITIONS.map((tool) => ({
  name: tool.name,
  description: tool.description,
  input_schema: {
    type: "object" as const,
    properties: tool.parameters.properties,
    required: tool.parameters.required,
  },
}));

// ============================================================================
// System Prompt
// ============================================================================

const SYSTEM_PROMPT = `You are QueryStudio AI, an expert PostgreSQL assistant.

## Formatting Rules (IMPORTANT)

Always use rich markdown formatting:

- **Tables**: Display schema/column info in markdown tables:
  | Column | Type | Nullable | Default |
  |--------|------|----------|---------|
  | id | bigint | NO | auto |

- **Code**: SQL in \`\`\`sql blocks, identifiers in \`backticks\`
- **Lists**: Use bullet points for multiple items
- **Bold**: Key terms and column names
- **Headers**: Use ### for sections when needed

## Capabilities

✅ List tables, examine schemas, run SELECT queries, explain SQL, debug errors
❌ Cannot execute INSERT/UPDATE/DELETE (but can write examples for you to copy)

## Response Style

- Be concise and direct
- Format data nicely - never dump raw JSON
- Use tables for structured data (columns, query results)
- Suggest follow-up queries when helpful`;

// ============================================================================
// Tool Execution
// ============================================================================

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
        const trimmed = query.trim().toUpperCase();

        if (!trimmed.startsWith("SELECT") && !trimmed.startsWith("WITH")) {
          return JSON.stringify({
            error:
              "Only SELECT queries (including WITH clauses) are allowed for safety",
          });
        }

        const result = await api.executeQuery(connectionId, query);
        const maxRows = 50;
        const limitedRows = result.rows.slice(0, maxRows);

        return JSON.stringify(
          {
            columns: result.columns,
            rows: limitedRows,
            total_rows: result.row_count,
            showing: limitedRows.length,
            truncated: result.row_count > maxRows,
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
        } = args as {
          schema: string;
          table: string;
          limit?: number;
        };
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
            sample_size: result.rows.length,
            total_rows: result.row_count,
          },
          null,
          2,
        );
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return JSON.stringify({ error: message });
  }
}

// ============================================================================
// Chat History Management
// ============================================================================

const CHAT_HISTORY_KEY = "querystudio_chat_history";
const MAX_SESSIONS = 50;

export function loadChatHistory(): ChatSession[] {
  try {
    const stored = localStorage.getItem(CHAT_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveChatHistory(sessions: ChatSession[]): void {
  const limited = sessions.slice(-MAX_SESSIONS);
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

  const content = firstUserMessage.content.trim();
  const maxLength = 40;

  if (content.length <= maxLength) return content;

  // Try to break at a word boundary
  const truncated = content.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  return lastSpace > 20
    ? truncated.substring(0, lastSpace) + "..."
    : truncated + "...";
}

// ============================================================================
// AI Agent Class
// ============================================================================

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

  private initClient(): void {
    const provider = getModelProvider(this.model);

    if (provider === "anthropic") {
      this.anthropicClient = new Anthropic({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true,
      });
      this.openaiClient = null;
    } else {
      this.openaiClient = new OpenAI({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true,
      });
      this.anthropicClient = null;
    }
  }

  setModel(model: ModelId): void {
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

  loadFromSession(session: ChatSession): void {
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

  clearHistory(): void {
    this.openaiMessages = [{ role: "system", content: SYSTEM_PROMPT }];
    this.anthropicMessages = [];
  }

  // -------------------------------------------------------------------------
  // Streaming Chat (Primary Method)
  // -------------------------------------------------------------------------

  async *chatStream(
    userMessage: string,
    onToolCall?: (toolName: string, args: string) => void,
  ): AsyncGenerator<string, void, unknown> {
    const provider = getModelProvider(this.model);

    if (provider === "anthropic") {
      yield* this.streamAnthropic(userMessage, onToolCall);
    } else {
      yield* this.streamOpenAI(userMessage, onToolCall);
    }
  }

  private async *streamOpenAI(
    userMessage: string,
    onToolCall?: (toolName: string, args: string) => void,
  ): AsyncGenerator<string, void, unknown> {
    this.ensureOpenAIClient();
    this.openaiMessages.push({ role: "user", content: userMessage });

    let continueLoop = true;

    while (continueLoop) {
      const stream = await this.openaiClient!.chat.completions.create({
        model: this.model,
        messages: this.openaiMessages,
        tools: AI_TOOLS,
        tool_choice: "auto",
        stream: true,
      });

      let fullContent = "";
      const toolCalls: Array<{ id: string; name: string; arguments: string }> =
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

        // Check finish reason
        if (choice.finish_reason === "stop") {
          continueLoop = false;
          this.openaiMessages.push({
            role: "assistant",
            content: fullContent || "I couldn't generate a response.",
          });
        } else if (choice.finish_reason === "tool_calls") {
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

          // Continue loop for next response
          break;
        }
      }

      // Safety exit if no finish reason
      if (continueLoop && toolCalls.length === 0) {
        continueLoop = false;
        if (fullContent) {
          this.openaiMessages.push({ role: "assistant", content: fullContent });
        }
      }
    }
  }

  private async *streamAnthropic(
    userMessage: string,
    onToolCall?: (toolName: string, args: string) => void,
  ): AsyncGenerator<string, void, unknown> {
    this.ensureAnthropicClient();
    this.anthropicMessages.push({ role: "user", content: userMessage });

    let continueLoop = true;

    while (continueLoop) {
      const stream = this.anthropicClient!.messages.stream({
        model: this.model,
        max_tokens: 8192,
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

        // Execute tools
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
        // Continue loop
      } else {
        continueLoop = false;
        this.anthropicMessages.push({
          role: "assistant",
          content: fullContent || "I couldn't generate a response.",
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Non-Streaming Chat (Legacy/Fallback)
  // -------------------------------------------------------------------------

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

  private async chatOpenAI(
    userMessage: string,
    onToolCall?: (toolName: string, args: string) => void,
  ): Promise<string> {
    this.ensureOpenAIClient();
    this.openaiMessages.push({ role: "user", content: userMessage });

    let response = await this.openaiClient!.chat.completions.create({
      model: this.model,
      messages: this.openaiMessages,
      tools: AI_TOOLS,
      tool_choice: "auto",
    });

    let assistantMessage = response.choices[0].message;

    while (assistantMessage.tool_calls?.length) {
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

      response = await this.openaiClient!.chat.completions.create({
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
    this.ensureAnthropicClient();
    this.anthropicMessages.push({ role: "user", content: userMessage });

    let response = await this.anthropicClient!.messages.create({
      model: this.model,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: this.anthropicMessages,
      tools: ANTHROPIC_TOOLS,
    });

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

      this.anthropicMessages.push({
        role: "assistant",
        content: response.content,
      });
      this.anthropicMessages.push({ role: "user", content: toolResults });

      response = await this.anthropicClient!.messages.create({
        model: this.model,
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: this.anthropicMessages,
        tools: ANTHROPIC_TOOLS,
      });
    }

    const textBlocks = response.content.filter(
      (block) => block.type === "text",
    );
    const content =
      textBlocks.map((b) => (b.type === "text" ? b.text : "")).join("\n") ||
      "I couldn't generate a response.";

    this.anthropicMessages.push({ role: "assistant", content });

    return content;
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private ensureOpenAIClient(): void {
    if (!this.openaiClient) {
      this.openaiClient = new OpenAI({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true,
      });
    }
  }

  private ensureAnthropicClient(): void {
    if (!this.anthropicClient) {
      this.anthropicClient = new Anthropic({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true,
      });
    }
  }
}
