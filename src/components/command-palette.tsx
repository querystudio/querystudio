import { useEffect, useState } from "react";
import { Database, Plus, Trash2 } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useSavedConnections, useDeleteSavedConnection } from "@/lib/hooks";
import type { SavedConnection } from "@/lib/types";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectConnection: (connection: SavedConnection) => void;
  onNewConnection: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  onSelectConnection,
  onNewConnection,
}: CommandPaletteProps) {
  const { data: savedConnections } = useSavedConnections();
  const deleteConnection = useDeleteSavedConnection();
  const [search, setSearch] = useState("");

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const handleSelect = (connection: SavedConnection) => {
    onOpenChange(false);
    setSearch("");
    onSelectConnection(connection);
  };

  const handleNewConnection = () => {
    onOpenChange(false);
    setSearch("");
    onNewConnection();
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteConnection.mutate(id);
  };

  const getConnectionDescription = (connection: SavedConnection) => {
    if ("connection_string" in connection.config) {
      return "Connection string";
    }
    return `${connection.config.host}:${connection.config.port}/${connection.config.database}`;
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search connections..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No connections found.</CommandEmpty>

        {savedConnections && savedConnections.length > 0 && (
          <CommandGroup heading="Saved Connections">
            {savedConnections.map((connection) => (
              <CommandItem
                key={connection.id}
                value={connection.name}
                onSelect={() => handleSelect(connection)}
                className="group"
              >
                <Database className="h-4 w-4" />
                <div className="flex flex-1 flex-col">
                  <span>{connection.name}</span>
                  <span className="text-xs text-zinc-500">
                    {getConnectionDescription(connection)}
                  </span>
                </div>
                <button
                  onClick={(e) => handleDelete(e, connection.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-700 rounded"
                >
                  <Trash2 className="h-3 w-3 text-zinc-500" />
                </button>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem onSelect={handleNewConnection}>
            <Plus className="h-4 w-4" />
            <span>New Connection</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
