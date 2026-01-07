import { Database, Plus, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSavedConnections } from "@/lib/hooks";
import type { SavedConnection } from "@/lib/types";

interface WelcomeScreenProps {
  onNewConnection: () => void;
  onSelectConnection: (connection: SavedConnection) => void;
}

export function WelcomeScreen({ onNewConnection, onSelectConnection }: WelcomeScreenProps) {
  const { data: savedConnections, isLoading } = useSavedConnections();

  const getConnectionDescription = (connection: SavedConnection) => {
    if ("connection_string" in connection.config) {
      return "Connection string";
    }
    return `${connection.config.host}:${connection.config.port}/${connection.config.database}`;
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-zinc-950">
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-900">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
            <Database className="h-8 w-8 text-zinc-300" />
          </div>
          <CardTitle className="text-2xl text-zinc-100">QueryStudio</CardTitle>
          <CardDescription className="text-zinc-400">
            A modern PostgreSQL client for exploring and querying your databases
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Saved Connections */}
          {!isLoading && savedConnections && savedConnections.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Saved Connections
              </p>
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {savedConnections.map((connection) => (
                  <button
                    key={connection.id}
                    onClick={() => onSelectConnection(connection)}
                    className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-zinc-800 transition-colors"
                  >
                    <Server className="h-4 w-4 text-zinc-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">
                        {connection.name}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">
                        {getConnectionDescription(connection)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-zinc-900 px-2 text-zinc-500">or</span>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={onNewConnection}
            className="w-full"
            size="lg"
            variant={savedConnections && savedConnections.length > 0 ? "outline" : "default"}
          >
            <Plus className="mr-2 h-5 w-5" />
            New Connection
          </Button>
          <p className="text-center text-xs text-zinc-500">
            {savedConnections && savedConnections.length > 0 
              ? "Press ⌘K to quickly switch connections"
              : "Connect to a PostgreSQL database to get started"
            }
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
