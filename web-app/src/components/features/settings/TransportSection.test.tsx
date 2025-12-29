import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { TransportSection } from "./TransportSection";
import { useSettingsStore } from "@/stores/settings";
import { useAuthStore } from "@/stores/auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock the stores
vi.mock("@/stores/settings", () => ({
  useSettingsStore: vi.fn(),
  getDefaultArrivalBuffer: (code: string | undefined) => (code === "SV" ? 60 : 45),
  MIN_ARRIVAL_BUFFER_MINUTES: 0,
  MAX_ARRIVAL_BUFFER_MINUTES: 180,
}));

vi.mock("@/stores/auth", () => ({
  useAuthStore: vi.fn(),
}));

vi.mock("@/hooks/useTravelTime", () => ({
  useTravelTimeAvailable: () => true,
}));

vi.mock("@/services/transport", () => ({
  clearTravelTimeCache: vi.fn(),
  getTravelTimeCacheStats: () => ({ entryCount: 0 }),
}));

function createMockSettingsStore(
  overrides: Partial<ReturnType<typeof useSettingsStore>> = {},
) {
  return {
    // Safe mode
    isSafeModeEnabled: false,
    setSafeMode: vi.fn(),

    // Home location
    homeLocation: {
      latitude: 46.9,
      longitude: 7.4,
      label: "Test Location",
      source: "manual" as const,
    },
    setHomeLocation: vi.fn(),

    // Distance filter
    distanceFilter: { enabled: false, maxDistanceKm: 50 },
    setDistanceFilterEnabled: vi.fn(),
    setMaxDistanceKm: vi.fn(),

    // Transport toggle (legacy global)
    transportEnabled: true,
    setTransportEnabled: vi.fn(),

    // Per-association transport
    transportEnabledByAssociation: {},
    setTransportEnabledForAssociation: vi.fn(),
    isTransportEnabledForAssociation: vi.fn().mockReturnValue(true),

    // Travel time filter
    travelTimeFilter: {
      enabled: false,
      maxTravelTimeMinutes: 120,
      arrivalBufferMinutes: 30,
      arrivalBufferByAssociation: {},
      cacheInvalidatedAt: null,
    },
    setTravelTimeFilterEnabled: vi.fn(),
    setMaxTravelTimeMinutes: vi.fn(),
    setArrivalBufferMinutes: vi.fn(),
    setArrivalBufferForAssociation: vi.fn(),
    getArrivalBufferForAssociation: vi.fn().mockReturnValue(60),
    invalidateTravelTimeCache: vi.fn(),

    // Level filter
    levelFilterEnabled: false,
    setLevelFilterEnabled: vi.fn(),

    // Reset
    resetLocationSettings: vi.fn(),

    ...overrides,
  };
}

