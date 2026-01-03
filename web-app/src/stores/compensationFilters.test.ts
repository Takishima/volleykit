import { describe, it, expect, beforeEach } from "vitest";
import { useCompensationFiltersStore } from "./compensationFilters";

describe("CompensationFilters Store", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset store state to defaults
    useCompensationFiltersStore.setState({ hideFutureItems: false });
  });

  it("initializes with hideFutureItems set to false", () => {
    const { hideFutureItems } = useCompensationFiltersStore.getState();
    expect(hideFutureItems).toBe(false);
  });

  it("toggles hideFutureItems when toggleHideFutureItems is called", () => {
    const { toggleHideFutureItems } = useCompensationFiltersStore.getState();

    // Initially false
    expect(useCompensationFiltersStore.getState().hideFutureItems).toBe(false);

    // Toggle to true
    toggleHideFutureItems();
    expect(useCompensationFiltersStore.getState().hideFutureItems).toBe(true);

    // Toggle back to false
    toggleHideFutureItems();
    expect(useCompensationFiltersStore.getState().hideFutureItems).toBe(false);
  });

  it("persists hideFutureItems to localStorage", () => {
    const { toggleHideFutureItems } = useCompensationFiltersStore.getState();

    toggleHideFutureItems();

    // Check that localStorage was updated
    const stored = localStorage.getItem("volleykit-compensation-filters");
    expect(stored).toBeTruthy();

    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.hideFutureItems).toBe(true);
    }
  });

  it("restores state from localStorage on initialization", () => {
    // Simulate persisted state
    localStorage.setItem(
      "volleykit-compensation-filters",
      JSON.stringify({ state: { hideFutureItems: true }, version: 0 }),
    );

    // Force store to rehydrate from localStorage
    useCompensationFiltersStore.persist.rehydrate();

    expect(useCompensationFiltersStore.getState().hideFutureItems).toBe(true);
  });
});
