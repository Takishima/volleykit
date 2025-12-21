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
function createLoginPageHtml(trustedProperties = "a:0:{}abc123def456") {
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
      </body>
    </html>
  `;
}

// Helper to create dashboard HTML with CSRF token
function createDashboardHtml(csrfToken = "abcd1234efgh5678ijkl9012mnop3456") {
  return `<html data-csrf-token='${csrfToken}'><body>Dashboard</body></html>`;
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
      mockFetch.mockResolvedValueOnce({
        ok: true,
        redirected: true,
        text: () =>
          Promise.resolve(
            createDashboardHtml("my-csrf-token-12345678901234567890"),
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

    it("failed login returns login page without CSRF token", async () => {
      // First fetch: login page with form fields
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(createLoginPageHtml()),
      });

      // Second fetch: login POST returns login page (no redirect, invalid credentials)
      // The response is still 200 OK but contains the login page HTML without data-csrf-token
      mockFetch.mockResolvedValueOnce({
        ok: true,
        redirected: false,
        text: () => Promise.resolve(createLoginPageHtml()), // Login page, not dashboard
      });

      const result = await useAuthStore.getState().login("user", "wrongpass");

      expect(result).toBe(false);
      const { status, error } = useAuthStore.getState();
      expect(status).toBe("error");
      expect(error).toBe("Invalid username or password");
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
      mockFetch.mockResolvedValueOnce({
        ok: true,
        redirected: true,
        text: () =>
          Promise.resolve(
            createDashboardHtml("existing-session-csrf-token-1234"),
          ),
      });

      const result = await useAuthStore.getState().login("user", "pass");

      expect(result).toBe(true);
      expect(useAuthStore.getState().status).toBe("authenticated");
      expect(setCsrfToken).toHaveBeenCalledWith(
        "existing-session-csrf-token-1234",
      );
      // Should only have made 1 call (login page fetch detected existing session)
      expect(mockFetch).toHaveBeenCalledTimes(1);
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
      mockFetch.mockResolvedValueOnce({
        ok: true,
        redirected: true,
        text: () =>
          Promise.resolve(createDashboardHtml("fresh-csrf-token-abcdef")),
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

    it("sends correct form data to authentication endpoint", async () => {
      // First fetch: login page
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(createLoginPageHtml("trusted-props-value")),
      });

      // Second fetch: login POST (returns login page to simulate failure)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        redirected: false,
        text: () => Promise.resolve(createLoginPageHtml()),
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
        "[VolleyKit]",
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
        "[VolleyKit]",
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
