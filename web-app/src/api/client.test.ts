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

  describe("getCompensationDetails", () => {
    it("sends GET request to showWithNestedObjects endpoint", async () => {
      const mockDetailsResponse = {
        convocationCompensation: {
          __identity: "comp-123",
          distanceInMetres: 48000,
          correctionReason: "Test reason",
        },
      };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockDetailsResponse));

      await api.getCompensationDetails("comp-123");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "/indoorvolleyball.refadmin/api%5cconvocationcompensation/showWithNestedObjects",
        ),
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("includes compensation ID in query parameters", async () => {
      const mockDetailsResponse = { convocationCompensation: {} };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockDetailsResponse));

      await api.getCompensationDetails("test-comp-id");

      const [url] = mockFetch.mock.calls[0]!;
      expect(url).toContain(
        "convocationCompensation%5B__identity%5D=test-comp-id",
      );
    });

    it("requests correctionReason and distance properties", async () => {
      const mockDetailsResponse = { convocationCompensation: {} };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockDetailsResponse));

      await api.getCompensationDetails("comp-123");

      const [url] = mockFetch.mock.calls[0]!;
      expect(url).toContain("propertyRenderConfiguration");
      expect(url).toContain("correctionReason");
      expect(url).toContain("distanceInMetres");
    });

    it("returns detailed compensation data", async () => {
      const mockDetailsResponse = {
        convocationCompensation: {
          __identity: "comp-123",
          distanceInMetres: 48000,
          distanceFormatted: "48.0",
          correctionReason: "Ich wohne in Oberengstringen",
        },
      };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockDetailsResponse));

      const result = await api.getCompensationDetails("comp-123");

      expect(result.convocationCompensation?.distanceInMetres).toBe(48000);
      expect(result.convocationCompensation?.correctionReason).toBe(
        "Ich wohne in Oberengstringen",
      );
    });
  });

  describe("updateCompensation", () => {
    it("sends PUT request to correct endpoint", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}));

      await api.updateCompensation("comp-123", { distanceInMetres: 50000 });

      // Note: backslash in path is required by Neos/Flow backend
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "/indoorvolleyball.refadmin/api%5cconvocationcompensation",
        ),
        expect.objectContaining({ method: "PUT" }),
      );
    });

    it("includes compensation ID in request body", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}));

      await api.updateCompensation("comp-456", { distanceInMetres: 60000 });

      const [, options] = mockFetch.mock.calls[0]!;
      const body = options.body as URLSearchParams;
      expect(body.get("__identity")).toBe("comp-456");
    });

    it("includes distanceInMetres in nested convocationCompensation object", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}));

      await api.updateCompensation("comp-789", { distanceInMetres: 75000 });

      const [, options] = mockFetch.mock.calls[0]!;
      const body = options.body as URLSearchParams;
      expect(body.get("convocationCompensation[distanceInMetres]")).toBe(
        "75000",
      );
    });

    it("includes correctionReason in nested convocationCompensation object", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}));

      await api.updateCompensation("comp-abc", {
        correctionReason: "Umweg wegen Baustelle",
      });

      const [, options] = mockFetch.mock.calls[0]!;
      const body = options.body as URLSearchParams;
      expect(body.get("convocationCompensation[correctionReason]")).toBe(
        "Umweg wegen Baustelle",
      );
    });

    it("includes both distanceInMetres and correctionReason when provided", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}));

      await api.updateCompensation("comp-xyz", {
        distanceInMetres: 88000,
        correctionReason: "Alternative route",
      });

      const [, options] = mockFetch.mock.calls[0]!;
      const body = options.body as URLSearchParams;
      expect(body.get("convocationCompensation[distanceInMetres]")).toBe(
        "88000",
      );
      expect(body.get("convocationCompensation[correctionReason]")).toBe(
        "Alternative route",
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
    it("sends PUT request with __identity and apply=1 per OpenAPI spec", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}));

      await api.applyForExchange("exchange-123");

      const [, options] = mockFetch.mock.calls[0]!;
      expect(options.method).toBe("PUT");
      const body = options.body as URLSearchParams;
      expect(body.get("__identity")).toBe("exchange-123");
      expect(body.get("apply")).toBe("1");
    });
  });

  describe("withdrawFromExchange", () => {
    it("sends PUT request with __identity and withdrawApplication=1 per OpenAPI spec", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}));

      await api.withdrawFromExchange("exchange-456");

      const [, options] = mockFetch.mock.calls[0]!;
      expect(options.method).toBe("PUT");
      const body = options.body as URLSearchParams;
      expect(body.get("__identity")).toBe("exchange-456");
      expect(body.get("withdrawApplication")).toBe("1");
    });
  });

  describe("searchPersons", () => {
    const mockPersonSearchResponse = { items: [], totalItemsCount: 0 };

    // Helper to extract query params from fetch URL
    function getQueryParams(): URLSearchParams {
      const [url] = mockFetch.mock.calls[0]!;
      // URL is relative, so use a base URL to parse it
      const urlObj = new URL(url as string, "https://example.com");
      return urlObj.searchParams;
    }

    it("uses GET method for person search", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockPersonSearchResponse),
      );

      await api.searchPersons({ lastName: "müller" });

      const [, options] = mockFetch.mock.calls[0]!;
      expect(options.method).toBe("GET");
      expect(options.body).toBeUndefined();
    });

    it("does not include CSRF token in GET request URL", async () => {
      // CSRF tokens in URLs can leak through browser history, server logs,
      // referer headers, and proxy logs - only include for state-changing methods
      setCsrfToken("test-csrf-token");

      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockPersonSearchResponse),
      );

      await api.searchPersons({ lastName: "müller" });

      const params = getQueryParams();
      expect(params.get("__csrfToken")).toBeNull();

      // Clean up
      setCsrfToken(null);
    });

    it("uses default limit when not specified", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockPersonSearchResponse),
      );

      await api.searchPersons({ lastName: "müller" });

      const params = getQueryParams();
      expect(params.get("searchConfiguration[limit]")).toBe("50");
    });

    it("respects custom limit when provided", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockPersonSearchResponse),
      );

      await api.searchPersons({ lastName: "müller" }, { limit: 100 });

      const params = getQueryParams();
      expect(params.get("searchConfiguration[limit]")).toBe("100");
    });

    it("sends lastName-only search to both firstName and lastName for OR matching", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockPersonSearchResponse),
      );

      await api.searchPersons({ lastName: "müller" });

      const params = getQueryParams();

      // Single term should be sent to both firstName and lastName
      expect(params.get("searchConfiguration[propertyFilters][0][propertyName]")).toBe("firstName");
      expect(params.get("searchConfiguration[propertyFilters][0][text]")).toBe("müller");
      expect(params.get("searchConfiguration[propertyFilters][1][propertyName]")).toBe("lastName");
      expect(params.get("searchConfiguration[propertyFilters][1][text]")).toBe("müller");
    });

    it("sends firstName-only search to both firstName and lastName for OR matching", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockPersonSearchResponse),
      );

      await api.searchPersons({ firstName: "hans" });

      const params = getQueryParams();

      // Single term should be sent to both firstName and lastName
      expect(params.get("searchConfiguration[propertyFilters][0][propertyName]")).toBe("firstName");
      expect(params.get("searchConfiguration[propertyFilters][0][text]")).toBe("hans");
      expect(params.get("searchConfiguration[propertyFilters][1][propertyName]")).toBe("lastName");
      expect(params.get("searchConfiguration[propertyFilters][1][text]")).toBe("hans");
    });

    it("sends two-term search to separate firstName and lastName fields", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockPersonSearchResponse),
      );

      await api.searchPersons({ firstName: "hans", lastName: "müller" });

      const params = getQueryParams();

      // Two terms should be sent to their respective fields
      expect(params.get("searchConfiguration[propertyFilters][0][propertyName]")).toBe("firstName");
      expect(params.get("searchConfiguration[propertyFilters][0][text]")).toBe("hans");
      expect(params.get("searchConfiguration[propertyFilters][1][propertyName]")).toBe("lastName");
      expect(params.get("searchConfiguration[propertyFilters][1][text]")).toBe("müller");
    });

    it("includes yearOfBirth filter when provided with single-term search", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockPersonSearchResponse),
      );

      await api.searchPersons({ lastName: "müller", yearOfBirth: "1985" });

      const params = getQueryParams();

      // Single term + year: firstName, lastName, yearOfBirth
      expect(params.get("searchConfiguration[propertyFilters][0][propertyName]")).toBe("firstName");
      expect(params.get("searchConfiguration[propertyFilters][0][text]")).toBe("müller");
      expect(params.get("searchConfiguration[propertyFilters][1][propertyName]")).toBe("lastName");
      expect(params.get("searchConfiguration[propertyFilters][1][text]")).toBe("müller");
      expect(params.get("searchConfiguration[propertyFilters][2][propertyName]")).toBe("yearOfBirth");
      expect(params.get("searchConfiguration[propertyFilters][2][text]")).toBe("1985");
    });

    it("includes yearOfBirth filter when provided with two-term search", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockPersonSearchResponse),
      );

      await api.searchPersons({ firstName: "hans", lastName: "müller", yearOfBirth: "1985" });

      const params = getQueryParams();

      // Two terms + year: firstName, lastName, yearOfBirth
      expect(params.get("searchConfiguration[propertyFilters][0][propertyName]")).toBe("firstName");
      expect(params.get("searchConfiguration[propertyFilters][0][text]")).toBe("hans");
      expect(params.get("searchConfiguration[propertyFilters][1][propertyName]")).toBe("lastName");
      expect(params.get("searchConfiguration[propertyFilters][1][text]")).toBe("müller");
      expect(params.get("searchConfiguration[propertyFilters][2][propertyName]")).toBe("yearOfBirth");
      expect(params.get("searchConfiguration[propertyFilters][2][text]")).toBe("1985");
    });

    it("requests all required properties for displaying search results", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockPersonSearchResponse),
      );

      await api.searchPersons({ lastName: "test" });

      const params = getQueryParams();

      // These properties are required for ScorerResultsList to display results properly.
      // Missing properties will cause search results to appear empty.
      const requiredProperties = [
        "displayName",
        "firstName",
        "lastName",
        "associationId",
        "birthday",
        "gender",
      ];

      requiredProperties.forEach((prop, index) => {
        expect(params.get(`propertyRenderConfiguration[${index}]`)).toBe(prop);
      });
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
