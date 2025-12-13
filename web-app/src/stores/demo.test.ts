import { describe, it, expect, beforeEach } from "vitest";
import { useDemoStore } from "./demo";

describe("useDemoStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    useDemoStore.setState({
      isDemoMode: false,
      assignments: [],
      compensations: [],
      exchanges: [],
    });
  });

  describe("initial state", () => {
    it("starts with isDemoMode false", () => {
      const state = useDemoStore.getState();
      expect(state.isDemoMode).toBe(false);
    });

    it("starts with empty data arrays (lazy loading)", () => {
      const state = useDemoStore.getState();
      expect(state.assignments).toHaveLength(0);
      expect(state.compensations).toHaveLength(0);
      expect(state.exchanges).toHaveLength(0);
    });
  });

  describe("enableDemoMode", () => {
    it("sets isDemoMode to true", () => {
      useDemoStore.getState().enableDemoMode();
      expect(useDemoStore.getState().isDemoMode).toBe(true);
    });

    it("generates demo data only when enabled (lazy loading)", () => {
      // Before enabling, data should be empty
      expect(useDemoStore.getState().assignments).toHaveLength(0);

      // Enable demo mode
      useDemoStore.getState().enableDemoMode();

      // After enabling, data should be populated
      const state = useDemoStore.getState();
      expect(state.assignments.length).toBeGreaterThan(0);
      expect(state.compensations.length).toBeGreaterThan(0);
      expect(state.exchanges.length).toBeGreaterThan(0);
    });

    it("generates valid assignment data", () => {
      useDemoStore.getState().enableDemoMode();

      const { assignments } = useDemoStore.getState();
      expect(assignments.length).toBeGreaterThan(0);

      const firstAssignment = assignments[0];
      expect(firstAssignment).toHaveProperty("__identity");
      expect(firstAssignment).toHaveProperty("refereeConvocationStatus");
      expect(firstAssignment).toHaveProperty("refereePosition");
      expect(firstAssignment).toHaveProperty("refereeGame");
    });

    it("generates valid compensation data", () => {
      useDemoStore.getState().enableDemoMode();

      const { compensations } = useDemoStore.getState();
      expect(compensations.length).toBeGreaterThan(0);

      const firstCompensation = compensations[0]!;
      expect(firstCompensation).toHaveProperty("__identity");
      expect(firstCompensation).toHaveProperty("convocationCompensation");
      expect(firstCompensation.convocationCompensation).toHaveProperty(
        "gameCompensation",
      );
    });

    it("generates valid exchange data", () => {
      useDemoStore.getState().enableDemoMode();

      const { exchanges } = useDemoStore.getState();
      expect(exchanges.length).toBeGreaterThan(0);

      const firstExchange = exchanges[0];
      expect(firstExchange).toHaveProperty("__identity");
      expect(firstExchange).toHaveProperty("status");
      expect(firstExchange).toHaveProperty("refereeGame");
    });
  });

  describe("disableDemoMode", () => {
    it("sets isDemoMode to false", () => {
      useDemoStore.getState().enableDemoMode();
      useDemoStore.getState().disableDemoMode();
      expect(useDemoStore.getState().isDemoMode).toBe(false);
    });

    it("clears demo data when disabled", () => {
      // Enable and verify data exists
      useDemoStore.getState().enableDemoMode();
      expect(useDemoStore.getState().assignments.length).toBeGreaterThan(0);

      // Disable and verify data is cleared
      useDemoStore.getState().disableDemoMode();
      const state = useDemoStore.getState();
      expect(state.assignments).toHaveLength(0);
      expect(state.compensations).toHaveLength(0);
      expect(state.exchanges).toHaveLength(0);
    });
  });

  describe("refreshData", () => {
    it("regenerates demo data with fresh dates", () => {
      useDemoStore.getState().enableDemoMode();
      const initialAssignments = useDemoStore.getState().assignments;

      // Refresh data
      useDemoStore.getState().refreshData();
      const refreshedAssignments = useDemoStore.getState().assignments;

      // Data should be regenerated (same length, but new instances)
      expect(refreshedAssignments.length).toBe(initialAssignments.length);
      // New instances should have new date values
      expect(refreshedAssignments).not.toBe(initialAssignments);
    });

    it("does nothing if demo mode is disabled", () => {
      // Ensure we start with empty data
      expect(useDemoStore.getState().assignments).toHaveLength(0);

      // Try to refresh without enabling demo mode
      useDemoStore.getState().refreshData();

      // Data should still be empty
      const { assignments } = useDemoStore.getState();
      expect(assignments).toHaveLength(0);
    });
  });
});
