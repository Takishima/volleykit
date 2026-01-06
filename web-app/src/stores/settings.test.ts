import { describe, it, expect, beforeEach } from "vitest";
import {
  useSettingsStore,
  type UserLocation,
  type ModeSettings,
  DEFAULT_ARRIVAL_BUFFER_SV_MINUTES,
  DEFAULT_ARRIVAL_BUFFER_REGIONAL_MINUTES,
  getDefaultArrivalBuffer,
} from "./settings";
import type { DataSource } from "./auth";

/** Default mode settings for tests */
const DEFAULT_MODE_SETTINGS: ModeSettings = {
  homeLocation: null,
  distanceFilter: { enabled: false, maxDistanceKm: 50 },
  transportEnabled: false,
  transportEnabledByAssociation: {},
  travelTimeFilter: {
    enabled: false,
    maxTravelTimeMinutes: 120,
    arrivalBufferMinutes: 30,
    arrivalBufferByAssociation: {},
    cacheInvalidatedAt: null,
  },
  levelFilterEnabled: false,
};

/** Helper to reset store to clean state */
function resetStore(mode: DataSource = "api") {
  useSettingsStore.setState({
    // Global settings
    isSafeModeEnabled: true,
    preventZoom: false,
    // Mode tracking
    currentMode: mode,
    settingsByMode: {
      api: { ...DEFAULT_MODE_SETTINGS },
      demo: { ...DEFAULT_MODE_SETTINGS },
      calendar: { ...DEFAULT_MODE_SETTINGS },
    },
    // Top-level properties (synced from current mode)
    homeLocation: DEFAULT_MODE_SETTINGS.homeLocation,
    distanceFilter: { ...DEFAULT_MODE_SETTINGS.distanceFilter },
    transportEnabled: DEFAULT_MODE_SETTINGS.transportEnabled,
    transportEnabledByAssociation: { ...DEFAULT_MODE_SETTINGS.transportEnabledByAssociation },
    travelTimeFilter: { ...DEFAULT_MODE_SETTINGS.travelTimeFilter },
    levelFilterEnabled: DEFAULT_MODE_SETTINGS.levelFilterEnabled,
  });
}

