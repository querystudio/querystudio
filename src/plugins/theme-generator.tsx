// ============================================================================
// Theme Generator Plugin
// ============================================================================
//
// A plugin that allows users to create custom themes for QueryStudio.
// Features color pickers, live preview, and theme export/import.
//
// Features:
// - Pick primary, background, and accent colors
// - Auto-generate complementary colors
// - Live preview of the theme
// - Export theme as JSON
// - Apply theme directly to the app
//
// ============================================================================

import { useState, useCallback, useMemo } from "react";
import {
  Palette,
  Copy,
  Check,
  RefreshCw,
  Sun,
  Moon,
  Sparkles,
  Eye,
} from "lucide-react";
import type { TabPluginRegistration, TabContentProps } from "@/lib/tab-sdk";
import type { LocalPluginModule } from "@/lib/local-plugins";
import type { Theme, ThemeColors } from "@/lib/themes";
import { usePluginSDK } from "@/lib/plugin-sdk";
import { useThemeStore } from "@/lib/theme-store";
import { ScrollArea } from "@/components/ui/scroll-area";

// ============================================================================
// Types
// ============================================================================

interface ColorConfig {
  primary: string;
  background: string;
  foreground: string;
  accent: string;
  destructive: string;
}

interface ThemePreset {
  name: string;
  colors: ColorConfig;
  isDark: boolean;
}

// ============================================================================
// Color Utility Functions
// ============================================================================

// Convert hex to HSL
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

// Convert HSL to OKLCH (approximate conversion)
function hslToOklch(h: number, s: number, l: number): string {
  // Normalize values
  const lightness = l / 100;
  const chroma = (s / 100) * Math.min(lightness, 1 - lightness) * 0.4;
  const hue = h;

  return `oklch(${lightness.toFixed(3)} ${chroma.toFixed(3)} ${hue.toFixed(0)})`;
}

// Convert hex to OKLCH
function hexToOklch(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToOklch(h, s, l);
}

// Adjust lightness of an OKLCH color
function adjustLightness(oklch: string, amount: number): string {
  const match = oklch.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
  if (!match) return oklch;

  const l = Math.max(0, Math.min(1, parseFloat(match[1]) + amount));
  const c = parseFloat(match[2]);
  const h = parseFloat(match[3]);

  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(0)})`;
}

// Reduce chroma (saturation) of an OKLCH color
function reduceChroma(oklch: string, factor: number): string {
  const match = oklch.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
  if (!match) return oklch;

  const l = parseFloat(match[1]);
  const c = parseFloat(match[2]) * factor;
  const h = parseFloat(match[3]);

  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(0)})`;
}

// ============================================================================
// Theme Generation
// ============================================================================

function generateThemeColors(
  config: ColorConfig,
  isDark: boolean,
): ThemeColors {
  const primary = hexToOklch(config.primary);
  const background = hexToOklch(config.background);
  const foreground = hexToOklch(config.foreground);
  const accent = hexToOklch(config.accent);
  const destructive = hexToOklch(config.destructive);

  // Generate variations
  const card = isDark
    ? adjustLightness(background, 0.02)
    : adjustLightness(background, -0.02);
  const muted = isDark
    ? adjustLightness(background, 0.05)
    : adjustLightness(background, -0.05);
  const mutedForeground = isDark
    ? adjustLightness(foreground, -0.37)
    : adjustLightness(foreground, 0.37);
  const border = isDark
    ? adjustLightness(background, 0.07)
    : adjustLightness(background, -0.07);
  const sidebar = isDark
    ? adjustLightness(background, -0.02)
    : adjustLightness(background, 0.02);

  // Chart colors with different hues
  const primaryHsl = hexToHsl(config.primary);
  const chart1 = primary;
  const chart2 = hslToOklch(
    (primaryHsl.h + 60) % 360,
    primaryHsl.s,
    primaryHsl.l,
  );
  const chart3 = hslToOklch(
    (primaryHsl.h + 120) % 360,
    primaryHsl.s,
    primaryHsl.l,
  );
  const chart4 = hslToOklch(
    (primaryHsl.h + 180) % 360,
    primaryHsl.s,
    primaryHsl.l,
  );
  const chart5 = hslToOklch(
    (primaryHsl.h + 240) % 360,
    primaryHsl.s,
    primaryHsl.l,
  );

  return {
    background,
    foreground,
    card,
    cardForeground: foreground,
    popover: card,
    popoverForeground: foreground,
    primary,
    primaryForeground: isDark
      ? adjustLightness(primary, -0.5)
      : adjustLightness(primary, 0.5),
    secondary: muted,
    secondaryForeground: foreground,
    muted,
    mutedForeground,
    accent: reduceChroma(accent, 0.3),
    accentForeground: foreground,
    destructive,
    border,
    input: border,
    ring: primary,
    chart1,
    chart2,
    chart3,
    chart4,
    chart5,
    sidebar,
    sidebarForeground: foreground,
    sidebarPrimary: primary,
    sidebarPrimaryForeground: isDark
      ? adjustLightness(primary, -0.5)
      : adjustLightness(primary, 0.5),
    sidebarAccent: muted,
    sidebarAccentForeground: foreground,
    sidebarBorder: border,
    sidebarRing: primary,
  };
}

