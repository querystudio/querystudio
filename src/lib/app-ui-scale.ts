import type { UIFontScale } from "./settings-schema";

const UI_FONT_SCALE_FACTORS: Record<UIFontScale, number> = {
  small: 0.92,
  default: 1,
  large: 1.08,
};

export function normalizeUiFontScale(scale: string | null | undefined): UIFontScale {
  if (scale === "small" || scale === "large") return scale;
  return "default";
}

export function getUiFontScaleFactor(scale: UIFontScale): number {
  return UI_FONT_SCALE_FACTORS[scale];
}

export function applyUiFontScale(scale: UIFontScale): void {
  if (typeof document === "undefined") return;
  const normalized = normalizeUiFontScale(scale);
  const factor = getUiFontScaleFactor(normalized);
  document.documentElement.style.setProperty("--ui-font-scale", String(factor));
}