function createMockAuthStore(
  overrides: Partial<ReturnType<typeof useAuthStore>> = {},
) {
  return {
    user: {
      id: "user-1",
      firstName: "John",
      lastName: "Doe",
      occupations: [
        { id: "ref-1", type: "referee" as const, associationCode: "SV" },
      ],
    },
    activeOccupationId: "ref-1",
    status: "authenticated" as const,
    error: null,
    csrfToken: null,
    isDemoMode: false,
    _checkSessionPromise: null,
    login: vi.fn(),
    logout: vi.fn(),
    checkSession: vi.fn(),
    setUser: vi.fn(),
    setDemoAuthenticated: vi.fn(),
    setActiveOccupation: vi.fn(),
    ...overrides,
  };
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("TransportSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("render stability", () => {
    it("should not cause infinite render loops when mounting", () => {
      // Track render count using a counter object
      const counter = { renders: 0 };
      function RenderCounter({ children }: { children: React.ReactNode }) {
        // eslint-disable-next-line react-hooks/immutability -- test counter
        counter.renders += 1;
        return <>{children}</>;
      }

      vi.mocked(useSettingsStore).mockImplementation((selector) => {
        const state = createMockSettingsStore();
        return typeof selector === "function" ? selector(state) : state;
      });

      vi.mocked(useAuthStore).mockImplementation((selector) => {
        const state = createMockAuthStore();
        return typeof selector === "function" ? selector(state) : state;
      });

      renderWithProviders(
        <RenderCounter>
          <TransportSection />
        </RenderCounter>,
      );

      // Component should render a reasonable number of times (initial + effects)
      // If there's an infinite loop, this would be much higher
      expect(counter.renders).toBeLessThan(10);
    });

    it("should not cause infinite loops when store value changes", () => {
      const counter = { renders: 0 };
      function RenderCounter({ children }: { children: React.ReactNode }) {
        // eslint-disable-next-line react-hooks/immutability -- test counter
        counter.renders += 1;
        return <>{children}</>;
      }

      const mockStore = createMockSettingsStore();

      vi.mocked(useSettingsStore).mockImplementation((selector) => {
        return typeof selector === "function" ? selector(mockStore) : mockStore;
      });

      vi.mocked(useAuthStore).mockImplementation((selector) => {
        const state = createMockAuthStore();
        return typeof selector === "function" ? selector(state) : state;
      });

      const { rerender } = renderWithProviders(
        <RenderCounter>
          <TransportSection />
        </RenderCounter>,
      );

      const initialRenderCount = counter.renders;

      // Simulate store update by re-rendering with new value
      mockStore.travelTimeFilter.arrivalBufferByAssociation = { SV: 90 };

      act(() => {
        rerender(
          <QueryClientProvider client={createQueryClient()}>
            <RenderCounter>
              <TransportSection />
            </RenderCounter>
          </QueryClientProvider>,
        );
      });

      // Should only add a few more renders, not explode
      expect(counter.renders - initialRenderCount).toBeLessThan(5);
    });

    it("should handle hydration-like scenario without infinite loops", () => {
      // Simulate the hydration scenario where arrivalBufferByAssociation
      // starts undefined and then gets populated
      const counter = { renders: 0 };
      function RenderCounter({ children }: { children: React.ReactNode }) {
        // eslint-disable-next-line react-hooks/immutability -- test counter
        counter.renders += 1;
        return <>{children}</>;
      }

      // First render: no per-association settings (simulates pre-hydration)
      const mockStore = createMockSettingsStore({
        travelTimeFilter: {
          arrivalBufferByAssociation: {},
        },
      });

      vi.mocked(useSettingsStore).mockImplementation((selector) => {
        return typeof selector === "function" ? selector(mockStore) : mockStore;
      });

      vi.mocked(useAuthStore).mockImplementation((selector) => {
        const state = createMockAuthStore();
        return typeof selector === "function" ? selector(state) : state;
      });

      const { rerender } = renderWithProviders(
        <RenderCounter>
          <TransportSection />
        </RenderCounter>,
      );

      const preHydrationCount = counter.renders;

      // Simulate hydration: arrivalBufferByAssociation now has a value
      mockStore.travelTimeFilter.arrivalBufferByAssociation = { SV: 60 };

      act(() => {
        rerender(
          <QueryClientProvider client={createQueryClient()}>
            <RenderCounter>
              <TransportSection />
            </RenderCounter>
          </QueryClientProvider>,
        );
      });

      // Total renders should be bounded
      expect(counter.renders).toBeLessThan(15);
      // The hydration step shouldn't cause excessive re-renders
      expect(counter.renders - preHydrationCount).toBeLessThan(5);
    });
  });

  describe("arrival buffer input", () => {
    it("should render arrival time input when transport is enabled", () => {
      vi.mocked(useSettingsStore).mockImplementation((selector) => {
        const state = createMockSettingsStore({
          transportEnabledByAssociation: { SV: true },
        });
        return typeof selector === "function" ? selector(state) : state;
      });

      vi.mocked(useAuthStore).mockImplementation((selector) => {
        const state = createMockAuthStore();
        return typeof selector === "function" ? selector(state) : state;
      });

      renderWithProviders(<TransportSection />);

      expect(
        screen.getByLabelText("Arrive before game"),
      ).toBeInTheDocument();
    });

    it("should not render arrival time input when transport is disabled", () => {
      vi.mocked(useSettingsStore).mockImplementation((selector) => {
        const state = createMockSettingsStore({
          transportEnabled: false,
          transportEnabledByAssociation: { SV: false },
        });
        return typeof selector === "function" ? selector(state) : state;
      });

      vi.mocked(useAuthStore).mockImplementation((selector) => {
        const state = createMockAuthStore();
        return typeof selector === "function" ? selector(state) : state;
      });

      renderWithProviders(<TransportSection />);

      expect(
        screen.queryByLabelText("Arrive before game"),
      ).not.toBeInTheDocument();
    });

    it("should debounce store updates when typing", async () => {
      vi.useFakeTimers();
      const setArrivalBufferForAssociation = vi.fn();

      vi.mocked(useSettingsStore).mockImplementation((selector) => {
        const state = createMockSettingsStore({
          transportEnabledByAssociation: { SV: true },
          setArrivalBufferForAssociation,
        });
        return typeof selector === "function" ? selector(state) : state;
      });

      vi.mocked(useAuthStore).mockImplementation((selector) => {
        const state = createMockAuthStore();
        return typeof selector === "function" ? selector(state) : state;
      });

      renderWithProviders(<TransportSection />);

      const input = screen.getByLabelText("Arrive before game");

      // Type multiple characters quickly
      fireEvent.change(input, { target: { value: "9" } });
      fireEvent.change(input, { target: { value: "90" } });

      // Store should not be called yet (debounced)
      expect(setArrivalBufferForAssociation).not.toHaveBeenCalled();

      // Advance past debounce delay
      act(() => {
        vi.advanceTimersByTime(350);
      });

      // Now store should be called with final value
      expect(setArrivalBufferForAssociation).toHaveBeenCalledTimes(1);
      expect(setArrivalBufferForAssociation).toHaveBeenCalledWith("SV", 90);

      vi.useRealTimers();
    });
  });

  describe("association badge", () => {
    it("should display association code badge", () => {
      vi.mocked(useSettingsStore).mockImplementation((selector) => {
        const state = createMockSettingsStore({
          transportEnabledByAssociation: { SV: true },
        });
        return typeof selector === "function" ? selector(state) : state;
      });

      vi.mocked(useAuthStore).mockImplementation((selector) => {
        const state = createMockAuthStore();
        return typeof selector === "function" ? selector(state) : state;
      });

      renderWithProviders(<TransportSection />);

      // Should show SV badge (association code from mock user)
      expect(screen.getAllByText("SV").length).toBeGreaterThan(0);
    });
  });
});
