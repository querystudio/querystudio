import { useState } from "react";
import { Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useConnectionStore } from "@/lib/store";
import { useExecuteQuery } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type { QueryResult } from "@/lib/types";

export function QueryEditor() {
  const connection = useConnectionStore((s) => s.connection);
  const connectionId = connection?.id ?? null;
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const executeQuery = useExecuteQuery(connectionId);

  const handleExecute = async () => {
    if (!query.trim() || !connectionId) return;

    setError(null);
    setResult(null);

    try {
      const data = await executeQuery.mutateAsync(query);
      setResult(data);
    } catch (err) {
      setError(String(err));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleExecute();
    }
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  if (!connectionId) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500">
        <p>Connect to a database to run queries</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-800 p-4">
        <div className="flex gap-2">
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="SELECT * FROM users LIMIT 10;"
            className="min-h-[100px] resize-none font-mono text-sm"
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            Press Cmd+Enter (Ctrl+Enter) to execute
          </p>
          <Button
            onClick={handleExecute}
            disabled={executeQuery.isPending || !query.trim()}
            size="sm"
          >
            {executeQuery.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Execute
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {error && (
          <div className="m-4 rounded-md border border-red-900 bg-red-950/50 p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {result && (
          <ScrollArea className="h-full">
            <div className="min-w-max p-4">
              <div className="mb-2 text-sm text-zinc-400">
                {result.row_count} row{result.row_count !== 1 ? "s" : ""} returned
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    {result.columns.map((col) => (
                      <TableHead
                        key={col}
                        className="whitespace-nowrap border-r border-zinc-800 last:border-r-0"
                      >
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={result.columns.length || 1}
                        className="h-24 text-center text-zinc-500"
                      >
                        No results
                      </TableCell>
                    </TableRow>
                  ) : (
                    result.rows.map((row, i) => (
                      <TableRow
                        key={i}
                        className="border-zinc-800 hover:bg-zinc-900/50"
                      >
                        {row.map((cell, j) => {
                          const isNull = cell === null;
                          return (
                            <TableCell
                              key={j}
                              className={cn(
                                "max-w-xs truncate border-r border-zinc-800 font-mono text-xs last:border-r-0",
                                isNull && "text-zinc-600 italic"
                              )}
                              title={formatValue(cell)}
                            >
                              {formatValue(cell)}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}

        {!error && !result && (
          <div className="flex h-full items-center justify-center text-zinc-500">
            <p>Execute a query to see results</p>
          </div>
        )}
      </div>
    </div>
  );
}
