import { useEffect } from "react";
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { isTauri } from "@tauri-apps/api/core";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

const AUTH_CALLBACK_HOST = "auth";
const AUTH_CALLBACK_PATHNAME = "/callback";

/**
 * Hook that listens for deep-link auth callbacks and verifies the one-time token.
 * Should be used in the root component of the app.
 */
export function useAuthDeepLink() {
  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    let cleanup: (() => void) | undefined;

    const setupDeepLinkListener = async () => {
      try {
        cleanup = await onOpenUrl((urls) => {
          for (const url of urls) {
            handleDeepLinkUrl(url);
          }
        });
      } catch (error) {
        console.error("Failed to setup deep link listener:", error);
      }
    };

    setupDeepLinkListener();

    return () => {
      cleanup?.();
    };
  }, []);
}

async function handleDeepLinkUrl(url: string) {
  console.log("[Deep Link] Received URL:", url);
  toast.info(`Deep link received: ${url.substring(0, 50)}...`);

  try {
    // Parse the deep-link URL
    // Expected format: querystudio://auth/callback?token=xxx
    const parsedUrl = new URL(url);

    console.log(
      "[Deep Link] Parsed URL - host:",
      parsedUrl.host,
      "pathname:",
      parsedUrl.pathname,
    );

    toast.info(`Host: ${parsedUrl.host}, Path: ${parsedUrl.pathname}`);

    // Check if this is an auth callback
    // URL format: querystudio://auth/callback?token=xxx
    // Parsed as: host="auth", pathname="/callback"
    const isAuthCallback =
      (parsedUrl.host === AUTH_CALLBACK_HOST &&
        parsedUrl.pathname === AUTH_CALLBACK_PATHNAME) ||
      parsedUrl.pathname.includes("auth/callback");

    console.log("[Deep Link] Is auth callback:", isAuthCallback);

    if (!isAuthCallback) {
      console.log("[Deep Link] Not an auth callback, ignoring");
      toast.warning("Not an auth callback, ignoring");
      return;
    }

    // Check if the user cancelled
    const cancelled = parsedUrl.searchParams.get("cancelled");
    if (cancelled === "true") {
      // User cancelled, no action needed
      return;
    }

    // Get the one-time token from the URL
    const token = parsedUrl.searchParams.get("token");
    console.log(
      "[Deep Link] Token from URL:",
      token ? `${token.substring(0, 20)}...` : "null",
    );

    toast.info(`Token: ${token ? `${token.substring(0, 15)}...` : "NONE"}`);

    if (!token) {
      console.error("[Deep Link] No token found in auth callback URL");
      toast.error("Sign-in failed: No authentication token received");
      return;
    }

    console.log("[Deep Link] Verifying one-time token...");
    toast.info("Verifying token...");

    // Verify the one-time token to establish a session
    // This will set up the session in Tauri's context
    const result = await authClient.oneTimeToken.verify({
      token,
    });

    console.log("[Deep Link] Verify result:", result);

    if (result.error) {
      console.error("[Deep Link] Failed to verify token:", result.error);
      toast.error(`Verify failed: ${result.error.message || "Unknown error"}`);
      return;
    }

    console.log("[Deep Link] Token verified successfully!");
    toast.success("Signed in successfully! Refreshing session...");

    // Force a session refresh after successful verification
    await authClient.getSession();
    toast.success("Session established!");
  } catch (error) {
    console.error("Failed to handle auth deep link:", error);
    toast.error(
      `Deep link error: ${error instanceof Error ? error.message : "Unknown"}`,
    );
  }
}
