import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TourId = "assignments" | "compensations" | "exchange" | "settings";

interface TourState {
  // Tours the user has fully completed
  completedTours: TourId[];

  // Tours the user dismissed/skipped (won't auto-start until reset)
  dismissedTours: TourId[];

  // Currently active tour (null if no tour running)
  activeTour: TourId | null;

  // Current step index within the active tour
  currentStep: number;

  // Actions
  startTour: (tourId: TourId) => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: number) => void;
  completeTour: () => void;
  dismissTour: () => void;
  exitTour: () => void;
  resetAllTours: () => void;

  // Query helpers
  shouldShowTour: (tourId: TourId) => boolean;
  isTourActive: (tourId: TourId) => boolean;
  getTourStatus: (tourId: TourId) => "completed" | "dismissed" | "not_started";
}

export const useTourStore = create<TourState>()(
  persist(
    (set, get) => ({
      completedTours: [],
      dismissedTours: [],
      activeTour: null,
      currentStep: 0,

      startTour: (tourId: TourId) => {
        set({
          activeTour: tourId,
          currentStep: 0,
        });
      },

      nextStep: () => {
        set((state) => ({
          currentStep: state.currentStep + 1,
        }));
      },

      previousStep: () => {
        set((state) => ({
          currentStep: Math.max(0, state.currentStep - 1),
        }));
      },

      goToStep: (step: number) => {
        set({ currentStep: step });
      },

      completeTour: () => {
        const { activeTour, completedTours, dismissedTours } = get();
        if (!activeTour) return;

        set({
          activeTour: null,
          currentStep: 0,
          completedTours: completedTours.includes(activeTour)
            ? completedTours
            : [...completedTours, activeTour],
          // Remove from dismissed if it was there
          dismissedTours: dismissedTours.filter((id) => id !== activeTour),
        });
      },

      dismissTour: () => {
        const { activeTour, dismissedTours } = get();
        if (!activeTour) return;

        set({
          activeTour: null,
          currentStep: 0,
          dismissedTours: dismissedTours.includes(activeTour)
            ? dismissedTours
            : [...dismissedTours, activeTour],
        });
      },

      exitTour: () => {
        set({
          activeTour: null,
          currentStep: 0,
        });
      },

      resetAllTours: () => {
        set({
          completedTours: [],
          dismissedTours: [],
          activeTour: null,
          currentStep: 0,
        });
      },

      shouldShowTour: (tourId: TourId) => {
        const { completedTours, dismissedTours, activeTour } = get();
        // Don't show if already completed, dismissed, or another tour is active
        if (completedTours.includes(tourId)) return false;
        if (dismissedTours.includes(tourId)) return false;
        if (activeTour !== null && activeTour !== tourId) return false;
        return true;
      },

      isTourActive: (tourId: TourId) => {
        return get().activeTour === tourId;
      },

      getTourStatus: (tourId: TourId) => {
        const { completedTours, dismissedTours } = get();
        if (completedTours.includes(tourId)) return "completed";
        if (dismissedTours.includes(tourId)) return "dismissed";
        return "not_started";
      },
    }),
    {
      name: "volleykit-tour",
      partialize: (state) => ({
        completedTours: state.completedTours,
        dismissedTours: state.dismissedTours,
      }),
    },
  ),
);
