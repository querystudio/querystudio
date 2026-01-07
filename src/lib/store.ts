import { create } from "zustand";
import type { Connection, TableInfo } from "./types";

interface ConnectionState {
  connection: Connection | null;
  tables: TableInfo[];
  selectedTable: { schema: string; name: string } | null;

  setConnection: (connection: Connection | null) => void;
  setTables: (tables: TableInfo[]) => void;
  setSelectedTable: (table: { schema: string; name: string } | null) => void;
  disconnect: () => void;
}

export const useConnectionStore = create<ConnectionState>()((set) => ({
  connection: null,
  tables: [],
  selectedTable: null,

  setConnection: (connection: Connection | null) =>
    set({ connection, tables: [], selectedTable: null }),

  setTables: (tables: TableInfo[]) => set({ tables }),

  setSelectedTable: (table: { schema: string; name: string } | null) =>
    set({ selectedTable: table }),

  disconnect: () => set({ connection: null, tables: [], selectedTable: null }),
}));
