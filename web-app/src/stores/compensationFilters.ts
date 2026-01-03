import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CompensationFiltersState {
  /** Filter to show only items from the current volleyball season (Sept-May) */
  currentSeasonOnly: boolean;
  /** Filter to hide items with game dates in the future */
  hideFutureItems: boolean;
  /** Toggle current season filter */
  toggleCurrentSeasonOnly: () => void;
  /** Toggle hide future items filter */
  toggleHideFutureItems: () => void;
}

export const useCompensationFiltersStore = create<CompensationFiltersState>()(
  persist(
    (set) => ({
      currentSeasonOnly: true,
      hideFutureItems: false,
      toggleCurrentSeasonOnly: () =>
        set((state) => ({ currentSeasonOnly: !state.currentSeasonOnly })),
      toggleHideFutureItems: () =>
        set((state) => ({ hideFutureItems: !state.hideFutureItems })),
    }),
    {
      name: "volleykit-compensation-filters",
      partialize: (state) => ({
        currentSeasonOnly: state.currentSeasonOnly,
        hideFutureItems: state.hideFutureItems,
      }),
    },
  ),
);
