import { createAuthClient } from "better-auth/react";
import { oneTimeTokenClient } from "better-auth/client/plugins";
import { isTauri } from "@tauri-apps/api/core";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { platform } from "@tauri-apps/plugin-os";
import { openUrl } from "@tauri-apps/plugin-opener";

const AUTH_URL = "https://querystudio.dev";
const DESKTOP_AUTH_PATH = "/auth/desktop";
const DEEP_LINK_CALLBACK_PATH = "auth/callback";

export const authClient = createAuthClient({
  baseURL: AUTH_URL,
  plugins: [oneTimeTokenClient()],
  fetchOptions: {
    customFetchImpl: (...params) =>
      isTauri() &&
      platform() === "macos" &&
      window.location.protocol === "tauri:"
        ? tauriFetch(...params)
        : fetch(...params),
  },
});

/**
 * Sign in with GitHub using OAuth flow.
 * For Tauri desktop apps, this opens the web-based auth page in the system browser.
 * The web page handles the OAuth flow and redirects back via deep-link.
 */
export async function signInWithGithub(): Promise<void> {
  if (isTauri()) {
    // For Tauri apps, open the desktop auth page in the system browser
    // This page handles the OAuth flow entirely in the browser context,
    // avoiding cookie/state mismatch issues between Tauri and the browser
    const authUrl = `${AUTH_URL}${DESKTOP_AUTH_PATH}?callback=${encodeURIComponent(DEEP_LINK_CALLBACK_PATH)}`;
    await openUrl(authUrl);
  } else {
    // For web, use regular redirect flow
    await authClient.signIn.social({
      provider: "github",
      callbackURL: "/",
    });
  }
}
