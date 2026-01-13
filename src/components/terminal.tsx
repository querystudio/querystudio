import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { CanvasAddon } from "@xterm/addon-canvas";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useThemeStore } from "@/lib/theme-store";
import "@xterm/xterm/css/xterm.css";

interface TerminalProps {
  terminalId: string;
  isVisible: boolean;
  onClose?: () => void;
}

// Get computed color from CSS variable and convert to hex
function getCssVarAsHex(varName: string): string {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();

  if (!value) {
    return "#1a1b26"; // fallback
  }

  // Create a temporary element to compute the final color
  const temp = document.createElement("div");
  temp.style.cssText = `color: ${value}; display: none;`;
  document.body.appendChild(temp);

  const computedColor = getComputedStyle(temp).color;
  document.body.removeChild(temp);

  // Parse rgb(r, g, b) or rgba(r, g, b, a)
  const match = computedColor.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/
  );
  if (match) {
    const r = parseInt(match[1], 10);
    const g = parseInt(match[2], 10);
    const b = parseInt(match[3], 10);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  return "#1a1b26"; // fallback
}

// Build xterm theme from CSS variables
function buildTerminalTheme() {
  const bg = getCssVarAsHex("--background");
  const fg = getCssVarAsHex("--foreground");
  const primary = getCssVarAsHex("--primary");
  const primaryFg = getCssVarAsHex("--primary-foreground");
  const accent = getCssVarAsHex("--accent");
  const accentFg = getCssVarAsHex("--accent-foreground");
  const muted = getCssVarAsHex("--muted-foreground");
  const destructive = getCssVarAsHex("--destructive");
  const chart1 = getCssVarAsHex("--chart-1");
  const chart2 = getCssVarAsHex("--chart-2");
  const chart3 = getCssVarAsHex("--chart-3");
  const chart4 = getCssVarAsHex("--chart-4");
  const sidebarPrimary = getCssVarAsHex("--sidebar-primary");

  return {
    background: bg,
    foreground: fg,
    cursor: primary,
    cursorAccent: primaryFg,
    selectionBackground: accent + "80",
    selectionForeground: accentFg,
    // ANSI colors
    black: bg,
    red: destructive,
    green: chart2,
    yellow: chart3,
    blue: chart1,
    magenta: chart4,
    cyan: sidebarPrimary,
    white: fg,
    brightBlack: muted,
    brightRed: destructive,
    brightGreen: chart2,
    brightYellow: chart3,
    brightBlue: chart1,
    brightMagenta: chart4,
    brightCyan: sidebarPrimary,
    brightWhite: fg,
  };
}

export function Terminal({ terminalId, isVisible, onClose }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const isInitializedRef = useRef(false);

  // Subscribe to theme changes
  const activeThemeId = useThemeStore((s) => s.activeTheme);

  // Initialize terminal only once - stable dependencies only
  useEffect(() => {
    if (!containerRef.current || isInitializedRef.current) return;
    isInitializedRef.current = true;

    // Build theme at initialization time
    const initialTheme = buildTerminalTheme();

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
      invoke("terminal_resize", { id: terminalId, rows, cols }).catch(
        console.error
      );
    });

    // Listen for terminal output from backend
    let unlistenOutput: UnlistenFn | null = null;
    let unlistenClosed: UnlistenFn | null = null;

    const setupListeners = async () => {
      unlistenOutput = await listen<string>(
        `terminal-output-${terminalId}`,
        (event) => {
          terminal.write(event.payload);
        }
      );

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
      terminalRef.current.options.theme = buildTerminalTheme();
    }
  }, [activeThemeId]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ padding: "8px" }}
    />
  );
}
