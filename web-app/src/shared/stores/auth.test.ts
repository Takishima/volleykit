import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAuthStore, NO_REFEREE_ROLE_ERROR_KEY } from "./auth";
import { setCsrfToken, clearSession } from "@/api/client";

// Mock the API client
// Use vi.hoisted to ensure the mock function is defined before vi.mock hoists
const { mockSwitchRoleAndAttribute } = vi.hoisted(() => ({
  mockSwitchRoleAndAttribute: vi.fn(),
}));

vi.mock("@/api/client", () => ({
  setCsrfToken: vi.fn(),
  clearSession: vi.fn(),
  captureSessionToken: vi.fn(),
  getSessionHeaders: vi.fn(() => ({})),
  getSessionToken: vi.fn(() => null),
  apiClient: {
    switchRoleAndAttribute: mockSwitchRoleAndAttribute,
  },
}));


// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Helper to create mock Response with proper headers (for redirect: manual)
function createMockResponse(options: {
  ok?: boolean;
  status?: number;
  type?: ResponseType;
  url?: string;
  redirected?: boolean;
  headers?: Record<string, string>;
  body?: string;
}): Partial<Response> {
  const headers = new Map(Object.entries(options.headers ?? {}));
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    type: options.type ?? "basic",
    url: options.url ?? "",
    redirected: options.redirected ?? false,
    headers: {
      get: (name: string) => headers.get(name) ?? null,
      has: (name: string) => headers.has(name),
    } as Headers,
    text: () => Promise.resolve(options.body ?? ""),
    json: () => Promise.resolve(JSON.parse(options.body ?? "{}")),
  };
}

// Helper to create valid login page HTML with form fields
function createLoginPageHtml(
  trustedProperties = "a:0:{}abc123def456",
  options: { withError?: boolean; withTfa?: boolean } = {},
) {
  const errorSnackbar = options.withError
    ? `<v-snackbar :value="true" color="error" :timeout="5000">Authentifizierung fehlgeschlagen!</v-snackbar>`
    : "";
  // TFA page contains a secondFactorToken input for TOTP codes
  if (options.withTfa) {
    return `
      <html>
        <body>
          <form>
            <input type='hidden' name='__trustedProperties' value='${trustedProperties}' />
            <input type='text' name='secondFactorToken' placeholder='Enter your 2FA code' />
            <button type='submit'>Verify</button>
          </form>
        </body>
      </html>
    `;
  }
  return `
    <html>
      <body>
        <form>
          <input type='hidden' name='__trustedProperties' value='${trustedProperties}' />
          <input type='hidden' name='__referrer[@package]' value='SportManager.Volleyball' />
          <input type='hidden' name='__referrer[@subpackage]' value='' />
          <input type='hidden' name='__referrer[@controller]' value='Public' />
          <input type='hidden' name='__referrer[@action]' value='login' />
          <input type='hidden' name='__referrer[arguments]' value='YTowOnt9abc123' />
        </form>
        ${errorSnackbar}
      </body>
    </html>
  `;
}

// Helper to create dashboard HTML with CSRF token
function createDashboardHtml(csrfToken = "abcd1234efgh5678ijkl9012mnop3456") {
  return `<html data-csrf-token='${csrfToken}'><body>Dashboard</body></html>`;
}

