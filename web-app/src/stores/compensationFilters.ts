import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CompensationFiltersState {
  /** Filter to hide items with game dates in the future */
  hideFutureItems: boolean;
  /** Toggle hide future items filter */
  toggleHideFutureItems: () => void;
}

export const useCompensationFiltersStore = create<CompensationFiltersState>()(
  persist(
    (set) => ({
      hideFutureItems: false,
      toggleHideFutureItems: () =>
        set((state) => ({ hideFutureItems: !state.hideFutureItems })),
    }),
    {
      name: "volleykit-compensation-filters",
      partialize: (state) => ({
        hideFutureItems: state.hideFutureItems,
      }),
    },
  ),
);
