import { isTauri } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";

const SETTINGS_WINDOW_LABEL = "settings";

interface OpenSettingsWindowOptions {
  fallback?: () => void;
}

export async function openSettingsWindow(options: OpenSettingsWindowOptions = {}): Promise<void> {
  const fallback = options.fallback;

  if (!isTauri()) {
    fallback?.();
    return;
  }

  const currentWindow = getCurrentWindow();
  if (currentWindow.label === SETTINGS_WINDOW_LABEL) {
    return;
  }

  const existing = await WebviewWindow.getByLabel(SETTINGS_WINDOW_LABEL);
  if (existing) {
    await existing.setFocus().catch(() => undefined);
    return;
  }

  const settingsWindow = new WebviewWindow(SETTINGS_WINDOW_LABEL, {
    url: "/settings",
    title: "Settings - QueryStudio",
    center: true,
    width: 1040,
    height: 760,
    minWidth: 820,
    minHeight: 600,
    resizable: true,
    titleBarStyle: "overlay",
    hiddenTitle: true,
    focus: true,
  });

  void settingsWindow.once("tauri://error", (event) => {
    console.error("Failed to open settings window:", event);
    fallback?.();
  });
}

export async function closeSettingsWindow(options: OpenSettingsWindowOptions = {}): Promise<void> {
  const fallback = options.fallback;

  if (!isTauri()) {
    fallback?.();
    return;
  }

  const currentWindow = getCurrentWindow();
  if (currentWindow.label !== SETTINGS_WINDOW_LABEL) {
    fallback?.();
    return;
  }

  await currentWindow.close().catch(() => {
    fallback?.();
  });
}
