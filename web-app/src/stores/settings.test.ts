import { describe, it, expect, beforeEach } from "vitest";
import { useSettingsStore, type UserLocation } from "./settings";

describe("useSettingsStore", () => {
  beforeEach(() => {
    useSettingsStore.setState({
      isSafeModeEnabled: true,
      homeLocation: null,
      distanceFilter: { enabled: false, maxDistanceKm: 50 },
    });
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

  describe("homeLocation", () => {
    const testLocation: UserLocation = {
      latitude: 47.3769,
      longitude: 8.5417,
      label: "Zürich, Switzerland",
      source: "geocoded",
    };

    it("should have null home location by default", () => {
      const { homeLocation } = useSettingsStore.getState();
      expect(homeLocation).toBeNull();
    });

    it("should allow setting home location", () => {
      const { setHomeLocation } = useSettingsStore.getState();

      setHomeLocation(testLocation);

      const { homeLocation } = useSettingsStore.getState();
      expect(homeLocation).toEqual(testLocation);
    });

    it("should allow clearing home location", () => {
      const { setHomeLocation } = useSettingsStore.getState();

      setHomeLocation(testLocation);
      setHomeLocation(null);

      const { homeLocation } = useSettingsStore.getState();
      expect(homeLocation).toBeNull();
    });

    it("should persist home location", () => {
      const { setHomeLocation } = useSettingsStore.getState();

      setHomeLocation(testLocation);

      const storageKey = "volleykit-settings";
      const persistedData = localStorage.getItem(storageKey);
      expect(persistedData).toBeTruthy();

      if (persistedData) {
        const parsed = JSON.parse(persistedData);
        expect(parsed.state.homeLocation).toEqual(testLocation);
      }
    });
  });

  describe("distanceFilter", () => {
    it("should have distance filter disabled by default", () => {
      const { distanceFilter } = useSettingsStore.getState();
      expect(distanceFilter.enabled).toBe(false);
      expect(distanceFilter.maxDistanceKm).toBe(50);
    });

    it("should allow enabling distance filter", () => {
      const { setDistanceFilterEnabled } = useSettingsStore.getState();

      setDistanceFilterEnabled(true);

      const { distanceFilter } = useSettingsStore.getState();
      expect(distanceFilter.enabled).toBe(true);
    });

    it("should allow setting max distance", () => {
      const { setMaxDistanceKm } = useSettingsStore.getState();

      setMaxDistanceKm(30);

      const { distanceFilter } = useSettingsStore.getState();
      expect(distanceFilter.maxDistanceKm).toBe(30);
    });

    it("should preserve other filter settings when updating", () => {
      const { setDistanceFilterEnabled, setMaxDistanceKm } =
        useSettingsStore.getState();

      setDistanceFilterEnabled(true);
      setMaxDistanceKm(25);

      const { distanceFilter } = useSettingsStore.getState();
      expect(distanceFilter.enabled).toBe(true);
      expect(distanceFilter.maxDistanceKm).toBe(25);
    });

    it("should persist distance filter settings", () => {
      const { setDistanceFilterEnabled, setMaxDistanceKm } =
        useSettingsStore.getState();

      setDistanceFilterEnabled(true);
      setMaxDistanceKm(75);

      const storageKey = "volleykit-settings";
      const persistedData = localStorage.getItem(storageKey);
      expect(persistedData).toBeTruthy();

      if (persistedData) {
        const parsed = JSON.parse(persistedData);
        expect(parsed.state.distanceFilter.enabled).toBe(true);
        expect(parsed.state.distanceFilter.maxDistanceKm).toBe(75);
      }
    });
  });
});
