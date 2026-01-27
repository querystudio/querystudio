// ============================================================================
// Data Export Plugin
// ============================================================================
//
// A plugin that exports query results or table data to various formats.
//
// Features:
// - Export to CSV, JSON, SQL INSERT, and Markdown
// - Select specific columns to export
// - Preview export before downloading
// - Copy to clipboard or download as file
// - Load data from connected tables
//
// ============================================================================

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  FileDown,
  Copy,
  Check,
  Download,
  Table2,
  Database,
  ChevronDown,
  RefreshCw,
  FileJson,
  FileText,
  FileCode,
  FileSpreadsheet,
} from "lucide-react";
import type { TabPluginRegistration, TabContentProps } from "@/lib/tab-sdk";
import type { LocalPluginModule } from "@/lib/local-plugins";
import { usePluginSDK } from "@/lib/plugin-sdk";
import { ScrollArea } from "@/components/ui/scroll-area";

// ============================================================================
// Types
// ============================================================================

type ExportFormat = "csv" | "json" | "sql" | "markdown";

interface ExportOptions {
  format: ExportFormat;
  includeHeaders: boolean;
  tableName: string;
  delimiter: string;
  quoteStrings: boolean;
  prettyPrint: boolean;
}

interface ColumnInfo {
  name: string;
  selected: boolean;
}

interface TableData {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
}

// ============================================================================
// Export Format Info
// ============================================================================

const FORMAT_INFO: Record<
  ExportFormat,
  { label: string; extension: string; icon: typeof FileDown; mimeType: string }
> = {
  csv: {
    label: "CSV",
    extension: ".csv",
    icon: FileSpreadsheet,
    mimeType: "text/csv",
  },
  json: {
    label: "JSON",
    extension: ".json",
    icon: FileJson,
    mimeType: "application/json",
  },
  sql: {
    label: "SQL INSERT",
    extension: ".sql",
    icon: FileCode,
    mimeType: "text/sql",
  },
  markdown: {
    label: "Markdown",
    extension: ".md",
    icon: FileText,
    mimeType: "text/markdown",
  },
};

// ============================================================================
// Export Functions
// ============================================================================

