interface OpenSettingsWindowOptions {
  fallback?: () => void;
}

export async function openSettingsWindow(
  options: OpenSettingsWindowOptions = {},
): Promise<void> {
  const fallback = options.fallback;
  fallback?.();
}

export async function closeSettingsWindow(
  options: OpenSettingsWindowOptions = {},
): Promise<void> {
  const fallback = options.fallback;
  fallback?.();
}
