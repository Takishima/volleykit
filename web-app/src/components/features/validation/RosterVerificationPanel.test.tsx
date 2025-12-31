import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RosterVerificationPanel } from "./RosterVerificationPanel";
import * as useNominationListModule from "@/hooks/useNominationList";
import type { RosterPlayer } from "@/hooks/useNominationList";

vi.mock("@/hooks/useNominationList");

const mockPlayers: RosterPlayer[] = [
  {
    id: "player-1",
    displayName: "Bob Wilson",
    licenseCategory: "SEN",
    isNewlyAdded: false,
  },
  {
    id: "player-2",
    displayName: "Jane Smith",
    licenseCategory: "JUN",
    isNewlyAdded: false,
  },
  {
    id: "player-3",
    displayName: "John Doe",
    licenseCategory: "SEN",
    isNewlyAdded: false,
  },
];

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

describe("RosterVerificationPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders loading state initially", () => {
    vi.mocked(useNominationListModule.useNominationList).mockReturnValue({
      nominationList: null,
      players: [],
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <RosterVerificationPanel
        team="home"
        teamName="Test Team"
        gameId="game-1"
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText("Loading roster...")).toBeInTheDocument();
  });

  it("displays player list after loading", () => {
    vi.mocked(useNominationListModule.useNominationList).mockReturnValue({
      nominationList: null,
      players: mockPlayers,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <RosterVerificationPanel
        team="home"
        teamName="Test Team"
        gameId="game-1"
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText("Test Team")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("Bob Wilson")).toBeInTheDocument();
  });

  it("shows player count", () => {
    vi.mocked(useNominationListModule.useNominationList).mockReturnValue({
      nominationList: null,
      players: mockPlayers,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <RosterVerificationPanel
        team="home"
        teamName="Test Team"
        gameId="game-1"
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText("3 players")).toBeInTheDocument();
  });

  it("shows error state with retry button", () => {
    const mockRefetch = vi.fn();
    vi.mocked(useNominationListModule.useNominationList).mockReturnValue({
      nominationList: null,
      players: [],
      isLoading: false,
      isError: true,
      error: new Error("Network error"),
      refetch: mockRefetch,
    });

    render(
      <RosterVerificationPanel
        team="home"
        teamName="Test Team"
        gameId="game-1"
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText("Failed to load roster")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it("shows empty state when no players", () => {
    vi.mocked(useNominationListModule.useNominationList).mockReturnValue({
      nominationList: null,
      players: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <RosterVerificationPanel
        team="home"
        teamName="Test Team"
        gameId="game-1"
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText("No players in roster")).toBeInTheDocument();
  });

  it("shows Add Player button", () => {
    vi.mocked(useNominationListModule.useNominationList).mockReturnValue({
      nominationList: null,
      players: mockPlayers,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <RosterVerificationPanel
        team="home"
        teamName="Test Team"
        gameId="game-1"
      />,
      { wrapper: createWrapper() },
    );

    expect(
      screen.getByRole("button", { name: /add player/i }),
    ).toBeInTheDocument();
  });

  it("marks player for removal when remove button is clicked", () => {
    vi.mocked(useNominationListModule.useNominationList).mockReturnValue({
      nominationList: null,
      players: mockPlayers,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <RosterVerificationPanel
        team="home"
        teamName="Test Team"
        gameId="game-1"
      />,
      { wrapper: createWrapper() },
    );

    // Find the first remove button and click it
    const removeButtons = screen.getAllByRole("button", { name: /remove/i });
    fireEvent.click(removeButtons[0]!);

    // After removal, player count should decrease
    expect(screen.getByText("2 players")).toBeInTheDocument();

    // An undo button should appear
    expect(screen.getByRole("button", { name: /undo/i })).toBeInTheDocument();
  });

  it("restores player when undo button is clicked", () => {
    vi.mocked(useNominationListModule.useNominationList).mockReturnValue({
      nominationList: null,
      players: mockPlayers,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <RosterVerificationPanel
        team="home"
        teamName="Test Team"
        gameId="game-1"
      />,
      { wrapper: createWrapper() },
    );

    // Remove a player
    const removeButtons = screen.getAllByRole("button", { name: /remove/i });
    fireEvent.click(removeButtons[0]!);

    expect(screen.getByText("2 players")).toBeInTheDocument();

    // Undo the removal
    const undoButton = screen.getByRole("button", { name: /undo/i });
    fireEvent.click(undoButton);

    // Player count should be restored
    expect(screen.getByText("3 players")).toBeInTheDocument();
  });

  it("calls onModificationsChange when player is removed", () => {
    const onModificationsChange = vi.fn();
    vi.mocked(useNominationListModule.useNominationList).mockReturnValue({
      nominationList: null,
      players: mockPlayers,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <RosterVerificationPanel
        team="home"
        teamName="Test Team"
        gameId="game-1"
        onModificationsChange={onModificationsChange}
      />,
      { wrapper: createWrapper() },
    );

    const removeButtons = screen.getAllByRole("button", { name: /remove/i });
    fireEvent.click(removeButtons[0]!);

    expect(onModificationsChange).toHaveBeenCalled();
  });

  it("sorts newly added players to end of list", () => {
    const playersWithNewlyAdded: RosterPlayer[] = [
      {
        id: "player-existing-high",
        displayName: "High Number",
        isNewlyAdded: false,
      },
      {
        id: "player-new",
        displayName: "Newly Added Player",
        isNewlyAdded: true,
      },
      {
        id: "player-existing-low",
        displayName: "Low Number",
        isNewlyAdded: false,
      },
    ];

    vi.mocked(useNominationListModule.useNominationList).mockReturnValue({
      nominationList: null,
      players: playersWithNewlyAdded,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <RosterVerificationPanel
        team="home"
        teamName="Test Team"
        gameId="game-1"
      />,
      { wrapper: createWrapper() },
    );

    const playerNames = screen
      .getAllByText(/Low Number|High Number|Newly Added Player/)
      .map((el) => el.textContent);

    // Sorted alphabetically, then newly added at the end
    expect(playerNames).toEqual([
      "High Number",
      "Low Number",
      "Newly Added Player",
    ]);
  });

  describe("initialModifications state restoration", () => {
    it("restores added players from initialModifications on mount", () => {
      const addedPlayer: RosterPlayer = {
        id: "added-player-1",
        displayName: "Previously Added Player",
        isNewlyAdded: true,
      };

      vi.mocked(useNominationListModule.useNominationList).mockReturnValue({
        nominationList: null,
        players: mockPlayers,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <RosterVerificationPanel
          team="home"
          teamName="Test Team"
          gameId="game-1"
          initialModifications={{ added: [addedPlayer], removed: [] }}
        />,
        { wrapper: createWrapper() },
      );

      // Should show the added player
      expect(screen.getByText("Previously Added Player")).toBeInTheDocument();
      // Total count should include both base players and added player
      expect(screen.getByText("4 players")).toBeInTheDocument();
    });

    it("restores removed players from initialModifications on mount", () => {
      vi.mocked(useNominationListModule.useNominationList).mockReturnValue({
        nominationList: null,
        players: mockPlayers,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <RosterVerificationPanel
          team="home"
          teamName="Test Team"
          gameId="game-1"
          initialModifications={{ added: [], removed: ["player-1"] }}
        />,
        { wrapper: createWrapper() },
      );

      // Player count should be reduced (one removed)
      expect(screen.getByText("2 players")).toBeInTheDocument();
      // There should be an undo button for the removed player
      expect(screen.getByRole("button", { name: /undo/i })).toBeInTheDocument();
    });

    it("persists state when component remounts with initialModifications", () => {
      const addedPlayer: RosterPlayer = {
        id: "added-player-1",
        displayName: "Previously Added Player",
        isNewlyAdded: true,
      };

      const onModificationsChange = vi.fn();

      vi.mocked(useNominationListModule.useNominationList).mockReturnValue({
        nominationList: null,
        players: mockPlayers,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <RosterVerificationPanel
          team="home"
          teamName="Test Team"
          gameId="game-1"
          onModificationsChange={onModificationsChange}
          initialModifications={{ added: [addedPlayer], removed: ["player-1"] }}
        />,
        { wrapper: createWrapper() },
      );

      // Verify initial state is correct
      expect(screen.getByText("Previously Added Player")).toBeInTheDocument();
      expect(screen.getByText("3 players")).toBeInTheDocument(); // 3 - 1 removed + 1 added

      // Simulate remounting by changing key (would force complete remount)
      // or we can check that onModificationsChange was called with the correct values
      expect(onModificationsChange).toHaveBeenCalledWith({
        added: [addedPlayer],
        removed: ["player-1"],
      });
    });

    it("simulates wizard navigation: state persists after unmount/remount", () => {
      const onModificationsChange = vi.fn();
      let capturedModifications: { added: RosterPlayer[]; removed: string[] } = {
        added: [],
        removed: [],
      };

      // Track modifications as they're reported
      onModificationsChange.mockImplementation((mods) => {
        capturedModifications = mods;
      });

      vi.mocked(useNominationListModule.useNominationList).mockReturnValue({
        nominationList: null,
        players: mockPlayers,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      // Step 1: Initial render (empty modifications)
      const { unmount } = render(
        <RosterVerificationPanel
          team="home"
          teamName="Test Team"
          gameId="game-1"
          onModificationsChange={onModificationsChange}
          initialModifications={{ added: [], removed: [] }}
        />,
        { wrapper: createWrapper() },
      );

      expect(screen.getByText("3 players")).toBeInTheDocument();

      // Step 2: User removes a player
      const removeButtons = screen.getAllByRole("button", { name: /remove/i });
      fireEvent.click(removeButtons[0]!);

      expect(screen.getByText("2 players")).toBeInTheDocument();
      expect(capturedModifications.removed).toContain("player-1");

      // Step 3: Simulate navigation to next wizard step (component unmounts)
      unmount();

      // Step 4: User navigates back (component remounts with saved modifications)
      render(
        <RosterVerificationPanel
          team="home"
          teamName="Test Team"
          gameId="game-1"
          onModificationsChange={onModificationsChange}
          initialModifications={capturedModifications}
        />,
        { wrapper: createWrapper() },
      );

      // Step 5: Verify state was restored correctly
      expect(screen.getByText("2 players")).toBeInTheDocument();
      // The removed player should still be marked for removal (has undo button)
      expect(screen.getByRole("button", { name: /undo/i })).toBeInTheDocument();
    });
  });
});
