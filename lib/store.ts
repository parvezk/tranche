"use client";

import { nanoid } from "nanoid";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface PositionPerf {
  changePct1W: number | null;
  changePct3M: number | null;
  changePctYTD: number | null;
  changePct1Y: number | null;
}

export interface Position {
  id: string;
  ticker: string;
  name: string;
  price: number | null;
  lockedPrice: number | null;
  lockedAt: string | null;
  locked: boolean;
  changePct1D: number | null;
  perf: PositionPerf | null;
  shares: number;
  notes: string;
  loading: boolean;
  error: string | null;
}

interface ReplacePositionInput {
  ticker: string;
  shares: number;
}

interface Store {
  budget: number;
  positions: Position[];
  hasHydrated: boolean;
  setHydrated: (hasHydrated: boolean) => void;
  setBudget: (budget: number) => void;
  addPosition: () => string;
  removePosition: (id: string) => void;
  reorderPosition: (sourceId: string, targetId: string) => void;
  updateTicker: (id: string, ticker: string) => void;
  setPrice: (id: string, payload: { name: string; price: number; changePct1D: number | null }) => void;
  setShares: (id: string, shares: number) => void;
  setNotes: (id: string, notes: string) => void;
  toggleLocked: (id: string) => void;
  setLoading: (id: string, loading: boolean) => void;
  setError: (id: string, error: string | null) => void;
  setPerf: (id: string, perf: PositionPerf) => void;
  resetMarketData: () => void;
  replaceFromShareState: (budget: number | null, positions: ReplacePositionInput[]) => void;
}

const createEmptyPosition = (): Position => ({
  id: nanoid(),
  ticker: "",
  name: "",
  price: null,
  lockedPrice: null,
  lockedAt: null,
  locked: false,
  changePct1D: null,
  perf: null,
  shares: 0,
  notes: "",
  loading: false,
  error: null,
});

const normalizePosition = (position: Partial<Position>): Position => ({
  ...createEmptyPosition(),
  ...position,
  id: typeof position.id === "string" && position.id ? position.id : nanoid(),
  ticker: typeof position.ticker === "string" ? position.ticker : "",
  name: typeof position.name === "string" ? position.name : "",
  price: typeof position.price === "number" ? position.price : null,
  lockedPrice: typeof position.lockedPrice === "number" ? position.lockedPrice : null,
  lockedAt: typeof position.lockedAt === "string" ? position.lockedAt : null,
  locked: Boolean(position.locked),
  changePct1D: typeof position.changePct1D === "number" ? position.changePct1D : null,
  perf: position.perf ?? null,
  shares: typeof position.shares === "number" && position.shares >= 0 ? position.shares : 0,
  notes: typeof position.notes === "string" ? position.notes : "",
  loading: false,
  error: typeof position.error === "string" ? position.error : null,
});

