import type { Theme, TerminalColors } from "./themes";

// Get computed color from CSS variable and convert to hex
function getCssVarAsHex(varName: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();

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
  const match = computedColor.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (match) {
    const r = parseInt(match[1], 10);
    const g = parseInt(match[2], 10);
    const b = parseInt(match[3], 10);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  return "#1a1b26"; // fallback
}

// Build xterm theme from theme configuration or CSS variables
export function buildTerminalTheme(theme?: Theme | null): TerminalColors {
  // If theme has explicit terminal colors, use them
  if (theme?.terminal) {
    return theme.terminal;
  }

  // Otherwise, build from CSS variables (fallback for themes without terminal colors)
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