function escapeCSV(value: unknown, quoteStrings: boolean): string {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value);
  if (
    quoteStrings ||
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function exportToCSV(
  data: TableData,
  columns: ColumnInfo[],
  options: ExportOptions
): string {
  const selectedColumns = columns.filter((c) => c.selected);
  const selectedIndices = selectedColumns.map((c) =>
    data.columns.indexOf(c.name)
  );

  const lines: string[] = [];

  if (options.includeHeaders) {
    lines.push(
      selectedColumns.map((c) => escapeCSV(c.name, options.quoteStrings)).join(options.delimiter)
    );
  }

  for (const row of data.rows) {
    const values = selectedIndices.map((i) =>
      escapeCSV(row[i], options.quoteStrings)
    );
    lines.push(values.join(options.delimiter));
  }

  return lines.join("\n");
}

function exportToJSON(
  data: TableData,
  columns: ColumnInfo[],
  options: ExportOptions
): string {
  const selectedColumns = columns.filter((c) => c.selected);
  const selectedIndices = selectedColumns.map((c) =>
    data.columns.indexOf(c.name)
  );

  const objects = data.rows.map((row) => {
    const obj: Record<string, unknown> = {};
    selectedColumns.forEach((col, i) => {
      obj[col.name] = row[selectedIndices[i]];
    });
    return obj;
  });

  return options.prettyPrint
    ? JSON.stringify(objects, null, 2)
    : JSON.stringify(objects);
}

function escapeSQLString(value: unknown): string {
  if (value === null || value === undefined) {
    return "NULL";
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function exportToSQL(
  data: TableData,
  columns: ColumnInfo[],
  options: ExportOptions
): string {
  const selectedColumns = columns.filter((c) => c.selected);
  const selectedIndices = selectedColumns.map((c) =>
    data.columns.indexOf(c.name)
  );
  const columnNames = selectedColumns.map((c) => `"${c.name}"`).join(", ");
  const tableName = options.tableName || "table_name";

  const values = data.rows
    .map((row) => {
      const rowValues = selectedIndices
        .map((i) => escapeSQLString(row[i]))
        .join(", ");
      return `  (${rowValues})`;
    })
    .join(",\n");

  return `INSERT INTO ${tableName} (${columnNames})\nVALUES\n${values};`;
}

function exportToMarkdown(
  data: TableData,
  columns: ColumnInfo[],
  _options: ExportOptions
): string {
  const selectedColumns = columns.filter((c) => c.selected);
  const selectedIndices = selectedColumns.map((c) =>
    data.columns.indexOf(c.name)
  );

  const lines: string[] = [];

  // Header row
  lines.push("| " + selectedColumns.map((c) => c.name).join(" | ") + " |");

  // Separator row
  lines.push("| " + selectedColumns.map(() => "---").join(" | ") + " |");

  // Data rows
  for (const row of data.rows) {
    const values = selectedIndices.map((i) => {
      const val = row[i];
      if (val === null || val === undefined) return "";
      return String(val).replace(/\|/g, "\\|");
    });
    lines.push("| " + values.join(" | ") + " |");
  }

  return lines.join("\n");
}

function exportData(
  data: TableData,
  columns: ColumnInfo[],
  options: ExportOptions
): string {
  switch (options.format) {
    case "csv":
      return exportToCSV(data, columns, options);
    case "json":
      return exportToJSON(data, columns, options);
    case "sql":
      return exportToSQL(data, columns, options);
    case "markdown":
      return exportToMarkdown(data, columns, options);
    default:
      return "";
  }
}

// ============================================================================
// Plugin Definition
// ============================================================================

export const plugin: TabPluginRegistration = {
  type: "data-export",
  displayName: "Data Export",
  icon: FileDown,
  getDefaultTitle: (index) => `Data Export ${index}`,
  canCreate: true,
  allowMultiple: true,
  priority: 25,
  experimental: false,
  lifecycle: {
    onCreate: (tabId, metadata) => {
      console.log(`[DataExport] Created: ${tabId}`, metadata);
    },
    onClose: (tabId) => {
      console.log(`[DataExport] Closed: ${tabId}`);
    },
  },
};

// ============================================================================
// Tab Component
// ============================================================================

export function Component({ tabId, paneId, connectionId }: TabContentProps) {
  const sdk = usePluginSDK(connectionId, tabId, paneId);

  // State
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [showTableDropdown, setShowTableDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    format: "csv",
    includeHeaders: true,
    tableName: "table_name",
    delimiter: ",",
    quoteStrings: true,
    prettyPrint: true,
  });

  // Get tables from connection
  const tables = useMemo(() => {
    if (!sdk.connection.isConnected) return [];
    return sdk.connection.tables.map((t) => ({
      schema: t.schema,
      name: t.name,
      fullName: `${t.schema}.${t.name}`,
    }));
  }, [sdk.connection.isConnected, sdk.connection.tables]);

  // Load data from selected table
  const loadTableData = useCallback(async () => {
    if (!selectedTable || !sdk.connection.isConnected) return;

    const [schema, tableName] = selectedTable.split(".");
    if (!schema || !tableName) return;

    setIsLoading(true);
    try {
      const result = await sdk.api.getTableData(schema, tableName, 1000, 0);
      if (result) {
        setTableData({
          columns: result.columns,
          rows: result.rows,
          rowCount: result.row_count,
        });
        setColumns(result.columns.map((name) => ({ name, selected: true })));
        setOptions((prev) => ({ ...prev, tableName: selectedTable }));
        sdk.utils.toast.success(`Loaded ${result.row_count} rows from ${tableName}`);
      }
    } catch (error) {
      sdk.utils.toast.error(`Failed to load data: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTable, sdk]);

  // Load data when table changes
  useEffect(() => {
    if (selectedTable) {
      loadTableData();
    }
  }, [selectedTable, loadTableData]);

  // Generate export content
  const exportContent = useMemo(() => {
    if (!tableData || columns.length === 0) return "";
    return exportData(tableData, columns, options);
  }, [tableData, columns, options]);

  // Toggle column selection
  const toggleColumn = useCallback((name: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.name === name ? { ...col, selected: !col.selected } : col
      )
    );
  }, []);

  // Select/deselect all columns
  const toggleAllColumns = useCallback((selected: boolean) => {
    setColumns((prev) => prev.map((col) => ({ ...col, selected })));
  }, []);

  // Copy to clipboard
  const copyToClipboard = useCallback(async () => {
    if (!exportContent) {
      sdk.utils.toast.error("No data to copy");
      return;
    }

    const success = await sdk.utils.clipboard.copy(exportContent);
    if (success) {
      setCopied(true);
      sdk.utils.toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } else {
      sdk.utils.toast.error("Failed to copy to clipboard");
    }
  }, [exportContent, sdk.utils.clipboard, sdk.utils.toast]);

  // Download file
  const downloadFile = useCallback(() => {
    if (!exportContent) {
      sdk.utils.toast.error("No data to download");
      return;
    }

    const formatInfo = FORMAT_INFO[options.format];
    const blob = new Blob([exportContent], { type: formatInfo.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${options.tableName.replace(/\./g, "_")}${formatInfo.extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    sdk.utils.toast.success(`Downloaded ${a.download}`);
  }, [exportContent, options.format, options.tableName, sdk.utils.toast]);

  const selectedColumnCount = columns.filter((c) => c.selected).length;
  const FormatIcon = FORMAT_INFO[options.format].icon;

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <FileDown className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">
              Data Export
            </h1>
            <p className="text-xs text-muted-foreground">
              Export table data to various formats
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyToClipboard}
            disabled={!exportContent}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy
              </>
            )}
          </button>
          <button
            onClick={downloadFile}
            disabled={!exportContent}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Left Panel - Configuration */}
        <div className="w-72 border-r border-border flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-5">
              {/* Table Selector */}
              {sdk.connection.isConnected && tables.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-foreground mb-2 block">
                    Source Table
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setShowTableDropdown(!showTableDropdown)}
                      className="flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-xs hover:bg-muted transition-colors"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Database className="h-3.5 w-3.5 text-muted-foreground" />
                        {selectedTable || "Select a table..."}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>

                    {showTableDropdown && (
                      <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-48 overflow-auto rounded-md border border-border bg-popover shadow-lg">
                        {tables.map((table) => (
                          <button
                            key={table.fullName}
                            onClick={() => {
                              setSelectedTable(table.fullName);
                              setShowTableDropdown(false);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors"
                          >
                            <Table2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="truncate">{table.fullName}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedTable && (
                    <button
                      onClick={loadTableData}
                      disabled={isLoading}
                      className="mt-2 w-full flex items-center justify-center gap-1.5 h-7 rounded border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`}
                      />
                      Refresh Data
                    </button>
                  )}
                </div>
              )}

              {/* Export Format */}
              <div>
                <label className="text-xs font-medium text-foreground mb-2 block">
                  Export Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(FORMAT_INFO) as ExportFormat[]).map((format) => {
                    const info = FORMAT_INFO[format];
                    const Icon = info.icon;
                    return (
                      <button
                        key={format}
                        onClick={() =>
                          setOptions((prev) => ({ ...prev, format }))
                        }
                        className={`flex items-center gap-2 p-2 rounded-md border text-xs transition-colors ${
                          options.format === format
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {info.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Format-specific Options */}
              <div>
                <label className="text-xs font-medium text-foreground mb-2 block">
                  Options
                </label>
                <div className="space-y-2">
                  {options.format === "csv" && (
                    <>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={options.includeHeaders}
                          onChange={(e) =>
                            setOptions((prev) => ({
                              ...prev,
                              includeHeaders: e.target.checked,
                            }))
                          }
                          className="h-3.5 w-3.5 rounded border-border"
                        />
                        <span className="text-xs text-muted-foreground">
                          Include headers
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={options.quoteStrings}
                          onChange={(e) =>
                            setOptions((prev) => ({
                              ...prev,
                              quoteStrings: e.target.checked,
                            }))
                          }
                          className="h-3.5 w-3.5 rounded border-border"
                        />
                        <span className="text-xs text-muted-foreground">
                          Quote all strings
                        </span>
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground">
                          Delimiter:
                        </label>
                        <select
                          value={options.delimiter}
                          onChange={(e) =>
                            setOptions((prev) => ({
                              ...prev,
                              delimiter: e.target.value,
                            }))
                          }
                          className="h-7 rounded border border-border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          <option value=",">Comma (,)</option>
                          <option value=";">Semicolon (;)</option>
                          <option value="\t">Tab</option>
                          <option value="|">Pipe (|)</option>
                        </select>
                      </div>
                    </>
                  )}

                  {options.format === "json" && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={options.prettyPrint}
                        onChange={(e) =>
                          setOptions((prev) => ({
                            ...prev,
                            prettyPrint: e.target.checked,
                          }))
                        }
                        className="h-3.5 w-3.5 rounded border-border"
                      />
                      <span className="text-xs text-muted-foreground">
                        Pretty print (formatted)
                      </span>
                    </label>
                  )}

                  {options.format === "sql" && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">
                        Table name:
                      </label>
                      <input
                        type="text"
                        value={options.tableName}
                        onChange={(e) =>
                          setOptions((prev) => ({
                            ...prev,
                            tableName: e.target.value,
                          }))
                        }
                        className="flex-1 h-7 rounded border border-border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Column Selection */}
              {columns.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-foreground">
                      Columns ({selectedColumnCount}/{columns.length})
                    </label>
                    <div className="flex gap-1">
                      <button
                        onClick={() => toggleAllColumns(true)}
                        className="text-[10px] text-primary hover:underline"
                      >
                        All
                      </button>
                      <span className="text-[10px] text-muted-foreground">
                        /
                      </span>
                      <button
                        onClick={() => toggleAllColumns(false)}
                        className="text-[10px] text-primary hover:underline"
                      >
                        None
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1 max-h-40 overflow-auto rounded border border-border p-2">
                    {columns.map((col) => (
                      <label
                        key={col.name}
                        className="flex items-center gap-2 cursor-pointer py-0.5"
                      >
                        <input
                          type="checkbox"
                          checked={col.selected}
                          onChange={() => toggleColumn(col.name)}
                          className="h-3 w-3 rounded border-border"
                        />
                        <span className="text-xs font-mono truncate">
                          {col.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Preview */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <div className="flex items-center gap-2">
              <FormatIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                Preview ({FORMAT_INFO[options.format].label})
              </span>
            </div>
            {tableData && (
              <span className="text-xs text-muted-foreground">
                {tableData.rowCount} rows • {selectedColumnCount} columns
              </span>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            {exportContent ? (
              <pre className="p-4 text-xs font-mono text-foreground whitespace-pre-wrap break-all">
                {exportContent}
              </pre>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <FileDown className="mx-auto h-10 w-10 text-muted-foreground/30" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {sdk.connection.isConnected
                      ? "Select a table to export"
                      : "Connect to a database to export data"}
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Choose a table from the left panel
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
          Format: {FORMAT_INFO[options.format].label}
          {tableData && ` • ${tableData.rowCount} rows`}
        </span>
        <span>
          {exportContent
            ? `${exportContent.length.toLocaleString()} characters`
            : "No data loaded"}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Export as LocalPluginModule
// ============================================================================

const dataExportPlugin: LocalPluginModule = {
  plugin,
  Component,
};

export default dataExportPlugin;