// ============================================================================
// Presets
// ============================================================================

const PRESETS: ThemePreset[] = [
  {
    name: "Ocean Blue",
    colors: {
      primary: "#3b82f6",
      background: "#0f172a",
      foreground: "#f8fafc",
      accent: "#6366f1",
      destructive: "#ef4444",
    },
    isDark: true,
  },
  {
    name: "Forest Green",
    colors: {
      primary: "#22c55e",
      background: "#0a1410",
      foreground: "#f0fdf4",
      accent: "#10b981",
      destructive: "#ef4444",
    },
    isDark: true,
  },
  {
    name: "Sunset Orange",
    colors: {
      primary: "#f97316",
      background: "#1c1410",
      foreground: "#fff7ed",
      accent: "#fb923c",
      destructive: "#dc2626",
    },
    isDark: true,
  },
  {
    name: "Purple Haze",
    colors: {
      primary: "#a855f7",
      background: "#1a0a1f",
      foreground: "#faf5ff",
      accent: "#c084fc",
      destructive: "#ef4444",
    },
    isDark: true,
  },
  {
    name: "Rose Gold",
    colors: {
      primary: "#f43f5e",
      background: "#1f1015",
      foreground: "#fff1f2",
      accent: "#fb7185",
      destructive: "#dc2626",
    },
    isDark: true,
  },
  {
    name: "Mint Light",
    colors: {
      primary: "#10b981",
      background: "#f0fdf4",
      foreground: "#0a1410",
      accent: "#34d399",
      destructive: "#dc2626",
    },
    isDark: false,
  },
  {
    name: "Sky Light",
    colors: {
      primary: "#0ea5e9",
      background: "#f0f9ff",
      foreground: "#0c1929",
      accent: "#38bdf8",
      destructive: "#dc2626",
    },
    isDark: false,
  },
];

// ============================================================================
// Plugin Definition
// ============================================================================

export const plugin: TabPluginRegistration = {
  type: "theme-generator",
  displayName: "Theme Generator",
  icon: Palette,
  getDefaultTitle: (index) => `Theme Generator ${index}`,
  canCreate: true,
  allowMultiple: true,
  priority: 30,
  experimental: false,
  lifecycle: {
    onCreate: (tabId, metadata) => {
      console.log(`[ThemeGenerator] Created: ${tabId}`, metadata);
    },
    onClose: (tabId) => {
      console.log(`[ThemeGenerator] Closed: ${tabId}`);
    },
  },
};

// ============================================================================
// Preview Component
// ============================================================================

