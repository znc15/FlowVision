import { create } from 'zustand';
import { GraphData } from '../types/graph';

export interface HistoryEntry {
  graph: GraphData;
  timestamp: number;
  label?: string;
}

interface HistoryState {
  past: HistoryEntry[];
  present: HistoryEntry | null;
  future: HistoryEntry[];
}

interface HistoryStore extends HistoryState {
  undo: () => void;
  redo: () => void;
  pushHistory: (graph: GraphData, label?: string) => void;
  restoreTo: (index: number) => void;
  clear: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const MAX_HISTORY = 50;

export const useHistoryStore = create<HistoryStore>((set, _get) => ({
  past: [],
  present: null,
  future: [],
  canUndo: false,
  canRedo: false,

  undo: () =>
    set((state) => {
      if (state.past.length === 0) return state;

      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, state.past.length - 1);

      return {
        past: newPast,
        present: previous,
        future: state.present ? [state.present, ...state.future] : state.future,
        canUndo: newPast.length > 0,
        canRedo: true,
      };
    }),

  redo: () =>
    set((state) => {
      if (state.future.length === 0) return state;

      const next = state.future[0];
      const newFuture = state.future.slice(1);

      return {
        past: state.present ? [...state.past, state.present] : state.past,
        present: next,
        future: newFuture,
        canUndo: true,
        canRedo: newFuture.length > 0,
      };
    }),

  pushHistory: (graph, label) =>
    set((state) => {
      const entry: HistoryEntry = { graph, timestamp: Date.now(), label };
      const newPast = state.present ? [...state.past, state.present] : state.past;
      const trimmedPast = newPast.length > MAX_HISTORY ? newPast.slice(newPast.length - MAX_HISTORY) : newPast;

      return {
        past: trimmedPast,
        present: entry,
        future: [],
        canUndo: true,
        canRedo: false,
      };
    }),

  restoreTo: (index) =>
    set((state) => {
      const allEntries = [...state.past, ...(state.present ? [state.present] : []), ...state.future];
      if (index < 0 || index >= allEntries.length) return state;

      const target = allEntries[index];
      const past = allEntries.slice(0, index);
      const future = allEntries.slice(index + 1);

      return {
        past,
        present: target,
        future,
        canUndo: past.length > 0,
        canRedo: future.length > 0,
      };
    }),

  clear: () =>
    set({
      past: [],
      present: null,
      future: [],
      canUndo: false,
      canRedo: false,
    }),
}));
