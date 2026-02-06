import { useState, useEffect, useCallback, memo, useMemo } from "react";
import { Table, LogOut, ChevronRight, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { useConnectionStore, useAIQueryStore } from "@/lib/store";
import { useLayoutStore } from "@/lib/layout-store";
import { useShallow } from "zustand/react/shallow";
import { useTables, useDisconnect } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type { DatabaseType } from "@/lib/types";

const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 400;

export function DatabaseIcon({ type, className }: { type: DatabaseType; className?: string }) {
  if (type === "mysql") {
    return (
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded bg-orange-500/20 text-xs font-bold text-orange-500",
          className,
        )}
      >
        M
      </span>
    );
  }

  if (type === "sqlite") {
    return (
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded bg-cyan-500/20 text-xs font-bold text-cyan-500",
          className,
        )}
      >
        S
      </span>
    );
  }

  if (type === "redis") {
    return (
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded bg-red-500/20 text-xs font-bold text-red-500",
          className,
        )}
      >
        R
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded bg-blue-500/20 text-xs font-bold text-blue-500",
        className,
      )}
    >
      P
    </span>
  );
}

export const Sidebar = memo(function Sidebar() {
  // Get active connection
  const activeConnectionId = useConnectionStore((s) => s.activeConnectionId);
  const getActiveConnection = useConnectionStore((s) => s.getActiveConnection);
  const connection = getActiveConnection();

  // Use shallow comparison to minimize re-renders
  const { tables, selectedTable } = useConnectionStore(
    useShallow((s) => ({
      tables: s.tables,
      selectedTable: s.selectedTable,
    })),
  );
  const setTables = useConnectionStore((s) => s.setTables);

  // Layout store for multi-tab support
  const openDataTab = useLayoutStore((s) => s.openDataTab);

  // Sidebar state from store - use shallow comparison
  const { sidebarWidth, sidebarCollapsed } = useAIQueryStore(
    useShallow((s) => ({
      sidebarWidth: s.sidebarWidth,
      sidebarCollapsed: s.sidebarCollapsed,
    })),
  );
  const setSidebarWidth = useAIQueryStore((s) => s.setSidebarWidth);

  const [isResizing, setIsResizing] = useState(false);
  const [tableSearch, setTableSearch] = useState("");

  const { data: fetchedTables } = useTables(activeConnectionId);
  const disconnect = useDisconnect(activeConnectionId ?? undefined);

  useEffect(() => {
    if (fetchedTables && fetchedTables !== tables) {
      setTables(fetchedTables);
    }
  }, [fetchedTables, tables, setTables]);

  // Handle resize drag
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const newWidth = e.clientX;
      setSidebarWidth(Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, setSidebarWidth]);

  const groupedTables = useMemo(() => {
    const query = tableSearch.trim().toLowerCase();
    const filteredTables = query
      ? tables.filter((table) => `${table.schema}.${table.name}`.toLowerCase().includes(query))
      : tables;

    const grouped = filteredTables.reduce(
      (acc, table) => {
        if (!acc[table.schema]) {
          acc[table.schema] = [];
        }
        acc[table.schema].push(table);
        return acc;
      },
      {} as Record<string, typeof tables>,
    );

    for (const schemaTables of Object.values(grouped)) {
      schemaTables.sort((a, b) => a.name.localeCompare(b.name));
    }

    return Object.entries(grouped).sort(([schemaA], [schemaB]) => {
      if (schemaA === "public") return -1;
      if (schemaB === "public") return 1;
      return schemaA.localeCompare(schemaB);
    });
  }, [tableSearch, tables]);

  const groupedTableCount = groupedTables.reduce(
    (count, [, schemaTables]) => count + schemaTables.length,
    0,
  );

  if (!connection) return null;

  // Collapsed state - show minimal sidebar
  if (sidebarCollapsed) {
    return (
      <motion.div
        initial={{ width: sidebarWidth, opacity: 1 }}
        animate={{ width: 48, opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="flex h-full flex-col border-r border-border bg-card shrink-0"
      >
        {/* Collapsed header */}
        <div className="flex flex-col items-center border-b border-border p-2 gap-2">
          <DatabaseIcon type={connection.db_type || "postgres"} />
        </div>

        {/* Collapsed table list - just icons */}
        <ScrollArea className="flex-1">
          <div className="flex flex-col items-center p-2 gap-1">
            {tables.slice(0, 10).map((table) => (
              <Button
                key={`${table.schema}.${table.name}`}
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7",
                  selectedTable?.schema === table.schema &&
                    selectedTable?.name === table.name &&
                    "bg-secondary",
                )}
                onClick={() => {
                  if (connection?.id) {
                    openDataTab(connection.id, table.schema, table.name);
                  }
                }}
                title={`${table.schema}.${table.name}`}
              >
                <Table className="h-3 w-3" />
              </Button>
            ))}
            {tables.length > 10 && (
              <span className="text-[10px] text-muted-foreground">+{tables.length - 10}</span>
            )}
          </div>
        </ScrollArea>

        {/* Disconnect button */}
        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => disconnect.mutate()}
            title="Disconnect"
          >
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1, width: sidebarWidth }}
        transition={isResizing ? { duration: 0 } : { duration: 0.2, ease: "easeInOut" }}
        className="relative flex h-full flex-col border-r border-border bg-card shrink-0"
        style={{ width: sidebarWidth }}
      >
        {/* Resize Handle */}
        <div
          onMouseDown={handleResizeStart}
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/30 active:bg-primary/40 z-10"
        />

        {/* Header */}
        <div className="border-b border-border/70 p-2.5">
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-card/80 px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden">
              <DatabaseIcon type={connection.db_type || "postgres"} className="h-8 w-8 text-sm" />
              <div className="min-w-0 overflow-hidden">
                <p className="truncate text-sm font-semibold text-foreground">{connection.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {connection.db_type === "mysql"
                    ? "MySQL"
                    : connection.db_type === "sqlite"
                      ? "SQLite"
                      : connection.db_type === "redis"
                        ? "Redis"
                        : "PostgreSQL"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg border border-transparent text-muted-foreground transition-colors hover:border-border/70 hover:bg-muted/50 hover:text-foreground"
              onClick={() => disconnect.mutate()}
              title="Disconnect"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-2 space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Schemas
              </span>
              <span className="rounded-md border border-border/60 bg-background/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {tables.length}
              </span>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/80" />
              <Input
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search tables..."
                className="h-8 rounded-lg border-border/60 bg-background/35 pl-7 text-xs shadow-none focus-visible:ring-1"
              />
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 overflow-hidden">
          <div className="space-y-1.5 p-2">
            <AnimatePresence>
              {groupedTables.map(([schema, schemaTables], schemaIdx) => (
                <motion.div
                  key={schema}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: schemaIdx * 0.05 }}
                >
                  <Collapsible defaultOpen={schema === "public"}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-full justify-start gap-2 rounded-lg px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground data-[state=open]:bg-muted/30 data-[state=open]:text-foreground"
                      >
                        <ChevronRight className="h-3 w-3 transition-transform duration-200 [[data-state=open]>&]:rotate-90" />
                        <span className="truncate">{schema}</span>
                        <span className="ml-auto rounded-md border border-border/60 bg-background/45 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {schemaTables.length}
                        </span>
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-0.5 space-y-0.5 pl-2">
                        {schemaTables.map((table, tableIdx) => (
                          <motion.div
                            key={`${table.schema}.${table.name}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                              duration: 0.15,
                              delay: tableIdx * 0.02,
                            }}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-8 w-full justify-start gap-2 rounded-lg border border-transparent px-2 text-xs transition-colors duration-150 hover:bg-muted/45 hover:text-foreground",
                                selectedTable?.schema === table.schema &&
                                  selectedTable?.name === table.name &&
                                  "border-primary/30 bg-primary/10 text-foreground",
                              )}
                              onClick={() => {
                                if (connection?.id) {
                                  openDataTab(connection.id, table.schema, table.name);
                                }
                              }}
                              title={`${table.schema}.${table.name}`}
                            >
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted/50 text-muted-foreground">
                                <Table className="h-3 w-3" />
                              </span>
                              <span className="truncate">{table.name}</span>
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </motion.div>
              ))}
            </AnimatePresence>

            {groupedTableCount === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-8 text-center"
              >
                <Table className="mx-auto mb-2 h-8 w-8 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">
                  {tables.length === 0 ? "No tables found" : "No tables match your search"}
                </p>
              </motion.div>
            )}
          </div>
        </ScrollArea>
      </motion.div>
    </>
  );
});
