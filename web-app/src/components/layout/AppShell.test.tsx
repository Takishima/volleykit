import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "./AppShell";
import { useAuthStore, type UserProfile } from "@/stores/auth";
import { setLocale, type Locale } from "@/i18n";

// Mock the auth store
vi.mock("@/stores/auth", () => ({
  useAuthStore: vi.fn(),
}));

// Creates mock auth store with sensible defaults; accepts partial overrides
// Note: isCalendarMode is returned as a boolean (the result of calling state.isCalendarMode())
// because the component's selector does: isCalendarMode: state.isCalendarMode()
function createMockAuthStore(
  overrides: Record<string, unknown> = {},
) {
  const dataSource = (overrides.dataSource as "api" | "demo" | "calendar") || "api";
  const isCalendarModeValue = dataSource === "calendar";
  return {
    status: "authenticated" as const,
    user: null,
    error: null,
    csrfToken: null,
    dataSource,
    isCalendarMode: isCalendarModeValue, // Boolean, not function - selector calls state.isCalendarMode()
    calendarCode: isCalendarModeValue ? "ABC123" : null,
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
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AppShell />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  describe("demo mode banner", () => {
    it("renders demo banner when dataSource is demo", () => {
      vi.mocked(useAuthStore).mockReturnValue(
        createMockAuthStore({
          user: demoUser,
          dataSource: "demo",
          activeOccupationId: "demo-referee-vd",
        }),
      );

      renderAppShell();

      expect(
        screen.getByText("Demo Mode - Viewing sample data"),
      ).toBeInTheDocument();
    });

    it("does NOT render demo banner when dataSource is api", () => {
      vi.mocked(useAuthStore).mockReturnValue(
        createMockAuthStore({
          user: realUser,
          dataSource: "api",
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
          dataSource: "demo",
          activeOccupationId: "demo-referee-vd",
        }),
      );

      renderAppShell();

      // Find the demo banner by its text content to avoid ambiguity
      const banner = screen.getByText("Demo Mode - Viewing sample data")
        .closest('[role="alert"]');
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
            dataSource: "demo",
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

  describe("calendar mode", () => {
    const calendarUser: UserProfile = {
      id: "calendar-ABC123",
      firstName: "Calendar",
      lastName: "User",
      occupations: [], // Calendar users have no occupations
    };

    describe("calendar mode banner", () => {
      it("renders calendar mode banner when in calendar mode", () => {
        vi.mocked(useAuthStore).mockReturnValue(
          createMockAuthStore({
            user: calendarUser,
            dataSource: "calendar",
            activeOccupationId: null,
          }),
        );

        renderAppShell();

        // Find the calendar banner by its sky-colored background (banner, not header indicator)
        const banners = screen.getAllByRole("alert");
        const calendarBanner = banners.find(b => b.className.includes("sky"));
        expect(calendarBanner).toBeInTheDocument();
      });

      it("does NOT render calendar banner when not in calendar mode", () => {
        vi.mocked(useAuthStore).mockReturnValue(
          createMockAuthStore({
            user: realUser,
            dataSource: "api",
            activeOccupationId: "ref-1",
          }),
        );

        renderAppShell();

        // Should not have calendar mode banner (sky-colored alert)
        const banners = screen.queryAllByRole("alert");
        const calendarBanner = banners.find(b => b.className.includes("sky"));
        expect(calendarBanner).toBeUndefined();
      });

      it("has proper accessibility attributes for calendar banner", () => {
        vi.mocked(useAuthStore).mockReturnValue(
          createMockAuthStore({
            user: calendarUser,
            dataSource: "calendar",
            activeOccupationId: null,
          }),
        );

        renderAppShell();

        // Find the calendar banner by its sky-colored background
        const banners = screen.getAllByRole("alert");
        const calendarBanner = banners.find(b => b.className.includes("sky"));
        expect(calendarBanner).toBeInTheDocument();
        expect(calendarBanner).toHaveAttribute("aria-live", "polite");
      });

      it.each<{ locale: Locale; expectedPattern: RegExp }>([
        { locale: "de", expectedPattern: /kalender.?modus/i },
        { locale: "fr", expectedPattern: /mode calendrier/i },
        { locale: "it", expectedPattern: /modalità calendario/i },
      ])(
        "displays correct translation for $locale locale in calendar mode",
        ({ locale, expectedPattern }) => {
          setLocale(locale);

          vi.mocked(useAuthStore).mockReturnValue(
            createMockAuthStore({
              user: calendarUser,
              dataSource: "calendar",
              activeOccupationId: null,
            }),
          );

          renderAppShell();

          // Find the calendar banner by its sky-colored background class
          const banners = screen.getAllByRole("alert");
          const calendarBanner = banners.find(b => b.className.includes("sky"));
          expect(calendarBanner?.textContent).toMatch(expectedPattern);
        },
      );
    });

    describe("navigation filtering", () => {
      it("hides Compensations nav item in calendar mode", () => {
        vi.mocked(useAuthStore).mockReturnValue(
          createMockAuthStore({
            user: calendarUser,
            dataSource: "calendar",
            activeOccupationId: null,
          }),
        );

        renderAppShell();

        // Compensations should not be in navigation
        expect(
          screen.queryByRole("link", { name: /compensation/i }),
        ).not.toBeInTheDocument();
      });

      it("hides Exchange nav item in calendar mode", () => {
        vi.mocked(useAuthStore).mockReturnValue(
          createMockAuthStore({
            user: calendarUser,
            dataSource: "calendar",
            activeOccupationId: null,
          }),
        );

        renderAppShell();

        // Exchange should not be in navigation
        expect(
          screen.queryByRole("link", { name: /exchange/i }),
        ).not.toBeInTheDocument();
      });

      it("shows Assignments nav item in calendar mode", () => {
        vi.mocked(useAuthStore).mockReturnValue(
          createMockAuthStore({
            user: calendarUser,
            dataSource: "calendar",
            activeOccupationId: null,
          }),
        );

        renderAppShell();

        // Assignments should still be visible
        expect(
          screen.getByRole("link", { name: /assignment/i }),
        ).toBeInTheDocument();
      });

      it("shows Settings nav item in calendar mode", () => {
        vi.mocked(useAuthStore).mockReturnValue(
          createMockAuthStore({
            user: calendarUser,
            dataSource: "calendar",
            activeOccupationId: null,
          }),
        );

        renderAppShell();

        // Settings should still be visible
        expect(
          screen.getByRole("link", { name: /setting/i }),
        ).toBeInTheDocument();
      });

      it("shows all nav items when NOT in calendar mode", () => {
        vi.mocked(useAuthStore).mockReturnValue(
          createMockAuthStore({
            user: realUser,
            dataSource: "api",
            activeOccupationId: "ref-1",
          }),
        );

        renderAppShell();

        // All nav items should be visible
        expect(
          screen.getByRole("link", { name: /assignment/i }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("link", { name: /compensation/i }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("link", { name: /exchange/i }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("link", { name: /setting/i }),
        ).toBeInTheDocument();
      });
    });

    describe("occupation dropdown in calendar mode", () => {
      it("does NOT render occupation dropdown in calendar mode", () => {
        vi.mocked(useAuthStore).mockReturnValue(
          createMockAuthStore({
            user: calendarUser,
            dataSource: "calendar",
            activeOccupationId: null,
          }),
        );

        renderAppShell();

        // Calendar users have no occupations, so no dropdown
        expect(
          screen.queryByRole("button", { name: /referee/i }),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: /select role/i }),
        ).not.toBeInTheDocument();
      });
    });

    describe("demo vs calendar mode distinction", () => {
      it("shows demo banner in demo mode, not calendar banner", () => {
        vi.mocked(useAuthStore).mockReturnValue(
          createMockAuthStore({
            user: demoUser,
            dataSource: "demo",
            activeOccupationId: "demo-referee-vd",
          }),
        );

        renderAppShell();

        // Find demo banner (amber-colored) by its background
        const alerts = screen.getAllByRole("alert");
        const demoBanner = alerts.find(a => a.className.includes("amber"));
        expect(demoBanner).toBeInTheDocument();
        // Calendar banner (sky-colored) should not be present
        const calendarBanner = alerts.find(a => a.className.includes("sky"));
        expect(calendarBanner).toBeUndefined();
      });

      it("shows calendar banner in calendar mode, not demo banner", () => {
        vi.mocked(useAuthStore).mockReturnValue(
          createMockAuthStore({
            user: calendarUser,
            dataSource: "calendar",
            activeOccupationId: null,
          }),
        );

        renderAppShell();

        // Find the calendar banner by its sky-colored background
        const banners = screen.getAllByRole("alert");
        const calendarBanner = banners.find(b => b.className.includes("sky"));
        expect(calendarBanner).toBeInTheDocument();
        // Demo banner (amber-colored) should not be present
        const demoBanner = banners.find(b => b.className.includes("amber"));
        expect(demoBanner).toBeUndefined();
      });
    });
  });
});