function ThemePreview({ colors }: { colors: ThemeColors }) {
  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        backgroundColor: colors.background,
        borderColor: colors.border,
      }}
    >
      {/* Mock Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b"
        style={{ borderColor: colors.border, backgroundColor: colors.sidebar }}
      >
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <span
          className="text-xs font-medium ml-2"
          style={{ color: colors.sidebarForeground }}
        >
          QueryStudio
        </span>
      </div>

      <div className="flex h-48">
        {/* Mock Sidebar */}
        <div
          className="w-32 border-r p-2"
          style={{
            backgroundColor: colors.sidebar,
            borderColor: colors.sidebarBorder,
          }}
        >
          <div
            className="text-[10px] font-medium mb-2 px-1"
            style={{ color: colors.mutedForeground }}
          >
            TABLES
          </div>
          {["users", "orders", "products"].map((table, i) => (
            <div
              key={table}
              className="text-xs py-1 px-2 rounded mb-0.5"
              style={{
                backgroundColor: i === 0 ? colors.accent : "transparent",
                color: colors.sidebarForeground,
              }}
            >
              {table}
            </div>
          ))}
        </div>

        {/* Mock Content */}
        <div
          className="flex-1 p-3"
          style={{ backgroundColor: colors.background }}
        >
          {/* Mock Card */}
          <div
            className="rounded-lg p-3 mb-3"
            style={{
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold"
                style={{
                  backgroundColor: colors.primary,
                  color: colors.primaryForeground,
                }}
              >
                Q
              </div>
              <span
                className="text-xs font-medium"
                style={{ color: colors.cardForeground }}
              >
                Query Editor
              </span>
            </div>
            <div
              className="text-[10px] font-mono p-2 rounded"
              style={{
                backgroundColor: colors.muted,
                color: colors.mutedForeground,
              }}
            >
              SELECT * FROM users
            </div>
          </div>

          {/* Mock Buttons */}
          <div className="flex gap-2">
            <div
              className="text-[10px] px-2 py-1 rounded font-medium"
              style={{
                backgroundColor: colors.primary,
                color: colors.primaryForeground,
              }}
            >
              Run Query
            </div>
            <div
              className="text-[10px] px-2 py-1 rounded"
              style={{
                backgroundColor: colors.secondary,
                color: colors.secondaryForeground,
              }}
            >
              Cancel
            </div>
            <div
              className="text-[10px] px-2 py-1 rounded"
              style={{
                backgroundColor: colors.destructive,
                color: "#fff",
              }}
            >
              Delete
            </div>
          </div>

          {/* Chart Colors Preview */}
          <div className="flex gap-1 mt-3">
            {[
              colors.chart1,
              colors.chart2,
              colors.chart3,
              colors.chart4,
              colors.chart5,
            ].map((color, i) => (
              <div
                key={i}
                className="h-4 flex-1 rounded"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Color Input Component
// ============================================================================

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs text-muted-foreground w-24">{label}</label>
      <div className="flex items-center gap-2 flex-1">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded border border-border cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 h-8 rounded border border-border bg-background px-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
    </div>
  );
}

// ============================================================================
// Tab Component
// ============================================================================

export function Component({ tabId, paneId, connectionId }: TabContentProps) {
  const sdk = usePluginSDK(connectionId, tabId, paneId);
  const { addCustomTheme, setActiveTheme } = useThemeStore();

  // State
  const [themeName, setThemeName] = useState("My Custom Theme");
  const [isDark, setIsDark] = useState(true);
  const [colors, setColors] = useState<ColorConfig>({
    primary: "#3b82f6",
    background: "#0f172a",
    foreground: "#f8fafc",
    accent: "#6366f1",
    destructive: "#ef4444",
  });
  const [copied, setCopied] = useState(false);

  // Generate theme colors
  const themeColors = useMemo(
    () => generateThemeColors(colors, isDark),
    [colors, isDark],
  );

  // Generate full theme object
  const generateTheme = useCallback((): Theme => {
    const id = themeName.toLowerCase().replace(/\s+/g, "-");
    return {
      id,
      name: id,
      displayName: themeName,
      description: `Custom theme generated with Theme Generator`,
      author: "Theme Generator",
      version: "1.0.0",
      isDark,
      isBuiltIn: false,
      colors: themeColors,
    };
  }, [themeName, isDark, themeColors]);

  // Update a single color
  const updateColor = useCallback((key: keyof ColorConfig, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Apply preset
  const applyPreset = useCallback(
    (preset: ThemePreset) => {
      setColors(preset.colors);
      setIsDark(preset.isDark);
      setThemeName(preset.name);
      sdk.utils.toast.success(`Applied "${preset.name}" preset`);
    },
    [sdk.utils.toast],
  );

  // Randomize colors
  const randomizeColors = useCallback(() => {
    const hue = Math.random() * 360;

    // Convert HSL to hex (simplified)
    const hslToHex = (h: number, s: number, l: number): string => {
      s /= 100;
      l /= 100;
      const a = s * Math.min(l, 1 - l);
      const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color)
          .toString(16)
          .padStart(2, "0");
      };
      return `#${f(0)}${f(8)}${f(4)}`;
    };

    setColors({
      primary: hslToHex(hue, 70, 55),
      background: isDark ? hslToHex(hue, 15, 8) : hslToHex(hue, 20, 98),
      foreground: isDark ? hslToHex(hue, 10, 95) : hslToHex(hue, 15, 8),
      accent: hslToHex((hue + 30) % 360, 60, 50),
      destructive: "#ef4444",
    });

    sdk.utils.toast.success("Generated random colors!");
  }, [isDark, sdk.utils.toast]);

  // Copy theme JSON
  const copyThemeJson = useCallback(async () => {
    const theme = generateTheme();
    const json = JSON.stringify(theme, null, 2);
    const success = await sdk.utils.clipboard.copy(json);

    if (success) {
      setCopied(true);
      sdk.utils.toast.success("Theme JSON copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } else {
      sdk.utils.toast.error("Failed to copy to clipboard");
    }
  }, [generateTheme, sdk.utils.clipboard, sdk.utils.toast]);

  // Apply theme to app
  const applyTheme = useCallback(() => {
    const theme = generateTheme();
    addCustomTheme(theme);
    setActiveTheme(theme.id);
    sdk.utils.toast.success(`Applied "${themeName}" theme!`);
  }, [
    generateTheme,
    addCustomTheme,
    setActiveTheme,
    themeName,
    sdk.utils.toast,
  ]);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Palette className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">
              Theme Generator
            </h1>
            <p className="text-xs text-muted-foreground">
              Create custom color themes for QueryStudio
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyThemeJson}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-muted transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy JSON
              </>
            )}
          </button>
          <button
            onClick={applyTheme}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            Apply Theme
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Left Panel - Configuration */}
        <div className="w-80 border-r border-border flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {/* Theme Name */}
              <div>
                <label className="text-xs font-medium text-foreground mb-2 block">
                  Theme Name
                </label>
                <input
                  type="text"
                  value={themeName}
                  onChange={(e) => setThemeName(e.target.value)}
                  className="w-full h-8 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Dark/Light Toggle */}
              <div>
                <label className="text-xs font-medium text-foreground mb-2 block">
                  Mode
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsDark(true)}
                    className={`flex-1 flex items-center justify-center gap-2 h-8 rounded-md border text-xs font-medium transition-colors ${
                      isDark
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <Moon className="h-3.5 w-3.5" />
                    Dark
                  </button>
                  <button
                    onClick={() => setIsDark(false)}
                    className={`flex-1 flex items-center justify-center gap-2 h-8 rounded-md border text-xs font-medium transition-colors ${
                      !isDark
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <Sun className="h-3.5 w-3.5" />
                    Light
                  </button>
                </div>
              </div>

              {/* Presets */}
              <div>
                <label className="text-xs font-medium text-foreground mb-2 block">
                  Presets
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => applyPreset(preset)}
                      className="flex items-center gap-2 p-2 rounded-md border border-border hover:bg-muted transition-colors text-left"
                    >
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: preset.colors.primary }}
                      />
                      <span className="text-xs truncate">{preset.name}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={randomizeColors}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 h-8 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-solid transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Random Colors
                </button>
              </div>

              {/* Color Pickers */}
              <div>
                <label className="text-xs font-medium text-foreground mb-3 block">
                  Colors
                </label>
                <div className="space-y-3">
                  <ColorInput
                    label="Primary"
                    value={colors.primary}
                    onChange={(v) => updateColor("primary", v)}
                  />
                  <ColorInput
                    label="Background"
                    value={colors.background}
                    onChange={(v) => updateColor("background", v)}
                  />
                  <ColorInput
                    label="Foreground"
                    value={colors.foreground}
                    onChange={(v) => updateColor("foreground", v)}
                  />
                  <ColorInput
                    label="Accent"
                    value={colors.accent}
                    onChange={(v) => updateColor("accent", v)}
                  />
                  <ColorInput
                    label="Destructive"
                    value={colors.destructive}
                    onChange={(v) => updateColor("destructive", v)}
                  />
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Preview */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <span className="text-xs font-medium text-muted-foreground">
              Live Preview
            </span>
            <button
              onClick={randomizeColors}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Randomize
            </button>
          </div>

          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-lg mx-auto space-y-6">
              {/* Theme Preview */}
              <ThemePreview colors={themeColors} />

              {/* Color Palette */}
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-medium text-foreground mb-3">
                  Generated Palette
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(themeColors)
                    .slice(0, 16)
                    .map(([key, value]) => (
                      <div key={key} className="text-center">
                        <div
                          className="w-full h-8 rounded border border-border mb-1"
                          style={{ backgroundColor: value }}
                        />
                        <span className="text-[10px] text-muted-foreground truncate block">
                          {key}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Theme Info */}
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <h3 className="text-sm font-medium text-foreground mb-2">
                  Theme Info
                </h3>
                <div className="space-y-1 text-xs text-muted-foreground font-mono">
                  <div>ID: {themeName.toLowerCase().replace(/\s+/g, "-")}</div>
                  <div>Mode: {isDark ? "Dark" : "Light"}</div>
                  <div>Colors: {Object.keys(themeColors).length}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
        <span>
          Mode: {isDark ? "Dark" : "Light"} • {Object.keys(themeColors).length}{" "}
          colors generated
        </span>
        <span>Click "Apply Theme" to use this theme</span>
      </div>
    </div>
  );
}

// ============================================================================
// Export as LocalPluginModule
// ============================================================================

const themeGeneratorPlugin: LocalPluginModule = {
  plugin,
  Component,
};

export default themeGeneratorPlugin;
