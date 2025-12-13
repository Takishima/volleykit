import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "./AppShell";
import { useAuthStore, type AuthStatus, type UserProfile } from "@/stores/auth";
import { setLocale } from "@/i18n";

// Mock the auth store
vi.mock("@/stores/auth", () => ({
  useAuthStore: vi.fn(),
}));

/**
 * Create a mock auth store return value with sensible defaults.
 * Only specify the properties you need to override for your test.
 */
function createMockAuthStore(
  overrides: {
    status?: AuthStatus;
    user?: UserProfile | null;
    isDemoMode?: boolean;
    activeOccupationId?: string | null;
  } = {},
) {
  return {
    status: overrides.status ?? "authenticated",
    user: overrides.user ?? null,
    error: null,
    csrfToken: null,
    isDemoMode: overrides.isDemoMode ?? false,
    activeOccupationId: overrides.activeOccupationId ?? null,
    _checkSessionPromise: null,
    login: vi.fn(),
    logout: vi.fn(),
    checkSession: vi.fn(),
    setUser: vi.fn(),
    setDemoAuthenticated: vi.fn(),
    setActiveOccupation: vi.fn(),
  };
}

const demoUser: UserProfile = {
  id: "demo-user",
  firstName: "Demo",
  lastName: "User",
  occupations: [{ id: "demo-referee", type: "referee" }],
};

const realUser: UserProfile = {
  id: "real-user",
  firstName: "John",
  lastName: "Doe",
  occupations: [{ id: "ref-1", type: "referee" }],
};

describe("AppShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setLocale("en");
  });

  function renderAppShell() {
    return render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>,
    );
  }

  describe("demo mode banner", () => {
    it("renders demo banner when isDemoMode is true", () => {
      vi.mocked(useAuthStore).mockReturnValue(
        createMockAuthStore({
          user: demoUser,
          isDemoMode: true,
          activeOccupationId: "demo-referee",
        }),
      );

      renderAppShell();

      expect(
        screen.getByText("Demo Mode - Viewing sample data"),
      ).toBeInTheDocument();
    });

    it("does NOT render demo banner when isDemoMode is false", () => {
      vi.mocked(useAuthStore).mockReturnValue(
        createMockAuthStore({
          user: realUser,
          isDemoMode: false,
          activeOccupationId: "ref-1",
        }),
      );

      renderAppShell();

      expect(
        screen.queryByText("Demo Mode - Viewing sample data"),
      ).not.toBeInTheDocument();
    });

    it("has proper accessibility attributes", () => {
      vi.mocked(useAuthStore).mockReturnValue(
        createMockAuthStore({
          user: demoUser,
          isDemoMode: true,
          activeOccupationId: "demo-referee",
        }),
      );

      renderAppShell();

      const banner = screen.getByRole("alert");
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveAttribute("aria-live", "polite");
    });

    it("displays correct translation for German locale", () => {
      setLocale("de");

      vi.mocked(useAuthStore).mockReturnValue(
        createMockAuthStore({
          user: demoUser,
          isDemoMode: true,
          activeOccupationId: "demo-referee",
        }),
      );

      renderAppShell();

      expect(
        screen.getByText("Demo-Modus - Beispieldaten werden angezeigt"),
      ).toBeInTheDocument();
    });

    it("displays correct translation for French locale", () => {
      setLocale("fr");

      vi.mocked(useAuthStore).mockReturnValue(
        createMockAuthStore({
          user: demoUser,
          isDemoMode: true,
          activeOccupationId: "demo-referee",
        }),
      );

      renderAppShell();

      expect(
        screen.getByText("Mode Démo - Données d'exemple"),
      ).toBeInTheDocument();
    });

    it("displays correct translation for Italian locale", () => {
      setLocale("it");

      vi.mocked(useAuthStore).mockReturnValue(
        createMockAuthStore({
          user: demoUser,
          isDemoMode: true,
          activeOccupationId: "demo-referee",
        }),
      );

      renderAppShell();

      expect(
        screen.getByText("Modalità Demo - Dati di esempio"),
      ).toBeInTheDocument();
    });
  });
});