export const useTrancheStore = create<Store>()(
  persist(
    (set) => ({
      budget: 21600,
      positions: [createEmptyPosition()],
      hasHydrated: false,
      setHydrated: (hasHydrated) => set({ hasHydrated }),
      setBudget: (budget) => set({ budget: Number.isFinite(budget) ? budget : 0 }),
      addPosition: () => {
        const id = nanoid();
        set((state) => ({
          positions: [
            ...state.positions,
            {
              ...createEmptyPosition(),
              id,
            },
          ],
        }));
        return id;
      },
      removePosition: (id) =>
        set((state) => ({
          positions:
            state.positions.length === 1
              ? [createEmptyPosition()]
              : state.positions.filter((position) => position.id !== id),
        })),
      reorderPosition: (sourceId, targetId) =>
        set((state) => {
          const sourceIndex = state.positions.findIndex((position) => position.id === sourceId);
          const targetIndex = state.positions.findIndex((position) => position.id === targetId);
          if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
            return state;
          }

          const positions = [...state.positions];
          const [moved] = positions.splice(sourceIndex, 1);
          positions.splice(targetIndex, 0, moved);
          return { positions };
        }),
      updateTicker: (id, ticker) =>
        set((state) => ({
          positions: state.positions.map((position) =>
            position.id === id && !position.locked
              ? {
                  ...position,
                  ticker: ticker.toUpperCase().replace(/[^A-Z.\-]/g, ""),
                  name: "",
                  price: null,
                  lockedPrice: null,
                  lockedAt: null,
                  locked: false,
                  changePct1D: null,
                  perf: null,
                  loading: false,
                  error: null,
                }
              : position,
          ),
        })),
      setPrice: (id, payload) =>
        set((state) => ({
          positions: state.positions.map((position) =>
            position.id === id && !position.locked
              ? {
                  ...position,
                  name: payload.name,
                  price: payload.price,
                  changePct1D: payload.changePct1D,
                  loading: false,
                  error: null,
                }
              : position,
          ),
        })),
      setShares: (id, shares) =>
        set((state) => ({
          positions: state.positions.map((position) =>
            position.id === id && !position.locked
              ? {
                  ...position,
                  shares: shares >= 0 ? shares : 0,
                }
              : position,
          ),
        })),
      setNotes: (id, notes) =>
        set((state) => ({
          positions: state.positions.map((position) =>
            position.id === id && !position.locked ? { ...position, notes: notes.slice(0, 160) } : position,
          ),
        })),
      toggleLocked: (id) =>
        set((state) => ({
          positions: state.positions.map((position) => {
            if (position.id !== id) {
              return position;
            }

            if (position.locked) {
              return {
                ...position,
                locked: false,
                lockedAt: null,
                lockedPrice: null,
              };
            }

            const lockedPrice = typeof position.price === "number" ? position.price : position.lockedPrice;
            return {
              ...position,
              locked: true,
              lockedAt: new Date().toISOString(),
              lockedPrice,
              loading: false,
            };
          }),
        })),
      setLoading: (id, loading) =>
        set((state) => ({
          positions: state.positions.map((position) =>
            position.id === id && !position.locked ? { ...position, loading } : position,
          ),
        })),
      setError: (id, error) =>
        set((state) => ({
          positions: state.positions.map((position) =>
            position.id === id && !position.locked
              ? {
                  ...position,
                  error,
                  loading: false,
                  price: null,
                  changePct1D: null,
                  perf: null,
                  name: position.name || position.ticker,
                }
              : position,
          ),
        })),
      setPerf: (id, perf) =>
        set((state) => ({
          positions: state.positions.map((position) =>
            position.id === id ? { ...position, perf } : position,
          ),
        })),
      resetMarketData: () =>
        set((state) => ({
          positions: state.positions.map((position) => ({
            ...position,
            price: position.locked ? position.price : null,
            changePct1D: position.locked ? position.changePct1D : null,
            perf: position.locked ? position.perf : null,
            loading: false,
            error: position.locked ? position.error : null,
          })),
        })),
      replaceFromShareState: (budget, positions) =>
        set(() => ({
          budget: budget ?? 21600,
          positions:
            positions.length > 0
              ? positions.map((position) => ({
                  ...createEmptyPosition(),
                  ticker: position.ticker.toUpperCase(),
                  shares: position.shares,
                  name: position.ticker.toUpperCase(),
                }))
              : [createEmptyPosition()],
        })),
    }),
    {
      name: "tranche-session",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        budget: state.budget,
        positions: state.positions,
      }),
      migrate: (persistedState) => {
        if (!persistedState || typeof persistedState !== "object") {
          return {
            budget: 21600,
            positions: [createEmptyPosition()],
          };
        }

        const state = persistedState as Partial<Store>;
        return {
          ...state,
          budget: typeof state.budget === "number" ? state.budget : 21600,
          positions:
            Array.isArray(state.positions) && state.positions.length > 0
              ? state.positions.map((position) => normalizePosition(position))
              : [createEmptyPosition()],
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.positions =
            Array.isArray(state.positions) && state.positions.length > 0
              ? state.positions.map((position) => normalizePosition(position))
              : [createEmptyPosition()];
          state.setHydrated(true);
        }
      },
    },
  ),
);
