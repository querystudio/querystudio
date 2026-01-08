import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sidebar } from "@/components/sidebar";
import { ConnectionDialog } from "@/components/connection-dialog";
import { TableViewer } from "@/components/table-viewer";
import { QueryEditor } from "@/components/query-editor";
import { AIChat } from "@/components/ai-chat";
import { WelcomeScreen } from "@/components/welcome-screen";
import { CommandPalette } from "@/components/command-palette";
import { PasswordPromptDialog } from "@/components/password-prompt-dialog";
import { useConnectionStore, useAIQueryStore } from "@/lib/store";
import type { SavedConnection } from "@/lib/types";

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [passwordPromptConnection, setPasswordPromptConnection] = useState<SavedConnection | null>(null);
  const connection = useConnectionStore((s) => s.connection);
  
  // Active tab from store for cross-component navigation
  const activeTab = useAIQueryStore((s) => s.activeTab);
  const setActiveTab = useAIQueryStore((s) => s.setActiveTab);

  const handleSelectSavedConnection = (savedConnection: SavedConnection) => {
    // If it's a connection string, it has the password embedded, so connect directly
    if ("connection_string" in savedConnection.config) {
      setPasswordPromptConnection(savedConnection);
    } else {
      // Need password for params-based connections
      setPasswordPromptConnection(savedConnection);
    }
  };

  if (!connection) {
    return (
      <>
        <WelcomeScreen
          onNewConnection={() => setConnectionDialogOpen(true)}
          onSelectConnection={handleSelectSavedConnection}
        />
        <ConnectionDialog
          open={connectionDialogOpen}
          onOpenChange={setConnectionDialogOpen}
        />
        <CommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
          onSelectConnection={handleSelectSavedConnection}
          onNewConnection={() => setConnectionDialogOpen(true)}
        />
        <PasswordPromptDialog
          connection={passwordPromptConnection}
          open={passwordPromptConnection !== null}
          onOpenChange={(open) => !open && setPasswordPromptConnection(null)}
        />
      </>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      <Sidebar />

      <main className="flex flex-1 flex-col overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
          <div className="border-b border-zinc-800 px-4">
            <TabsList className="h-12 bg-transparent">
              <TabsTrigger
                value="data"
                className="data-[state=active]:bg-zinc-800"
              >
                Table Data
              </TabsTrigger>
              <TabsTrigger
                value="query"
                className="data-[state=active]:bg-zinc-800"
              >
                Query
              </TabsTrigger>
              <TabsTrigger
                value="ai"
                className="data-[state=active]:bg-zinc-800"
              >
                AI Assistant
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="data" className="mt-0 flex-1 overflow-hidden">
            <TableViewer />
          </TabsContent>

          <TabsContent value="query" className="mt-0 flex-1 overflow-hidden">
            <QueryEditor />
          </TabsContent>

          <TabsContent value="ai" className="mt-0 flex-1 overflow-hidden">
            <AIChat />
          </TabsContent>
        </Tabs>
      </main>

      <ConnectionDialog
        open={connectionDialogOpen}
        onOpenChange={setConnectionDialogOpen}
      />
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onSelectConnection={handleSelectSavedConnection}
        onNewConnection={() => setConnectionDialogOpen(true)}
      />
      <PasswordPromptDialog
        connection={passwordPromptConnection}
        open={passwordPromptConnection !== null}
        onOpenChange={(open) => !open && setPasswordPromptConnection(null)}
      />
    </div>
  );
}
