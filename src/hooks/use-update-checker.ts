import { useEffect, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { toast } from "sonner";

const UPDATE_AVAILABLE_TOAST_ID = "update-available";
const UPDATE_DOWNLOAD_TOAST_ID = "update-download";

let autoCheckTriggeredThisSession = false;
let activeCheckPromise: Promise<Update | null> | null = null;
let notifiedUpdateVersion: string | null = null;

async function runUpdateCheck(): Promise<Update | null> {
  if (!activeCheckPromise) {
    activeCheckPromise = check().finally(() => {
      activeCheckPromise = null;
    });
  }
  return activeCheckPromise;
}

interface UseUpdateCheckerOptions {
  autoCheckOnMount?: boolean;
}

export function useUpdateChecker(options: UseUpdateCheckerOptions = {}) {
  const autoCheckOnMount = options.autoCheckOnMount ?? true;
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [update, setUpdate] = useState<Update | null>(null);

  const checkForUpdates = async (silent = false) => {
    try {
      setChecking(true);
      const availableUpdate = await runUpdateCheck();
      setUpdate(availableUpdate);

      if (availableUpdate) {
        // Avoid spamming the same availability toast repeatedly.
        if (notifiedUpdateVersion !== availableUpdate.version) {
          notifiedUpdateVersion = availableUpdate.version;
          toast.info(`Update ${availableUpdate.version} available`, {
            id: UPDATE_AVAILABLE_TOAST_ID,
            description: "A new version is ready to install.",
            action: {
              label: "Install",
              onClick: () => installUpdate(availableUpdate),
            },
            duration: 10000,
          });
        } else if (!silent) {
          toast.info(`Update ${availableUpdate.version} is still available`, {
            id: UPDATE_AVAILABLE_TOAST_ID,
            description: "You can install it from the previous notification.",
            duration: 3000,
          });
        }
      } else if (!silent) {
        toast.success("You're up to date!");
      }
    } catch (error) {
      console.error("Failed to check for updates:", error);
      if (!silent) {
        toast.error("Failed to check for updates");
      }
    } finally {
      setChecking(false);
    }
  };

  const installUpdate = async (updateToInstall: Update) => {
    try {
      setDownloading(true);
      setProgress(0);

      let downloaded = 0;
      let contentLength = 0;

      await updateToInstall.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength ?? 0;
            toast.loading("Downloading update...", { id: UPDATE_DOWNLOAD_TOAST_ID });
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              const percent = Math.round((downloaded / contentLength) * 100);
              setProgress(percent);
              toast.loading(`Downloading update... ${percent}%`, {
                id: UPDATE_DOWNLOAD_TOAST_ID,
              });
            }
            break;
          case "Finished":
            toast.success("Update installed! Restarting...", {
              id: UPDATE_DOWNLOAD_TOAST_ID,
            });
            break;
        }
      });

      await relaunch();
    } catch (error) {
      console.error("Failed to install update:", error);
      toast.error("Failed to install update");
    } finally {
      setDownloading(false);
    }
  };

  // Check for updates on mount (silently)
  useEffect(() => {
    if (!autoCheckOnMount) return;
    if (autoCheckTriggeredThisSession) return;
    autoCheckTriggeredThisSession = true;

    // Delay check to not block app startup
    const timeout = setTimeout(() => {
      void checkForUpdates(true);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [autoCheckOnMount]);

  return {
    checking,
    downloading,
    progress,
    update,
    checkForUpdates,
    installUpdate,
  };
}
