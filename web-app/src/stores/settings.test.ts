import { describe, it, expect, beforeEach } from "vitest";
import { useSettingsStore } from "./settings";

describe("useSettingsStore", () => {
  beforeEach(() => {
    useSettingsStore.setState({ isSafeModeEnabled: true });
    localStorage.clear();
  });

  it("should have safe mode enabled by default", () => {
    const { isSafeModeEnabled } = useSettingsStore.getState();
    expect(isSafeModeEnabled).toBe(true);
  });

  it("should allow disabling safe mode", () => {
    const { setSafeMode } = useSettingsStore.getState();

    setSafeMode(false);

    const { isSafeModeEnabled } = useSettingsStore.getState();
    expect(isSafeModeEnabled).toBe(false);
  });

  it("should allow enabling safe mode", () => {
    const { setSafeMode } = useSettingsStore.getState();

    setSafeMode(false);
    setSafeMode(true);

    const { isSafeModeEnabled } = useSettingsStore.getState();
    expect(isSafeModeEnabled).toBe(true);
  });

  it("should persist safe mode setting", () => {
    const { setSafeMode } = useSettingsStore.getState();

    setSafeMode(false);

    const storageKey = "volleykit-settings";
    const persistedData = localStorage.getItem(storageKey);
    expect(persistedData).toBeTruthy();

    if (persistedData) {
      const parsed = JSON.parse(persistedData);
      expect(parsed.state.isSafeModeEnabled).toBe(false);
    }
  });
});
