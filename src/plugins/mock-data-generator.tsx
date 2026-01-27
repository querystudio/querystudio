// ============================================================================
// Mock Data Generator Plugin
// ============================================================================
//
// A plugin that generates realistic mock/fake data for database tables.
// Uses Faker.js to generate various types of data.
//
// Features:
// - Generate mock data for any table
// - Support for many data types (names, emails, dates, UUIDs, etc.)
// - Customizable row count
// - Preview generated data before inserting
// - Copy as SQL INSERT statements
// - Direct integration with connected database tables
//
// ============================================================================

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Sparkles,
  Play,
  Copy,
  RefreshCw,
  Check,
  Table2,
  Plus,
  Trash2,
  Database,
  ChevronDown,
} from "lucide-react";
import { faker } from "@faker-js/faker";
import type { TabPluginRegistration, TabContentProps } from "@/lib/tab-sdk";
import type { LocalPluginModule } from "@/lib/local-plugins";
import { usePluginSDK } from "@/lib/plugin-sdk";
import { ScrollArea } from "@/components/ui/scroll-area";

// ============================================================================
// Types
// ============================================================================

type DataType =
  | "uuid"
  | "firstName"
  | "lastName"
  | "fullName"
  | "email"
  | "phone"
  | "username"
  | "password"
  | "avatar"
  | "streetAddress"
  | "city"
  | "state"
  | "zipCode"
  | "country"
  | "latitude"
  | "longitude"
  | "date"
  | "pastDate"
  | "futureDate"
  | "birthdate"
  | "boolean"
  | "integer"
  | "float"
  | "price"
  | "companyName"
  | "jobTitle"
  | "department"
  | "productName"
  | "productDescription"
  | "color"
  | "url"
  | "ipv4"
  | "ipv6"
  | "macAddress"
  | "creditCard"
  | "iban"
  | "word"
  | "sentence"
  | "paragraph"
  | "json"
  | "null"
  | "autoIncrement";

interface ColumnConfig {
  id: string;
  name: string;
  dataType: DataType;
  options?: {
    min?: number;
    max?: number;
    precision?: number;
  };
}

interface GeneratedRow {
  [key: string]: unknown;
}

// ============================================================================
// Constants
// ============================================================================

const DATA_TYPES: { value: DataType; label: string; category: string }[] = [
  // IDs
  { value: "uuid", label: "UUID", category: "Identifiers" },
  { value: "autoIncrement", label: "Auto Increment", category: "Identifiers" },

  // Person
  { value: "firstName", label: "First Name", category: "Person" },
  { value: "lastName", label: "Last Name", category: "Person" },
  { value: "fullName", label: "Full Name", category: "Person" },
  { value: "email", label: "Email", category: "Person" },
  { value: "phone", label: "Phone", category: "Person" },
  { value: "username", label: "Username", category: "Person" },
  { value: "password", label: "Password", category: "Person" },
  { value: "avatar", label: "Avatar URL", category: "Person" },
  { value: "birthdate", label: "Birthdate", category: "Person" },
  { value: "jobTitle", label: "Job Title", category: "Person" },

  // Location
  { value: "streetAddress", label: "Street Address", category: "Location" },
  { value: "city", label: "City", category: "Location" },
  { value: "state", label: "State", category: "Location" },
  { value: "zipCode", label: "Zip Code", category: "Location" },
  { value: "country", label: "Country", category: "Location" },
  { value: "latitude", label: "Latitude", category: "Location" },
  { value: "longitude", label: "Longitude", category: "Location" },

  // Date & Time
  { value: "date", label: "Date", category: "Date & Time" },
  { value: "pastDate", label: "Past Date", category: "Date & Time" },
  { value: "futureDate", label: "Future Date", category: "Date & Time" },

  // Numbers
  { value: "integer", label: "Integer", category: "Numbers" },
  { value: "float", label: "Float", category: "Numbers" },
  { value: "price", label: "Price", category: "Numbers" },
  { value: "boolean", label: "Boolean", category: "Numbers" },

  // Business
  { value: "companyName", label: "Company Name", category: "Business" },
  { value: "department", label: "Department", category: "Business" },
  { value: "productName", label: "Product Name", category: "Business" },
  {
    value: "productDescription",
    label: "Product Description",
    category: "Business",
  },

  // Internet
  { value: "url", label: "URL", category: "Internet" },
  { value: "ipv4", label: "IPv4 Address", category: "Internet" },
  { value: "ipv6", label: "IPv6 Address", category: "Internet" },
  { value: "macAddress", label: "MAC Address", category: "Internet" },
  { value: "color", label: "Hex Color", category: "Internet" },

  // Finance
  { value: "creditCard", label: "Credit Card", category: "Finance" },
  { value: "iban", label: "IBAN", category: "Finance" },

  // Text
  { value: "word", label: "Word", category: "Text" },
  { value: "sentence", label: "Sentence", category: "Text" },
  { value: "paragraph", label: "Paragraph", category: "Text" },

  // Other
  { value: "json", label: "JSON Object", category: "Other" },
  { value: "null", label: "NULL", category: "Other" },
];

