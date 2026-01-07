import { Database, Table, LogOut, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useConnectionStore } from "@/lib/store";
import { useTables, useDisconnect } from "@/lib/hooks";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const connection = useConnectionStore((s) => s.connection);
  const tables = useConnectionStore((s) => s.tables);
  const setTables = useConnectionStore((s) => s.setTables);
  const selectedTable = useConnectionStore((s) => s.selectedTable);
  const setSelectedTable = useConnectionStore((s) => s.setSelectedTable);

  const { data: fetchedTables } = useTables(connection?.id ?? null);
  const disconnect = useDisconnect();

  if (fetchedTables && fetchedTables !== tables) {
    setTables(fetchedTables);
  }

  const groupedTables = tables.reduce(
    (acc, table) => {
      if (!acc[table.schema]) {
        acc[table.schema] = [];
      }
      acc[table.schema].push(table);
      return acc;
    },
    {} as Record<string, typeof tables>
  );

  if (!connection) return null;

  return (
    <div className="flex h-full w-64 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-800 p-3">
        <div className="flex items-center gap-2 overflow-hidden">
          <Database className="h-5 w-5 shrink-0 text-zinc-400" />
          <span className="truncate text-sm font-medium text-zinc-200">
            {connection.name}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => disconnect.mutate()}
          title="Disconnect"
        >
          <LogOut className="h-4 w-4 text-zinc-500" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {Object.entries(groupedTables).map(([schema, schemaTables]) => (
            <Collapsible key={schema} defaultOpen={schema === "public"}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 text-xs text-zinc-400"
                >
                  <ChevronRight className="h-3 w-3" />
                  {schema}
                  <span className="ml-auto text-zinc-600">
                    {schemaTables.length}
                  </span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="ml-3 border-l border-zinc-800 pl-2">
                  {schemaTables.map((table) => (
                    <Button
                      key={`${table.schema}.${table.name}`}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "w-full justify-start gap-2 text-xs",
                        selectedTable?.schema === table.schema &&
                          selectedTable?.name === table.name &&
                          "bg-zinc-800"
                      )}
                      onClick={() =>
                        setSelectedTable({
                          schema: table.schema,
                          name: table.name,
                        })
                      }
                    >
                      <Table className="h-3 w-3" />
                      <span className="truncate">{table.name}</span>
                    </Button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}

          {tables.length === 0 && (
            <div className="py-8 text-center">
              <Table className="mx-auto mb-2 h-8 w-8 text-zinc-600" />
              <p className="text-sm text-zinc-500">No tables found</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
