import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSwissGeocode } from "./useSwissGeocode";

describe("useSwissGeocode", () => {
  const mockFetch = vi.fn();
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = mockFetch;
    mockFetch.mockReset();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const mockGeoAdminResults = {
    results: [
      {
        id: 2867655,
        weight: 1602,
        attrs: {
          origin: "address",
          detail: "bederstrasse 1 8002 zuerich 261 zuerich ch zh",
          label: "Bederstrasse 1 <b>8002 Zürich</b>",
          lat: 47.364768981933594,
          lon: 8.531177520751953,
          x: 246566.03125,
          y: 682527.125,
          rank: 7,
          num: 1,
          zoomlevel: 10,
        },
      },
      {
        id: 1982103,
        weight: 1602,
        attrs: {
          origin: "address",
          detail: "bederstrasse 2 8002 zuerich 261 zuerich ch zh",
          label: "Bederstrasse 2 <b>8002 Zürich</b>",
          lat: 47.365299224853516,
          lon: 8.53133487701416,
          x: 246625.171875,
          y: 682538.25,
          rank: 7,
          num: 2,
          zoomlevel: 10,
        },
      },
    ],
  };

  describe("initial state", () => {
    it("returns correct initial state", () => {
      const { result } = renderHook(() => useSwissGeocode());

      expect(result.current.results).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.search).toBe("function");
      expect(typeof result.current.clear).toBe("function");
    });
  });

  describe("search", () => {
    it("ignores queries shorter than 3 characters", async () => {
      const { result } = renderHook(() => useSwissGeocode());

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
        json: async () => mockGeoAdminResults,
      });

      const { result } = renderHook(() => useSwissGeocode());

      act(() => {
        result.current.search("Zurich");
      });

      expect(result.current.isLoading).toBe(true);
    });

    it("returns geocoded results on success", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGeoAdminResults,
      });

      const { result } = renderHook(() => useSwissGeocode());

      act(() => {
        result.current.search("Bederstrasse Zurich");
      });

      await waitFor(() => {
        expect(result.current.results).toHaveLength(2);
      });

      expect(result.current.results[0]).toEqual({
        id: 2867655,
        latitude: 47.364768981933594,
        longitude: 8.531177520751953,
        lv95X: 246566.03125,
        lv95Y: 682527.125,
        label: "Bederstrasse 1 <b>8002 Zürich</b>",
        detail: "bederstrasse 1 8002 zuerich 261 zuerich ch zh",
        origin: "address",
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("makes request with correct parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      });

      const { result } = renderHook(() => useSwissGeocode());

      act(() => {
        result.current.search("Basel");
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const url = mockFetch.mock.calls[0]?.[0] as string;
      expect(url).toContain("api3.geo.admin.ch/rest/services/api/SearchServer");
      expect(url).toContain("searchText=Basel");
      expect(url).toContain("type=locations");
      expect(url).toContain("limit=5");
    });

    it("uses custom limit", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      });

      const { result } = renderHook(() => useSwissGeocode({ limit: 10 }));

      act(() => {
        result.current.search("Bern");
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const url = mockFetch.mock.calls[0]?.[0] as string;
      expect(url).toContain("limit=10");
    });

    it("caps limit at 50", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      });

      const { result } = renderHook(() => useSwissGeocode({ limit: 100 }));

      act(() => {
        result.current.search("Geneva");
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const url = mockFetch.mock.calls[0]?.[0] as string;
      expect(url).toContain("limit=50");
    });

    it("filters by origins when specified", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      });

      const { result } = renderHook(() =>
        useSwissGeocode({ origins: ["address", "zipcode"] }),
      );

      act(() => {
        result.current.search("8002");
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const url = mockFetch.mock.calls[0]?.[0] as string;
      expect(url).toContain("origins=address%2Czipcode");
    });

    it("handles HTTP error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useSwissGeocode());

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

      const { result } = renderHook(() => useSwissGeocode());

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

      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => mockGeoAdminResults,
                }),
              1000,
            ),
          ),
      );

      const { result } = renderHook(() => useSwissGeocode());

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

      const { result } = renderHook(() => useSwissGeocode());

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
        json: async () => mockGeoAdminResults,
      });

      const { result } = renderHook(() => useSwissGeocode());

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
