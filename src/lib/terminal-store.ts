import { create } from "zustand";

export interface TerminalInstance {
  id: string;
  title: string;
  createdAt: Date;
}

interface TerminalState {
  terminals: TerminalInstance[];
  activeTerminalId: string | null;
  isTerminalPanelOpen: boolean;

  // Actions
  addTerminal: (terminal: TerminalInstance) => void;
  removeTerminal: (id: string) => void;
  setActiveTerminal: (id: string | null) => void;
  toggleTerminalPanel: () => void;
  openTerminalPanel: () => void;
  closeTerminalPanel: () => void;
}

export const useTerminalStore = create<TerminalState>()((set) => ({
  terminals: [],
  activeTerminalId: null,
  isTerminalPanelOpen: false,

  addTerminal: (terminal) =>
    set((state) => ({
      terminals: [...state.terminals, terminal],
      activeTerminalId: terminal.id,
      isTerminalPanelOpen: true,
    })),

  removeTerminal: (id) =>
    set((state) => {
      const newTerminals = state.terminals.filter((t) => t.id !== id);
      const newActiveId =
        state.activeTerminalId === id
          ? newTerminals.length > 0
            ? newTerminals[newTerminals.length - 1].id
            : null
          : state.activeTerminalId;
      return {
        terminals: newTerminals,
        activeTerminalId: newActiveId,
        isTerminalPanelOpen: newTerminals.length > 0,
      };
    }),

  setActiveTerminal: (id) => set({ activeTerminalId: id }),

  toggleTerminalPanel: () =>
    set((state) => ({ isTerminalPanelOpen: !state.isTerminalPanelOpen })),

  openTerminalPanel: () => set({ isTerminalPanelOpen: true }),

  closeTerminalPanel: () => set({ isTerminalPanelOpen: false }),
}));
