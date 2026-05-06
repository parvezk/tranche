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
  changePct1D: number | null;
  perf: PositionPerf | null;
  shares: number;
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
  updateTicker: (id: string, ticker: string) => void;
  setPrice: (id: string, payload: { name: string; price: number; changePct1D: number | null }) => void;
  setShares: (id: string, shares: number) => void;
  setLoading: (id: string, loading: boolean) => void;
  setError: (id: string, error: string | null) => void;
  setPerf: (id: string, perf: PositionPerf) => void;
  resetMarketData: () => void;
  clearAllocations: () => void;
  clearEverything: () => void;
  replaceFromShareState: (budget: number | null, positions: ReplacePositionInput[]) => void;
}

const createEmptyPosition = (): Position => ({
  id: nanoid(),
  ticker: "",
  name: "",
  price: null,
  changePct1D: null,
  perf: null,
  shares: 0,
  loading: false,
  error: null,
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
      updateTicker: (id, ticker) =>
        set((state) => ({
          positions: state.positions.map((position) =>
            position.id === id
              ? {
                  ...position,
                  ticker: ticker.toUpperCase().replace(/[^A-Z.\-]/g, ""),
                  name: "",
                  price: null,
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
            position.id === id
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
            position.id === id
              ? {
                  ...position,
                  shares: shares >= 0 ? shares : 0,
                }
              : position,
          ),
        })),
      setLoading: (id, loading) =>
        set((state) => ({
          positions: state.positions.map((position) =>
            position.id === id ? { ...position, loading } : position,
          ),
        })),
      setError: (id, error) =>
        set((state) => ({
          positions: state.positions.map((position) =>
            position.id === id
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
            price: null,
            changePct1D: null,
            perf: null,
            loading: false,
            error: null,
          })),
        })),
      clearAllocations: () =>
        set(() => ({
          positions: [createEmptyPosition()],
        })),
      clearEverything: () =>
        set(() => ({
          budget: 0,
          positions: [createEmptyPosition()],
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
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