// Helper to create dashboard HTML with activeParty data containing only non-referee roles
function createDashboardHtmlWithPlayerOnly(csrfToken = "abcd1234efgh5678ijkl9012mnop3456") {
  // This activeParty has only player roles, no referee roles
  const activeParty = {
    __identity: "party-1",
    eligibleAttributeValues: [
      {
        __identity: "attr-1",
        roleIdentifier: "Indoorvolleyball.ClubAdmin:Player",
        type: "boolean",
        value: "true",
        inflatedValue: true,
      },
    ],
    groupedEligibleAttributeValues: [
      {
        __identity: "attr-2",
        roleIdentifier: "Indoorvolleyball.ClubAdmin:Player",
        type: "boolean",
        value: "true",
        inflatedValue: true,
      },
    ],
    eligibleRoles: {
      "Indoorvolleyball.ClubAdmin:Player": { identifier: "Indoorvolleyball.ClubAdmin:Player" },
    },
  };
  const encodedActiveParty = JSON.stringify(activeParty).replace(/"/g, "&quot;");
  return `<html data-csrf-token='${csrfToken}'><body><main-layout :active-party="$convertFromBackendToFrontend(${encodedActiveParty})"></main-layout></body></html>`;
}

// Helper to create dashboard HTML with activeParty containing referee roles
function createDashboardHtmlWithReferee(csrfToken = "abcd1234efgh5678ijkl9012mnop3456") {
  const activeParty = {
    __identity: "party-1",
    eligibleAttributeValues: [
      {
        __identity: "attr-1",
        roleIdentifier: "Indoorvolleyball.RefAdmin:Referee",
        type: "SportManager\\Volleyball\\Domain\\Model\\AbstractAssociation",
        value: "assoc-uuid-1",
        inflatedValue: { __identity: "assoc-1", shortName: "SV" },
      },
    ],
    groupedEligibleAttributeValues: [
      {
        __identity: "attr-1",
        roleIdentifier: "Indoorvolleyball.RefAdmin:Referee",
        type: "SportManager\\Volleyball\\Domain\\Model\\AbstractAssociation",
        value: "assoc-uuid-1",
        inflatedValue: { __identity: "assoc-1", shortName: "SV" },
      },
    ],
    eligibleRoles: {
      "Indoorvolleyball.RefAdmin:Referee": { identifier: "Indoorvolleyball.RefAdmin:Referee" },
    },
  };
  const encodedActiveParty = JSON.stringify(activeParty).replace(/"/g, "&quot;");
  return `<html data-csrf-token='${csrfToken}'><body><main-layout :active-party="$convertFromBackendToFrontend(${encodedActiveParty})"></main-layout></body></html>`;
}

describe("useAuthStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      status: "idle",
      user: null,
      error: null,
      csrfToken: null,
      dataSource: "api",
      calendarCode: null,
      activeOccupationId: null,
      _checkSessionPromise: null,
      _lastAuthTimestamp: null,
    });
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Default: switchRoleAndAttribute succeeds (login sync is best-effort)
    mockSwitchRoleAndAttribute.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();
  });

  describe("initial state", () => {
    it("starts with idle status", () => {
      const { status } = useAuthStore.getState();
      expect(status).toBe("idle");
    });

    it("starts with no user", () => {
      const { user } = useAuthStore.getState();
      expect(user).toBeNull();
    });
  });

  describe("logout", () => {
    it("clears session and resets state", async () => {
      // Mock logout fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 303,
        type: "opaqueredirect",
      });

      // Set up authenticated state
      useAuthStore.setState({
        status: "authenticated",
        user: { id: "1", firstName: "Test", lastName: "User", occupations: [] },
        csrfToken: "abc123",
      });

      // Logout
      await useAuthStore.getState().logout();

      // Verify state is reset
      const state = useAuthStore.getState();
      expect(state.status).toBe("idle");
      expect(state.user).toBeNull();
      expect(state.csrfToken).toBeNull();
      expect(clearSession).toHaveBeenCalled();
    });

    it("clears state even if server logout fails", async () => {
      // Mock logout fetch failure
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      useAuthStore.setState({
        status: "authenticated",
        user: { id: "1", firstName: "Test", lastName: "User", occupations: [] },
      });

      await useAuthStore.getState().logout();

      // State should still be cleared
      const state = useAuthStore.getState();
      expect(state.status).toBe("idle");
      expect(state.user).toBeNull();
    });
  });

  describe("login", () => {
    it("sets loading state when starting login", async () => {
      // Mock failed fetch to stop early
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const loginPromise = useAuthStore.getState().login("user", "pass");

      // Check loading state was set (may have already moved to error)
      await loginPromise;

      const { status } = useAuthStore.getState();
      expect(status).toBe("error");
    });

    it("handles failed login page fetch", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await useAuthStore.getState().login("user", "pass");

      expect(result).toBe(false);
      const { status, error } = useAuthStore.getState();
      expect(status).toBe("error");
      expect(error).toBe("Failed to load login page");
    });

    it("handles missing __trustedProperties in HTML", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("<html><body>No token here</body></html>"),
      });

      const result = await useAuthStore.getState().login("user", "pass");

      expect(result).toBe(false);
      const { status, error } = useAuthStore.getState();
      expect(status).toBe("error");
      expect(error).toBe("Could not extract form fields from login page");
    });

    it("successful login follows redirect and extracts CSRF token", async () => {
      const dashboardUrl = "/sportmanager.volleyball/main/dashboard";

      // First fetch: login page with form fields
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          body: createLoginPageHtml(),
        })
      );

      // Second fetch: login POST returns 303 redirect (redirect: manual)
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: false,
          status: 303,
          headers: { Location: dashboardUrl },
        })
      );

      // Third fetch: manual dashboard fetch with referee role
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          body: createDashboardHtmlWithReferee("my-csrf-token-12345678901234567890"),
        })
      );

      const resultPromise = useAuthStore.getState().login("user", "pass");
      await vi.advanceTimersByTimeAsync(100); // Wait for cookie processing delay
      const result = await resultPromise;

      expect(result).toBe(true);
      expect(useAuthStore.getState().status).toBe("authenticated");
      expect(setCsrfToken).toHaveBeenCalledWith(
        "my-csrf-token-12345678901234567890",
      );
      // Should make 3 calls: login page + auth POST + manual dashboard fetch
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("failed login returns login page with error snackbar", async () => {
      // First fetch: login page with form fields
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          body: createLoginPageHtml(),
        })
      );

      // Second fetch: login POST returns login page with error (no redirect, invalid credentials)
      // The response is still 200 OK but contains error snackbar
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          body: createLoginPageHtml("a:0:{}abc123def456", { withError: true }),
        })
      );

      const result = await useAuthStore.getState().login("user", "wrongpass");

      expect(result).toBe(false);
      const { status, error } = useAuthStore.getState();
      expect(status).toBe("error");
      expect(error).toBe("Invalid username or password");
    });

    it("succeeds via fallback when redirected flag is missing but CSRF token present", async () => {
      // Regression test: When proxy doesn't preserve redirect info,
      // but the response contains a valid CSRF token (dashboard HTML),
      // login should still succeed.
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          body: createLoginPageHtml(),
        })
      );

      // Second fetch: login POST returns dashboard with CSRF token directly (200 OK)
      // This is the fallback path via content-based detection
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          body: createDashboardHtmlWithReferee("fallback-csrf-token-12345678901234"),
        })
      );

      const result = await useAuthStore.getState().login("user", "pass");

      // Should succeed via the fallback CSRF token detection
      expect(result).toBe(true);
      expect(useAuthStore.getState().status).toBe("authenticated");
      expect(setCsrfToken).toHaveBeenCalledWith(
        "fallback-csrf-token-12345678901234",
      );
    });

    it("handles network errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network failure"));

      const result = await useAuthStore.getState().login("user", "pass");

      expect(result).toBe(false);
      const { status, error } = useAuthStore.getState();
      expect(status).toBe("error");
      expect(error).toBe("Network failure");
    });

    it("handles already authenticated user (login page has CSRF token)", async () => {
      // When user has existing valid session, /login redirects to authenticated page
      // The browser follows the redirect, and we get a page with CSRF token
      // First fetch: login page (with existing CSRF token)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        redirected: true,
        text: () =>
          Promise.resolve(
            createDashboardHtmlWithReferee("existing-session-csrf-token-1234"),
          ),
      });
      // Second fetch: dashboard to get activeParty data
      // Must include referee role to pass the no-referee-role check
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            createDashboardHtmlWithReferee("existing-session-csrf-token-1234"),
          ),
      });

      const result = await useAuthStore.getState().login("user", "pass");

      expect(result).toBe(true);
      expect(useAuthStore.getState().status).toBe("authenticated");
      expect(setCsrfToken).toHaveBeenCalledWith(
        "existing-session-csrf-token-1234",
      );
      // Should have made 2 calls: login page fetch + dashboard fetch for activeParty
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("handles stale session by proceeding with normal login", async () => {
      const dashboardUrl = "/sportmanager.volleyball/main/dashboard";

      // With stale session cookie, /login returns login page (session invalid)
      // First fetch: login page (browser followed redirect but session was invalid)
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          redirected: true,
          body: createLoginPageHtml(),
        })
      );

      // Second fetch: login POST returns 303 redirect (redirect: manual)
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: false,
          status: 303,
          headers: { Location: dashboardUrl },
        })
      );

      // Third fetch: manual dashboard fetch
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          body: createDashboardHtmlWithReferee("fresh-csrf-token-abcdef"),
        })
      );

      const resultPromise = useAuthStore.getState().login("user", "pass");
      await vi.advanceTimersByTimeAsync(100);
      const result = await resultPromise;

      expect(result).toBe(true);
      expect(useAuthStore.getState().status).toBe("authenticated");
      expect(setCsrfToken).toHaveBeenCalledWith("fresh-csrf-token-abcdef");
      // 3 calls: login page fetch + auth POST + dashboard
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("fails when auth request returns non-ok response", async () => {
      // First fetch: login page
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          body: createLoginPageHtml(),
        })
      );

      // Second fetch: auth POST fails with server error
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: false,
          status: 500,
          type: "basic",
        })
      );

      const result = await useAuthStore.getState().login("user", "pass");

      expect(result).toBe(false);
      const { status, error } = useAuthStore.getState();
      expect(status).toBe("error");
      expect(error).toBe("Authentication request failed");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("detects TFA page and returns helpful error message", async () => {
      // First fetch: login page with form fields
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          body: createLoginPageHtml(),
        })
      );

      // Second fetch: login POST returns TFA page (valid credentials but TFA enabled)
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          body: createLoginPageHtml("a:0:{}", { withTfa: true }),
        })
      );

      const result = await useAuthStore.getState().login("user", "pass");

      expect(result).toBe(false);
      const { status, error } = useAuthStore.getState();
      expect(status).toBe("error");
      expect(error).toContain("Two-factor authentication is not supported");
    });

    it("sends correct form data to authentication endpoint", async () => {
      // First fetch: login page
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          body: createLoginPageHtml("trusted-props-value"),
        })
      );

      // Second fetch: login POST (returns login page with error to simulate failure)
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          body: createLoginPageHtml("trusted-props-value", { withError: true }),
        })
      );

      await useAuthStore.getState().login("testuser", "testpass");

      // Check the second fetch call (login POST)
      const [url, options] = mockFetch.mock.calls[1] as [string, RequestInit];
      expect(url).toContain(
        "/sportmanager.security/authentication/authenticate",
      );
      expect(options.method).toBe("POST");
      expect(options.credentials).toBe("include");
      // redirect: "manual" for iOS PWA cookie handling
      expect(options.redirect).toBe("manual");
      // cache: "no-store" for iOS Safari cookie workaround
      expect(options.cache).toBe("no-store");

      const body = new URLSearchParams(options.body as string);
      expect(body.get("__trustedProperties")).toBe("trusted-props-value");
      expect(body.get("__referrer[@package]")).toBe("SportManager.Volleyball");
      expect(
        body.get(
          "__authentication[Neos][Flow][Security][Authentication][Token][UsernamePassword][username]",
        ),
      ).toBe("testuser");
      expect(
        body.get(
          "__authentication[Neos][Flow][Security][Authentication][Token][UsernamePassword][password]",
        ),
      ).toBe("testpass");
    });

    it("rejects login when user has no referee role", async () => {
      const dashboardUrl = "/sportmanager.volleyball/main/dashboard";

      // First fetch: login page with form fields
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          body: createLoginPageHtml(),
        })
      );

      // Second fetch: login POST returns 303 redirect (redirect: manual)
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: false,
          status: 303,
          headers: { Location: dashboardUrl },
        })
      );

      // Third fetch: manual dashboard fetch returns player-only roles
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          body: createDashboardHtmlWithPlayerOnly("valid-csrf-token"),
        })
      );

      // Fourth fetch: logout to invalidate session
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 303,
        type: "opaqueredirect",
      });

      const resultPromise = useAuthStore.getState().login("player-user", "pass");
      await vi.advanceTimersByTimeAsync(100); // Wait for cookie processing delay
      const result = await resultPromise;

      expect(result).toBe(false);
      const { status, error } = useAuthStore.getState();
      expect(status).toBe("error");
      expect(error).toBe(NO_REFEREE_ROLE_ERROR_KEY);
      expect(clearSession).toHaveBeenCalled();
      // Should have made 4 calls: login page + auth POST + dashboard + logout
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it("rejects already-authenticated user without referee role", async () => {
      // When user has existing valid session but no referee role
      // First fetch: login page redirects to authenticated page with CSRF token
      mockFetch.mockResolvedValueOnce({
        ok: true,
        redirected: true,
        text: () => Promise.resolve(createDashboardHtmlWithPlayerOnly("existing-csrf-token")),
      });

      // Second fetch: dashboard to get activeParty data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(createDashboardHtmlWithPlayerOnly("existing-csrf-token")),
      });

      // Third fetch: logout to invalidate session
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 303,
        type: "opaqueredirect",
      });

      const result = await useAuthStore.getState().login("player-user", "pass");

      expect(result).toBe(false);
      const { status, error } = useAuthStore.getState();
      expect(status).toBe("error");
      expect(error).toBe(NO_REFEREE_ROLE_ERROR_KEY);
      expect(clearSession).toHaveBeenCalled();
    });

    it("accepts login when user has referee role", async () => {
      const dashboardUrl = "/sportmanager.volleyball/main/dashboard";

      // First fetch: login page with form fields
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          body: createLoginPageHtml(),
        })
      );

      // Second fetch: login POST returns 303 redirect (redirect: manual)
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: false,
          status: 303,
          headers: { Location: dashboardUrl },
        })
      );

      // Third fetch: manual dashboard fetch returns referee role
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          body: createDashboardHtmlWithReferee("valid-csrf-token"),
        })
      );

      const resultPromise = useAuthStore.getState().login("referee-user", "pass");
      await vi.advanceTimersByTimeAsync(100); // Wait for cookie processing delay
      const result = await resultPromise;

      expect(result).toBe(true);
      expect(useAuthStore.getState().status).toBe("authenticated");
      expect(useAuthStore.getState().user?.occupations).toHaveLength(1);
      expect(useAuthStore.getState().user?.occupations?.[0]?.type).toBe("referee");
      // Should make 3 calls: login page + auth POST + dashboard
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("resets stale activeOccupationId when it does not exist in new occupations", async () => {
      // Simulate a persisted stale activeOccupationId from a previous session
      // (e.g., demo mode ID or a different user's occupation)
      useAuthStore.setState({
        activeOccupationId: "stale-occupation-id-from-previous-session",
      });

      const dashboardUrl = "/sportmanager.volleyball/main/dashboard";

      // First fetch: login page with form fields
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          body: createLoginPageHtml(),
        })
      );

      // Second fetch: login POST returns 303 redirect
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: false,
          status: 303,
          headers: { Location: dashboardUrl },
        })
      );

      // Third fetch: dashboard with a different occupation ID
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          body: createDashboardHtmlWithReferee("valid-csrf-token"),
        })
      );

      const resultPromise = useAuthStore.getState().login("new-user", "pass");
      await vi.advanceTimersByTimeAsync(100);
      const result = await resultPromise;

      expect(result).toBe(true);
      const state = useAuthStore.getState();
      // The stale ID should be replaced with a valid occupation from the new user
      expect(state.activeOccupationId).not.toBe("stale-occupation-id-from-previous-session");
      expect(state.activeOccupationId).toBe(state.user?.occupations?.[0]?.id);
    });

    it("preserves activeOccupationId when it exists in new occupations", async () => {
      // Set up state with an activeOccupationId that matches the new user's occupation
      // The occupation ID "attr-1" matches the one in createDashboardHtmlWithReferee
      useAuthStore.setState({
        activeOccupationId: "attr-1",
      });

      const dashboardUrl = "/sportmanager.volleyball/main/dashboard";

      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          body: createLoginPageHtml(),
        })
      );

      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: false,
          status: 303,
          headers: { Location: dashboardUrl },
        })
      );

      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          body: createDashboardHtmlWithReferee("valid-csrf-token"),
        })
      );

      const resultPromise = useAuthStore.getState().login("same-user", "pass");
      await vi.advanceTimersByTimeAsync(100);
      const result = await resultPromise;

      expect(result).toBe(true);
      const state = useAuthStore.getState();
      // The valid activeOccupationId should be preserved
      expect(state.activeOccupationId).toBe("attr-1");
    });

    it("syncs server-side active association after login", async () => {
      // This test verifies that after login, the client calls switchRoleAndAttribute
      // to sync the server with the client's chosen association.
      // This fixes the bug where dropdown shows one association but data is from another.
      const dashboardUrl = "/sportmanager.volleyball/main/dashboard";

      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          body: createLoginPageHtml(),
        })
      );

      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: false,
          status: 303,
          headers: { Location: dashboardUrl },
        })
      );

      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          body: createDashboardHtmlWithReferee("valid-csrf-token"),
        })
      );

      // Reset the mock to track calls
      mockSwitchRoleAndAttribute.mockClear();
      mockSwitchRoleAndAttribute.mockResolvedValueOnce(undefined);

      const resultPromise = useAuthStore.getState().login("referee-user", "pass");
      await vi.advanceTimersByTimeAsync(100);
      const result = await resultPromise;

      expect(result).toBe(true);
      // Verify that switchRoleAndAttribute was called with the activeOccupationId
      expect(mockSwitchRoleAndAttribute).toHaveBeenCalledTimes(1);
      expect(mockSwitchRoleAndAttribute).toHaveBeenCalledWith(
        useAuthStore.getState().activeOccupationId
      );
    });

    it("continues login successfully even if association sync fails", async () => {
      // The association sync is a best-effort operation - login should succeed
      // even if switchRoleAndAttribute fails
      const dashboardUrl = "/sportmanager.volleyball/main/dashboard";

      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          body: createLoginPageHtml(),
        })
      );

      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: false,
          status: 303,
          headers: { Location: dashboardUrl },
        })
      );

      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          body: createDashboardHtmlWithReferee("valid-csrf-token"),
        })
      );

      // Mock switchRoleAndAttribute to fail
      mockSwitchRoleAndAttribute.mockClear();
      mockSwitchRoleAndAttribute.mockRejectedValueOnce(new Error("Network error"));

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const resultPromise = useAuthStore.getState().login("referee-user", "pass");
      await vi.advanceTimersByTimeAsync(100);
      const result = await resultPromise;

      // Login should still succeed
      expect(result).toBe(true);
      expect(useAuthStore.getState().status).toBe("authenticated");
      // The error should be logged but not thrown
      expect(consoleSpy).toHaveBeenCalledWith(
        "[VolleyKit][App]",
        "Failed to sync active association after login:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("checkSession", () => {
    it("returns true and sets authenticated on successful API call", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(createDashboardHtml("renewed-csrf-token")),
      });

      const result = await useAuthStore.getState().checkSession();

      expect(result).toBe(true);
      expect(useAuthStore.getState().status).toBe("authenticated");
      expect(setCsrfToken).toHaveBeenCalledWith("renewed-csrf-token");
      expect(useAuthStore.getState().csrfToken).toBe("renewed-csrf-token");
    });

    it("preserves existing occupations when dashboard has no activeParty data", async () => {
      // Set up state with existing occupations from a previous session
      const existingOccupations = [
        { id: "ref-1", type: "referee" as const, associationCode: "SV" },
        { id: "ref-2", type: "referee" as const, associationCode: "SVRZ" },
        { id: "ref-3", type: "referee" as const, associationCode: "SVRBA" },
      ];
      useAuthStore.setState({
        status: "authenticated",
        user: {
          id: "user-1",
          firstName: "Test",
          lastName: "User",
          occupations: existingOccupations,
        },
        activeOccupationId: "ref-1",
      });

      // Mock dashboard response WITHOUT activeParty data (just CSRF token)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(createDashboardHtml("new-csrf-token")),
      });

      const result = await useAuthStore.getState().checkSession();

      expect(result).toBe(true);
      const state = useAuthStore.getState();
      // Occupations should be preserved, not wiped out
      expect(state.user?.occupations).toHaveLength(3);
      expect(state.user?.occupations).toEqual(existingOccupations);
      // Active occupation ID should also be preserved
      expect(state.activeOccupationId).toBe("ref-1");
    });

    it("preserves groupedEligibleAttributeValues when dashboard has no activeParty data", async () => {
      // Set up state with existing attribute values from login
      const existingGroupedValues = [
        { __identity: "attr-1", roleIdentifier: "Referee", type: "AbstractAssociation" },
        { __identity: "attr-2", roleIdentifier: "Referee", type: "AbstractAssociation" },
      ];
      const existingEligibleValues = [
        { __identity: "attr-3", roleIdentifier: "Referee" },
      ];
      const existingEligibleRoles = {
        "Indoorvolleyball.RefAdmin:Referee": { identifier: "Indoorvolleyball.RefAdmin:Referee" },
      };
      useAuthStore.setState({
        status: "authenticated",
        user: {
          id: "user-1",
          firstName: "Test",
          lastName: "User",
          occupations: [{ id: "ref-1", type: "referee" as const, associationCode: "SV" }],
        },
        groupedEligibleAttributeValues: existingGroupedValues,
        eligibleAttributeValues: existingEligibleValues,
        eligibleRoles: existingEligibleRoles,
      });

      // Mock dashboard response WITHOUT activeParty data (just CSRF token)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(createDashboardHtml("new-csrf-token")),
      });

      const result = await useAuthStore.getState().checkSession();

      expect(result).toBe(true);
      const state = useAuthStore.getState();
      // groupedEligibleAttributeValues should be preserved, not set to null
      expect(state.groupedEligibleAttributeValues).toEqual(existingGroupedValues);
      expect(state.eligibleAttributeValues).toEqual(existingEligibleValues);
      expect(state.eligibleRoles).toEqual(existingEligibleRoles);
    });

    it("resets stale activeOccupationId when session check returns different occupations", async () => {
      // Set up state with a stale activeOccupationId that won't exist in new data
      useAuthStore.setState({
        status: "authenticated",
        user: {
          id: "user-1",
          firstName: "Test",
          lastName: "User",
          occupations: [{ id: "old-ref-1", type: "referee" as const, associationCode: "SV" }],
        },
        activeOccupationId: "old-ref-1",
      });

      // Mock dashboard response with NEW activeParty data containing different occupation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(createDashboardHtmlWithReferee("new-csrf-token")),
      });

      const result = await useAuthStore.getState().checkSession();

      expect(result).toBe(true);
      const state = useAuthStore.getState();
      // The stale occupation ID should be replaced with the new valid one
      expect(state.activeOccupationId).not.toBe("old-ref-1");
      // Should fall back to the first occupation from the new data
      expect(state.activeOccupationId).toBe(state.user?.occupations?.[0]?.id);
    });

    it("returns false and sets idle on failed API call", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await useAuthStore.getState().checkSession();

      expect(result).toBe(false);
      expect(useAuthStore.getState().status).toBe("idle");
    });

    it("returns false and logs error on network failure", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await useAuthStore.getState().checkSession();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        "[VolleyKit][App]",
        "Session check failed:",
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });

    it("returns true immediately in demo mode", async () => {
      useAuthStore.setState({ dataSource: "demo" });

      const result = await useAuthStore.getState().checkSession();

      expect(result).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns true immediately in calendar mode", async () => {
      useAuthStore.setState({ dataSource: "calendar", calendarCode: "ABC123" });

      const result = await useAuthStore.getState().checkSession();

      expect(result).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("deduplicates concurrent session checks", async () => {
      // Mock a slow response to ensure both calls happen before resolution
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            // Use setTimeout with fake timers
            setTimeout(
              () =>
                resolve(
                  createMockResponse({
                    ok: true,
                    body: createDashboardHtml("concurrent-csrf"),
                  })
                ),
              50,
            );
          }),
      );

      // Start two concurrent session checks
      const promise1 = useAuthStore.getState().checkSession();
      const promise2 = useAuthStore.getState().checkSession();

      // Advance timers to let the fetch complete
      await vi.advanceTimersByTimeAsync(100);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      // Should only make one fetch call
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("returns false and sets idle status on timeout", async () => {
      // Fake timers are already set up in beforeEach

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Mock a fetch that respects the abort signal
      // When the signal is aborted, it throws an AbortError
      mockFetch.mockImplementation(
        (_url: string, options?: RequestInit) =>
          new Promise((_resolve, reject) => {
            const signal = options?.signal;
            if (signal) {
              signal.addEventListener("abort", () => {
                const error = new Error("The operation was aborted.");
                error.name = "AbortError";
                reject(error);
              });
            }
            // Never resolves on its own - will be aborted by timeout
          }),
      );

      // Start the session check (don't await yet)
      const resultPromise = useAuthStore.getState().checkSession();

      // Advance time past the 10-second timeout
      await vi.advanceTimersByTimeAsync(10_000);

      // Now await the result
      const result = await resultPromise;

      expect(result).toBe(false);
      expect(useAuthStore.getState().status).toBe("idle");
      expect(useAuthStore.getState().user).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "[VolleyKit][App]",
        "Session check timed out",
      );

      consoleSpy.mockRestore();
    });

    it("detects stale session in PWA mode when redirected but URL not updated", async () => {
      // Set up authenticated state first
      useAuthStore.setState({
        status: "authenticated",
        user: { id: "user-1", firstName: "Test", lastName: "User", occupations: [] },
        csrfToken: "existing-token",
      });

      // PWA mode scenario: redirected to login page, but response.url not updated
      // response.redirected is true, but URL still shows dashboard
      mockFetch.mockResolvedValueOnce({
        ok: true,
        redirected: true, // Key: redirect happened
        url: "https://volleymanager.volleyball.ch/sportmanager.volleyball/main/dashboard", // URL not updated
        text: () =>
          Promise.resolve(`
          <!DOCTYPE html>
          <html>
          <body>
            <form action="/login" method="post">
              <input id="username" type="text">
              <input id="password" type="password">
            </form>
          </body>
          </html>
        `),
      });

      const result = await useAuthStore.getState().checkSession();

      expect(result).toBe(false);
      expect(useAuthStore.getState().status).toBe("idle");
      expect(useAuthStore.getState().user).toBeNull();
    });

    it("succeeds in PWA mode when redirected but URL not updated and content is dashboard", async () => {
      // PWA mode scenario: redirected but URL not updated, content is valid dashboard
      mockFetch.mockResolvedValueOnce({
        ok: true,
        redirected: true, // Key: redirect happened (after following login redirect)
        url: "https://volleymanager.volleyball.ch/sportmanager.volleyball/main/dashboard", // URL shows dashboard
        text: () => Promise.resolve(createDashboardHtml("pwa-csrf-token")),
      });

      const result = await useAuthStore.getState().checkSession();

      expect(result).toBe(true);
      expect(useAuthStore.getState().status).toBe("authenticated");
      expect(useAuthStore.getState().csrfToken).toBe("pwa-csrf-token");
    });
  });

  describe("setUser", () => {
    it("updates user profile", () => {
      const user = {
        id: "123",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        occupations: [],
      };

      useAuthStore.getState().setUser(user);

      expect(useAuthStore.getState().user).toEqual(user);
    });

    it("can clear user profile", () => {
      useAuthStore.setState({
        user: { id: "1", firstName: "Test", lastName: "User", occupations: [] },
      });

      useAuthStore.getState().setUser(null);

      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe("setDemoAuthenticated", () => {
    it("sets demo mode and creates demo user", () => {
      useAuthStore.getState().setDemoAuthenticated();

      const state = useAuthStore.getState();
      expect(state.status).toBe("authenticated");
      expect(state.dataSource).toBe("demo");
      expect(state.user).toBeTruthy();
      expect(state.user?.firstName).toBe("Demo");
      expect(state.activeOccupationId).toBeTruthy();
    });
  });

  describe("isCalendarMode", () => {
    it("returns false by default", () => {
      expect(useAuthStore.getState().isCalendarMode()).toBe(false);
    });

    it("returns true when dataSource is calendar", () => {
      useAuthStore.setState({ dataSource: "calendar" });
      expect(useAuthStore.getState().isCalendarMode()).toBe(true);
    });

    it("returns false in demo mode", () => {
      useAuthStore.setState({ dataSource: "demo" });
      expect(useAuthStore.getState().isCalendarMode()).toBe(false);
    });
  });

  describe("loginWithCalendar", () => {
    // Note: Calendar code validation is now done by LoginPage before calling loginWithCalendar.
    // This function only performs format validation as a safeguard for direct API calls.

    it("sets calendar mode with the provided code", async () => {
      await useAuthStore.getState().loginWithCalendar("ABC123");

      const state = useAuthStore.getState();
      expect(state.status).toBe("authenticated");
      expect(state.dataSource).toBe("calendar");
      expect(state.calendarCode).toBe("ABC123");
      expect(state.user?.id).toBe("calendar-ABC123");
    });

    it("trims whitespace from calendar code", async () => {
      await useAuthStore.getState().loginWithCalendar("  ABC123  ");

      const state = useAuthStore.getState();
      expect(state.status).toBe("authenticated");
      expect(state.dataSource).toBe("calendar");
      expect(state.calendarCode).toBe("ABC123");
    });

    it("rejects code that is too short", async () => {
      await useAuthStore.getState().loginWithCalendar("ABC12");

      const state = useAuthStore.getState();
      expect(state.status).toBe("error");
      expect(state.error).toBe("auth.invalidCalendarCode");
      expect(state.calendarCode).toBeNull();
    });

    it("rejects code that is too long", async () => {
      await useAuthStore.getState().loginWithCalendar("ABC1234");

      const state = useAuthStore.getState();
      expect(state.status).toBe("error");
      expect(state.error).toBe("auth.invalidCalendarCode");
    });

    it("rejects code with special characters", async () => {
      await useAuthStore.getState().loginWithCalendar("ABC12!");

      const state = useAuthStore.getState();
      expect(state.status).toBe("error");
      expect(state.error).toBe("auth.invalidCalendarCode");
    });

    it("accepts lowercase alphanumeric codes", async () => {
      await useAuthStore.getState().loginWithCalendar("abc123");

      const state = useAuthStore.getState();
      expect(state.status).toBe("authenticated");
      expect(state.calendarCode).toBe("abc123");
    });

    it("sets authenticated state immediately without loading state", async () => {
      // loginWithCalendar is now synchronous (no API validation)
      // since validation is done by LoginPage before calling this
      await useAuthStore.getState().loginWithCalendar("ABC123");
      expect(useAuthStore.getState().status).toBe("authenticated");
    });
  });

  describe("logoutCalendar", () => {
    it("clears calendar mode and resets state", async () => {
      // Set up calendar mode
      await useAuthStore.getState().loginWithCalendar("ABC123");

      // Logout from calendar
      await useAuthStore.getState().logoutCalendar();

      const state = useAuthStore.getState();
      expect(state.status).toBe("idle");
      expect(state.dataSource).toBe("api");
      expect(state.calendarCode).toBeNull();
      expect(state.user).toBeNull();
    });
  });

  describe("getAuthMode", () => {
    it("returns 'none' when not authenticated", () => {
      expect(useAuthStore.getState().getAuthMode()).toBe("none");
    });

    it("returns 'full' for API authentication", () => {
      useAuthStore.setState({
        status: "authenticated",
        dataSource: "api",
        user: { id: "1", firstName: "Test", lastName: "User", occupations: [] },
      });

      expect(useAuthStore.getState().getAuthMode()).toBe("full");
    });

    it("returns 'demo' for demo mode", () => {
      useAuthStore.getState().setDemoAuthenticated();

      expect(useAuthStore.getState().getAuthMode()).toBe("demo");
    });

    it("returns 'calendar' for calendar mode", async () => {
      await useAuthStore.getState().loginWithCalendar("ABC123");

      expect(useAuthStore.getState().getAuthMode()).toBe("calendar");
    });
  });

  describe("logout clears dataSource and calendarCode", () => {
    it("resets dataSource to api when logging out from demo mode", async () => {
      useAuthStore.getState().setDemoAuthenticated();
      expect(useAuthStore.getState().dataSource).toBe("demo");

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.dataSource).toBe("api");
    });

    it("clears calendarCode when logging out from calendar mode", async () => {
      await useAuthStore.getState().loginWithCalendar("ABC123");
      expect(useAuthStore.getState().calendarCode).toBe("ABC123");

      await useAuthStore.getState().logout();

      expect(useAuthStore.getState().calendarCode).toBeNull();
    });
  });
});
