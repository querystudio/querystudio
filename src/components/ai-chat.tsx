import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Bot,
  User,
  Loader2,
  Settings,
  Trash2,
  Wrench,
  Plus,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  PlayCircle,
  Paperclip,
  X,
  FileText,
} from "lucide-react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  useConnectionStore,
  useAIQueryStore,
  useLastChatStore,
} from "@/lib/store";
import {
  AIAgent,
  AI_MODELS,
  type Message,
  type MessageAttachment,
  type ModelId,
  type ChatSession,
  loadChatHistory,
  saveChatHistory,
  createChatSession,
  generateSessionTitle,
} from "@/lib/ai-agent";
import { cn } from "@/lib/utils";

const API_KEY_STORAGE_KEY = "querystudio_openai_api_key";
const SELECTED_MODEL_KEY = "querystudio_selected_model";

// Code block component with copy button and syntax highlighting
function CodeBlock({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const language = className?.replace("language-", "") || "";
  const isSql =
    language === "sql" || language === "pgsql" || language === "postgresql";

  const code = String(children).replace(/\n$/, "");

  const appendSql = useAIQueryStore((s) => s.appendSql);
  const setActiveTab = useAIQueryStore((s) => s.setActiveTab);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const handleAppendToRunner = useCallback(() => {
    appendSql(code);
    setActiveTab("query");
  }, [code, appendSql, setActiveTab]);

  return (
    <div className="relative group my-2">
      <div className="flex items-center justify-between bg-card px-3 py-1.5 rounded-t-md border-b border-border">
        <span className="text-xs text-muted-foreground uppercase">
          {language || "code"}
        </span>
        <div className="flex items-center gap-2">
          {isSql && (
            <button
              onClick={handleAppendToRunner}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              <PlayCircle className="h-3 w-3" />
              Add to Query
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>
      <SyntaxHighlighter
        language={language || "text"}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: "0 0 6px 6px",
          fontSize: "0.875rem",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

// Inline code component
function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-secondary px-1.5 py-0.5 rounded text-blue-400 text-sm">
      {children}
    </code>
  );
}

export function AIChat() {
  const connection = useConnectionStore((s) => s.connection);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem(API_KEY_STORAGE_KEY) || "",
  );
  const [showSettings, setShowSettings] = useState(false);
  const [tempApiKey, setTempApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState<ModelId>(() => {
    const saved = localStorage.getItem(SELECTED_MODEL_KEY);
    if (saved && AI_MODELS.some((m) => m.id === saved)) {
      return saved as ModelId;
    }
    return "gpt-5";
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const agentRef = useRef<AIAgent | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debug request from query editor
  const debugRequest = useAIQueryStore((s) => s.debugRequest);
  const clearDebugRequest = useAIQueryStore((s) => s.clearDebugRequest);

  // Last chat session persistence
  const setLastSession = useLastChatStore((s) => s.setLastSession);
  const getLastSession = useLastChatStore((s) => s.getLastSession);

  // Load chat history on mount and restore last session
  useEffect(() => {
    const history = loadChatHistory();
    setSessions(history);

    // Restore last session for this connection
    if (connection?.id) {
      const lastSessionId = getLastSession(connection.id);
      if (lastSessionId) {
        const lastSession = history.find((s) => s.id === lastSessionId);
        if (lastSession) {
          setCurrentSessionId(lastSessionId);
          setMessages(lastSession.messages);
          setSelectedModel(lastSession.model as ModelId);
        }
      }
    }
  }, [connection?.id, getLastSession]);

  // Save current session ID when it changes
  useEffect(() => {
    if (connection?.id && currentSessionId) {
      setLastSession(connection.id, currentSessionId);
    }
  }, [connection?.id, currentSessionId, setLastSession]);

  // Initialize agent when connection, API key, or model changes
  useEffect(() => {
    if (apiKey && connection?.id) {
      agentRef.current = new AIAgent(apiKey, connection.id, selectedModel);
    } else {
      agentRef.current = null;
    }
  }, [apiKey, connection?.id, selectedModel]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle debug request from query editor
  useEffect(() => {
    if (debugRequest && apiKey && connection?.id) {
      const debugMessage = `I got this SQL error. Please help me debug it:\n\n**Query:**\n\`\`\`sql\n${debugRequest.query}\n\`\`\`\n\n**Error:**\n\`\`\`\n${debugRequest.error}\n\`\`\``;
      setInput(debugMessage);
      clearDebugRequest();
    }
  }, [debugRequest, apiKey, connection?.id, clearDebugRequest]);

  // Filter sessions for current connection
  const connectionSessions = sessions.filter(
    (s) => s.connectionId === connection?.id,
  );

  const handleSaveApiKey = () => {
    setApiKey(tempApiKey);
    localStorage.setItem(API_KEY_STORAGE_KEY, tempApiKey);
    setShowSettings(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("handleFileSelect called", e.target.files);
    const files = e.target.files;
    if (!files || files.length === 0) {
      console.log("No files selected");
      return;
    }

    console.log("Processing", files.length, "files");
    const newAttachments: MessageAttachment[] = [];

    for (const file of Array.from(files)) {
      try {
        const content = await file.text();
        // Limit file size to 100KB
        if (content.length > 100000) {
          console.warn(`File ${file.name} is too large, skipping`);
          continue;
        }
        newAttachments.push({
          id: crypto.randomUUID(),
          name: file.name,
          content,
          type: file.type || "text/plain",
        });
      } catch (err) {
        console.error(`Failed to read file ${file.name}:`, err);
      }
    }

    console.log("Created", newAttachments.length, "attachments");
    if (newAttachments.length > 0) {
      setAttachments((prev) => {
        console.log("Setting attachments:", [...prev, ...newAttachments]);
        return [...prev, ...newAttachments];
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleNewChat = () => {
    if (!connection?.id) return;
    const session = createChatSession(connection.id, selectedModel);
    const newSessions = [...sessions, session];
    setSessions(newSessions);
    saveChatHistory(newSessions);
    setCurrentSessionId(session.id);
    setMessages([]);
    agentRef.current?.clearHistory();
  };

  const handleSelectSession = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    setCurrentSessionId(sessionId);
    setMessages(session.messages);
    setSelectedModel(session.model as ModelId);

    // Reload agent with session history
    if (agentRef.current) {
      agentRef.current.loadFromSession(session);
    }
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSessions = sessions.filter((s) => s.id !== sessionId);
    setSessions(newSessions);
    saveChatHistory(newSessions);

    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      setMessages([]);
      agentRef.current?.clearHistory();
    }
  };

  const handleClearChat = () => {
    if (currentSessionId) {
      // Update session with empty messages
      const newSessions = sessions.map((s) =>
        s.id === currentSessionId
          ? { ...s, messages: [], title: "New Chat", updatedAt: Date.now() }
          : s,
      );
      setSessions(newSessions);
      saveChatHistory(newSessions);
    }
    setMessages([]);
    agentRef.current?.clearHistory();
  };

  const handleModelChange = (model: ModelId) => {
    setSelectedModel(model);
    localStorage.setItem(SELECTED_MODEL_KEY, model);
    agentRef.current?.setModel(model);

    // Update current session model
    if (currentSessionId) {
      const newSessions = sessions.map((s) =>
        s.id === currentSessionId ? { ...s, model, updatedAt: Date.now() } : s,
      );
      setSessions(newSessions);
      saveChatHistory(newSessions);
    }
  };

  const saveCurrentSession = (updatedMessages: Message[]) => {
    if (!connection?.id) return;

    let newSessions: ChatSession[];

    if (currentSessionId) {
      // Update existing session
      newSessions = sessions.map((s) =>
        s.id === currentSessionId
          ? {
              ...s,
              messages: updatedMessages,
              title: generateSessionTitle(updatedMessages),
              updatedAt: Date.now(),
            }
          : s,
      );
    } else {
      // Create new session
      const session = createChatSession(connection.id, selectedModel);
      session.messages = updatedMessages;
      session.title = generateSessionTitle(updatedMessages);
      newSessions = [...sessions, session];
      setCurrentSessionId(session.id);
    }

    setSessions(newSessions);
    saveChatHistory(newSessions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      (!input.trim() && attachments.length === 0) ||
      isLoading ||
      !agentRef.current
    )
      return;

    // Build message content for AI (includes attachment content)
    const userText = input.trim();
    let aiMessageContent = userText;
    if (attachments.length > 0) {
      const attachmentText = attachments
        .map((a) => {
          const ext = a.name.split(".").pop()?.toLowerCase() || "txt";
          const lang =
            ext === "sql"
              ? "sql"
              : ext === "json"
                ? "json"
                : ext === "csv"
                  ? "csv"
                  : "";
          return `**Attached file: ${a.name}**\n\`\`\`${lang}\n${a.content}\n\`\`\``;
        })
        .join("\n\n");
      aiMessageContent = userText
        ? `${userText}\n\n${attachmentText}`
        : attachmentText;
    }

    // Store the display message (with attachments metadata, not content)
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: userText,
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    // Clear attachments after sending
    setAttachments([]);

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    // Add loading indicator
    const loadingId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: loadingId, role: "assistant", content: "", isLoading: true },
    ]);

    try {
      // Use streaming API - send full content with attachments to AI
      const stream = agentRef.current.chatStream(
        aiMessageContent,
        (toolName, args) => {
          // Update loading message to show tool being called
          setMessages((prev) =>
            prev.map((m) =>
              m.id === loadingId
                ? {
                    ...m,
                    toolCalls: [
                      ...(m.toolCalls || []),
                      {
                        id: crypto.randomUUID(),
                        name: toolName,
                        arguments: args,
                      },
                    ],
                  }
                : m,
            ),
          );
        },
      );

      // Stream response chunks
      let fullContent = "";
      for await (const chunk of stream) {
        fullContent += chunk;
        // Update message content as chunks arrive
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId
              ? { ...m, content: fullContent, isLoading: true }
              : m,
          ),
        );
        // Keep scrolled to bottom while streaming
        scrollToBottom();
      }

      // Mark message as complete
      setMessages((prev) => {
        const updated = prev.map((m) =>
          m.id === loadingId ? { ...m, isLoading: false } : m,
        );
        // Save session after streaming completes
        saveCurrentSession(updated);
        return updated;
      });
    } catch (error) {
      setMessages((prev) => {
        const updated = prev.map((m) =>
          m.id === loadingId
            ? {
                ...m,
                content: `Error: ${error instanceof Error ? error.message : "Failed to get response"}`,
                isLoading: false,
              }
            : m,
        );
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!connection) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg">Connect to a database first</p>
          <p className="text-sm text-muted-foreground">
            The AI assistant needs an active connection
          </p>
        </div>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center space-y-4">
          <Bot className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg">API Key Required</p>
          <p className="text-sm text-muted-foreground max-w-md">
            To use the AI assistant, you need to provide an OpenAI API key. Your
            key is stored locally and never sent to our servers.
          </p>
          <Button
            onClick={() => {
              setTempApiKey(apiKey);
              setShowSettings(true);
            }}
          >
            <Settings className="mr-2 h-4 w-4" />
            Configure API Key
          </Button>
        </div>

        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>API Key</DialogTitle>
              <DialogDescription>
                Enter your OpenAI API key to enable the AI assistant.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="openaiKey">OpenAI API Key</Label>
                <Input
                  id="openaiKey"
                  type="password"
                  placeholder="sk-..."
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Get your key from{" "}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    platform.openai.com
                  </a>
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSettings(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveApiKey} disabled={!tempApiKey.trim()}>
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex h-full relative">
      {/* Chat History Sidebar */}
      <div
        className={cn(
          "flex flex-col border-r border-border bg-card/50 transition-all duration-200",
          sidebarOpen ? "w-64" : "w-0 overflow-hidden",
        )}
      >
        <div className="flex items-center justify-between border-b border-border p-3">
          <span className="text-sm font-medium text-muted-foreground">
            History
          </span>
          <Button variant="ghost" size="sm" onClick={handleNewChat}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            {connectionSessions.length === 0 ? (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                No chat history yet
              </p>
            ) : (
              connectionSessions
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map((session) => (
                  <div
                    key={session.id}
                    onClick={() => handleSelectSession(session.id)}
                    className={cn(
                      "group flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
                      currentSessionId === session.id
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                    )}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{session.title}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      onClick={(e) => handleDeleteSession(session.id, e)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Toggle Sidebar Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="flex h-6 w-6 items-center justify-center self-center -ml-3 z-10 rounded-full border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground"
      >
        {sidebarOpen ? (
          <ChevronLeft className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
      </button>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <h2 className="font-medium text-foreground">AI Assistant</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewChat}
              title="New Chat"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearChat}
              disabled={messages.length === 0}
              title="Clear Chat"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setTempApiKey(apiKey);
                setShowSettings(true);
              }}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <div className="text-center space-y-2">
                <p>Ask me anything about your database!</p>
                <p className="text-sm text-muted-foreground">
                  Examples: "What tables do I have?" or "Show me the top 10
                  users"
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" && "justify-end",
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20">
                      <Bot className="h-4 w-4 text-blue-400" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-4 py-2",
                      message.role === "user"
                        ? "bg-secondary text-foreground"
                        : "bg-secondary text-foreground",
                    )}
                  >
                    {/* Show attachments for user messages */}
                    {message.role === "user" &&
                      message.attachments &&
                      message.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {message.attachments.map((attachment) => (
                            <div
                              key={attachment.id}
                              className="flex items-center gap-1.5 rounded bg-background/50 px-2 py-1 text-xs"
                            >
                              <FileText className="h-3 w-3 text-muted-foreground" />
                              <span className="max-w-32 truncate">
                                {attachment.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    {message.isLoading && !message.content ? (
                      <div className="space-y-2">
                        {message.toolCalls?.length ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Wrench className="h-3 w-3" />
                            <span>
                              Calling{" "}
                              {
                                message.toolCalls[message.toolCalls.length - 1]
                                  .name
                              }
                              ...
                            </span>
                          </div>
                        ) : null}
                        <Skeleton className="h-4 w-48 bg-muted" />
                        <Skeleton className="h-4 w-36 bg-muted" />
                        <Skeleton className="h-4 w-24 bg-muted" />
                      </div>
                    ) : message.isLoading && message.content ? (
                      // Streaming state - show content with cursor
                      <>
                        {message.toolCalls && message.toolCalls.length > 0 && (
                          <div className="mb-2 space-y-1">
                            {message.toolCalls.map((tc) => (
                              <div
                                key={tc.id}
                                className="flex items-center gap-1 text-xs text-muted-foreground"
                              >
                                <Wrench className="h-3 w-3" />
                                <span>{tc.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="prose prose-sm prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0">
                          <ReactMarkdown
                            components={{
                              code({ className, children, ...props }) {
                                const isBlock =
                                  className?.includes("language-") ||
                                  String(children).includes("\n");
                                if (isBlock) {
                                  return (
                                    <CodeBlock className={className}>
                                      {children}
                                    </CodeBlock>
                                  );
                                }
                                return (
                                  <InlineCode {...props}>{children}</InlineCode>
                                );
                              },
                              pre({ children }) {
                                return <>{children}</>;
                              },
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                          <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-0.5" />
                        </div>
                      </>
                    ) : (
                      <>
                        {message.toolCalls && message.toolCalls.length > 0 && (
                          <div className="mb-2 space-y-1">
                            {message.toolCalls.map((tc) => (
                              <div
                                key={tc.id}
                                className="flex items-center gap-1 text-xs text-muted-foreground"
                              >
                                <Wrench className="h-3 w-3" />
                                <span>{tc.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {message.content ? (
                          <div className="prose prose-sm prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0">
                            <ReactMarkdown
                              components={{
                                code({ className, children, ...props }) {
                                  const isBlock =
                                    className?.includes("language-") ||
                                    String(children).includes("\n");
                                  if (isBlock) {
                                    return (
                                      <CodeBlock className={className}>
                                        {children}
                                      </CodeBlock>
                                    );
                                  }
                                  return (
                                    <InlineCode {...props}>
                                      {children}
                                    </InlineCode>
                                  );
                                },
                                pre({ children }) {
                                  return <>{children}</>;
                                },
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          /* Attachment-only message with no text */
                          message.role === "user" &&
                          message.attachments &&
                          message.attachments.length > 0 && (
                            <span className="text-muted-foreground text-sm italic">
                              Sent {message.attachments.length} file
                              {message.attachments.length > 1 ? "s" : ""}
                            </span>
                          )
                        )}
                      </>
                    )}
                  </div>
                  {message.role === "user" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                      <User className="h-4 w-4 text-foreground" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Input - Sticky at bottom */}
        <div className="sticky bottom-0 border-t border-border bg-background p-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Attachments preview */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 text-xs"
                  >
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    <span className="max-w-32 truncate">{attachment.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(attachment.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (
                      (input.trim() || attachments.length > 0) &&
                      !isLoading
                    ) {
                      handleSubmit(e);
                    }
                  }
                }}
                placeholder="Ask about your database..."
                disabled={isLoading}
                className="min-h-11 max-h-50 resize-none pr-20"
                rows={1}
              />
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="sr-only"
                  tabIndex={-1}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    console.log("Attach button clicked");
                    fileInputRef.current?.click();
                  }}
                  disabled={isLoading}
                  className="h-8 w-8"
                  title="Attach files"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button
                  type="submit"
                  size="icon"
                  disabled={
                    isLoading || (!input.trim() && attachments.length === 0)
                  }
                  className="h-8 w-8"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Select value={selectedModel} onValueChange={handleModelChange}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_MODELS.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                Enter to send, Shift+Enter for new line
              </span>
            </div>
          </form>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI Settings</DialogTitle>
            <DialogDescription>
              Configure your OpenAI API key for the AI assistant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="openaiKey2">OpenAI API Key</Label>
              <Input
                id="openaiKey2"
                type="password"
                placeholder="sk-..."
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Get your key from{" "}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  platform.openai.com
                </a>
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveApiKey} disabled={!tempApiKey.trim()}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