const GROUPED_DATA_TYPES = DATA_TYPES.reduce(
  (acc, type) => {
    if (!acc[type.category]) {
      acc[type.category] = [];
    }
    acc[type.category].push(type);
    return acc;
  },
  {} as Record<string, typeof DATA_TYPES>,
);

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: "1", name: "id", dataType: "uuid" },
  { id: "2", name: "name", dataType: "fullName" },
  { id: "3", name: "email", dataType: "email" },
  { id: "4", name: "created_at", dataType: "pastDate" },
];

// ============================================================================
// Data Generation Function
// ============================================================================

let autoIncrementCounter = 0;

function generateValue(
  dataType: DataType,
  options?: ColumnConfig["options"],
): unknown {
  const min = options?.min ?? 0;
  const max = options?.max ?? 1000;

  switch (dataType) {
    // Identifiers
    case "uuid":
      return faker.string.uuid();
    case "autoIncrement":
      return ++autoIncrementCounter;

    // Person
    case "firstName":
      return faker.person.firstName();
    case "lastName":
      return faker.person.lastName();
    case "fullName":
      return faker.person.fullName();
    case "email":
      return faker.internet.email();
    case "phone":
      return faker.phone.number();
    case "username":
      return faker.internet.username();
    case "password":
      return faker.internet.password();
    case "avatar":
      return faker.image.avatar();
    case "birthdate":
      return faker.date.birthdate().toISOString().split("T")[0];
    case "jobTitle":
      return faker.person.jobTitle();

    // Location
    case "streetAddress":
      return faker.location.streetAddress();
    case "city":
      return faker.location.city();
    case "state":
      return faker.location.state();
    case "zipCode":
      return faker.location.zipCode();
    case "country":
      return faker.location.country();
    case "latitude":
      return faker.location.latitude();
    case "longitude":
      return faker.location.longitude();

    // Date & Time
    case "date":
      return faker.date.recent().toISOString().split("T")[0];
    case "pastDate":
      return faker.date.past().toISOString().split("T")[0];
    case "futureDate":
      return faker.date.future().toISOString().split("T")[0];

    // Numbers
    case "integer":
      return faker.number.int({ min, max });
    case "float":
      return faker.number.float({
        min,
        max,
        fractionDigits: options?.precision ?? 2,
      });
    case "price":
      return faker.commerce.price({ min, max });
    case "boolean":
      return faker.datatype.boolean();

    // Business
    case "companyName":
      return faker.company.name();
    case "department":
      return faker.commerce.department();
    case "productName":
      return faker.commerce.productName();
    case "productDescription":
      return faker.commerce.productDescription();

    // Internet
    case "url":
      return faker.internet.url();
    case "ipv4":
      return faker.internet.ipv4();
    case "ipv6":
      return faker.internet.ipv6();
    case "macAddress":
      return faker.internet.mac();
    case "color":
      return faker.color.rgb();

    // Finance
    case "creditCard":
      return faker.finance.creditCardNumber();
    case "iban":
      return faker.finance.iban();

    // Text
    case "word":
      return faker.lorem.word();
    case "sentence":
      return faker.lorem.sentence();
    case "paragraph":
      return faker.lorem.paragraph();

    // Other
    case "json":
      return JSON.stringify({
        key: faker.lorem.word(),
        value: faker.number.int({ min: 1, max: 100 }),
      });
    case "null":
      return null;

    default:
      return null;
  }
}

