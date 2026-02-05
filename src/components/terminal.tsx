import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { CanvasAddon } from "@xterm/addon-canvas";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useThemeStore } from "@/lib/theme-store";
import { buildTerminalTheme } from "@/lib/terminal-theme";
import "@xterm/xterm/css/xterm.css";

interface TerminalProps {
  terminalId: string;
  isVisible: boolean;
  onClose?: () => void;
}

export function Terminal({ terminalId, isVisible, onClose }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const isInitializedRef = useRef(false);

  // Subscribe to theme changes
  const activeThemeId = useThemeStore((s) => s.activeTheme);
  const activeTheme = useThemeStore((s) => s.getActiveTheme());

  // Initialize terminal only once - stable dependencies only
  useEffect(() => {
    if (!containerRef.current || isInitializedRef.current) return;
    isInitializedRef.current = true;

    // Build theme at initialization time
    const initialTheme = buildTerminalTheme(activeTheme);

    const terminal = new XTerm({
      cursorBlink: true,
      cursorStyle: "bar",
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Cascadia Code", "Courier New", monospace',
      fontWeight: "normal",
      fontWeightBold: "bold",
      lineHeight: 1.2,
      letterSpacing: 0,
      theme: initialTheme,
      allowProposedApi: true,
      drawBoldTextInBrightColors: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const canvasAddon = new CanvasAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    terminal.open(containerRef.current);

    // Load canvas addon after opening for better rendering
    terminal.loadAddon(canvasAddon);

    // Delay initial fit to ensure container is properly sized
    requestAnimationFrame(() => {
      fitAddon.fit();
    });

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Handle user input
    terminal.onData((data) => {
      invoke("terminal_write", { id: terminalId, data }).catch(console.error);
    });

    // Handle resize
    terminal.onResize(({ rows, cols }) => {
      invoke("terminal_resize", { id: terminalId, rows, cols }).catch(console.error);
    });

    // Listen for terminal output from backend
    let unlistenOutput: UnlistenFn | null = null;
    let unlistenClosed: UnlistenFn | null = null;

    const setupListeners = async () => {
      unlistenOutput = await listen<string>(`terminal-output-${terminalId}`, (event) => {
        terminal.write(event.payload);
      });

      unlistenClosed = await listen(`terminal-closed-${terminalId}`, () => {
        terminal.write("\r\n\x1b[31mTerminal session ended.\x1b[0m\r\n");
        onClose?.();
      });
    };

    setupListeners();

    // Handle window resize
    const handleResize = () => {
      if (fitAddonRef.current && terminalRef.current) {
        requestAnimationFrame(() => {
          fitAddonRef.current?.fit();
        });
      }
    };

    window.addEventListener("resize", handleResize);

    // Create ResizeObserver for container resize
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current && terminalRef.current) {
        requestAnimationFrame(() => {
          fitAddonRef.current?.fit();
        });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      unlistenOutput?.();
      unlistenClosed?.();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      isInitializedRef.current = false;
    };
    // Only depend on terminalId - onClose is handled via ref pattern
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminalId]);

  // Refit when visibility changes
  useEffect(() => {
    if (isVisible && fitAddonRef.current && terminalRef.current) {
      // Use multiple animation frames to ensure DOM has updated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          fitAddonRef.current?.fit();
          terminalRef.current?.focus();
        });
      });
    }
  }, [isVisible]);

  // Update theme when it changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.theme = buildTerminalTheme(activeTheme);
    }
  }, [activeThemeId, activeTheme]);

  return <div ref={containerRef} className="h-full w-full" style={{ padding: "8px" }} />;
}
