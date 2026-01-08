export type ConnectionConfig =
  | { connection_string: string }
  | {
      host: string;
      port: number;
      database: string;
      username: string;
      password: string;
    };

export type SavedConnectionConfig =
  | { connection_string: string }
  | {
      host: string;
      port: number;
      database: string;
      username: string;
    };

export interface SavedConnection {
  id: string;
  name: string;
  config: SavedConnectionConfig;
}

export interface Connection {
  id: string;
  name: string;
  config: ConnectionConfig;
}

export interface TableInfo {
  schema: string;
  name: string;
  row_count: number;
}

export interface ColumnInfo {
  name: string;
  data_type: string;
  is_nullable: boolean;
  is_primary_key: boolean;
  has_default: boolean;
}

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  row_count: number;
}
