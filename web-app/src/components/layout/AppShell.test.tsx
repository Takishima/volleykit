import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "./AppShell";
import { useAuthStore, type UserProfile } from "@/stores/auth";
import { setLocale, type Locale } from "@/i18n";

// Mock the auth store
vi.mock("@/stores/auth", () => ({
  useAuthStore: vi.fn(),
}));

/**
 * Create a mock auth store return value with sensible defaults.
 * Accepts Partial<ReturnType<typeof useAuthStore>> to allow overriding any property.
 */
function createMockAuthStore(
  overrides: Partial<ReturnType<typeof useAuthStore>> = {},
) {
  return {
    status: "authenticated" as const,
    user: null,
    error: null,
    csrfToken: null,
    isDemoMode: false,
    activeOccupationId: null,
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

const demoUser: UserProfile = {
  id: "demo-user",
  firstName: "Demo",
  lastName: "User",
  occupations: [
    { id: "demo-referee-vd", type: "referee", associationCode: "AVL-VD" },
    { id: "demo-referee-ge", type: "referee", associationCode: "AVL-GE" },
  ],
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
          activeOccupationId: "demo-referee-vd",
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
          activeOccupationId: "demo-referee-vd",
        }),
      );

      renderAppShell();

      const banner = screen.getByRole("alert");
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveAttribute("aria-live", "polite");
    });

    it.each<{ locale: Locale; expected: string }>([
      { locale: "de", expected: "Demo-Modus - Beispieldaten werden angezeigt" },
      { locale: "fr", expected: "Mode Démo - Données d'exemple" },
      { locale: "it", expected: "Modalità Demo - Dati di esempio" },
    ])(
      "displays correct translation for $locale locale",
      ({ locale, expected }) => {
        setLocale(locale);

        vi.mocked(useAuthStore).mockReturnValue(
          createMockAuthStore({
            user: demoUser,
            isDemoMode: true,
            activeOccupationId: "demo-referee-vd",
          }),
        );

        renderAppShell();

        expect(screen.getByText(expected)).toBeInTheDocument();
      },
    );
  });

  describe("occupation dropdown", () => {
    it("does NOT render dropdown when user has only one occupation", () => {
      const singleOccupationUser: UserProfile = {
        id: "user-1",
        firstName: "John",
        lastName: "Doe",
        occupations: [{ id: "ref-1", type: "referee" }],
      };

      vi.mocked(useAuthStore).mockReturnValue(
        createMockAuthStore({
          user: singleOccupationUser,
          activeOccupationId: "ref-1",
        }),
      );

      renderAppShell();

      // Dropdown button should not exist
      expect(
        screen.queryByRole("button", { name: /referee/i }),
      ).not.toBeInTheDocument();
    });

    it("renders dropdown when user has multiple occupations", () => {
      const multiOccupationUser: UserProfile = {
        id: "user-1",
        firstName: "John",
        lastName: "Doe",
        occupations: [
          { id: "ref-1", type: "referee" },
          { id: "ref-2", type: "referee", associationCode: "VBC" },
        ],
      };

      vi.mocked(useAuthStore).mockReturnValue(
        createMockAuthStore({
          user: multiOccupationUser,
          activeOccupationId: "ref-1",
        }),
      );

      renderAppShell();

      // Dropdown button should exist with haspopup attribute
      const dropdownButton = screen.getByRole("button", {
        name: /referee/i,
      });
      expect(dropdownButton).toBeInTheDocument();
      expect(dropdownButton).toHaveAttribute("aria-haspopup", "listbox");
    });

    it("does NOT render dropdown when user has no occupations", () => {
      const noOccupationUser: UserProfile = {
        id: "user-1",
        firstName: "John",
        lastName: "Doe",
        occupations: [],
      };

      vi.mocked(useAuthStore).mockReturnValue(
        createMockAuthStore({
          user: noOccupationUser,
          activeOccupationId: null,
        }),
      );

      renderAppShell();

      // No dropdown button should exist
      expect(
        screen.queryByRole("button", { name: /select role/i }),
      ).not.toBeInTheDocument();
    });
  });
});
