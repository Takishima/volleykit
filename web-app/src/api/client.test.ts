import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api, setCsrfToken, clearSession } from "./client";

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Helper to create mock response with headers
function createMockResponse(
  data: unknown,
  options: {
    ok?: boolean;
    status?: number;
    statusText?: string;
    contentType?: string;
  } = {},
) {
  const {
    ok = true,
    status = 200,
    statusText = "OK",
    contentType = "application/json",
  } = options;
  return {
    ok,
    status,
    statusText,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "content-type" ? contentType : null,
    },
    json: () => Promise.resolve(data),
  };
}

// Valid mock response structures that pass Zod validation
const mockAssignmentsResponse = { items: [], totalItemsCount: 0 };
const mockCompensationsResponse = { items: [], totalItemsCount: 0 };
const mockExchangesResponse = { items: [], totalItemsCount: 0 };

describe("API Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSession();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("setCsrfToken / clearSession", () => {
    it("setCsrfToken stores token for use in requests", async () => {
      setCsrfToken("test-token-123");

      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockAssignmentsResponse),
      );

      await api.searchAssignments({});

      // Check that CSRF token was included in the request
      const [, options] = mockFetch.mock.calls[0]!;
      const body = options.body as URLSearchParams;
      expect(body.get("__csrfToken")).toBe("test-token-123");
    });

    it("clearSession removes CSRF token", async () => {
      setCsrfToken("test-token");
      clearSession();

      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockAssignmentsResponse),
      );

      await api.searchAssignments({});

      const [, options] = mockFetch.mock.calls[0]!;
      const body = options.body as URLSearchParams;
      expect(body.get("__csrfToken")).toBeNull();
    });
  });

  describe("error handling", () => {
    it("throws error on non-OK response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        headers: {
          get: () => null,
        },
        text: () => Promise.resolve(""),
      });

      await expect(api.searchAssignments({})).rejects.toThrow(
        "500 Internal Server Error",
      );
    });

    it("clears session and throws on 401 response", async () => {
      setCsrfToken("some-token");

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      await expect(api.searchAssignments({})).rejects.toThrow(
        "Session expired. Please log in again.",
      );
    });

    it("clears session and throws on 403 response", async () => {
      setCsrfToken("some-token");

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
      });

      await expect(api.searchAssignments({})).rejects.toThrow(
        "Session expired. Please log in again.",
      );
    });

    it("clears session and throws on 406 response", async () => {
      setCsrfToken("some-token");

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 406,
        statusText: "Not Acceptable",
      });

      await expect(api.searchAssignments({})).rejects.toThrow(
        "Session expired. Please log in again.",
      );
    });

    it("throws error on invalid JSON response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) =>
            name.toLowerCase() === "content-type" ? "application/json" : null,
        },
        json: () => Promise.reject(new SyntaxError("Unexpected token")),
      });

      await expect(api.searchAssignments({})).rejects.toThrow(
        "Invalid JSON response (Content-Type: application/json, status: 200)",
      );
    });

    it("parses JSON even when content type is text/html", async () => {
      // TYPO3 Neos/Flow backend sometimes returns JSON with text/html Content-Type
      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockAssignmentsResponse, {
          contentType: "text/html",
        }),
      );

      const result = await api.searchAssignments({});
      expect(result).toEqual(mockAssignmentsResponse);
    });
  });

  describe("searchAssignments", () => {
    it("sends POST request to correct endpoint", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockAssignmentsResponse),
      );

      await api.searchAssignments({});

      // Note: backslash in path is required by Neos/Flow backend
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "/indoorvolleyball.refadmin/api%5crefereeconvocation/searchMyRefereeConvocations",
        ),
        expect.objectContaining({
          method: "POST",
          credentials: "include",
        }),
      );
    });

    it("uses pre-encoded %5c in URL paths (not literal backslash)", async () => {
      // This test prevents regression to literal backslashes which browsers don't encode
      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockAssignmentsResponse),
      );

      await api.searchAssignments({});

      const [url] = mockFetch.mock.calls[0]!;
      expect(url).toContain("%5c");
      // Verify no literal backslash in the URL
      expect(url).not.toMatch(/api\\/);
    });

    it("includes search configuration in request", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockAssignmentsResponse),
      );

      await api.searchAssignments({
        offset: 0,
        limit: 10,
      });

      const [, options] = mockFetch.mock.calls[0]!;
      const body = options.body as URLSearchParams;
      expect(body.get("searchConfiguration[offset]")).toBe("0");
      expect(body.get("searchConfiguration[limit]")).toBe("10");
    });

    it("includes propertyRenderConfiguration in request", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockAssignmentsResponse),
      );

      await api.searchAssignments({});

      const [, options] = mockFetch.mock.calls[0]!;
      const body = options.body as URLSearchParams;

      // Verify key properties are included
      expect(body.get("propertyRenderConfiguration[0]")).toBe(
        "refereeConvocationStatus",
      );
      // refereePosition is at index 12 in the array
      expect(body.get("propertyRenderConfiguration[12]")).toBe(
        "refereePosition",
      );
      // Verify hall info is included
      expect(body.get("propertyRenderConfiguration[26]")).toBe(
        "refereeGame.game.hall.name",
      );
    });
  });

  describe("searchCompensations", () => {
    it("sends POST request to correct endpoint", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockCompensationsResponse),
      );

      await api.searchCompensations({});

      // Note: backslash in path is required by Neos/Flow backend
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "/indoorvolleyball.refadmin/api%5crefereeconvocationcompensation/search",
        ),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  describe("searchExchanges", () => {
    it("sends POST request to correct endpoint", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockExchangesResponse),
      );

      await api.searchExchanges({});

      // Note: backslash in path is required by Neos/Flow backend
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "/indoorvolleyball.refadmin/api%5crefereegameexchange/search",
        ),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  describe("applyForExchange", () => {
    it("sends PUT request with exchange ID and action", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}));

      await api.applyForExchange("exchange-123");

      const [, options] = mockFetch.mock.calls[0]!;
      expect(options.method).toBe("PUT");
      const body = options.body as URLSearchParams;
      expect(body.get("gameExchange")).toBe("exchange-123");
      expect(body.get("action")).toBe("apply");
    });
  });

  describe("withdrawFromExchange", () => {
    it("sends PUT request with exchange ID and withdraw action", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}));

      await api.withdrawFromExchange("exchange-456");

      const [, options] = mockFetch.mock.calls[0]!;
      expect(options.method).toBe("PUT");
      const body = options.body as URLSearchParams;
      expect(body.get("gameExchange")).toBe("exchange-456");
      expect(body.get("action")).toBe("withdraw");
    });
  });

  describe("request headers", () => {
    it("includes Accept: application/json header", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockAssignmentsResponse),
      );

      await api.searchAssignments({});

      const [, options] = mockFetch.mock.calls[0]!;
      expect(options.headers.Accept).toBe("application/json");
    });

    it("includes credentials: include for cookies", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockAssignmentsResponse),
      );

      await api.searchAssignments({});

      const [, options] = mockFetch.mock.calls[0]!;
      expect(options.credentials).toBe("include");
    });
  });
});