// ============================================================================
// Plugin Definition
// ============================================================================

export const plugin: TabPluginRegistration = {
  type: "mock-data-generator",
  displayName: "Mock Data Generator",
  icon: Sparkles,
  getDefaultTitle: (index) => `Mock Data ${index}`,
  canCreate: true,
  allowMultiple: true,
  priority: 35,
  experimental: false,
  lifecycle: {
    onCreate: (tabId, metadata) => {
      console.log(`[MockDataGenerator] Created: ${tabId}`, metadata);
    },
    onClose: (tabId) => {
      console.log(`[MockDataGenerator] Closed: ${tabId}`);
    },
  },
};

// ============================================================================
// Tab Component
// ============================================================================

export function Component({ tabId, paneId, connectionId }: TabContentProps) {
  const sdk = usePluginSDK(connectionId, tabId, paneId);

  // State
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [rowCount, setRowCount] = useState(10);
  const [generatedData, setGeneratedData] = useState<GeneratedRow[]>([]);
  const [copied, setCopied] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [showTableDropdown, setShowTableDropdown] = useState(false);

  // Get tables from connection
  const tables = useMemo(() => {
    if (!sdk.connection.isConnected) return [];
    return sdk.connection.tables.map((t) => ({
      schema: t.schema,
      name: t.name,
      fullName: `${t.schema}.${t.name}`,
    }));
  }, [sdk.connection.isConnected, sdk.connection.tables]);

  // Load columns from selected table
  useEffect(() => {
    const loadTableColumns = async () => {
      if (!selectedTable || !sdk.connection.isConnected) return;

      const [schema, tableName] = selectedTable.split(".");
      if (!schema || !tableName) return;

      try {
        const tableColumns = await sdk.api.getTableColumns(schema, tableName);
        if (tableColumns && tableColumns.length > 0) {
          const newColumns: ColumnConfig[] = tableColumns.map((col, index) => {
            // Try to guess the data type based on column name
            let dataType: DataType = "word";
            const colName = col.name.toLowerCase();

            if (colName === "id" || colName.endsWith("_id")) {
              dataType = "uuid";
            } else if (colName.includes("email")) {
              dataType = "email";
            } else if (colName.includes("name") && colName.includes("first")) {
              dataType = "firstName";
            } else if (colName.includes("name") && colName.includes("last")) {
              dataType = "lastName";
            } else if (
              colName.includes("name") ||
              colName.includes("full_name")
            ) {
              dataType = "fullName";
            } else if (colName.includes("phone")) {
              dataType = "phone";
            } else if (colName.includes("address")) {
              dataType = "streetAddress";
            } else if (colName.includes("city")) {
              dataType = "city";
            } else if (colName.includes("state")) {
              dataType = "state";
            } else if (colName.includes("zip") || colName.includes("postal")) {
              dataType = "zipCode";
            } else if (colName.includes("country")) {
              dataType = "country";
            } else if (
              colName.includes("created") ||
              colName.includes("updated") ||
              colName.includes("date")
            ) {
              dataType = "pastDate";
            } else if (colName.includes("birth")) {
              dataType = "birthdate";
            } else if (
              colName.includes("price") ||
              colName.includes("amount")
            ) {
              dataType = "price";
            } else if (
              colName.includes("active") ||
              colName.includes("enabled") ||
              colName.includes("is_")
            ) {
              dataType = "boolean";
            } else if (colName.includes("url") || colName.includes("link")) {
              dataType = "url";
            } else if (colName.includes("description")) {
              dataType = "sentence";
            } else if (colName.includes("company")) {
              dataType = "companyName";
            } else if (colName.includes("username")) {
              dataType = "username";
            } else if (colName.includes("password")) {
              dataType = "password";
            } else if (
              colName.includes("avatar") ||
              colName.includes("image")
            ) {
              dataType = "avatar";
            } else if (colName.includes("title") && colName.includes("job")) {
              dataType = "jobTitle";
            }

            return {
              id: `${index + 1}`,
              name: col.name,
              dataType,
            };
          });

          setColumns(newColumns);
          setGeneratedData([]);
          sdk.utils.toast.success(
            `Loaded ${tableColumns.length} columns from ${tableName}`,
          );
        }
      } catch (error) {
        sdk.utils.toast.error(`Failed to load columns: ${error}`);
      }
    };

    loadTableColumns();
  }, [selectedTable, sdk]);

  // Generate data
  const generateData = useCallback(() => {
    autoIncrementCounter = 0;
    const data: GeneratedRow[] = [];

    for (let i = 0; i < rowCount; i++) {
      const row: GeneratedRow = {};
      for (const col of columns) {
        row[col.name] = generateValue(col.dataType, col.options);
      }
      data.push(row);
    }

    setGeneratedData(data);
    sdk.utils.toast.success(`Generated ${rowCount} rows`);
  }, [columns, rowCount, sdk.utils.toast]);

  // Add column
  const addColumn = useCallback(() => {
    const newId = `${Date.now()}`;
    setColumns((prev) => [
      ...prev,
      { id: newId, name: `column_${prev.length + 1}`, dataType: "word" },
    ]);
  }, []);

  // Remove column
  const removeColumn = useCallback((id: string) => {
    setColumns((prev) => prev.filter((col) => col.id !== id));
  }, []);

  // Update column
  const updateColumn = useCallback(
    (id: string, updates: Partial<ColumnConfig>) => {
      setColumns((prev) =>
        prev.map((col) => (col.id === id ? { ...col, ...updates } : col)),
      );
    },
    [],
  );

  // Generate SQL INSERT statements
  const generateInsertSql = useCallback(() => {
    if (generatedData.length === 0 || columns.length === 0) return "";

    const tableName = selectedTable || "table_name";
    const columnNames = columns.map((c) => `"${c.name}"`).join(", ");

    const values = generatedData
      .map((row) => {
        const rowValues = columns
          .map((col) => {
            const value = row[col.name];
            if (value === null) return "NULL";
            if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
            if (typeof value === "number") return value.toString();
            return `'${String(value).replace(/'/g, "''")}'`;
          })
          .join(", ");
        return `(${rowValues})`;
      })
      .join(",\n  ");

    return `INSERT INTO ${tableName} (${columnNames})\nVALUES\n  ${values};`;
  }, [generatedData, columns, selectedTable]);

  // Copy SQL to clipboard
  const copySqlToClipboard = useCallback(async () => {
    const sql = generateInsertSql();
    if (!sql) {
      sdk.utils.toast.error("No data to copy");
      return;
    }

    const success = await sdk.utils.clipboard.copy(sql);
    if (success) {
      setCopied(true);
      sdk.utils.toast.success("SQL copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } else {
      sdk.utils.toast.error("Failed to copy to clipboard");
    }
  }, [generateInsertSql, sdk.utils.clipboard, sdk.utils.toast]);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">
              Mock Data Generator
            </h1>
            <p className="text-xs text-muted-foreground">
              Generate realistic fake data for testing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Row Count */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Rows:</label>
            <input
              type="number"
              min="1"
              max="1000"
              value={rowCount}
              onChange={(e) =>
                setRowCount(
                  Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)),
                )
              }
              className="h-8 w-20 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={generateData}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Play className="h-3.5 w-3.5" />
            Generate
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Left Panel - Column Configuration */}
        <div className="w-80 border-r border-border flex flex-col">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">
              Columns ({columns.length})
            </span>
            <button
              onClick={addColumn}
              className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
          </div>

          {/* Table Selector */}
          {sdk.connection.isConnected && tables.length > 0 && (
            <div className="border-b border-border px-3 py-2">
              <div className="relative">
                <button
                  onClick={() => setShowTableDropdown(!showTableDropdown)}
                  className="flex w-full items-center justify-between rounded-md border border-border bg-muted/50 px-2 py-1.5 text-xs hover:bg-muted transition-colors"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Database className="h-3 w-3 text-muted-foreground" />
                    {selectedTable || "Load from table..."}
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
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
                        className="flex w-full items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted transition-colors"
                      >
                        <Table2 className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate">{table.fullName}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Column List */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {columns.map((col) => (
                <div
                  key={col.id}
                  className="rounded-lg border border-border bg-card p-2 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={col.name}
                      onChange={(e) =>
                        updateColumn(col.id, { name: e.target.value })
                      }
                      placeholder="Column name"
                      className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <button
                      onClick={() => removeColumn(col.id)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <select
                    value={col.dataType}
                    onChange={(e) =>
                      updateColumn(col.id, {
                        dataType: e.target.value as DataType,
                      })
                    }
                    className="w-full rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {Object.entries(GROUPED_DATA_TYPES).map(
                      ([category, types]) => (
                        <optgroup key={category} label={category}>
                          {types.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </optgroup>
                      ),
                    )}
                  </select>
                </div>
              ))}

              {columns.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-xs text-muted-foreground">
                    No columns defined. Click "Add" to create one.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Preview */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">
              Preview{" "}
              {generatedData.length > 0 && `(${generatedData.length} rows)`}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={generateData}
                disabled={columns.length === 0}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                <RefreshCw className="h-3 w-3" />
                Regenerate
              </button>
              <button
                onClick={copySqlToClipboard}
                disabled={generatedData.length === 0}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-green-500" />
                    <span className="text-green-500">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy SQL
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Data Table */}
          <div className="flex-1 min-h-0 overflow-auto">
            {generatedData.length > 0 ? (
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground border-b border-border">
                      #
                    </th>
                    {columns.map((col) => (
                      <th
                        key={col.id}
                        className="px-3 py-2 text-left font-medium text-muted-foreground border-b border-border"
                      >
                        {col.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {generatedData.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-border hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-3 py-2 text-muted-foreground">
                        {i + 1}
                      </td>
                      {columns.map((col) => (
                        <td
                          key={col.id}
                          className="px-3 py-2 font-mono max-w-50 truncate"
                          title={String(row[col.name] ?? "")}
                        >
                          {row[col.name] === null ? (
                            <span className="text-muted-foreground italic">
                              NULL
                            </span>
                          ) : typeof row[col.name] === "boolean" ? (
                            <span
                              className={
                                row[col.name]
                                  ? "text-green-500"
                                  : "text-red-500"
                              }
                            >
                              {String(row[col.name])}
                            </span>
                          ) : (
                            String(row[col.name])
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <Sparkles className="mx-auto h-10 w-10 text-muted-foreground/30" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Click "Generate" to create mock data
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Configure columns on the left, then generate
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
          {columns.length} columns configured
          {selectedTable && ` • Table: ${selectedTable}`}
        </span>
        <span>
          {generatedData.length > 0
            ? `${generatedData.length} rows generated`
            : "Ready to generate"}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Export as LocalPluginModule
// ============================================================================

const mockDataGeneratorPlugin: LocalPluginModule = {
  plugin,
  Component,
};

export default mockDataGeneratorPlugin;
