import { describe, it, expect, beforeEach } from "vitest";
import {
  useSettingsStore,
  type UserLocation,
  DEFAULT_ARRIVAL_BUFFER_SV_MINUTES,
  DEFAULT_ARRIVAL_BUFFER_REGIONAL_MINUTES,
  getDefaultArrivalBuffer,
} from "./settings";

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

  describe("per-association transport settings", () => {
    beforeEach(() => {
      useSettingsStore.setState({
        transportEnabled: false,
        transportEnabledByAssociation: {},
        travelTimeFilter: {
          enabled: false,
          maxTravelTimeMinutes: 120,
          arrivalBufferMinutes: 30,
          arrivalBufferByAssociation: {},
          cacheInvalidatedAt: null,
        },
      });
    });

    describe("isTransportEnabledForAssociation", () => {
      it("should fall back to global transportEnabled when no per-association setting exists", () => {
        const { isTransportEnabledForAssociation, setTransportEnabled } = useSettingsStore.getState();

        // With global transport disabled
        expect(isTransportEnabledForAssociation("SV")).toBe(false);

        // Enable global transport
        setTransportEnabled(true);
        expect(isTransportEnabledForAssociation("SV")).toBe(true);
      });

      it("should use per-association setting when available", () => {
        const { isTransportEnabledForAssociation, setTransportEnabledForAssociation, setTransportEnabled } =
          useSettingsStore.getState();

        // Set global to true but SV to false
        setTransportEnabled(true);
        setTransportEnabledForAssociation("SV", false);

        expect(isTransportEnabledForAssociation("SV")).toBe(false);
        // Other associations should still use global
        expect(isTransportEnabledForAssociation("SVRBA")).toBe(true);
      });

      it("should handle undefined association code gracefully", () => {
        const { isTransportEnabledForAssociation, setTransportEnabled } = useSettingsStore.getState();

        setTransportEnabled(true);
        expect(isTransportEnabledForAssociation(undefined)).toBe(true);
      });
    });

    describe("setTransportEnabledForAssociation", () => {
      it("should set per-association transport setting", () => {
        const { setTransportEnabledForAssociation } = useSettingsStore.getState();

        setTransportEnabledForAssociation("SV", true);

        const state = useSettingsStore.getState();
        expect(state.transportEnabledByAssociation["SV"]).toBe(true);
      });

      it("should preserve settings for other associations", () => {
        const { setTransportEnabledForAssociation } = useSettingsStore.getState();

        setTransportEnabledForAssociation("SV", true);
        setTransportEnabledForAssociation("SVRBA", false);

        const state = useSettingsStore.getState();
        expect(state.transportEnabledByAssociation["SV"]).toBe(true);
        expect(state.transportEnabledByAssociation["SVRBA"]).toBe(false);
      });
    });
  });

  describe("per-association arrival buffer settings", () => {
    beforeEach(() => {
      useSettingsStore.setState({
        travelTimeFilter: {
          enabled: false,
          maxTravelTimeMinutes: 120,
          arrivalBufferMinutes: 30,
          arrivalBufferByAssociation: {},
          cacheInvalidatedAt: null,
        },
      });
    });

    describe("getDefaultArrivalBuffer", () => {
      it("should return 60 minutes for SV (Swiss Volley national)", () => {
        expect(getDefaultArrivalBuffer("SV")).toBe(DEFAULT_ARRIVAL_BUFFER_SV_MINUTES);
        expect(getDefaultArrivalBuffer("SV")).toBe(60);
      });

      it("should return 45 minutes for regional associations", () => {
        expect(getDefaultArrivalBuffer("SVRBA")).toBe(DEFAULT_ARRIVAL_BUFFER_REGIONAL_MINUTES);
        expect(getDefaultArrivalBuffer("SVRZ")).toBe(45);
        expect(getDefaultArrivalBuffer("OTHER")).toBe(45);
      });

      it("should return 45 minutes for undefined association", () => {
        expect(getDefaultArrivalBuffer(undefined)).toBe(DEFAULT_ARRIVAL_BUFFER_REGIONAL_MINUTES);
      });
    });

    describe("getArrivalBufferForAssociation", () => {
      it("should return default value when no custom setting exists", () => {
        const { getArrivalBufferForAssociation } = useSettingsStore.getState();

        expect(getArrivalBufferForAssociation("SV")).toBe(60);
        expect(getArrivalBufferForAssociation("SVRBA")).toBe(45);
      });

      it("should return custom value when set", () => {
        const { getArrivalBufferForAssociation, setArrivalBufferForAssociation } =
          useSettingsStore.getState();

        setArrivalBufferForAssociation("SV", 90);

        expect(getArrivalBufferForAssociation("SV")).toBe(90);
        // Other associations should still use default
        expect(getArrivalBufferForAssociation("SVRBA")).toBe(45);
      });

      it("should handle undefined association code", () => {
        const { getArrivalBufferForAssociation } = useSettingsStore.getState();

        expect(getArrivalBufferForAssociation(undefined)).toBe(45);
      });
    });

    describe("setArrivalBufferForAssociation", () => {
      it("should set per-association arrival buffer", () => {
        const { setArrivalBufferForAssociation, getArrivalBufferForAssociation } =
          useSettingsStore.getState();

        setArrivalBufferForAssociation("SV", 75);

        expect(getArrivalBufferForAssociation("SV")).toBe(75);
      });

      it("should preserve settings for other associations", () => {
        const { setArrivalBufferForAssociation, getArrivalBufferForAssociation } =
          useSettingsStore.getState();

        setArrivalBufferForAssociation("SV", 90);
        setArrivalBufferForAssociation("SVRBA", 30);

        expect(getArrivalBufferForAssociation("SV")).toBe(90);
        expect(getArrivalBufferForAssociation("SVRBA")).toBe(30);
        // SVRZ should still use default
        expect(getArrivalBufferForAssociation("SVRZ")).toBe(45);
      });

      it("should persist per-association settings", () => {
        const { setArrivalBufferForAssociation } = useSettingsStore.getState();

        setArrivalBufferForAssociation("SV", 120);

        const storageKey = "volleykit-settings";
        const persistedData = localStorage.getItem(storageKey);
        expect(persistedData).toBeTruthy();

        if (persistedData) {
          const parsed = JSON.parse(persistedData);
          expect(parsed.state.travelTimeFilter.arrivalBufferByAssociation["SV"]).toBe(120);
        }
      });
    });
  });
});
