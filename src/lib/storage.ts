import Database from "@tauri-apps/plugin-sql";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { platform } from "@tauri-apps/plugin-os";
import type {
  SavedConnection,
  SavedConnectionConfig,
  DatabaseType,
} from "./types";
import { useSettingsStore } from "./settings-store";

const DB_PATH = "sqlite:connections.db";
const KEYCHAIN_SECRET_KIND = "connection_string";

let db: Database | null = null;

/**
 * Get or initialize the database connection
 */
async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load(DB_PATH);
  }
  return db;
}

/**
 * Database row type for connections table
 */
interface ConnectionRow {
  id: string;
  name: string;
  db_type: string;
  config_type: string;
  credentials_mode: string | null;
  connection_string: string | null;
  host: string | null;
  port: number | null;
  database: string | null;
  username: string | null;
}

function isMacDesktop(): boolean {
  return isTauri() && platform() === "macos";
}

function isKeychainCredentialStorageEnabled(): boolean {
  return isMacDesktop() && useSettingsStore.getState().keychainCredentials;
}

async function getKeychainConnectionString(
  connectionId: string,
): Promise<string | null> {
  if (!isMacDesktop()) {
    return null;
  }

  try {
    return await invoke<string | null>("keychain_get_connection_secret", {
      connectionId,
      kind: KEYCHAIN_SECRET_KIND,
    });
  } catch {
    return null;
  }
}

async function setKeychainConnectionString(
  connectionId: string,
  connectionString: string,
): Promise<void> {
  await invoke<void>("keychain_set_connection_secret", {
    connectionId,
    kind: KEYCHAIN_SECRET_KIND,
    secret: connectionString,
  });
}

async function deleteKeychainConnectionString(
  connectionId: string,
): Promise<void> {
  if (!isMacDesktop()) {
    return;
  }

  try {
    await invoke<void>("keychain_delete_connection_secret", {
      connectionId,
      kind: KEYCHAIN_SECRET_KIND,
    });
  } catch {
    // Best-effort cleanup.
  }
}

/**
 * Convert a database row to a SavedConnection
 */
async function rowToConnection(row: ConnectionRow): Promise<SavedConnection> {
  let config: SavedConnectionConfig;

  if (row.config_type === "connection_string") {
    let connectionString = row.connection_string ?? "";
    const shouldLoadFromKeychain =
      row.credentials_mode === "keychain" ||
      connectionString.trim().length === 0;

    if (shouldLoadFromKeychain) {
      const keychainValue = await getKeychainConnectionString(row.id);
      if (keychainValue && keychainValue.trim().length > 0) {
        connectionString = keychainValue;
      }
    }

    config = { connection_string: connectionString };
  } else {
    config = {
      host: row.host || "",
      port: row.port || 5432,
      database: row.database || "",
      username: row.username || "",
    };
  }

  return {
    id: row.id,
    name: row.name,
    db_type: row.db_type as DatabaseType,
    config,
  };
}

/**
 * Storage API using SQLite
 */
export const storage = {
  /**
   * Get all saved connections
   */
  async getSavedConnections(): Promise<{ connections: SavedConnection[] }> {
    const database = await getDb();
    const rows = await database.select<ConnectionRow[]>(
      "SELECT id, name, db_type, config_type, credentials_mode, connection_string, host, port, database, username FROM connections ORDER BY name",
    );
    const connections = await Promise.all(rows.map(rowToConnection));
    return {
      connections,
    };
  },

  /**
   * Save a connection (insert or update)
   */
  async saveConnection(connection: SavedConnection): Promise<void> {
    const database = await getDb();
    const config = connection.config;

    const isConnectionString = "connection_string" in config;
    const configType = isConnectionString ? "connection_string" : "parameters";
    let credentialsMode = "plaintext";
    let connectionStringToStore: string | null = isConnectionString
      ? config.connection_string
      : null;

    if (
      isConnectionString &&
      isKeychainCredentialStorageEnabled() &&
      config.connection_string.trim().length > 0
    ) {
      await setKeychainConnectionString(
        connection.id,
        config.connection_string,
      );
      credentialsMode = "keychain";
      connectionStringToStore = "";
    } else if (isMacDesktop()) {
      await deleteKeychainConnectionString(connection.id);
    }

    // Use INSERT OR REPLACE for upsert behavior
    await database.execute(
      `INSERT OR REPLACE INTO connections
       (id, name, db_type, config_type, credentials_mode, connection_string, host, port, database, username)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        connection.id,
        connection.name,
        connection.db_type,
        configType,
        credentialsMode,
        connectionStringToStore,
        isConnectionString ? null : config.host,
        isConnectionString ? null : config.port,
        isConnectionString ? null : config.database,
        isConnectionString ? null : config.username,
      ],
    );
  },

  /**
   * Delete a saved connection
   */
  async deleteSavedConnection(id: string): Promise<void> {
    const database = await getDb();
    await database.execute("DELETE FROM connections WHERE id = $1", [id]);
    await deleteKeychainConnectionString(id);
  },

  /**
   * Get the count of saved connections
   */
  async getSavedConnectionCount(): Promise<number> {
    const database = await getDb();
    const result = await database.select<{ count: number }[]>(
      "SELECT COUNT(*) as count FROM connections",
    );
    return result[0]?.count ?? 0;
  },

  /**
   * Get a single connection by ID
   */
  async getConnection(id: string): Promise<SavedConnection | null> {
    const database = await getDb();
    const rows = await database.select<ConnectionRow[]>(
      "SELECT id, name, db_type, config_type, credentials_mode, connection_string, host, port, database, username FROM connections WHERE id = $1",
      [id],
    );

    if (rows.length === 0) {
      return null;
    }

    return rowToConnection(rows[0]);
  },
};
