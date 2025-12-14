import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HomeRosterPanel } from "./HomeRosterPanel";
import { AwayRosterPanel } from "./AwayRosterPanel";
import { ScorerPanel } from "./ScorerPanel";
import { ScoresheetPanel } from "./ScoresheetPanel";
import type { Assignment } from "@/api/client";
import * as useNominationListModule from "@/hooks/useNominationList";

vi.mock("@/hooks/useNominationList");

function createMockAssignment(
  overrides: Partial<Assignment> = {},
): Assignment {
  return {
    __identity: "assignment-1",
    refereePosition: "head-one",
    refereeGame: {
      game: {
        __identity: "game-1",
        startingDateTime: "2025-12-15T14:00:00Z",
        encounter: {
          teamHome: { name: "VBC Zürich" },
          teamAway: { name: "VBC Basel" },
        },
        hall: {
          name: "Sporthalle Zürich",
          primaryPostalAddress: {
            city: "Zürich",
          },
        },
      },
    },
    ...overrides,
  } as Assignment;
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("HomeRosterPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNominationListModule.useNominationList).mockReturnValue({
      nominationList: null,
      players: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("renders without crashing", () => {
    render(<HomeRosterPanel assignment={createMockAssignment()} />, {
      wrapper: createWrapper(),
    });
    // Panel renders with team name and empty roster message
    expect(screen.getByText("VBC Zürich")).toBeInTheDocument();
    expect(screen.getByText("No players in roster")).toBeInTheDocument();
  });

  it("displays home team name", () => {
    render(<HomeRosterPanel assignment={createMockAssignment()} />, {
      wrapper: createWrapper(),
    });
    expect(screen.getByText("VBC Zürich")).toBeInTheDocument();
  });

  it("passes correct team prop to RosterVerificationPanel", () => {
    render(<HomeRosterPanel assignment={createMockAssignment()} />, {
      wrapper: createWrapper(),
    });

    expect(useNominationListModule.useNominationList).toHaveBeenCalledWith(
      expect.objectContaining({
        team: "home",
        gameId: "game-1",
      }),
    );
  });
});

describe("AwayRosterPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNominationListModule.useNominationList).mockReturnValue({
      nominationList: null,
      players: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("renders without crashing", () => {
    render(<AwayRosterPanel assignment={createMockAssignment()} />, {
      wrapper: createWrapper(),
    });
    // Panel renders with team name and empty roster message
    expect(screen.getByText("VBC Basel")).toBeInTheDocument();
    expect(screen.getByText("No players in roster")).toBeInTheDocument();
  });

  it("displays away team name", () => {
    render(<AwayRosterPanel assignment={createMockAssignment()} />, {
      wrapper: createWrapper(),
    });
    expect(screen.getByText("VBC Basel")).toBeInTheDocument();
  });

  it("passes correct team prop to RosterVerificationPanel", () => {
    render(<AwayRosterPanel assignment={createMockAssignment()} />, {
      wrapper: createWrapper(),
    });

    expect(useNominationListModule.useNominationList).toHaveBeenCalledWith(
      expect.objectContaining({
        team: "away",
        gameId: "game-1",
      }),
    );
  });
});

vi.mock("@/hooks/useScorerSearch", () => ({
  useScorerSearch: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
  })),
  parseSearchInput: vi.fn((input: string) => {
    if (!input.trim()) return {};
    return { lastName: input };
  }),
}));

vi.mock("@/stores/auth", () => ({
  useAuthStore: vi.fn((selector) => selector({ isDemoMode: false })),
}));

describe("ScorerPanel", () => {
  it("renders without crashing", () => {
    render(<ScorerPanel />, { wrapper: createWrapper() });
    expect(
      screen.getByPlaceholderText("Search scorer by name..."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No scorer selected/),
    ).toBeInTheDocument();
  });
});

describe("ScoresheetPanel", () => {
  it("renders without crashing", () => {
    render(<ScoresheetPanel />, { wrapper: createWrapper() });
    // Panel renders with upload UI
    expect(screen.getByText("Upload Scoresheet")).toBeInTheDocument();
    expect(
      screen.getByText("Upload a photo or scan of the physical scoresheet"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Select File" }),
    ).toBeInTheDocument();
  });
});
