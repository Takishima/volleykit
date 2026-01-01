import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAuthStore } from "./auth";
import { setCsrfToken, clearSession } from "@/api/client";

// Mock the API client
vi.mock("@/api/client", () => ({
  setCsrfToken: vi.fn(),
  clearSession: vi.fn(),
}));

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

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
      isDemoMode: false,
      activeOccupationId: null,
      _checkSessionPromise: null,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
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
      // First fetch: login page with form fields
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(createLoginPageHtml()),
      });

      // Second fetch: login POST follows redirect to dashboard
      // (browser handles redirect automatically, returns final page)
      // Must include referee role to pass the no-referee-role check
      mockFetch.mockResolvedValueOnce({
        ok: true,
        redirected: true,
        url: "https://volleymanager.volleyball.ch/sportmanager.volleyball/main/dashboard",
        text: () =>
          Promise.resolve(
            createDashboardHtmlWithReferee("my-csrf-token-12345678901234567890"),
          ),
      });

      const result = await useAuthStore.getState().login("user", "pass");

      expect(result).toBe(true);
      expect(useAuthStore.getState().status).toBe("authenticated");
      expect(setCsrfToken).toHaveBeenCalledWith(
        "my-csrf-token-12345678901234567890",
      );
      // Should only make 2 calls (login page + auth POST that follows redirect)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("failed login returns login page with error snackbar", async () => {
      // First fetch: login page with form fields
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(createLoginPageHtml()),
      });

      // Second fetch: login POST returns login page with error (no redirect, invalid credentials)
      // The response is still 200 OK but contains error snackbar
      mockFetch.mockResolvedValueOnce({
        ok: true,
        redirected: false,
        text: () =>
          Promise.resolve(
            createLoginPageHtml("a:0:{}abc123def456", { withError: true }),
          ),
      });

      const result = await useAuthStore.getState().login("user", "wrongpass");

      expect(result).toBe(false);
      const { status, error } = useAuthStore.getState();
      expect(status).toBe("error");
      expect(error).toBe("Invalid username or password");
    });

    it("succeeds via fallback when redirected flag is missing but CSRF token present", async () => {
      // Regression test: When proxy doesn't preserve redirect info,
      // but the response contains a valid CSRF token (dashboard HTML),
      // login should still succeed. The old code would fail with
      // "Invalid username or password" in this case.
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(createLoginPageHtml()),
      });

      // Second fetch: login POST returns dashboard with CSRF token
      // BUT redirected flag is false (e.g., due to proxy behavior)
      // Must include referee role to pass the no-referee-role check
      mockFetch.mockResolvedValueOnce({
        ok: true,
        redirected: false, // Proxy didn't preserve redirect info
        url: "", // No URL info either
        text: () =>
          Promise.resolve(
            createDashboardHtmlWithReferee("fallback-csrf-token-12345678901234"),
          ),
      });

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
      // With stale session cookie, /login returns login page (session invalid)
      // First fetch: login page (browser followed redirect but session was invalid)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        redirected: true, // May have redirected but ended up at login
        text: () => Promise.resolve(createLoginPageHtml()),
      });

      // Second fetch: login POST follows redirect to dashboard (success)
      // Must include referee role to pass the no-referee-role check
      mockFetch.mockResolvedValueOnce({
        ok: true,
        redirected: true,
        url: "https://volleymanager.volleyball.ch/sportmanager.volleyball/main/dashboard",
        text: () =>
          Promise.resolve(createDashboardHtmlWithReferee("fresh-csrf-token-abcdef")),
      });

      const result = await useAuthStore.getState().login("user", "pass");

      expect(result).toBe(true);
      expect(useAuthStore.getState().status).toBe("authenticated");
      expect(setCsrfToken).toHaveBeenCalledWith("fresh-csrf-token-abcdef");
      // 2 calls: login page fetch + auth POST
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("fails when auth request returns non-ok response", async () => {
      // First fetch: login page
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(createLoginPageHtml()),
      });

      // Second fetch: auth POST fails with server error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await useAuthStore.getState().login("user", "pass");

      expect(result).toBe(false);
      const { status, error } = useAuthStore.getState();
      expect(status).toBe("error");
      expect(error).toBe("Authentication request failed");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("detects TFA page and returns helpful error message", async () => {
      // First fetch: login page with form fields
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(createLoginPageHtml()),
      });

      // Second fetch: login POST returns TFA page (valid credentials but TFA enabled)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        redirected: false,
        text: () => Promise.resolve(createLoginPageHtml("a:0:{}", { withTfa: true })),
      });

      const result = await useAuthStore.getState().login("user", "pass");

      expect(result).toBe(false);
      const { status, error } = useAuthStore.getState();
      expect(status).toBe("error");
      expect(error).toContain("Two-factor authentication is not supported");
    });

    it("sends correct form data to authentication endpoint", async () => {
      // First fetch: login page
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(createLoginPageHtml("trusted-props-value")),
      });

      // Second fetch: login POST (returns login page with error to simulate failure)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        redirected: false,
        text: () =>
          Promise.resolve(
            createLoginPageHtml("trusted-props-value", { withError: true }),
          ),
      });

      await useAuthStore.getState().login("testuser", "testpass");

      // Check the second fetch call (login POST)
      const [url, options] = mockFetch.mock.calls[1] as [string, RequestInit];
      expect(url).toContain(
        "/sportmanager.security/authentication/authenticate",
      );
      expect(options.method).toBe("POST");
      expect(options.credentials).toBe("include");
      // Should NOT use redirect: "manual" (allows browser to process cookies)
      expect(options.redirect).toBeUndefined();

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
      // First fetch: login page with form fields
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(createLoginPageHtml()),
      });

      // Second fetch: login POST follows redirect to dashboard with player-only roles
      mockFetch.mockResolvedValueOnce({
        ok: true,
        redirected: true,
        url: "https://volleymanager.volleyball.ch/sportmanager.volleyball/main/dashboard",
        text: () => Promise.resolve(createDashboardHtmlWithPlayerOnly("valid-csrf-token")),
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
      expect(error).toContain("This app is for referees only");
      expect(clearSession).toHaveBeenCalled();
      // Should have made 3 calls: login page + auth POST + logout
      expect(mockFetch).toHaveBeenCalledTimes(3);
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
      expect(error).toContain("no referee role");
      expect(clearSession).toHaveBeenCalled();
    });

    it("accepts login when user has referee role", async () => {
      // First fetch: login page with form fields
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(createLoginPageHtml()),
      });

      // Second fetch: login POST follows redirect to dashboard with referee role
      mockFetch.mockResolvedValueOnce({
        ok: true,
        redirected: true,
        url: "https://volleymanager.volleyball.ch/sportmanager.volleyball/main/dashboard",
        text: () => Promise.resolve(createDashboardHtmlWithReferee("valid-csrf-token")),
      });

      const result = await useAuthStore.getState().login("referee-user", "pass");

      expect(result).toBe(true);
      expect(useAuthStore.getState().status).toBe("authenticated");
      expect(useAuthStore.getState().user?.occupations).toHaveLength(1);
      expect(useAuthStore.getState().user?.occupations?.[0]?.type).toBe("referee");
      // Should only make 2 calls (no logout needed)
      expect(mockFetch).toHaveBeenCalledTimes(2);
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
      useAuthStore.setState({ isDemoMode: true });

      const result = await useAuthStore.getState().checkSession();

      expect(result).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("deduplicates concurrent session checks", async () => {
      // Slow response to ensure both calls happen before resolution
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  text: () =>
                    Promise.resolve(createDashboardHtml("concurrent-csrf")),
                }),
              50,
            ),
          ),
      );

      // Start two concurrent session checks
      const [result1, result2] = await Promise.all([
        useAuthStore.getState().checkSession(),
        useAuthStore.getState().checkSession(),
      ]);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      // Should only make one fetch call
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("returns false and sets idle status on timeout", async () => {
      // Use fake timers to avoid waiting for real 10-second timeout
      vi.useFakeTimers();

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
      vi.useRealTimers();
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
      expect(state.isDemoMode).toBe(true);
      expect(state.user).toBeTruthy();
      expect(state.user?.firstName).toBe("Demo");
      expect(state.activeOccupationId).toBeTruthy();
    });
  });
});
