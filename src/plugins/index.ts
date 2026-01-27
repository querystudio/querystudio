// ============================================================================
// Local Plugins Index
// ============================================================================
//
// This file aggregates all local plugins for easy registration.
// To add a new plugin:
// 1. Create your plugin file in this directory (e.g., my-plugin.tsx)
// 2. Import it below
// 3. Add it to the localPlugins array
//
// ============================================================================

import type { LocalPluginModule } from "@/lib/local-plugins";

// Import local plugins
import sqlFormatterPlugin from "./sql-formatter";
import mockDataGeneratorPlugin from "./mock-data-generator";
import themeGeneratorPlugin from "./theme-generator";
import dataExportPlugin from "./data-export";

// ============================================================================
// All Local Plugins
// ============================================================================

export const localPlugins: LocalPluginModule[] = [
  sqlFormatterPlugin,
  mockDataGeneratorPlugin,
  themeGeneratorPlugin,
  dataExportPlugin,
];

export {
  sqlFormatterPlugin,
  mockDataGeneratorPlugin,
  themeGeneratorPlugin,
  dataExportPlugin,
};
export const pluginCount = localPlugins.length;
