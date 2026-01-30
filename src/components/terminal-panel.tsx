import { useCallback, useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { X, Plus, ChevronDown, ChevronUp, GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Terminal } from "./terminal";
import { useTerminalStore, type TerminalInstance } from "@/lib/terminal-store";

const MIN_HEIGHT = 100;
const MAX_HEIGHT = 600;
const DEFAULT_HEIGHT = 256;

export function TerminalPanel() {
  const terminals = useTerminalStore((s) => s.terminals);
  const activeTerminalId = useTerminalStore((s) => s.activeTerminalId);
  const isTerminalPanelOpen = useTerminalStore((s) => s.isTerminalPanelOpen);
  const addTerminal = useTerminalStore((s) => s.addTerminal);
  const removeTerminal = useTerminalStore((s) => s.removeTerminal);
  const setActiveTerminal = useTerminalStore((s) => s.setActiveTerminal);
  const toggleTerminalPanel = useTerminalStore((s) => s.toggleTerminalPanel);

  // Resizable height state
  const [panelHeight, setPanelHeight] = useState(() => {
    const saved = localStorage.getItem("querystudio_terminal_height");
    return saved ? parseInt(saved, 10) : DEFAULT_HEIGHT;
  });
  const [isResizing, setIsResizing] = useState(false);

  // Save height to localStorage
  useEffect(() => {
    localStorage.setItem("querystudio_terminal_height", String(panelHeight));
  }, [panelHeight]);

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
      // Calculate new height from bottom of window
      const newHeight = window.innerHeight - e.clientY;
      setPanelHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, newHeight)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const createTerminal = useCallback(async () => {
    try {
      const id = await invoke<string>("terminal_create", {
        rows: 24,
        cols: 80,
      });

      const terminal: TerminalInstance = {
        id,
        title: `Terminal ${terminals.length + 1}`,
        createdAt: new Date(),
      };

      addTerminal(terminal);
    } catch (error) {
      console.error("Failed to create terminal:", error);
    }
  }, [terminals.length, addTerminal]);

  const closeTerminal = useCallback(
    async (id: string) => {
      try {
        await invoke("terminal_close", { id });
        removeTerminal(id);
      } catch (error) {
        console.error("Failed to close terminal:", error);
        // Still remove from state even if backend fails
        removeTerminal(id);
      }
    },
    [removeTerminal],
  );

  if (terminals.length === 0) {
    return null;
  }

  return (
    <div
      className="flex flex-col border-t border-border bg-background"
      style={{
        height: isTerminalPanelOpen ? panelHeight : 32,
        transition: isResizing ? "none" : "height 0.2s ease-in-out",
      }}
    >
      {/* Resize handle - only show when panel is open */}
      {isTerminalPanelOpen && (
        <div
          onMouseDown={handleResizeStart}
          className="h-1 w-full cursor-row-resize hover:bg-primary/30 active:bg-primary/40 flex items-center justify-center group shrink-0"
        >
          <GripHorizontal className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      {/* Terminal header/tabs */}
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-border bg-card px-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          {terminals.map((terminal) => (
            <button
              key={terminal.id}
              onClick={() => setActiveTerminal(terminal.id)}
              className={cn(
                "flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors",
                activeTerminalId === terminal.id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span className="max-w-[100px] truncate">{terminal.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTerminal(terminal.id);
                }}
                className="ml-1 rounded p-0.5 hover:bg-destructive hover:text-destructive-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </button>
          ))}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={createTerminal}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={toggleTerminalPanel}>
          {isTerminalPanelOpen ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronUp className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* Terminal content - always render all terminals, use visibility to show/hide */}
      <div
        className="flex-1 overflow-hidden relative"
        style={{ display: isTerminalPanelOpen ? "block" : "none" }}
      >
        {terminals.map((terminal) => (
          <div
            key={terminal.id}
            className="absolute inset-0"
            style={{
              visibility: activeTerminalId === terminal.id ? "visible" : "hidden",
              zIndex: activeTerminalId === terminal.id ? 1 : 0,
            }}
          >
            <Terminal
              terminalId={terminal.id}
              isVisible={isTerminalPanelOpen && activeTerminalId === terminal.id}
              onClose={() => closeTerminal(terminal.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
