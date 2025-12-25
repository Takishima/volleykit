import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useGeocode } from "./useGeocode";

describe("useGeocode", () => {
  const mockFetch = vi.fn();
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = mockFetch;
    mockFetch.mockReset();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const mockNominatimResults = [
    {
      place_id: 12345,
      lat: "47.3769",
      lon: "8.5417",
      display_name: "Zürich, Switzerland",
    },
    {
      place_id: 67890,
      lat: "47.3667",
      lon: "8.55",
      display_name: "Zürich Hauptbahnhof, Switzerland",
    },
  ];

  describe("initial state", () => {
    it("returns correct initial state", () => {
      const { result } = renderHook(() => useGeocode());

      expect(result.current.results).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.search).toBe("function");
      expect(typeof result.current.clear).toBe("function");
    });
  });

  describe("search", () => {
    it("ignores queries shorter than 3 characters", async () => {
      const { result } = renderHook(() => useGeocode());

      act(() => {
        result.current.search("ab");
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.results).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it("sets loading state when searching", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNominatimResults,
      });

      const { result } = renderHook(() => useGeocode());

      act(() => {
        result.current.search("Zurich");
      });

      expect(result.current.isLoading).toBe(true);
    });

    it("returns geocoded results on success", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNominatimResults,
      });

      const { result } = renderHook(() => useGeocode());

      act(() => {
        result.current.search("Zurich");
      });

      await waitFor(() => {
        expect(result.current.results).toHaveLength(2);
      });

      expect(result.current.results[0]).toEqual({
        placeId: 12345,
        latitude: 47.3769,
        longitude: 8.5417,
        displayName: "Zürich, Switzerland",
      });
      expect(result.current.results[1]).toEqual({
        placeId: 67890,
        latitude: 47.3667,
        longitude: 8.55,
        displayName: "Zürich Hauptbahnhof, Switzerland",
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("makes request with correct parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const { result } = renderHook(() => useGeocode());

      act(() => {
        result.current.search("Basel");
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const url = mockFetch.mock.calls[0]?.[0] as string;
      expect(url).toContain("nominatim.openstreetmap.org/search");
      expect(url).toContain("q=Basel");
      expect(url).toContain("format=json");
      expect(url).toContain("countrycodes=ch");
      expect(url).toContain("limit=5");
    });

    it("uses custom country code", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const { result } = renderHook(() =>
        useGeocode({ countryCode: "de", limit: 10 }),
      );

      act(() => {
        result.current.search("Berlin");
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const url = mockFetch.mock.calls[0]?.[0] as string;
      expect(url).toContain("countrycodes=de");
      expect(url).toContain("limit=10");
    });

    it("handles HTTP error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useGeocode());

      act(() => {
        result.current.search("Zurich");
      });

      await waitFor(() => {
        expect(result.current.error).toBe("geocode_failed");
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.results).toEqual([]);
    });

    it("handles network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useGeocode());

      act(() => {
        result.current.search("Zurich");
      });

      await waitFor(() => {
        expect(result.current.error).toBe("geocode_failed");
      });
      expect(result.current.isLoading).toBe(false);
    });

    it("cancels previous request when new search is made", async () => {
      const abortSpy = vi.fn();
      const OriginalAbortController = globalThis.AbortController;
      globalThis.AbortController = class MockAbortController {
        signal = { aborted: false };
        abort = abortSpy;
      } as unknown as typeof AbortController;

      // First request takes a long time
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => mockNominatimResults,
                }),
              1000,
            ),
          ),
      );

      const { result } = renderHook(() => useGeocode());

      act(() => {
        result.current.search("First query");
      });

      act(() => {
        result.current.search("Second query");
      });

      expect(abortSpy).toHaveBeenCalled();

      globalThis.AbortController = OriginalAbortController;
    });

    it("ignores abort errors", async () => {
      const abortError = new Error("Aborted");
      abortError.name = "AbortError";
      mockFetch.mockRejectedValueOnce(abortError);

      const { result } = renderHook(() => useGeocode());

      act(() => {
        result.current.search("Zurich");
      });

      // Wait a bit to ensure state doesn't change
      await new Promise((resolve) => setTimeout(resolve, 50));

      // AbortError should not set error state
      expect(result.current.error).toBeNull();
    });
  });

  describe("clear", () => {
    it("clears results and error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNominatimResults,
      });

      const { result } = renderHook(() => useGeocode());

      act(() => {
        result.current.search("Zurich");
      });

      await waitFor(() => {
        expect(result.current.results).toHaveLength(2);
      });

      act(() => {
        result.current.clear();
      });

      expect(result.current.results).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });
});
