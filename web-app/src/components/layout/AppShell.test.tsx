import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "./AppShell";
import { useAuthStore } from "@/stores/auth";
import { setLocale } from "@/i18n";

// Mock the auth store
vi.mock("@/stores/auth", () => ({
  useAuthStore: vi.fn(),
}));

describe("AppShell", () => {
  const mockLogout = vi.fn();

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
      vi.mocked(useAuthStore).mockReturnValue({
        status: "authenticated",
        user: {
          id: "demo-user",
          firstName: "Demo",
          lastName: "User",
          occupations: [{ id: "demo-referee", type: "referee" }],
        },
        logout: mockLogout,
        activeOccupationId: "demo-referee",
        setActiveOccupation: vi.fn(),
        isDemoMode: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      renderAppShell();

      expect(
        screen.getByText("Demo Mode - Viewing sample data"),
      ).toBeInTheDocument();
    });

    it("does NOT render demo banner when isDemoMode is false", () => {
      vi.mocked(useAuthStore).mockReturnValue({
        status: "authenticated",
        user: {
          id: "real-user",
          firstName: "John",
          lastName: "Doe",
          occupations: [{ id: "ref-1", type: "referee" }],
        },
        logout: mockLogout,
        activeOccupationId: "ref-1",
        setActiveOccupation: vi.fn(),
        isDemoMode: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      renderAppShell();

      expect(
        screen.queryByText("Demo Mode - Viewing sample data"),
      ).not.toBeInTheDocument();
    });

    it("has proper accessibility attributes", () => {
      vi.mocked(useAuthStore).mockReturnValue({
        status: "authenticated",
        user: {
          id: "demo-user",
          firstName: "Demo",
          lastName: "User",
          occupations: [{ id: "demo-referee", type: "referee" }],
        },
        logout: mockLogout,
        activeOccupationId: "demo-referee",
        setActiveOccupation: vi.fn(),
        isDemoMode: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      renderAppShell();

      const banner = screen.getByRole("alert");
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveAttribute("aria-live", "polite");
    });

    it("displays correct translation for German locale", () => {
      setLocale("de");

      vi.mocked(useAuthStore).mockReturnValue({
        status: "authenticated",
        user: {
          id: "demo-user",
          firstName: "Demo",
          lastName: "User",
          occupations: [{ id: "demo-referee", type: "referee" }],
        },
        logout: mockLogout,
        activeOccupationId: "demo-referee",
        setActiveOccupation: vi.fn(),
        isDemoMode: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      renderAppShell();

      expect(
        screen.getByText("Demo-Modus - Beispieldaten werden angezeigt"),
      ).toBeInTheDocument();
    });

    it("displays correct translation for French locale", () => {
      setLocale("fr");

      vi.mocked(useAuthStore).mockReturnValue({
        status: "authenticated",
        user: {
          id: "demo-user",
          firstName: "Demo",
          lastName: "User",
          occupations: [{ id: "demo-referee", type: "referee" }],
        },
        logout: mockLogout,
        activeOccupationId: "demo-referee",
        setActiveOccupation: vi.fn(),
        isDemoMode: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      renderAppShell();

      expect(
        screen.getByText("Mode Démo - Données d'exemple"),
      ).toBeInTheDocument();
    });

    it("displays correct translation for Italian locale", () => {
      setLocale("it");

      vi.mocked(useAuthStore).mockReturnValue({
        status: "authenticated",
        user: {
          id: "demo-user",
          firstName: "Demo",
          lastName: "User",
          occupations: [{ id: "demo-referee", type: "referee" }],
        },
        logout: mockLogout,
        activeOccupationId: "demo-referee",
        setActiveOccupation: vi.fn(),
        isDemoMode: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      renderAppShell();

      expect(
        screen.getByText("Modalità Demo - Dati di esempio"),
      ).toBeInTheDocument();
    });
  });
});
