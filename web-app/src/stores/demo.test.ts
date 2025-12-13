import { describe, it, expect, beforeEach } from "vitest";
import { useDemoStore } from "./demo";

describe("useDemoStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    useDemoStore.setState({
      assignments: [],
      compensations: [],
      exchanges: [],
    });
  });

  describe("initial state", () => {
    it("starts with empty data arrays", () => {
      const state = useDemoStore.getState();
      expect(state.assignments).toHaveLength(0);
      expect(state.compensations).toHaveLength(0);
      expect(state.exchanges).toHaveLength(0);
    });
  });

  describe("initializeDemoData", () => {
    it("populates demo data arrays", () => {
      // Before initializing, data should be empty
      expect(useDemoStore.getState().assignments).toHaveLength(0);

      // Initialize demo data
      useDemoStore.getState().initializeDemoData();

      // After initializing, data should be populated
      const state = useDemoStore.getState();
      expect(state.assignments.length).toBeGreaterThan(0);
      expect(state.compensations.length).toBeGreaterThan(0);
      expect(state.exchanges.length).toBeGreaterThan(0);
    });

    it("generates valid assignment data", () => {
      useDemoStore.getState().initializeDemoData();

      const { assignments } = useDemoStore.getState();
      expect(assignments.length).toBeGreaterThan(0);

      const firstAssignment = assignments[0];
      expect(firstAssignment).toHaveProperty("__identity");
      expect(firstAssignment).toHaveProperty("refereeConvocationStatus");
      expect(firstAssignment).toHaveProperty("refereePosition");
      expect(firstAssignment).toHaveProperty("refereeGame");
    });

    it("generates valid compensation data", () => {
      useDemoStore.getState().initializeDemoData();

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
      useDemoStore.getState().initializeDemoData();

      const { exchanges } = useDemoStore.getState();
      expect(exchanges.length).toBeGreaterThan(0);

      const firstExchange = exchanges[0];
      expect(firstExchange).toHaveProperty("__identity");
      expect(firstExchange).toHaveProperty("status");
      expect(firstExchange).toHaveProperty("refereeGame");
    });
  });

  describe("clearDemoData", () => {
    it("clears all demo data", () => {
      // Initialize and verify data exists
      useDemoStore.getState().initializeDemoData();
      expect(useDemoStore.getState().assignments.length).toBeGreaterThan(0);

      // Clear and verify data is empty
      useDemoStore.getState().clearDemoData();
      const state = useDemoStore.getState();
      expect(state.assignments).toHaveLength(0);
      expect(state.compensations).toHaveLength(0);
      expect(state.exchanges).toHaveLength(0);
    });
  });

  describe("refreshData", () => {
    it("regenerates demo data with fresh dates", () => {
      useDemoStore.getState().initializeDemoData();
      const initialAssignments = useDemoStore.getState().assignments;

      // Refresh data
      useDemoStore.getState().refreshData();
      const refreshedAssignments = useDemoStore.getState().assignments;

      // Data should be regenerated (same length, but new instances)
      expect(refreshedAssignments.length).toBe(initialAssignments.length);
      // New instances should have new date values
      expect(refreshedAssignments).not.toBe(initialAssignments);
    });
  });
});
