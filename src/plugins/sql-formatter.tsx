// ============================================================================
// SQL Formatter Plugin
// ============================================================================
//
// A plugin that provides SQL formatting/beautifying capabilities with support
// for multiple SQL dialects and customizable formatting options.
//
// Features:
// - Format SQL queries with proper indentation and styling
// - Support for multiple SQL dialects (PostgreSQL, MySQL, SQLite, etc.)
// - Customizable formatting options (indent, keyword case, etc.)
// - Monaco editor for input/output
// - Copy formatted SQL to clipboard
// - Auto-detect dialect from connection
//
// ============================================================================

import { useState, useCallback, useEffect } from "react";
import { Code2, Play, Copy, Settings2, RotateCcw, Check } from "lucide-react";
import { format } from "sql-formatter";
import Editor from "@monaco-editor/react";
import type { TabPluginRegistration, TabContentProps } from "@/lib/tab-sdk";
import type { LocalPluginModule } from "@/lib/local-plugins";
import { usePluginSDK } from "@/lib/plugin-sdk";
import { useThemeStore } from "@/lib/theme-store";

// ============================================================================
// Types
// ============================================================================

type SqlDialect = "postgresql" | "mysql" | "sqlite";

type KeywordCase = "preserve" | "upper" | "lower";

interface FormatterOptions {
  dialect: SqlDialect;
  tabWidth: number;
  useTabs: boolean;
  keywordCase: KeywordCase;
  linesBetweenQueries: number;
  denseOperators: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const DIALECTS: { value: SqlDialect; label: string }[] = [
  { value: "postgresql", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL" },
  { value: "sqlite", label: "SQLite" },
];

const DEFAULT_OPTIONS: FormatterOptions = {
  dialect: "postgresql",
  tabWidth: 2,
  useTabs: false,
  keywordCase: "upper",
  linesBetweenQueries: 2,
  denseOperators: false,
};

const SAMPLE_SQL = `select u.id, u.name, u.email, count(o.id) as order_count, sum(o.total) as total_spent from users u left join orders o on u.id = o.user_id where u.active = true and u.created_at > '2024-01-01' group by u.id, u.name, u.email having count(o.id) > 0 order by total_spent desc limit 100;`;

// ============================================================================
// Plugin Definition
// ============================================================================

export const plugin: TabPluginRegistration = {
  type: "sql-formatter",
  displayName: "SQL Formatter",
  icon: Code2,
  getDefaultTitle: (index) => `SQL Formatter ${index}`,
  canCreate: true,
  allowMultiple: true,
  priority: 40,
  experimental: false,
  lifecycle: {
    onCreate: (tabId, metadata) => {
      console.log(`[SQLFormatter] Created: ${tabId}`, metadata);
    },
    onClose: (tabId) => {
      console.log(`[SQLFormatter] Closed: ${tabId}`);
    },
  },
};

// ============================================================================
// Tab Component
// ============================================================================

export function Component({ tabId, paneId, connectionId }: TabContentProps) {
  const sdk = usePluginSDK(connectionId, tabId, paneId);
  const activeTheme = useThemeStore((s) => s.getActiveTheme());

  // State
  const [inputSql, setInputSql] = useState(SAMPLE_SQL);
  const [outputSql, setOutputSql] = useState("");
  const [options, setOptions] = useState<FormatterOptions>(DEFAULT_OPTIONS);
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-detect dialect from connection
  useEffect(() => {
    if (sdk.connection.isConnected && sdk.connection.databaseType) {
      const dbType = sdk.connection.databaseType;
      let detectedDialect: SqlDialect = "sql";

      if (dbType === "postgres") {
        detectedDialect = "postgresql";
      } else if (dbType === "mysql") {
        detectedDialect = "mysql";
      } else if (dbType === "sqlite") {
        detectedDialect = "sqlite";
      }

      setOptions((prev) => ({ ...prev, dialect: detectedDialect }));
    }
  }, [sdk.connection.isConnected, sdk.connection.databaseType]);

  // Format SQL
  const formatSql = useCallback(() => {
    if (!inputSql.trim()) {
      setOutputSql("");
      setError(null);
      return;
    }

    try {
      const formatted = format(inputSql, {
        language: options.dialect,
        tabWidth: options.tabWidth,
        useTabs: options.useTabs,
        keywordCase: options.keywordCase,
        linesBetweenQueries: options.linesBetweenQueries,
        denseOperators: options.denseOperators,
      });
      setOutputSql(formatted);
      setError(null);
      sdk.utils.toast.success("SQL formatted successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to format SQL";
      setError(message);
      sdk.utils.toast.error(message);
    }
  }, [inputSql, options, sdk.utils.toast]);

  // Copy to clipboard
  const copyToClipboard = useCallback(async () => {
    if (!outputSql) {
      sdk.utils.toast.error("Nothing to copy");
      return;
    }

    const success = await sdk.utils.clipboard.copy(outputSql);
    if (success) {
      setCopied(true);
      sdk.utils.toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } else {
      sdk.utils.toast.error("Failed to copy to clipboard");
    }
  }, [outputSql, sdk.utils.clipboard, sdk.utils.toast]);

  // Reset to defaults
  const resetOptions = useCallback(() => {
    setOptions(DEFAULT_OPTIONS);
    sdk.utils.toast.info("Options reset to defaults");
  }, [sdk.utils.toast]);

  // Clear input
  const clearInput = useCallback(() => {
    setInputSql("");
    setOutputSql("");
    setError(null);
  }, []);

  // Monaco editor theme based on app's theme store
  const editorTheme = activeTheme?.isDark ? "vs-dark" : "light";

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Code2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">
              SQL Formatter
            </h1>
            <p className="text-xs text-muted-foreground">
              Beautify and format SQL queries
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Dialect Selector */}
          <select
            value={options.dialect}
            onChange={(e) =>
              setOptions((prev) => ({
                ...prev,
                dialect: e.target.value as SqlDialect,
              }))
            }
            className="h-8 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {DIALECTS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>

          {/* Settings Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
              showSettings
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:bg-muted"
            }`}
            title="Formatting options"
          >
            <Settings2 className="h-4 w-4" />
          </button>

          {/* Format Button */}
          <button
            onClick={formatSql}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Play className="h-3.5 w-3.5" />
            Format
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="border-b border-border bg-muted/30 px-4 py-3">
          <div className="flex flex-wrap items-center gap-4">
            {/* Tab Width */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Indent:</label>
              <select
                value={options.useTabs ? "tabs" : options.tabWidth.toString()}
                onChange={(e) => {
                  if (e.target.value === "tabs") {
                    setOptions((prev) => ({ ...prev, useTabs: true }));
                  } else {
                    setOptions((prev) => ({
                      ...prev,
                      useTabs: false,
                      tabWidth: parseInt(e.target.value),
                    }));
                  }
                }}
                className="h-7 rounded border border-border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="2">2 spaces</option>
                <option value="4">4 spaces</option>
                <option value="tabs">Tabs</option>
              </select>
            </div>

            {/* Keyword Case */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Keywords:</label>
              <select
                value={options.keywordCase}
                onChange={(e) =>
                  setOptions((prev) => ({
                    ...prev,
                    keywordCase: e.target.value as KeywordCase,
                  }))
                }
                className="h-7 rounded border border-border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="upper">UPPERCASE</option>
                <option value="lower">lowercase</option>
                <option value="preserve">Preserve</option>
              </select>
            </div>

            {/* Lines Between Queries */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">
                Lines between queries:
              </label>
              <select
                value={options.linesBetweenQueries}
                onChange={(e) =>
                  setOptions((prev) => ({
                    ...prev,
                    linesBetweenQueries: parseInt(e.target.value),
                  }))
                }
                className="h-7 rounded border border-border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </div>

            {/* Dense Operators */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.denseOperators}
                onChange={(e) =>
                  setOptions((prev) => ({
                    ...prev,
                    denseOperators: e.target.checked,
                  }))
                }
                className="h-3.5 w-3.5 rounded border-border"
              />
              <span className="text-xs text-muted-foreground">
                Dense operators
              </span>
            </label>

            {/* Reset Button */}
            <button
              onClick={resetOptions}
              className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Main Content - Side by Side Editors */}
      <div className="flex flex-1 min-h-0">
        {/* Input Panel */}
        <div className="flex flex-1 flex-col border-r border-border">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">
              Input SQL
            </span>
            <button
              onClick={clearInput}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              language="sql"
              theme={editorTheme}
              value={inputSql}
              onChange={(value) => setInputSql(value || "")}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                wordWrap: "on",
                automaticLayout: true,
                tabSize: options.tabWidth,
                padding: { top: 8, bottom: 8 },
                renderWhitespace: "selection",
              }}
            />
          </div>
        </div>

        {/* Output Panel */}
        <div className="flex flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">
              Formatted Output
            </span>
            <button
              onClick={copyToClipboard}
              disabled={!outputSql}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy
                </>
              )}
            </button>
          </div>
          <div className="flex-1 min-h-0 relative">
            {error ? (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              </div>
            ) : outputSql ? (
              <Editor
                height="100%"
                language="sql"
                theme={editorTheme}
                value={outputSql}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  automaticLayout: true,
                  tabSize: options.tabWidth,
                  padding: { top: 8, bottom: 8 },
                  renderWhitespace: "selection",
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Code2 className="mx-auto h-10 w-10 text-muted-foreground/30" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Click "Format" to beautify your SQL
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
        <span>
          {inputSql.length > 0
            ? `${inputSql.length} characters`
            : "Paste or type SQL to format"}
        </span>
        <span>
          Dialect:{" "}
          <span className="font-medium text-foreground">
            {DIALECTS.find((d) => d.value === options.dialect)?.label}
          </span>
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Export as LocalPluginModule
// ============================================================================

const sqlFormatterPlugin: LocalPluginModule = {
  plugin,
  Component,
};

export default sqlFormatterPlugin;
