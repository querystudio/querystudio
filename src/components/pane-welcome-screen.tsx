import { memo, useMemo, useCallback } from "react";
import { Table2, Code, Terminal, ChevronRight } from "lucide-react";
import { useLayoutStore, type TabType } from "@/lib/layout-store";
import { useConnectionStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface PaneWelcomeScreenProps {
  connectionId: string;
  paneId: string;
  dbType?: string;
}

// Static plugin definitions to avoid re-renders
const STATIC_PLUGINS = [
  {
    type: "data" as TabType,
    displayName: "Data",
    icon: Table2,
    description: "Browse tables and inspect records",
  },
  {
    type: "query" as TabType,
    displayName: "Query",
    icon: Code,
    description: "Write and run SQL statements",
  },
  {
    type: "terminal" as TabType,
    displayName: "Terminal",
    icon: Terminal,
    description: "Run shell commands in-app",
  },
];

export const PaneWelcomeScreen = memo(function PaneWelcomeScreen({
  connectionId,
  paneId,
  dbType,
}: PaneWelcomeScreenProps) {
  const createTab = useLayoutStore((s) => s.createTab);
  const tables = useConnectionStore((s) => s.tables);

  const isRedis = dbType === "redis";
  const isMongoDB = dbType === "mongodb";

  // Filter plugins based on database type - use static list
  const availablePlugins = useMemo(() => {
    return STATIC_PLUGINS.filter((plugin) => {
      // Query tab not available for MongoDB
      if (plugin.type === "query" && isMongoDB) return false;
      return true;
    });
  }, [isMongoDB]);

  const handleCreateTab = useCallback(
    (type: TabType) => {
      createTab(connectionId, paneId, type, {});
    },
    [createTab, connectionId, paneId],
  );

  return (
    <div className="flex h-full w-full items-center justify-center bg-background p-6">
      <div className="w-full max-w-4xl rounded-3xl border border-border/55 bg-card/25 p-5 md:p-7">
        <div className="mb-6 space-y-2">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Quick Start
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Open Something Useful
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {isRedis
              ? "Connected to Redis. Open a console to run commands."
              : isMongoDB
                ? "Connected to MongoDB. Browse collections or add a new document."
                : "Open a data, query, or terminal tab to continue. You can also jump directly into a table below."}
          </p>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {availablePlugins.slice(0, 3).map((plugin) => {
            const Icon = plugin.icon;
            return (
              <button
                key={plugin.type}
                onClick={() => handleCreateTab(plugin.type)}
                className={cn(
                  "group flex items-start gap-3 rounded-xl border border-border/50 bg-background/45 p-4 text-left",
                  "transition-colors duration-150 hover:border-border/80 hover:bg-background/70",
                  "cursor-pointer",
                )}
              >
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/35">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    {plugin.displayName}
                  </span>
                  <span className="block text-xs text-muted-foreground">{plugin.description}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform group-hover:translate-x-0.5" />
              </button>
            );
          })}
        </div>

        {tables.length > 0 && !isRedis && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground">Recent Tables</h2>
              <span className="text-xs text-muted-foreground">{tables.length} available</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {tables.slice(0, 6).map((table) => (
                <button
                  key={`${table.schema}.${table.name}`}
                  onClick={() =>
                    createTab(connectionId, paneId, "data", {
                      tableInfo: { schema: table.schema, name: table.name },
                      title: table.name,
                    })
                  }
                  className={cn(
                    "group flex items-center justify-between rounded-lg border border-border/50 bg-background/40 px-3 py-2 text-left",
                    "text-foreground transition-colors hover:border-border/80 hover:bg-background/70",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{table.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {table.schema}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
              {tables.length > 6 && (
                <div className="flex items-center rounded-lg border border-dashed border-border/50 px-3 py-2 text-xs text-muted-foreground">
                  +{tables.length - 6} more in sidebar
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
