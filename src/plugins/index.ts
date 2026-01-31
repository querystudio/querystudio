// ============================================================================
// Local Plugins Index
// ============================================================================
import type { LocalPluginModule } from "@/lib/local-plugins";
import sqlFormatterPlugin from "./sql-formatter";

// ============================================================================
// All Local Plugins
// ============================================================================

export const localPlugins: LocalPluginModule[] = [sqlFormatterPlugin];

export {};
export const pluginCount = localPlugins.length;
