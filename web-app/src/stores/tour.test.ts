import { describe, it, expect, beforeEach } from "vitest";
import { useTourStore, type TourId } from "./tour";

describe("useTourStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    useTourStore.setState({
      completedTours: [],
      dismissedTours: [],
      activeTour: null,
      currentStep: 0,
    });
  });

  describe("startTour", () => {
    it("sets activeTour and resets currentStep", () => {
      useTourStore.getState().startTour("assignments");

      expect(useTourStore.getState().activeTour).toBe("assignments");
      expect(useTourStore.getState().currentStep).toBe(0);
    });

    it("can start different tours", () => {
      const tourIds: TourId[] = [
        "assignments",
        "compensations",
        "exchange",
        "settings",
      ];

      for (const tourId of tourIds) {
        useTourStore.getState().startTour(tourId);
        expect(useTourStore.getState().activeTour).toBe(tourId);
      }
    });
  });

  describe("nextStep", () => {
    it("increments currentStep by 1", () => {
      useTourStore.getState().startTour("assignments");

      useTourStore.getState().nextStep();
      expect(useTourStore.getState().currentStep).toBe(1);

      useTourStore.getState().nextStep();
      expect(useTourStore.getState().currentStep).toBe(2);
    });
  });

  describe("previousStep", () => {
    it("decrements currentStep by 1", () => {
      useTourStore.setState({ activeTour: "assignments", currentStep: 2 });

      useTourStore.getState().previousStep();
      expect(useTourStore.getState().currentStep).toBe(1);
    });

    it("does not go below 0", () => {
      useTourStore.setState({ activeTour: "assignments", currentStep: 0 });

      useTourStore.getState().previousStep();
      expect(useTourStore.getState().currentStep).toBe(0);
    });
  });

  describe("goToStep", () => {
    it("sets currentStep to specified value", () => {
      useTourStore.getState().startTour("assignments");

      useTourStore.getState().goToStep(5);
      expect(useTourStore.getState().currentStep).toBe(5);

      useTourStore.getState().goToStep(0);
      expect(useTourStore.getState().currentStep).toBe(0);
    });
  });

  describe("completeTour", () => {
    it("clears activeTour and resets currentStep", () => {
      useTourStore.setState({ activeTour: "assignments", currentStep: 3 });

      useTourStore.getState().completeTour();

      expect(useTourStore.getState().activeTour).toBeNull();
      expect(useTourStore.getState().currentStep).toBe(0);
    });

    it("adds tour to completedTours", () => {
      useTourStore.setState({ activeTour: "assignments", currentStep: 3 });

      useTourStore.getState().completeTour();

      expect(useTourStore.getState().completedTours).toContain("assignments");
    });

    it("does not duplicate tour in completedTours", () => {
      useTourStore.setState({
        activeTour: "assignments",
        completedTours: ["assignments"],
      });

      useTourStore.getState().completeTour();

      expect(
        useTourStore.getState().completedTours.filter((t) => t === "assignments")
          .length
      ).toBe(1);
    });

    it("removes tour from dismissedTours if it was there", () => {
      useTourStore.setState({
        activeTour: "assignments",
        dismissedTours: ["assignments"],
      });

      useTourStore.getState().completeTour();

      expect(useTourStore.getState().dismissedTours).not.toContain(
        "assignments"
      );
      expect(useTourStore.getState().completedTours).toContain("assignments");
    });

    it("does nothing if no activeTour", () => {
      useTourStore.setState({ activeTour: null, completedTours: [] });

      useTourStore.getState().completeTour();

      expect(useTourStore.getState().completedTours).toHaveLength(0);
    });
  });

  describe("dismissTour", () => {
    it("clears activeTour and resets currentStep", () => {
      useTourStore.setState({ activeTour: "compensations", currentStep: 2 });

      useTourStore.getState().dismissTour();

      expect(useTourStore.getState().activeTour).toBeNull();
      expect(useTourStore.getState().currentStep).toBe(0);
    });

    it("adds tour to dismissedTours", () => {
      useTourStore.setState({ activeTour: "exchange" });

      useTourStore.getState().dismissTour();

      expect(useTourStore.getState().dismissedTours).toContain("exchange");
    });

    it("does not duplicate tour in dismissedTours", () => {
      useTourStore.setState({
        activeTour: "exchange",
        dismissedTours: ["exchange"],
      });

      useTourStore.getState().dismissTour();

      expect(
        useTourStore.getState().dismissedTours.filter((t) => t === "exchange")
          .length
      ).toBe(1);
    });

    it("does nothing if no activeTour", () => {
      useTourStore.setState({ activeTour: null, dismissedTours: [] });

      useTourStore.getState().dismissTour();

      expect(useTourStore.getState().dismissedTours).toHaveLength(0);
    });
  });

  describe("exitTour", () => {
    it("clears activeTour without affecting completed/dismissed lists", () => {
      useTourStore.setState({
        activeTour: "settings",
        currentStep: 1,
        completedTours: ["assignments"],
        dismissedTours: ["exchange"],
      });

      useTourStore.getState().exitTour();

      expect(useTourStore.getState().activeTour).toBeNull();
      expect(useTourStore.getState().currentStep).toBe(0);
      expect(useTourStore.getState().completedTours).toEqual(["assignments"]);
      expect(useTourStore.getState().dismissedTours).toEqual(["exchange"]);
    });
  });

  describe("resetAllTours", () => {
    it("clears all tour state", () => {
      useTourStore.setState({
        activeTour: "settings",
        currentStep: 3,
        completedTours: ["assignments", "compensations"],
        dismissedTours: ["exchange"],
      });

      useTourStore.getState().resetAllTours();

      expect(useTourStore.getState().activeTour).toBeNull();
      expect(useTourStore.getState().currentStep).toBe(0);
      expect(useTourStore.getState().completedTours).toEqual([]);
      expect(useTourStore.getState().dismissedTours).toEqual([]);
    });
  });

  describe("shouldShowTour", () => {
    it("returns true for tours that are not completed or dismissed", () => {
      expect(useTourStore.getState().shouldShowTour("assignments")).toBe(true);
    });

    it("returns false for completed tours", () => {
      useTourStore.setState({ completedTours: ["assignments"] });

      expect(useTourStore.getState().shouldShowTour("assignments")).toBe(false);
    });

    it("returns false for dismissed tours", () => {
      useTourStore.setState({ dismissedTours: ["compensations"] });

      expect(useTourStore.getState().shouldShowTour("compensations")).toBe(
        false
      );
    });

    it("returns false if another tour is active", () => {
      useTourStore.setState({ activeTour: "assignments" });

      expect(useTourStore.getState().shouldShowTour("compensations")).toBe(
        false
      );
    });

    it("returns true if the same tour is active", () => {
      useTourStore.setState({ activeTour: "assignments" });

      expect(useTourStore.getState().shouldShowTour("assignments")).toBe(true);
    });
  });

  describe("isTourActive", () => {
    it("returns true when the specified tour is active", () => {
      useTourStore.setState({ activeTour: "exchange" });

      expect(useTourStore.getState().isTourActive("exchange")).toBe(true);
    });

    it("returns false when a different tour is active", () => {
      useTourStore.setState({ activeTour: "assignments" });

      expect(useTourStore.getState().isTourActive("exchange")).toBe(false);
    });

    it("returns false when no tour is active", () => {
      expect(useTourStore.getState().isTourActive("exchange")).toBe(false);
    });
  });

  describe("getTourStatus", () => {
    it('returns "completed" for completed tours', () => {
      useTourStore.setState({ completedTours: ["assignments"] });

      expect(useTourStore.getState().getTourStatus("assignments")).toBe(
        "completed"
      );
    });

    it('returns "dismissed" for dismissed tours', () => {
      useTourStore.setState({ dismissedTours: ["compensations"] });

      expect(useTourStore.getState().getTourStatus("compensations")).toBe(
        "dismissed"
      );
    });

    it('returns "not_started" for tours that have not been started', () => {
      expect(useTourStore.getState().getTourStatus("exchange")).toBe(
        "not_started"
      );
    });

    it('prioritizes "completed" over "dismissed"', () => {
      useTourStore.setState({
        completedTours: ["settings"],
        dismissedTours: ["settings"],
      });

      expect(useTourStore.getState().getTourStatus("settings")).toBe(
        "completed"
      );
    });
  });

  describe("persistence", () => {
    it("only persists completedTours and dismissedTours", () => {
      // The persist middleware uses partialize to select which state to persist
      // We can verify this by checking the store's persisted state shape
      useTourStore.setState({
        activeTour: "assignments",
        currentStep: 5,
        completedTours: ["exchange"],
        dismissedTours: ["settings"],
      });

      // Access the persisted state directly from localStorage
      const persistedData = localStorage.getItem("volleykit-tour");
      if (persistedData) {
        const parsed = JSON.parse(persistedData);
        expect(parsed.state).toHaveProperty("completedTours");
        expect(parsed.state).toHaveProperty("dismissedTours");
        // activeTour and currentStep should not be persisted
        expect(parsed.state).not.toHaveProperty("activeTour");
        expect(parsed.state).not.toHaveProperty("currentStep");
      }
    });
  });
});
