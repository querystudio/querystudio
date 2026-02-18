import { isTauri } from "@tauri-apps/api/core";
import { platform } from "@tauri-apps/plugin-os";
import { api } from "./api";
import { useSettingsStore } from "./settings-store";
import type { SavedConnection } from "./types";

export const CONNECTION_STRING_SECRET_KIND = "connection_string";

export function isKeychainCredentialsEnabled(): boolean {
  return (
    isTauri() &&
    platform() === "macos" &&
    useSettingsStore.getState().keychainCredentials
  );
}

export async function resolveSavedConnectionString(
  savedConnection: SavedConnection,
): Promise<string> {
  if (!("connection_string" in savedConnection.config)) {
    throw new Error("Saved connection does not contain a connection string");
  }

  const fallback = savedConnection.config.connection_string;
  const shouldTryKeychain =
    isTauri() &&
    platform() === "macos" &&
    (isKeychainCredentialsEnabled() || fallback.trim().length === 0);

  if (shouldTryKeychain) {
    try {
      const keychainValue = await api.keychainGetConnectionSecret(
        savedConnection.id,
        CONNECTION_STRING_SECRET_KIND,
      );

      if (keychainValue && keychainValue.trim().length > 0) {
        return keychainValue;
      }
    } catch (error) {
      console.warn("Failed to read connection string from keychain:", error);
    }
  }

  if (fallback.trim().length === 0) {
    throw new Error(
      "Missing connection string in macOS Keychain for this saved connection. Re-enter and save it again.",
    );
  }

  return fallback;
}

export async function saveConnectionStringToKeychain(
  connectionId: string,
  connectionString: string,
): Promise<void> {
  if (!isKeychainCredentialsEnabled()) {
    return;
  }

  await api.keychainSetConnectionSecret(
    connectionId,
    CONNECTION_STRING_SECRET_KIND,
    connectionString,
  );
}