describe("useSettingsStore", () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
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

  describe("mode-specific settings", () => {
    it("should store settings separately for each mode", () => {
      const testLocation: UserLocation = {
        latitude: 47.3769,
        longitude: 8.5417,
        label: "Zürich, Switzerland",
        source: "geocoded",
      };

      // Set location in API mode
      useSettingsStore.getState()._setCurrentMode("api");
      useSettingsStore.getState().setHomeLocation(testLocation);

      // Switch to demo mode
      useSettingsStore.getState()._setCurrentMode("demo");

      // Demo mode should have null location
      expect(useSettingsStore.getState().homeLocation).toBeNull();

      // Switch back to API mode
      useSettingsStore.getState()._setCurrentMode("api");

      // API mode should still have the location
      expect(useSettingsStore.getState().homeLocation).toEqual(testLocation);
    });

    it("should clear only current mode settings when resetLocationSettings is called", () => {
      const testLocation: UserLocation = {
        latitude: 47.3769,
        longitude: 8.5417,
        label: "Zürich, Switzerland",
        source: "geocoded",
      };

      // Set location in both modes
      useSettingsStore.getState()._setCurrentMode("api");
      useSettingsStore.getState().setHomeLocation(testLocation);

      useSettingsStore.getState()._setCurrentMode("demo");
      useSettingsStore.getState().setHomeLocation(testLocation);

      // Reset demo mode settings
      useSettingsStore.getState().resetLocationSettings();

      // Demo mode should be cleared
      expect(useSettingsStore.getState().homeLocation).toBeNull();

      // API mode should still have location
      useSettingsStore.getState()._setCurrentMode("api");
      expect(useSettingsStore.getState().homeLocation).toEqual(testLocation);
    });

    it("should persist settings by mode", () => {
      const apiLocation: UserLocation = {
        latitude: 47.3769,
        longitude: 8.5417,
        label: "Zürich",
        source: "geocoded",
      };

      const demoLocation: UserLocation = {
        latitude: 46.949,
        longitude: 7.4474,
        label: "Bern",
        source: "geocoded",
      };

      // Set different locations for different modes
      useSettingsStore.getState()._setCurrentMode("api");
      useSettingsStore.getState().setHomeLocation(apiLocation);

      useSettingsStore.getState()._setCurrentMode("demo");
      useSettingsStore.getState().setHomeLocation(demoLocation);

      const storageKey = "volleykit-settings";
      const persistedData = localStorage.getItem(storageKey);
      expect(persistedData).toBeTruthy();

      if (persistedData) {
        const parsed = JSON.parse(persistedData);
        expect(parsed.state.settingsByMode.api.homeLocation).toEqual(apiLocation);
        expect(parsed.state.settingsByMode.demo.homeLocation).toEqual(demoLocation);
        expect(parsed.state.settingsByMode.calendar.homeLocation).toBeNull();
      }
    });
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

    it("should persist home location in current mode", () => {
      const { setHomeLocation } = useSettingsStore.getState();

      setHomeLocation(testLocation);

      const storageKey = "volleykit-settings";
      const persistedData = localStorage.getItem(storageKey);
      expect(persistedData).toBeTruthy();

      if (persistedData) {
        const parsed = JSON.parse(persistedData);
        // Current mode is "api"
        expect(parsed.state.settingsByMode.api.homeLocation).toEqual(testLocation);
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

    it("should persist distance filter settings in current mode", () => {
      const { setDistanceFilterEnabled, setMaxDistanceKm } =
        useSettingsStore.getState();

      setDistanceFilterEnabled(true);
      setMaxDistanceKm(75);

      const storageKey = "volleykit-settings";
      const persistedData = localStorage.getItem(storageKey);
      expect(persistedData).toBeTruthy();

      if (persistedData) {
        const parsed = JSON.parse(persistedData);
        expect(parsed.state.settingsByMode.api.distanceFilter.enabled).toBe(true);
        expect(parsed.state.settingsByMode.api.distanceFilter.maxDistanceKm).toBe(75);
      }
    });
  });

  describe("per-association transport settings", () => {
    beforeEach(() => {
      resetStore();
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
      resetStore();
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

      it("should persist per-association settings in current mode", () => {
        const { setArrivalBufferForAssociation } = useSettingsStore.getState();

        setArrivalBufferForAssociation("SV", 120);

        const storageKey = "volleykit-settings";
        const persistedData = localStorage.getItem(storageKey);
        expect(persistedData).toBeTruthy();

        if (persistedData) {
          const parsed = JSON.parse(persistedData);
          expect(parsed.state.settingsByMode.api.travelTimeFilter.arrivalBufferByAssociation["SV"]).toBe(120);
        }
      });
    });
  });

  describe("persistence migration", () => {
    it("should migrate version 1 flat settings to version 2 settingsByMode", () => {
      const testLocation: UserLocation = {
        latitude: 47.3769,
        longitude: 8.5417,
        label: "Zürich, Switzerland",
        source: "geocoded",
      };

      // Simulate version 1 data (flat structure)
      const v1Data = {
        state: {
          isSafeModeEnabled: false,
          preventZoom: true,
          homeLocation: testLocation,
          distanceFilter: { enabled: true, maxDistanceKm: 30 },
          transportEnabled: true,
          transportEnabledByAssociation: { SV: false },
          travelTimeFilter: {
            enabled: true,
            maxTravelTimeMinutes: 90,
            arrivalBufferMinutes: 45,
            arrivalBufferByAssociation: { SV: 60 },
            cacheInvalidatedAt: null,
          },
          levelFilterEnabled: true,
        },
        version: 1,
      };
      localStorage.setItem("volleykit-settings", JSON.stringify(v1Data));

      // Trigger rehydration
      useSettingsStore.persist.rehydrate();

      const state = useSettingsStore.getState();

      // Global settings should be preserved
      expect(state.isSafeModeEnabled).toBe(false);
      expect(state.preventZoom).toBe(true);

      // Old settings should be migrated to API mode
      useSettingsStore.getState()._setCurrentMode("api");
      expect(state.settingsByMode.api.homeLocation).toEqual(testLocation);
      expect(state.settingsByMode.api.distanceFilter.enabled).toBe(true);
      expect(state.settingsByMode.api.transportEnabled).toBe(true);
      expect(state.settingsByMode.api.travelTimeFilter.enabled).toBe(true);

      // Demo and calendar modes should have defaults
      expect(state.settingsByMode.demo.homeLocation).toBeNull();
      expect(state.settingsByMode.calendar.homeLocation).toBeNull();
    });
  });

  describe("persistence resilience", () => {
    const testLocation: UserLocation = {
      latitude: 47.3769,
      longitude: 8.5417,
      label: "Zürich, Switzerland",
      source: "geocoded",
    };

    beforeEach(() => {
      localStorage.clear();
      resetStore();
    });

    it("should preserve homeLocation when localStorage has partial data", () => {
      // Simulate partial localStorage data with new structure
      const partialData = {
        state: {
          settingsByMode: {
            api: { homeLocation: testLocation },
            // Missing other fields
          },
        },
        version: 2,
      };
      localStorage.setItem("volleykit-settings", JSON.stringify(partialData));

      // Trigger rehydration
      useSettingsStore.persist.rehydrate();

      const state = useSettingsStore.getState();
      expect(state.settingsByMode.api.homeLocation).toEqual(testLocation);
      // Other fields should have defaults
      expect(state.settingsByMode.api.distanceFilter.enabled).toBe(false);
      expect(state.settingsByMode.api.distanceFilter.maxDistanceKm).toBe(50);
    });

    it("should use defaults when localStorage data is completely corrupted", () => {
      // Simulate corrupted data
      localStorage.setItem("volleykit-settings", "not-valid-json{");

      // This should not throw and should use defaults
      useSettingsStore.persist.rehydrate();

      const state = useSettingsStore.getState();
      expect(state.settingsByMode.api.homeLocation).toBeNull();
      expect(state.isSafeModeEnabled).toBe(true);
    });

    it("should merge nested travelTimeFilter fields correctly", () => {
      // Simulate data missing new nested fields
      const oldData = {
        state: {
          settingsByMode: {
            api: {
              homeLocation: testLocation,
              travelTimeFilter: {
                enabled: true,
                maxTravelTimeMinutes: 90,
                // Missing arrivalBufferByAssociation
              },
            },
          },
        },
        version: 2,
      };
      localStorage.setItem("volleykit-settings", JSON.stringify(oldData));

      useSettingsStore.persist.rehydrate();

      const state = useSettingsStore.getState();
      expect(state.settingsByMode.api.homeLocation).toEqual(testLocation);
      expect(state.settingsByMode.api.travelTimeFilter.enabled).toBe(true);
      expect(state.settingsByMode.api.travelTimeFilter.maxTravelTimeMinutes).toBe(90);
      // New field should have default value
      expect(state.settingsByMode.api.travelTimeFilter.arrivalBufferByAssociation).toEqual({});
    });
  });
});
